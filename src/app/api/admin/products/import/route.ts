import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// POST /api/admin/products/import — bulk import products from an .xlsx / .csv history
// Flexible header mapping: any common column naming is accepted and normalized.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      return NextResponse.json({ error: 'Spreadsheet is empty' }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (!rows.length) {
      return NextResponse.json({ error: 'Spreadsheet has no data rows' }, { status: 400 });
    }

    const headerRow = rows[0];
    const colMap = resolveColumns(Object.keys(headerRow));

    const insertBatch: Array<Record<string, unknown>> = [];
    const upsertOps: Array<Promise<unknown>> = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    let matched = 0;

    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('company_id', companyId);

    const byNormalized = new Map<string, string>();
    for (const p of (existing || []) as Array<{ id: string; name: string }>) {
      byNormalized.set(normalizeName(p.name), p.id);
    }

    for (const raw of rows) {
      const row = raw as Record<string, unknown>;
      const name = pick(row, colMap.name);
      if (!name) {
        skipped.push(inspect(row));
        continue;
      }
      const productName = String(name).trim();
      const normalized = normalizeName(productName);
      if (!normalized) {
        skipped.push(inspect(row));
        continue;
      }

      const price = pick(row, colMap.price) || pick(row, colMap.price_range);
      const category = pick(row, colMap.category);
      const moq = pick(row, colMap.moq);
      const leadTime = pick(row, colMap.lead_time);
      const description = pick(row, colMap.description);
      const specs = pick(row, colMap.specs);

      const priceRange = normalizePriceRange(price);

      const payload: Record<string, unknown> = {
        company_id: companyId,
        name: productName,
        description: description ? String(description) : null,
        category: category ? String(category) : null,
        moq: moq ? String(moq) : null,
        lead_time: leadTime ? String(leadTime) : null,
        price_range: priceRange || null,
      };
      if (specs) payload.specs = parseSpecs(specs);

      const existingId = byNormalized.get(normalized);
      if (existingId) {
        matched++;
        upsertOps.push(
          supabaseAdmin
            .from('products')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', existingId)
        );
      } else {
        insertBatch.push({ ...payload, photos: [] });
      }
    }

    if (insertBatch.length) {
      const { error } = await supabaseAdmin.from('products').insert(insertBatch);
      if (error) {
        console.error('[products:import] insert error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const results = await Promise.allSettled(upsertOps);
    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('[products:import] update rejected:', r.reason);
        errors.push(String((r.reason as Error)?.message || r.reason));
      }
    }

    return NextResponse.json({
      imported: insertBatch.length,
      updated: matched,
      skipped: skipped.length,
      skipped_rows: skipped.slice(0, 10),
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[products:import] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NORMALIZERS: Array<{ short: string; long: string }> = [
  { short: 'name', long: 'product_name' },
  { short: 'category', long: 'product_category' },
  { short: 'price', long: 'unit_price' },
  { short: 'price_range', long: 'price' },
  { short: 'moq', long: 'min_order_qty' },
  { short: 'lead_time', long: 'delivery_time' },
  { short: 'description', long: 'product_description' },
  { short: 'specs', long: 'specifications' },
];

function normalizeColumn(h: string): string {
  return String(h)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function resolveColumns(headers: string[]): Record<string, string> {
  const colMap: Record<string, string> = {};
  const available = headers.map((h) => normalizeColumn(h));

  for (const { short, long } of NORMALIZERS) {
    const target = available.find(
      (c) =>
        c === short ||
        c === long ||
        c.startsWith(short + '_') ||
        c.startsWith(long + '_') ||
        c.includes(short)
    );
    if (target) colMap[short] = target;
  }

  // Fallbacks for value-style headers like "Unit Price (HKD)" or "Price / pc"
  if (!colMap.price) {
    const priceish = headers.find((h) => /price|cost|\$|hkd|usd|cny/i.test(h));
    if (priceish) colMap.price = normalizeColumn(priceish);
  }

  return colMap;
}

function pick(row: Record<string, unknown>, key?: string): unknown {
  if (!key) return '';
  const cell = row[key];
  return cell === null || cell === undefined || cell === '' ? '' : cell;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').trim();
}

function normalizePriceRange(price: unknown): string | null {
  if (!price) return null;
  const str = String(price).trim();
  if (!str) return null;

  // Already a range with two numbers, e.g. "1.20 - 2.50"
  const numbers = str.match(/[\d,]+(?:\.\d+)?/g);
  if (!numbers) return str;

  const nums = numbers.map((raw) => parseFloat(raw.replace(/,/g, ''))).filter((v) => isFinite(v));
  if (nums.length === 0) return str;

  const currency = str.match(/(USD|HKD|RMB|CNY|EUR|GBP)/i);
  const cur = currency ? currency[1].toUpperCase() : 'USD';
  const unitMatch = str.match(/\/(\s*)?([a-zA-Z]{2,4})/i);
  const unit = unitMatch ? unitMatch[2].toLowerCase() : null;

  if (nums.length === 1) {
    return `${cur} ${nums[0].toFixed(2)}${unit ? ` / ${unit}` : ''}`;
  }
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return lo === hi
    ? `${cur} ${lo.toFixed(2)}${unit ? ` / ${unit}` : ''}`
    : `${cur} ${lo.toFixed(2)} - ${hi.toFixed(2)}${unit ? ` / ${unit}` : ''}`;
}

function parseSpecs(v: unknown): Record<string, unknown> | null {
  if (!v) return null;
  const str = String(v).trim();
  if (!str) return null;
  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      return JSON.parse(str);
    } catch {
      return { note: str };
    }
  }
  return { note: str };
}

function inspect(row: Record<string, unknown>): string {
  const first = row[Object.keys(row)[0]];
  return String(first ?? '').slice(0, 80);
}