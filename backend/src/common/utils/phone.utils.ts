/**
 * Canonicalizes Indian and international phone numbers into a consistent format.
 * Examples:
 *   '9876543210' -> '9876543210'
 *   '+919876543210' -> '9876543210'
 *   '09876543210' -> '9876543210'
 *   '98765-43210' -> '9876543210'
 *   '98765 43210' -> '9876543210'
 */
export function normalizePhoneNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  // Remove whitespace, hyphens, parentheses, dots
  let cleaned = trimmed.replace(/[\s\-\(\)\.]/g, '');

  // Remove leading '+91' if present
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.length < 10) {
    return null;
  }

  return cleaned;
}
