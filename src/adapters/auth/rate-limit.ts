const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface Attempt {
  count: number;
  windowStart: number;
}

/**
 * Per-process in-memory fixed-window limiter on failed logins, keyed by
 * username. Resets on success. Single admin, single process in local mode
 * - this is enough to blunt casual brute-forcing without needing shared
 * state. In AWS mode it's a cheap extra layer on top of Cognito's own
 * throttling, not the only defense.
 */
export class LoginRateLimiter {
  private readonly attempts = new Map<string, Attempt>();

  isRateLimited(key: string): boolean {
    const attempt = this.attempts.get(key);
    if (!attempt) return false;
    if (Date.now() - attempt.windowStart > WINDOW_MS) {
      this.attempts.delete(key);
      return false;
    }
    return attempt.count >= MAX_ATTEMPTS;
  }

  recordFailure(key: string): void {
    const now = Date.now();
    const existing = this.attempts.get(key);
    if (!existing || now - existing.windowStart > WINDOW_MS) {
      this.attempts.set(key, { count: 1, windowStart: now });
      return;
    }
    existing.count += 1;
  }

  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }
}
