/**
 * Rate Limiter for Login Attempts (Mobile)
 * Uses AsyncStorage for React Native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RATE_LIMIT_KEY = 'login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitData {
    attempts: number;
    firstAttempt: number;
    lockedUntil: number | null;
}

async function getRateLimitData(): Promise<RateLimitData> {
    try {
        const stored = await AsyncStorage.getItem(RATE_LIMIT_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        // If storage fails, allow login
    }
    return { attempts: 0, firstAttempt: Date.now(), lockedUntil: null };
}

async function setRateLimitData(data: RateLimitData): Promise<void> {
    try {
        await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    } catch (e) {
        // Continue without rate limiting
    }
}

/**
 * Check if user is currently locked out
 */
export async function checkRateLimit(): Promise<{ locked: boolean; minutesRemaining: number }> {
    const data = await getRateLimitData();

    if (data.lockedUntil && Date.now() < data.lockedUntil) {
        const minutesRemaining = Math.ceil((data.lockedUntil - Date.now()) / (60 * 1000));
        return { locked: true, minutesRemaining };
    }

    // Reset if lockout expired
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
        await resetRateLimit();
    }

    return { locked: false, minutesRemaining: 0 };
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(): Promise<boolean> {
    const data = await getRateLimitData();

    // Reset if first attempt was more than lockout duration ago
    const timeSinceFirst = Date.now() - data.firstAttempt;
    if (timeSinceFirst > LOCKOUT_DURATION_MS) {
        data.attempts = 0;
        data.firstAttempt = Date.now();
    }

    data.attempts += 1;

    if (data.attempts >= MAX_ATTEMPTS) {
        data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        await setRateLimitData(data);
        return true;
    }

    await setRateLimitData(data);
    return false;
}

/**
 * Reset rate limit after successful login
 */
export async function resetRateLimit(): Promise<void> {
    try {
        await AsyncStorage.removeItem(RATE_LIMIT_KEY);
    } catch (e) {
        // Ignore errors
    }
}

/**
 * Get remaining attempts before lockout
 */
export async function getRemainingAttempts(): Promise<number> {
    const data = await getRateLimitData();
    return Math.max(0, MAX_ATTEMPTS - data.attempts);
}

export const RATE_LIMIT_CONFIG = {
    maxAttempts: MAX_ATTEMPTS,
    lockoutMinutes: LOCKOUT_DURATION_MS / (60 * 1000),
};
