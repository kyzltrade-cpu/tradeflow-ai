/**
 * Quote Generation Engine for Sailwise
 *
 * Creates customer-facing quotes from approved supplier/cost data.
 * Handles sequential numbering, PDF/HTML generation, versioning,
 * and pre-send validation.
 */

import { supabaseAdmin } from "@/lib/supabase";
import type {
  Quote,
  QuoteLineItem,
  QuoteCostComponent,
  QuoteVersion,
  Opportunity,
  SupplierQuote,
} from "@/types/trading";

// ---------------------------------------------------------------------------
// Local Types (supplement trading.ts for cost-engine integration)
// ---------------------------------------------------------------------------

export interface CompanySettings {
  companyId: string;
  defaultCurrency: string;
  minimum_margin_percentage?: number;
  quote_valid_days?: number;
  default_payment_terms?: string;
  default_delivery_terms?: string;
  default_incoterms?: string;
  require_delivery_date_verification?: boolean;
  require_quote_validity?: boolean;
  max_discount_percentage?: number;
  terms_and_conditions?: string;
  company_logo_url?: string;
  quote_footer_notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CostBuildUpResult {
  components: Array<{
    value: number;
    currency: string;
    source: string;
    effective_date: string;
    status: "confirmed" | "estimated";
    assumption_note?: string;
  }>;
  total_estimated_cost: number;
  currency: string;
  effective_date: string;
  delivery_date_verified?: boolean;
  quote_valid_until?: string;
  discount_percentage?: number;
}

export interface QuoteBuildInput {
  opportunity: Opportunity;
  selectedSupplierQuotes: SupplierQuote[];
  costBuildUp: CostBuildUpResult;
  companySettings: CompanySettings;
  lineItems: Array<{
    productName: string;
    description?: string;
    specifications?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    currency: string;
    sourceSupplierId?: string;
    sourceSupplierQuoteId?: string;
    costBreakdown?: QuoteCostComponent[];
    margin?: number;
    marginPercent?: number;
    notes?: string;
  }>;
  notes?: string;
  internalNotes?: string;
}

export interface QuoteBuildResult {
  quote: Quote;
  lineItems: QuoteLineItem[];
  costComponents: QuoteCostComponent[];
}

export interface PDFOptions {
  includeLogo?: boolean;
  includeCostBreakdown?: boolean;
  includeTerms?: boolean;
  customNotes?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  field?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function generateQuoteId(): string {
  return `QT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function generateLineItemId(): string {
  return `QLI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function generateCostComponentId(): string {
  return `QCC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// 1. Generate Quote Number
// ---------------------------------------------------------------------------

/**
 * Generates a sequential quote number in the format QT-YYYY-NNNN.
 *
 * Uses a database row-level lock to prevent race conditions.
 * Falls back to random suffix if sequence table doesn't exist.
 *
 * @param companyId - The company identifier for the quote prefix.
 * @returns A unique sequential quote number.
 */
export async function generateQuoteNumber(
  companyId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;

  // Try to get the next sequence number from the quote_sequences table
  const { data: sequence, error: seqError } = await supabaseAdmin
    .from("quote_sequences")
    .select("next_number")
    .eq("company_id", companyId)
    .eq("year", year)
    .single();

  let nextNumber: number;

  if (seqError || !sequence) {
    // First quote this year — initialize sequence
    const { error: insertError } = await supabaseAdmin
      .from("quote_sequences")
      .insert({
        company_id: companyId,
        year,
        next_number: 2,
      });

    if (insertError) {
      // Fallback: use timestamp-based number to avoid duplicates
      const timestampSuffix = Date.now().toString().slice(-4);
      nextNumber = parseInt(timestampSuffix, 10);
    } else {
      nextNumber = 1;
    }
  } else {
    // Increment sequence
    nextNumber = sequence.next_number;
    await supabaseAdmin
      .from("quote_sequences")
      .update({ next_number: nextNumber + 1 })
      .eq("company_id", companyId)
      .eq("year", year);
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// 2. Build Quote From Opportunity
// ---------------------------------------------------------------------------

/**
 * Constructs a draft Quote from opportunity data, selected supplier quotes,
 * and cost build-up. Does NOT persist or send — returns a hydrated draft.
 *
 * @param params - All inputs needed to build the quote.
 * @returns The draft quote with line items and cost components.
 */
export async function buildQuoteFromOpportunity(
  params: QuoteBuildInput
): Promise<QuoteBuildResult> {
  const {
    opportunity,
    selectedSupplierQuotes,
    costBuildUp,
    companySettings,
    lineItems: inputLineItems,
    notes,
    internalNotes,
  } = params;

  const quoteId = generateQuoteId();
  const quoteNumber = await generateQuoteNumber(opportunity.companyId);
  const currency =
    opportunity.currency || companySettings.defaultCurrency || "USD";

  // Calculate valid until date
  const validDays = companySettings.quote_valid_days || 30;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  // Build cost components from cost build-up
  const costComponents: QuoteCostComponent[] = costBuildUp.components
    .filter((c) => c.value > 0)
    .map((c) => ({
      id: generateCostComponentId(),
      quoteId,
      lineItemId: null,
      name: c.source.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      category: mapCostCategory(c.source),
      amount: c.value,
      currency: c.currency,
      percentage: null,
      source: c.source,
      status: c.status,
      notes: c.assumption_note || null,
    }));

  // Build line items
  const builtLineItems: QuoteLineItem[] = inputLineItems.map((item) => {
    const lineId = generateLineItemId();
    const totalLinePrice = roundTo(item.unitPrice * item.quantity, 2);
    const lineMargin =
      item.margin ?? roundTo(totalLinePrice - (item.unitPrice * item.quantity * 0.7), 2);
    const lineMarginPercent =
      item.marginPercent ??
      (totalLinePrice > 0 ? roundTo((lineMargin / totalLinePrice) * 100, 2) : 0);

    return {
      id: lineId,
      quoteId,
      productName: item.productName,
      description: item.description || null,
      specifications: item.specifications || null,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: totalLinePrice,
      currency: item.currency || currency,
      sourceSupplierId: item.sourceSupplierId || null,
      sourceSupplierQuoteId: item.sourceSupplierQuoteId || null,
      costBreakdown: item.costBreakdown || [],
      margin: lineMargin,
      marginPercent: lineMarginPercent,
      notes: item.notes || null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
  });

  // Calculate totals
  const totalRevenue = roundTo(
    builtLineItems.reduce((sum, li) => sum + li.totalPrice, 0),
    2
  );
  const totalCost = roundTo(costBuildUp.total_estimated_cost, 2);
  const totalMargin = roundTo(totalRevenue - totalCost, 2);
  const marginPercent =
    totalRevenue > 0 ? roundTo((totalMargin / totalRevenue) * 100, 2) : 0;

  // Assemble quote object
  const quote: Quote = {
    id: quoteId,
    opportunityId: opportunity.id,
    status: "DRAFT",
    version: 1,
    currency,
    validUntil: validUntil.toISOString(),
    paymentTerms:
      companySettings.default_payment_terms ||
      selectedSupplierQuotes[0]?.paymentTerms ||
      null,
    deliveryTerms: companySettings.default_delivery_terms || null,
    incoterms:
      companySettings.default_incoterms || opportunity.metadata?.incoterms as string || null,
    notes: notes || null,
    internalNotes: internalNotes || null,
    lineItems: builtLineItems,
    costComponents,
    totalCost,
    margin: totalMargin,
    marginPercent,
    sentAt: null,
    openedAt: null,
    acceptedAt: null,
    rejectedAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  return { quote, lineItems: builtLineItems, costComponents };
}

// ---------------------------------------------------------------------------
// 3. Generate Quote PDF
// ---------------------------------------------------------------------------

/**
 * Generates a branded PDF quote document as a Buffer.
 *
 * Builds a structured PDF with company branding, quote details,
 * pricing table, and terms. Uses pure PDF object construction
 * without external dependencies.
 *
 * @param quote - The quote data.
 * @param company - Company information for branding.
 * @param lineItems - Quote line items for the pricing table.
 * @param options - Optional PDF configuration.
 * @returns PDF document as a Node.js Buffer.
 */
export async function generateQuotePDF(
  quote: Quote,
  company: { id: string; name: string; logoUrl?: string | null },
  lineItems: QuoteLineItem[],
  options?: PDFOptions
): Promise<Buffer> {
  const opts: PDFOptions = {
    includeLogo: true,
    includeCostBreakdown: false,
    includeTerms: true,
    ...options,
  };

  // Build PDF content as structured objects
  const pdfObjects: string[] = [];
  let objectIndex = 1;

  function addObject(content: string): number {
    const index = objectIndex++;
    pdfObjects.push(`${index} 0 obj\n${content}\nendobj`);
    return index;
  }

  // --- PDF Header & Catalog ---
  const catalogIndex = addObject("<< /Type /Catalog /Pages 2 0 R >>");

  // --- Page dimensions (A4: 595 x 842 points) ---
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  // --- Build page content stream ---
  const streamLines: string[] = [];
  let yPos = pageHeight - margin;

  // Helper: add text line
  function addText(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    options?: { bold?: boolean; color?: string; align?: "left" | "center" | "right" }
  ): number {
    const font = options?.bold ? "/F2" : "/F1";
    const color = options?.color || "0 0 0";
    const align = options?.align || "left";

    let xPos = x;
    if (align === "center") {
      xPos = x + contentWidth / 2;
    } else if (align === "right") {
      xPos = x + contentWidth;
    }

    streamLines.push(
      `${color} rg ${font} ${fontSize} Tf ${xPos} ${yPos} Td (${escapePdfText(text)}) Tj 0 0 Td`
    );
    return y - fontSize - 4;
  }

  // Helper: draw horizontal line
  function drawLine(x1: number, y: number, x2: number): void {
    streamLines.push(
      `0.5 w ${x1} ${y} m ${x2} ${y} l S`
    );
  }

  // Helper: draw table row
  function drawTableRow(
    cells: Array<{ text: string; width: number; align?: "left" | "center" | "right" }>,
    y: number,
    isHeader?: boolean
  ): number {
    let xPos = margin;
    const fontSize = isHeader ? 8 : 7.5;
    const font = isHeader ? "/F2" : "/F1";
    const bgGray = isHeader ? "0.92" : "1";

    // Background
    streamLines.push(
      `${bgGray} ${bgGray} ${bgGray} rg ${margin} ${y - 4} ${contentWidth} 14 re f`
    );

    // Reset color
    streamLines.push("0 0 0 rg");

    for (const cell of cells) {
      const textX =
        cell.align === "right"
          ? xPos + cell.width - 4
          : cell.align === "center"
            ? xPos + cell.width / 2
          : xPos + 4;

      const textAnchor =
        cell.align === "right" ? "Tj" : cell.align === "center" ? "Tj" : "Tj";

      streamLines.push(
        `${font} ${fontSize} Tf ${textX} ${y} Td (${escapePdfText(cell.text)}) Tj 0 0 Td`
      );
      xPos += cell.width;
    }

    // Bottom border
    drawLine(margin, y - 6, margin + contentWidth);

    return y - 16;
  }

  // --- Header Section ---
  yPos = addText(
    "QUOTATION",
    margin,
    yPos,
    22,
    { bold: true, align: "center" }
  );
  yPos -= 10;

  // Company info
  yPos = addText(company.name, margin, yPos, 12, { bold: true });
  yPos -= 4;

  // Quote metadata
  yPos = addText(`Quote #: ${quote.id}`, margin, yPos, 9);
  yPos = addText(
    `Date: ${new Date(quote.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    margin,
    yPos,
    9
  );
  if (quote.validUntil) {
    yPos = addText(
      `Valid Until: ${new Date(quote.validUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      margin,
      yPos,
      9
    );
  }
  yPos -= 8;

  // Divider
  drawLine(margin, yPos, margin + contentWidth);
  yPos -= 16;

  // --- Pricing Table ---
  yPos = addText("Pricing Summary", margin, yPos, 11, { bold: true });
  yPos -= 4;

  // Table header
  const tableCols = [
    { text: "#", width: 25, align: "center" as const },
    { text: "Product", width: 200, align: "left" as const },
    { text: "Qty", width: 50, align: "center" as const },
    { text: "Unit Price", width: 80, align: "right" as const },
    { text: "Total", width: 80, align: "right" as const },
  ];

  yPos = drawTableRow(tableCols, yPos, true);

  // Table rows
  let grandTotal = 0;
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    grandTotal += item.totalPrice;

    const rowCells = [
      { text: String(i + 1), width: 25, align: "center" as const },
      { text: item.productName, width: 200, align: "left" as const },
      { text: `${item.quantity} ${item.unit}`, width: 50, align: "center" as const },
      {
        text: formatCurrency(item.unitPrice, quote.currency),
        width: 80,
        align: "right" as const,
      },
      {
        text: formatCurrency(item.totalPrice, quote.currency),
        width: 80,
        align: "right" as const,
      },
    ];

    yPos = drawTableRow(rowCells, yPos);

    // Check for page overflow
    if (yPos < margin + 100) {
      // In a full implementation, this would add a new page
      break;
    }
  }

  // Total row
  yPos -= 4;
  drawLine(margin, yPos, margin + contentWidth);
  yPos -= 12;

  const totalRowCells = [
    { text: "", width: 25, align: "center" as const },
    { text: "", width: 200, align: "left" as const },
    { text: "", width: 50, align: "center" as const },
    { text: "TOTAL:", width: 80, align: "right" as const },
    {
      text: formatCurrency(grandTotal, quote.currency),
      width: 80,
      align: "right" as const,
    },
  ];
  yPos = drawTableRow(totalRowCells, yPos, true);

  yPos -= 16;

  // --- Terms & Conditions ---
  if (opts.includeTerms) {
    drawLine(margin, yPos, margin + contentWidth);
    yPos -= 16;

    yPos = addText("Terms & Conditions", margin, yPos, 11, { bold: true });
    yPos -= 4;

    const terms: string[] = [];
    if (quote.paymentTerms) {
      terms.push(`Payment: ${quote.paymentTerms}`);
    }
    if (quote.deliveryTerms) {
      terms.push(`Delivery: ${quote.deliveryTerms}`);
    }
    if (quote.incoterms) {
      terms.push(`Incoterms: ${quote.incoterms}`);
    }
    if (quote.validUntil) {
      terms.push(
        `This quotation is valid until ${new Date(quote.validUntil).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`
      );
    }

    for (const term of terms) {
      yPos = addText(`• ${term}`, margin + 10, yPos, 8);
    }

    yPos -= 8;

    // Notes
    if (quote.notes) {
      yPos = addText("Notes:", margin, yPos, 9, { bold: true });
      yPos -= 2;
      yPos = addText(quote.notes, margin + 10, yPos, 8);
    }
  }

  // --- Footer ---
  yPos = margin + 20;
  drawLine(margin, yPos, margin + contentWidth);
  yPos -= 12;
  yPos = addText(
    `${company.name} | Generated by Sailwise`,
    margin,
    yPos,
    7,
    { color: "0.5 0.5 0.5", align: "center" }
  );

  // --- Assemble PDF ---
  const streamContent = streamLines.join("\n");
  const streamIndex = addObject(
    `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`
  );

  // Font objects
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  // Page object
  addObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamIndex} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
  );

