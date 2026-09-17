// apps/api/src/shared/utils/duration.util.ts
// Parses JWT-style duration strings ("15m", "7d") into seconds — used to set
// Redis TTLs and cookie maxAge from the same config value the token was
// signed with, so they can never drift out of sync.
const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d|w)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${value}" (expected a format like "15m" or "7d")`);
  }
  const amount = match[1]!;
  const unit = match[2]!;
  return Number(amount) * UNIT_SECONDS[unit]!;
}
