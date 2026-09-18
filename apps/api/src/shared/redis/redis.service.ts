// apps/api/src/shared/redis/redis.service.ts
// Thin wrapper over the ioredis client — used today for refresh-token
// storage and the resolved-permission-set cache (see platform/auth). Any
// future module needing Redis (rate limiting, other caches) injects this
// same service rather than creating its own client.
import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import type { Redis } from "ioredis";
import { REDIS_CLIENT } from "./redis.constants.js";

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  set(key: string, value: string, ttlSeconds?: number): Promise<"OK"> {
    if (ttlSeconds !== undefined) {
      return this.client.set(key, value, "EX", ttlSeconds);
    }
    return this.client.set(key, value);
  }

  del(key: string): Promise<number> {
    return this.client.del(key);
  }

  ping(): Promise<string> {
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
