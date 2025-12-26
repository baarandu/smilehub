/**
 * Rate Limiter for Login Attempts
 * Prevents brute force attacks by limiting failed login attempts
 */

const RATE_LIMIT_KEY = 'login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface RateLimitData {
    attempts: number;
    firstAttempt: number;
    lockedUntil: number | null;
}

function getRateLimitData(): RateLimitData {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        // If localStorage fails, allow login
    }
    return { attempts: 0, firstAttempt: Date.now(), lockedUntil: null };
}

function setRateLimitData(data: RateLimitData): void {
    try {
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    } catch (e) {
        // If localStorage fails, continue without rate limiting
    }
}

/**
 * Check if user is currently locked out
 * @returns null if not locked, or the remaining lockout time in minutes
 */
export function checkRateLimit(): { locked: boolean; minutesRemaining: number } {
    const data = getRateLimitData();

    if (data.lockedUntil && Date.now() < data.lockedUntil) {
        const minutesRemaining = Math.ceil((data.lockedUntil - Date.now()) / (60 * 1000));
        return { locked: true, minutesRemaining };
    }

    // Reset if lockout expired
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
        resetRateLimit();
    }

    return { locked: false, minutesRemaining: 0 };
}

/**
 * Record a failed login attempt
 * @returns true if user should be locked out after this attempt
 */
export function recordFailedAttempt(): boolean {
    const data = getRateLimitData();

    // Reset if first attempt was more than lockout duration ago
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

/**
 * Reset rate limit after successful login
 */
export function resetRateLimit(): void {
    try {
        localStorage.removeItem(RATE_LIMIT_KEY);
    } catch (e) {
        // Ignore errors
    }
}

/**
 * Get remaining attempts before lockout
 */
export function getRemainingAttempts(): number {
    const data = getRateLimitData();
    return Math.max(0, MAX_ATTEMPTS - data.attempts);
}

/**
 * Constants for display
 */
export const RATE_LIMIT_CONFIG = {
    maxAttempts: MAX_ATTEMPTS,
    lockoutMinutes: LOCKOUT_DURATION_MS / (60 * 1000),
};