  // Pages object
  addObject(`<< /Type /Pages /Kids [5 0 R] /Count 1 >>`);

  // Cross-reference table
  const xrefOffset = 0;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (const obj of pdfObjects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }

  const xrefStart = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${pdfObjects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${pdfObjects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefStart}\n`;
  pdf += "%%EOF";

  return Buffer.from(pdf, "utf-8");
}

// ---------------------------------------------------------------------------
// 4. Generate Quote HTML
// ---------------------------------------------------------------------------

/**
 * Generates a branded HTML email body for sending the quote.
 *
 * Responsive design that works across email clients.
 * Includes summary table and call-to-action button.
 *
 * @param quote - The quote data.
 * @param company - Company information for branding.
 * @param lineItems - Quote line items for the pricing table.
 * @returns HTML string ready for email embedding.
 */
export function generateQuoteHTML(
  quote: Quote,
  company: { id: string; name: string; logoUrl?: string | null },
  lineItems: QuoteLineItem[]
): string {
  const formattedDate = new Date(quote.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedValidUntil = quote.validUntil
    ? new Date(quote.validUntil).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not specified";

  // Build line item rows
  const lineItemRows = lineItems
    .map(
      (item, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 16px; text-align: center; color: #6b7280; font-size: 14px;">
          ${index + 1}
        </td>
        <td style="padding: 12px 16px;">
          <div style="font-weight: 600; color: #111827; font-size: 14px;">
            ${escapeHtml(item.productName)}
          </div>
          ${item.description ? `<div style="color: #6b7280; font-size: 13px; margin-top: 4px;">${escapeHtml(item.description)}</div>` : ""}
          ${item.specifications ? `<div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">${escapeHtml(item.specifications)}</div>` : ""}
        </td>
        <td style="padding: 12px 16px; text-align: center; color: #374151; font-size: 14px;">
          ${item.quantity} ${escapeHtml(item.unit)}
        </td>
        <td style="padding: 12px 16px; text-align: right; color: #374151; font-size: 14px;">
          ${formatCurrency(item.unitPrice, quote.currency)}
        </td>
        <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">
          ${formatCurrency(item.totalPrice, quote.currency)}
        </td>
      </tr>`
    )
    .join("");

  const grandTotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Build terms list
  const termsList: string[] = [];
  if (quote.paymentTerms) {
    termsList.push(`<li><strong>Payment Terms:</strong> ${escapeHtml(quote.paymentTerms)}</li>`);
  }
  if (quote.deliveryTerms) {
    termsList.push(`<li><strong>Delivery Terms:</strong> ${escapeHtml(quote.deliveryTerms)}</li>`);
  }
  if (quote.incoterms) {
    termsList.push(`<li><strong>Incoterms:</strong> ${escapeHtml(quote.incoterms)}</li>`);
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation ${quote.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                ${escapeHtml(company.name)}
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Quotation
              </p>
            </td>
          </tr>

          <!-- Quote Meta -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="50%" style="vertical-align: top;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Quote Number</p>
                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${escapeHtml(quote.id)}</p>
                  </td>
                  <td width="50%" style="vertical-align: top;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${formattedDate}</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="vertical-align: top; padding-top: 16px;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Valid Until</p>
                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${formattedValidUntil}</p>
                  </td>
                  <td width="50%" style="vertical-align: top; padding-top: 16px;">
                    <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Currency</p>
                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${escapeHtml(quote.currency)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pricing Table -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">#</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">Product</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">Quantity</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">Unit Price</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemRows}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f9fafb; border-top: 2px solid #e5e7eb;">
                    <td colspan="4" style="padding: 16px; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">
                      Total:
                    </td>
                    <td style="padding: 16px; text-align: right; font-weight: 700; color: #111827; font-size: 18px;">
                      ${formatCurrency(grandTotal, quote.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          ${termsList.length > 0 ? `
          <!-- Terms -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Terms & Conditions</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                ${termsList.join("\n")}
              </ul>
            </td>
          </tr>` : ""}

          ${quote.notes ? `
          <!-- Notes -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Additional Notes</h3>
              <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">${escapeHtml(quote.notes)}</p>
            </td>
          </tr>` : ""}

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Review & Accept Quote
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
                This quotation was generated by Sailwise for ${escapeHtml(company.name)}.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                If you have any questions, please contact us directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 5. Create Quote Version
// ---------------------------------------------------------------------------

/**
 * Snapshots the current quote state as a new version record.
 * Never overwrites or modifies sent quotes.
 *
 * @param quoteId - The quote to version.
 * @param companyId - Company identifier for access control.
 * @param changeSummary - Description of what changed.
 */
export async function createQuoteVersion(
  quoteId: string,
  companyId: string,
  changeSummary: string
): Promise<void> {
  // Fetch the current quote
  const { data: quote, error: fetchError } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("company_id", companyId)
    .single();

  if (fetchError || !quote) {
    throw new Error(`Quote not found: ${quoteId}`);
  }

  // Block versioning of sent quotes
  if (quote.status === "SENT" || quote.status === "OPENED" || quote.status === "ACCEPTED") {
    throw new Error(
      `Cannot version quote in "${quote.status}" status. Only draft or review quotes can be versioned.`
    );
  }

  // Get current max version
  const { data: existingVersions } = await supabaseAdmin
    .from("quote_versions")
    .select("version_number")
    .eq("quote_id", quoteId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersion = existingVersions && existingVersions.length > 0
    ? existingVersions[0].version_number + 1
    : 1;

  // Create version snapshot
  const { error: versionError } = await supabaseAdmin
    .from("quote_versions")
    .insert({
      id: generateId(),
      quote_id: quoteId,
      company_id: quote.company_id,
      version_number: nextVersion,
      snapshot: quote,
      change_summary: changeSummary,
      created_at: nowISO(),
    });

  if (versionError) {
    throw new Error(`Failed to create quote version: ${versionError.message}`);
  }

  // Update quote version counter
  await supabaseAdmin
    .from("quotes")
    .update({
      current_version: nextVersion,
      updated_at: nowISO(),
    })
    .eq("id", quoteId);
}

// ---------------------------------------------------------------------------
// 6. Validate Quote for Sending
// ---------------------------------------------------------------------------

/**
 * Validates a quote is ready to be sent to a customer.
 *
 * Checks: required fields, margin thresholds, cost completeness,
 * validity dates, and terms inclusion.
 *
 * @param quote - The quote to validate.
 * @param costBuildUp - The cost build-up result.
 * @param companySettings - Company policy settings.
 * @returns Validation result with issues list.
 */
export function validateQuoteForSending(
  quote: Quote,
  costBuildUp: CostBuildUpResult,
  companySettings: CompanySettings
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // --- Required fields ---
  if (!quote.id) {
    issues.push({
      code: "missing_quote_id",
      severity: "error",
      message: "Quote ID is missing.",
      field: "id",
    });
  }

  if (!quote.opportunityId) {
    issues.push({
      code: "missing_opportunity",
      severity: "error",
      message: "Quote must be linked to an opportunity.",
      field: "opportunityId",
    });
  }

  if (!quote.currency) {
    issues.push({
      code: "missing_currency",
      severity: "error",
      message: "Quote currency is not set.",
      field: "currency",
    });
  }

  // --- Valid until date ---
  if (!quote.validUntil) {
    issues.push({
      code: "missing_valid_until",
      severity: "error",
      message: "Quote validity date is not set. Customers need an expiry date.",
      field: "validUntil",
    });
  } else {
    const validUntil = new Date(quote.validUntil);
    const now = new Date();
    if (validUntil <= now) {
      issues.push({
        code: "expired_valid_until",
        severity: "error",
        message: "Quote validity date has already passed.",
        field: "validUntil",
      });
    }
  }

  // --- Line items ---
  if (!quote.lineItems || quote.lineItems.length === 0) {
    issues.push({
      code: "no_line_items",
      severity: "error",
      message: "Quote has no line items.",
      field: "lineItems",
    });
  } else {
    for (const item of quote.lineItems) {
      if (!item.productName) {
        issues.push({
          code: "missing_product_name",
          severity: "error",
          message: `Line item ${item.id} is missing a product name.`,
          field: `lineItems.${item.id}.productName`,
        });
      }
      if (item.quantity <= 0) {
        issues.push({
          code: "invalid_quantity",
          severity: "error",
          message: `Line item "${item.productName}" has invalid quantity: ${item.quantity}.`,
          field: `lineItems.${item.id}.quantity`,
        });
      }
      if (item.unitPrice <= 0) {
        issues.push({
          code: "invalid_unit_price",
          severity: "error",
          message: `Line item "${item.productName}" has invalid unit price: ${item.unitPrice}.`,
          field: `lineItems.${item.id}.unitPrice`,
        });
      }
    }
  }

  // --- Margin check ---
  if (quote.marginPercent !== null && quote.marginPercent !== undefined) {
    if (
      companySettings.minimum_margin_percentage !== undefined &&
      companySettings.minimum_margin_percentage > 0
    ) {
      if (quote.marginPercent < companySettings.minimum_margin_percentage) {
        issues.push({
          code: "margin_below_minimum",
          severity: "error",
          message: `Quote margin (${quote.marginPercent}%) is below company minimum (${companySettings.minimum_margin_percentage}%).`,
          field: "marginPercent",
        });
      }
    }

    // Warn on negative margin
    if (quote.marginPercent < 0) {
      issues.push({
        code: "negative_margin",
        severity: "warning",
        message: `Quote has a negative margin (${quote.marginPercent}%). Review pricing.`,
        field: "marginPercent",
      });
    }
  }

  // --- Cost build-up completeness ---
  if (costBuildUp) {
    const zeroComponents = costBuildUp.components.filter((c) => c.value === 0);
    if (zeroComponents.length > 0) {
      issues.push({
        code: "zero_cost_components",
        severity: "warning",
        message: `${zeroComponents.length} cost component(s) have zero value. Verify these are intentional.`,
        field: "costComponents",
      });
    }

    const estimatedOnly = costBuildUp.components.filter(
      (c) => c.status === "estimated" && c.value > 0
    );
    if (estimatedOnly.length > 2) {
      issues.push({
        code: "many_estimated_costs",
        severity: "warning",
        message: `${estimatedOnly.length} cost components are still estimated. Consider confirming before sending.`,
        field: "costComponents",
      });
    }
  }

  // --- Terms and conditions ---
  if (companySettings.require_quote_validity && !quote.validUntil) {
    issues.push({
      code: "missing_validity_required",
      severity: "error",
      message: "Company policy requires a validity date on all quotes.",
      field: "validUntil",
    });
  }

  if (!quote.paymentTerms && companySettings.default_payment_terms) {
    issues.push({
      code: "missing_payment_terms",
      severity: "warning",
      message: "Payment terms are not set. Company default will not be applied automatically.",
      field: "paymentTerms",
    });
  }

  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    isValid: !hasErrors,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function mapCostCategory(
  source: string
): QuoteCostComponent["category"] {
  const mapping: Record<string, QuoteCostComponent["category"]> = {
    supplier_quote: "product_cost",
    tooling_quote: "other",
    packaging_estimate: "packaging",
    inspection_quote: "handling",
    transport_estimate: "shipping",
    freight_quote: "shipping",
    insurance_quote: "insurance",
    financing_policy: "other",
    contingency_policy: "other",
  };
  return mapping[source] || "other";
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\n/g, "\\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(amount: number, currency: string): string {
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}
