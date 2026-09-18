// =============================================================================
// TradeFlow — Attachment Processing Pipeline
// =============================================================================
// Extracts text content from email attachments (PDF, Excel, CSV, DOCX, images).
// Used by the inquiry ingestion pipeline to normalize raw attachments into
// structured text that the AI extraction stage can consume.
// =============================================================================

import { createHash } from "node:crypto";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttachmentInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  fileSize: number;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ExtractionResult {
  text: string;
  tables: TableData[];
  status: "completed" | "failed" | "needs_ocr";
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "text/plain",
]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "text/csv": ".csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "image/png": ".png",
  "image/jpeg": ".jpeg",
  "text/plain": ".txt",
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateAttachment(
  mimeType: string,
  fileSize: number,
): ValidationResult {
  const errors: string[] = [];

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    errors.push(
      `Unsupported MIME type: ${mimeType}. Supported types: ${Array.from(SUPPORTED_MIME_TYPES).join(", ")}`,
    );
  }

  if (fileSize <= 0) {
    errors.push("File size must be greater than 0 bytes.");
  }

  if (fileSize > MAX_FILE_SIZE) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
    errors.push(`File size ${sizeMB}MB exceeds maximum of ${maxMB}MB.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Content hash (SHA-256)
// ---------------------------------------------------------------------------

export function computeContentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function processAttachment(
  attachment: AttachmentInput,
): Promise<ExtractionResult> {
  const { buffer, filename, mimeType, fileSize } = attachment;

  const validation = validateAttachment(mimeType, fileSize);
  if (!validation.isValid) {
    return {
      text: "",
      tables: [],
      status: "failed",
      error: validation.errors.join("; "),
    };
  }

  try {
    switch (mimeType) {
      case "application/pdf":
        return await processPDF(buffer, filename);

      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
        return await processExcel(buffer, filename);

      case "text/csv":
        return await processCSV(buffer, filename);

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return await processDOCX(buffer, filename);

      case "image/png":
      case "image/jpeg":
        return await processImage(buffer, filename);

      case "text/plain":
        return processPlainText(buffer, filename);

      default:
        return {
          text: "",
          tables: [],
          status: "failed",
          error: `No processor available for MIME type: ${mimeType}`,
        };
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during processing";
    return {
      text: "",
      tables: [],
      status: "failed",
      error: `Processing error for ${filename}: ${message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export async function processPDF(
  buffer: Buffer,
  filename: string,
): Promise<ExtractionResult> {
  const uint8 = new Uint8Array(buffer);

  const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;

  const pageTexts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Reconstruct lines from text items. Items sharing roughly the same
    // top coordinate belong to the same visual line.
    const textItems = content.items.filter(
      (item): item is (typeof item) & { transform: number[]; str: string } =>
        "str" in item && "transform" in item,
    );

    if (textItems.length === 0) continue;

    const lines: string[][] = [[]];
    let lastY = textItems[0].transform[4];

    for (const item of textItems) {
      const y = item.transform[4];
      // If vertical position changed by more than 2pt, treat as a new line
      if (Math.abs(y - lastY) > 2) {
        lines.push([]);
        lastY = y;
      }
      lines[lines.length - 1].push(item.str);
    }

    const pageText = lines.map((parts) => parts.join(" ").trim()).join("\n");
    pageTexts.push(`--- Page ${i} ---\n${pageText}`);
  }

  const fullText = pageTexts.join("\n\n");
  const tables = detectTables(fullText);

  return {
    text: fullText,
    tables,
    status: "completed",
  };
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export async function processExcel(
  buffer: Buffer,
  filename: string,
): Promise<ExtractionResult> {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const allTextParts: string[] = [];
  const allTables: TableData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Try structured JSON first (preserves headers)
    const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    if (jsonData.length === 0) {
      allTextParts.push(`[${sheetName}] (empty sheet)`);
      continue;
    }

    // First row is treated as header row
    const headerRow = jsonData[0] ?? [];
    const headers = headerRow.map((cell) => String(cell).trim());
    const dataRows = jsonData.slice(1).map((row) =>
      row.map((cell) => String(cell).trim()),
    );

    allTables.push({ headers, rows: dataRows });

    // Build readable text representation
    const sheetLines: string[] = [`[${sheetName}]`];
    sheetLines.push(headers.join(" | "));
    sheetLines.push(headers.map(() => "---").join(" | "));

    for (const row of dataRows) {
      sheetLines.push(row.join(" | "));
    }

    allTextParts.push(sheetLines.join("\n"));
  }

  return {
    text: allTextParts.join("\n\n"),
    tables: allTables,
    status: "completed",
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export async function processCSV(
  buffer: Buffer,
  filename: string,
): Promise<ExtractionResult> {
  const content = buffer.toString("utf-8");
  const lines = parseCSVLines(content);

  if (lines.length === 0) {
    return {
      text: "",
      tables: [],
      status: "completed",
    };
  }

  const headers = lines[0].map((cell) => cell.trim());
  const dataRows = lines.slice(1).map((row) => row.map((cell) => cell.trim()));

  const table: TableData = { headers, rows: dataRows };

  const sheetLines: string[] = [];
  sheetLines.push(headers.join(" | "));
  sheetLines.push(headers.map(() => "---").join(" | "));
  for (const row of dataRows) {
    sheetLines.push(row.join(" | "));
  }

  return {
    text: sheetLines.join("\n"),
    tables: [table],
    status: "completed",
  };
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

export async function processDOCX(
  buffer: Buffer,
  filename: string,
): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });

  const warnings = result.messages.filter((m) => m.type === "warning");
  const text = result.value ?? "";

  if (warnings.length > 0 && text.trim().length === 0) {
    return {
      text: "",
      tables: [],
      status: "failed",
      error: `DOCX extraction produced warnings: ${warnings.map((w) => w.message).join("; ")}`,
    };
  }

  return {
    text,
    tables: [],
    status: "completed",
  };
}

// ---------------------------------------------------------------------------
// Image (placeholder — needs OCR)
// ---------------------------------------------------------------------------

export async function processImage(
  _buffer: Buffer,
  filename: string,
): Promise<ExtractionResult> {
  // In production this would invoke Tesseract.js or GPT-4V vision.
  return {
    text: `[Image: ${filename}] OCR processing required — text extraction not yet implemented.`,
    tables: [],
    status: "needs_ocr",
  };
}

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

function processPlainText(
  buffer: Buffer,
  _filename: string,
): ExtractionResult {
  return {
    text: buffer.toString("utf-8"),
    tables: [],
    status: "completed",
  };
}

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields with commas/newlines)
// ---------------------------------------------------------------------------

