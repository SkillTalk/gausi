/**
 * Email normalization and validation utilities.
 * Used on both the client (validation feedback) and server (before DB writes).
 */

/** Normalize an email: trim + lowercase. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Basic RFC-5322-ish email validation (sufficient for lightweight identity). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

/** Normalize then validate. Returns normalized email or null if invalid. */
export function parseEmail(raw: string): string | null {
  const normalized = normalizeEmail(raw);
  return isValidEmail(normalized) ? normalized : null;
}
