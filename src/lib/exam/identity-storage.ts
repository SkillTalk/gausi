/**
 * Thin read-only accessor for the localStorage user identity.
 * Importable from server-neutral contexts (does typeof window guard).
 * Write operations go through useUser hook (client only).
 */

import type { UserIdentity } from '@/types/exam';

const IDENTITY_KEY = 'gausi:user:v1';

export function readIdentity(): UserIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).userId === 'string' &&
      typeof (parsed as Record<string, unknown>).email === 'string'
    ) {
      return parsed as UserIdentity;
    }
    return null;
  } catch {
    return null;
  }
}
