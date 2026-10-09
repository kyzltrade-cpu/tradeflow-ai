// Tenant-defined AI extraction fields.
//
// A company declares which specs it wants pulled out of every inbound buyer
// email (Settings → AI extraction fields). Those fields ride along in the
// company_settings.extraction_specs JSONB array and are rendered as extra
// rows in the email Specs pod.
//
// Key is the machine name the model echoes back, so it must be a stable
// slug derived from the label — renaming a label mid-flight would otherwise
// orphan previously extracted values.

export interface ExtractionSpec {
  key: string;
  label: string;
  hint: string;
  /**
   * When true the field is a hard requirement: Sailwise must always try to
   * pull it out of every inbound email, and a thread that is still missing it
   * is flagged as incomplete even if every other field is present.
   */
  required: boolean;
}

export const MAX_EXTRACTION_SPECS = 20;

export function extractionSpecKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'field'
  );
}

/**
 * Normalise anything array-shaped into a list of usable fields: drops blank
 * labels, forces a unique slug key, and caps the list so a runaway client
 * cannot blow up the extraction prompt.
 */
export function sanitizeExtractionSpecs(input: unknown): ExtractionSpec[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const out: ExtractionSpec[] = [];

  for (const raw of input) {
    if (out.length >= MAX_EXTRACTION_SPECS) break;

    const entry = (raw || {}) as Record<string, unknown>;
    const label = String(entry.label ?? '').trim().slice(0, 60);
    if (!label) continue;

    const providedKey = String(entry.key ?? '').trim();
    let key = extractionSpecKey(providedKey || label);
    if (seen.has(key)) {
      let n = 2;
      while (seen.has(`${key}_${n}`) && n < 100) n += 1;
      key = `${key}_${n}`;
    }

    seen.add(key);
    out.push({
      key,
      label,
      hint: String(entry.hint ?? '').trim().slice(0, 160),
      required: entry.required === true,
    });
  }

  return out;
}