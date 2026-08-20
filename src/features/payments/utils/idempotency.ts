/**
 * Generates a UUID v4 idempotency key for charge submission.
 * Each call produces a unique key to prevent duplicate charges.
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
