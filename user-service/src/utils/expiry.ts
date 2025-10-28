/**
 * Parse expiry string (e.g., "1h", "30d", "5s") to milliseconds
 * @param expiry - Expiry string in format: number + unit (s|m|h|d)
 * @param defaultMs - Default value in milliseconds if parsing fails
 * @returns Expiry time in milliseconds
 */
export function parseExpiry(
  expiry: string,
  defaultMs: number = 30 * 24 * 60 * 60 * 1000
): number {
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return defaultMs;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return defaultMs;
  }
}
