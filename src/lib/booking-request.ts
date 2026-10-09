/**
 * Validation for the public "book a pilot call" flow on the landing page.
 *
 * This endpoint is unauthenticated: it writes a lead row and sends an operator
 * an email, so every field is treated as attacker-controlled.
 *  - unbounded strings would let one request bloat the row and the notification
 *    email;
 *  - the fields are interpolated into the operator notification HTML, so
 *    unescaped markup is an inbox-injection vector.
 *
 * Kept as pure functions so it can be unit tested without a request object.
 */

export const BOOKING_LIMITS = {
  name: 120,
  company: 120,
  volume: 40,
  note: 1000,
  whenLabel: 80,
  tz: 60,
} as const;

export type BookingField = keyof typeof BOOKING_LIMITS;

// Intentionally permissive: reject only shapes that cannot be a real address.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export type BookingRequestInput = {
  name: string;
  email: string;
  company: string;
  volume: string;
  note: string;
  /** Chosen slot as an ISO timestamp (untrusted; only checked for validity). */
  whenIso: string;
  /** Pre-formatted, human-readable slot ("Friday, 10 October · 4:30 pm"). */
  whenLabel: string;
  tz: string;
};

export type BookingRequestResult =
  | { ok: true; value: BookingRequestInput }
  | { ok: false; error: string };

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validates and normalises a raw request body into bounded values. Lengths are
 * checked on the trimmed value, which is what gets stored, so whitespace
 * padding cannot smuggle a long string past the cap.
 */
export function normalizeBookingRequest(body: unknown): BookingRequestResult {
  const raw = (body ?? {}) as Record<string, unknown>;
  const name = asString(raw.name);
  const email = asString(raw.email);
  const company = asString(raw.company);
  const volume = asString(raw.volume);
  const note = asString(raw.note);
  const whenIso = asString(raw.whenIso);
  const whenLabel = asString(raw.whenLabel);
  const tz = asString(raw.tz);

  if (!name || !email || !company) {
    return { ok: false, error: 'Name, email, and company are required' };
  }
  if (!whenIso || Number.isNaN(Date.parse(whenIso))) {
    return { ok: false, error: 'A valid call time is required' };
  }

  const bounded: Array<[BookingField, string]> = [
    ['name', name],
    ['company', company],
    ['volume', volume],
    ['note', note],
    ['whenLabel', whenLabel],
    ['tz', tz],
  ];
  for (const [field, value] of bounded) {
    if (value.length > BOOKING_LIMITS[field]) {
      return {
        ok: false,
        error: `${field.charAt(0).toUpperCase()}${field.slice(1)} must be ${BOOKING_LIMITS[field]} characters or fewer`,
      };
    }
  }

  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please provide a valid email address' };
  }

  return { ok: true, value: { name, email, company, volume, note, whenIso, whenLabel, tz } };
}