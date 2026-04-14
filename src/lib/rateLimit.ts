/**
 * Rate Limiter for Login Attempts
 *
 * Authoritative check is server-side (Supabase RPC `check_login_lockout` /
 * `record_login_attempt`). The localStorage path is kept only as a UX
 * fallback so the UI can react instantly before the RPC round-trip, but it
 * MUST NOT be the only gate — it is trivially bypassed.
 */

import { supabase } from './supabase';

const RATE_LIMIT_KEY = 'login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitData {
    attempts: number;
    firstAttempt: number;
    lockedUntil: number | null;
}

export interface LockoutStatus {
    locked: boolean;
    minutesRemaining: number;
    remainingAttempts?: number;
}

function getRateLimitData(): RateLimitData {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_KEY);
        if (stored) return JSON.parse(stored);
    } catch {
        // ignore
    }
    return { attempts: 0, firstAttempt: Date.now(), lockedUntil: null };
}

function setRateLimitData(data: RateLimitData): void {
    try {
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    } catch {
        // ignore
    }
}

/** Client-side optimistic check (UX only, not authoritative). */
export function checkRateLimit(): LockoutStatus {
    const data = getRateLimitData();

    if (data.lockedUntil && Date.now() < data.lockedUntil) {
        const minutesRemaining = Math.ceil((data.lockedUntil - Date.now()) / (60 * 1000));
        return { locked: true, minutesRemaining };
    }

    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
        resetRateLimit();
    }

    return { locked: false, minutesRemaining: 0 };
}

export function recordFailedAttempt(): boolean {
    const data = getRateLimitData();
    const timeSinceFirst = Date.now() - data.firstAttempt;
    if (timeSinceFirst > LOCKOUT_DURATION_MS) {
        data.attempts = 0;
        data.firstAttempt = Date.now();
    }
    data.attempts += 1;
    if (data.attempts >= MAX_ATTEMPTS) {
        data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        setRateLimitData(data);
        return true;
    }
    setRateLimitData(data);
    return false;
}

export function resetRateLimit(): void {
    try {
        localStorage.removeItem(RATE_LIMIT_KEY);
    } catch {
        // ignore
    }
}

export function getRemainingAttempts(): number {
    const data = getRateLimitData();
    return Math.max(0, MAX_ATTEMPTS - data.attempts);
}

export const RATE_LIMIT_CONFIG = {
    maxAttempts: MAX_ATTEMPTS,
    lockoutMinutes: LOCKOUT_DURATION_MS / (60 * 1000),
};

// ─── Server-side (authoritative) ──────────────────────────────────────

/**
 * Authoritative check against the DB. Use this before calling Supabase auth.
 * Returns locked=false when the RPC fails (fail-open for availability,
 * since the client-side fallback still covers the easy cases).
 */
export async function serverCheckLoginLockout(email: string): Promise<LockoutStatus> {
    if (!email) return { locked: false, minutesRemaining: 0 };
    try {
        const { data, error } = await supabase.rpc('check_login_lockout', { p_email: email });
        if (error || !data) return { locked: false, minutesRemaining: 0 };
        const row = Array.isArray(data) ? data[0] : data;
        return {
            locked: !!row?.locked,
            minutesRemaining: row?.minutes_remaining ?? 0,
            remainingAttempts: row?.remaining_attempts ?? undefined,
        };
    } catch {
        return { locked: false, minutesRemaining: 0 };
    }
}

/**
 * Record the outcome of a login attempt. Returns the resulting lockout state
 * (so the client doesn't need a second round-trip).
 */
export async function serverRecordLoginAttempt(
    email: string,
    success: boolean,
): Promise<LockoutStatus> {
    if (!email) return { locked: false, minutesRemaining: 0 };
    try {
        const { data, error } = await supabase.rpc('record_login_attempt', {
            p_email: email,
            p_success: success,
        });
        if (error || !data) return { locked: false, minutesRemaining: 0 };
        const row = Array.isArray(data) ? data[0] : data;
        return {
            locked: !!row?.locked,
            minutesRemaining: row?.minutes_remaining ?? 0,
            remainingAttempts: row?.remaining_attempts ?? undefined,
        };
    } catch {
        return { locked: false, minutesRemaining: 0 };
    }
}
