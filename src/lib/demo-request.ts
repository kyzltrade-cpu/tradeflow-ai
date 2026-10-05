/**
 * Validation for the public demo-request form.
 *
 * This endpoint is unauthenticated and writes straight to a lead table, so it
 * needs to assume every field is attacker-controlled:
 *  - an unbounded string would let one request blow up the `demo_requests` row
 *    and the admin notification email;
 *  - the fields are interpolated into the admin notification email's HTML, so
 *    unescaped `<`/`"` is a markup-injection vector into an inbox the operator
 *    reads in a mail client (fake rows, tracking pixels, hidden payloads).
 *
 * Kept as pure functions so it can be unit tested without a request object.
 */

export const DEMO_REQUEST_LIMITS = {
  name: 120,
  company: 120,
  phone: 40,
} as const;

export type DemoRequestField = keyof typeof DEMO_REQUEST_LIMITS;

// Intentionally permissive: reject the shapes that cannot be a real address,
// accept anything else. Over-strict patterns reject valid addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export type DemoRequestInput = {
  name: string;
  email: string;
  company: string;
  phone: string;
};

export type DemoRequestResult =
  | { ok: true; value: DemoRequestInput }
  | { ok: false; error: string };

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validates and normalises a raw request body into bounded, escaped-safe
 * values. Lengths are checked on the trimmed value, which is what actually
 * gets stored, so padding with whitespace cannot be used to smuggle a long
 * string past the cap.
 */
export function normalizeDemoRequest(body: unknown): DemoRequestResult {
  const raw = (body ?? {}) as Record<string, unknown>;
  const name = asString(raw.name);
  const email = asString(raw.email);
  const company = asString(raw.company);
  const phone = asString(raw.phone);

  if (!name || !email || !company) {
    return { ok: false, error: 'Name, email, and company are required' };
  }

  for (const field of ['name', 'company', 'phone'] as const) {
    const value = field === 'phone' ? phone : field === 'name' ? name : company;
    if (value.length > DEMO_REQUEST_LIMITS[field]) {
      return {
        ok: false,
        error: `${field.charAt(0).toUpperCase()}${field.slice(1)} must be ${DEMO_REQUEST_LIMITS[field]} characters or fewer`,
      };
    }
  }

  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please provide a valid email address' };
  }

  return { ok: true, value: { name, email, company, phone } };
}
