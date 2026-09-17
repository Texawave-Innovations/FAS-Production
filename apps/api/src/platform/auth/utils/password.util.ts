// apps/api/src/platform/auth/utils/password.util.ts
// argon2id with the library's default cost parameters (memoryCost 64 MiB,
// timeCost 3, parallelism 4) — deliberately not tuned per-deploy here;
// revisit only if a real throughput/latency issue shows up in production.
import * as argon2 from "argon2";

export function hashPassword(plainTextPassword: string): Promise<string> {
  return argon2.hash(plainTextPassword, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plainTextPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainTextPassword);
  } catch {
    // argon2.verify throws on a malformed/foreign hash rather than
    // returning false — treat that the same as "wrong password".
    return false;
  }
}
