/**
 * Idempotency Service
 * Prevents duplicate operations when ChatGPT retries requests.
 * Uses in-memory cache with 24-hour TTL.
 */

interface CacheEntry<T> {
  result: T;
  expiresAt: number;
}

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

class IdempotencyService {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Generate a unique key for idempotency tracking
   */
  generateKey(userId: string, prIdentifier: string, action: string): string {
    return `idempotency:${userId}:${prIdentifier}:${action}`;
  }

  /**
   * Check if a request has already been processed
   */
  isProcessed(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get the cached result for a processed request
   */
  getResult<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.result as T;
  }

  /**
   * Mark a request as processed and cache the result
   */
  markProcessed<T>(key: string, result: T): void {
    this.store.set(key, {
      result,
      expiresAt: Date.now() + IDEMPOTENCY_TTL,
    });
    console.log(`[Idempotency] Marked as processed: ${key}`);
  }
}

// Singleton instance
export const idempotencyService = new IdempotencyService();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of (idempotencyService as any).store.entries()) {
    if (now > entry.expiresAt) {
      (idempotencyService as any).store.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour
