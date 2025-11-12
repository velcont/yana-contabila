/**
 * Client-side rate limiter utility
 * Prevents abuse and excessive API calls
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get existing requests for this key
    let timestamps = this.requests.get(key) || [];
    
    // Filter out old requests outside the window
    timestamps = timestamps.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (timestamps.length >= config.maxRequests) {
      return false;
    }
    
    // Add current request
    timestamps.push(now);
    this.requests.set(key, timestamps);
    
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter(time => time > now - 3600000); // 1 hour
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup old entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
}

export const RATE_LIMITS = {
  CHAT_MESSAGE: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  FILE_UPLOAD: { maxRequests: 10, windowMs: 300000 }, // 10 per 5 minutes
  STRATEGIC_ADVISOR: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
} as const;
