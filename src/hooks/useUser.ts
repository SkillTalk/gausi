/**
 * useUser — read/write lightweight user identity from localStorage.
 *
 * Key: gausi:user:v1
 * Shape: { userId: string, email: string }
 *
 * This is NOT authenticated. Email is not verified.
 * It is used only to associate test history across devices.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { UserIdentity } from '@/types/exam';

const IDENTITY_KEY = 'gausi:user:v1';

function readIdentity(): UserIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'userId' in parsed &&
      'email' in parsed &&
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

function writeIdentity(identity: UserIdentity): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

function clearIdentity(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(IDENTITY_KEY);
}

export function useUser() {
  const [identity, setIdentityState] = useState<UserIdentity | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIdentityState(readIdentity());
    setLoaded(true);
  }, []);

  const setIdentity = useCallback((id: UserIdentity) => {
    writeIdentity(id);
    setIdentityState(id);
  }, []);

  /** Clears the local binding only — does not delete DB records. */
  const clearUser = useCallback(() => {
    clearIdentity();
    setIdentityState(null);
  }, []);

  return { identity, loaded, setIdentity, clearUser };
}
