/**
 * A tiny in-memory cache: remembers results for a while so repeat searches
 * don't use up our free Adzuna / O*NET calls.
 *
 * It resets whenever the server restarts, which is fine for this purpose.
 */
export class TtlCache<T> {
  private entries = new Map<string, { value: T; expires: number }>()
  private readonly ttlMs: number
  private readonly maxEntries: number
  private readonly now: () => number

  constructor(ttlMs: number, maxEntries = 200, now: () => number = Date.now) {
    this.ttlMs = ttlMs
    this.maxEntries = maxEntries
    this.now = now
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expires <= this.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    // Forget the oldest entry when full (a Map remembers insertion order).
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    this.entries.set(key, { value, expires: this.now() + this.ttlMs })
  }
}
