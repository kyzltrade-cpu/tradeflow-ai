/**
 * HTML text/attribute escaping for the handful of places that interpolate
 * untrusted values into an email template.
 *
 * Note this is for HTML *content and quoted attribute values*, not for URL
 * construction. An address that is safe to print as text is still unsafe to
 * drop into `href="mailto:${...}"`, so callers must not treat this as URL
 * validation.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