function parseCSVLines(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        current.push(field);
        field = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        current.push(field);
        field = "";
        rows.push(current);
        current = [];
        if (char === "\r") i++; // skip \r in \r\n
      } else if (char === "\r") {
        current.push(field);
        field = "";
        rows.push(current);
        current = [];
      } else {
        field += char;
      }
    }
  }

  // Flush last field / row
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Table detection heuristic for PDF text
// ---------------------------------------------------------------------------
// Looks for consecutive lines where column-like alignment (consistent spacing
// patterns) suggests tabular data.

function detectTables(text: string): TableData[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const tables: TableData[] = [];

  // Heuristic: find groups of lines that share pipe-separated columns
  let candidateLines: string[] = [];
  let candidateStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const pipeCount = (lines[i].match(/\|/g) ?? []).length;
    const tabCount = (lines[i].match(/\t/g) ?? []).length;
    const hasStructuredSeparators = pipeCount >= 2 || tabCount >= 2;

    if (hasStructuredSeparators) {
      if (candidateLines.length === 0) {
        candidateStart = i;
      }
      candidateLines.push(lines[i]);
    } else {
      if (candidateLines.length >= 3) {
        const table = parseCandidateTable(candidateLines);
        if (table) tables.push(table);
      }
      candidateLines = [];
    }
  }

  // Flush remaining candidates
  if (candidateLines.length >= 3) {
    const table = parseCandidateTable(candidateLines);
    if (table) tables.push(table);
  }

  return tables;
}

function parseCandidateTable(lines: string[]): TableData | null {
  if (lines.length < 2) return null;

  const separator = lines[0].includes("|") ? "|" : "\t";

  const parsedLines = lines
    .map((line) =>
      line
        .split(separator)
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0),
    )
    .filter((cells) => cells.length >= 2);

  if (parsedLines.length < 2) return null;

  // Skip separator lines (e.g. "--- | ---")
  const dataLines = parsedLines.filter(
    (cells) => !cells.every((c) => /^[-:]+$/.test(c)),
  );

  if (dataLines.length < 2) return null;

  const headers = dataLines[0];
  const rows = dataLines.slice(1);

  // Normalize row widths to match headers
  const normalizedRows = rows.map((row) => {
    if (row.length < headers.length) {
      return [...row, ...new Array(headers.length - row.length).fill("")];
    }
    return row.slice(0, headers.length);
  });

  return { headers, rows: normalizedRows };
}
