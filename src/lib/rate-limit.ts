/**
 * Fixed-window rate limiter kept in memory. It is per server instance, so with several instances
 * the effective limit is higher; it is a guard against runaway clients, not a quota.
 */
const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || now - entry.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    // Keep the map small: drop expired windows now and then
    if (windows.size > 5000) for (const [k, v] of windows) if (now - v.start >= windowMs) windows.delete(k);
    return { ok: true };
  }
  if (entry.count >= limit) return { ok: false, retryAfter: Math.ceil((entry.start + windowMs - now) / 1000) };
  entry.count += 1;
  return { ok: true };
}
