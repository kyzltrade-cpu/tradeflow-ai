/**
 * Address validation for the composer.
 *
 * Cc and Bcc were plain free-text inputs, so a typo ("sam@acme.co," or a
 * half-typed address) reached Resend and rejected the *entire* send. The
 * operator then saw only "saved but not delivered" with no idea which field was
 * at fault. Validating in the composer catches it before the send is attempted.
 *
 * Deliberately permissive: it rejects the shapes that cannot be delivered and
 * accepts anything else. Over-strict regexes reject valid addresses
 * (plus-tags, long TLDs, unicode local parts), and a false rejection here
 * blocks a real customer email from going out.
 */

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>.]+(?:\.[^\s@,;<>.]+)+$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length > 0 && v.length <= 254 && EMAIL_RE.test(v);
}

/** Split a comma/semicolon separated address list into trimmed entries. */
export function splitAddresses(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export type AddressField = 'to' | 'cc' | 'bcc';

/**
 * Returns the invalid entries per field, or an empty object when all clean.
 * Callers decide how to surface it.
 */
export function validateAddressFields(fields: Record<AddressField, string>): Partial<Record<AddressField, string[]>> {
  const errors: Partial<Record<AddressField, string[]>> = {};
  for (const [field, value] of Object.entries(fields) as [AddressField, string][]) {
    const bad = splitAddresses(value).filter((addr) => !isValidEmail(addr));
    if (bad.length) errors[field] = bad;
  }
  return errors;
}

/** Flattens a server-side validation result into one operator-readable line. */
export function describeAddressErrors(errors: Partial<Record<AddressField, string[]>>): string {
  return Object.entries(errors)
    .map(([field, addrs]) => `${field.toUpperCase()}: ${(addrs || []).join(', ')}`)
    .join(' · ');
}
