import { UnauthorizedException } from "@nestjs/common";
import { vi } from "vitest";
import { AuthService } from "./auth.service.js";

vi.mock("./utils/password.util.js", () => ({
  verifyPassword: vi.fn(),
}));

import { verifyPassword } from "./utils/password.util.js";

const mockUser = {
  id: 1,
  organizationId: 1,
  email: "admin@fas-demo.local",
  passwordHash: "hashed",
  firstName: "FAS",
  lastName: "Admin",
  isActive: true,
  userRoles: [{ roleId: 10 }],
  plantAccess: [{ plantId: 20 }],
};

function buildService() {
  const authRepository = {
    findActiveUserByEmail: vi.fn(),
    findActiveUserById: vi.fn(),
    findPermissionCodesForRole: vi.fn().mockResolvedValue(["platform.user.manage"]),
  };
  const jwtService = {
    signAsync: vi.fn().mockResolvedValue("signed-token"),
    verifyAsync: vi.fn(),
  };
  const appConfig = {
    jwt: {
      accessSecret: "access-secret",
      accessExpiresIn: "15m",
      refreshSecret: "refresh-secret",
      refreshExpiresIn: "7d",
    },
  };
  const redisService = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  const service = new AuthService(
    authRepository as never,
    jwtService as never,
    appConfig as never,
    redisService as never,
  );
  return { service, authRepository, jwtService, redisService };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("rejects with a generic error when the user does not exist", async () => {
      const { service, authRepository } = buildService();
      authRepository.findActiveUserByEmail.mockResolvedValue(null);

      await expect(service.login("nobody@fas-demo.local", "whatever")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejects with the same generic error when the password is wrong", async () => {
      const { service, authRepository } = buildService();
      authRepository.findActiveUserByEmail.mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      await expect(service.login(mockUser.email, "wrong-password")).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("issues a token pair and caches the role permission set on success", async () => {
      const { service, authRepository, redisService } = buildService();
      authRepository.findActiveUserByEmail.mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(true);

      const result = await service.login(mockUser.email, "correct-password");

      expect(result.accessToken).toBe("signed-token");
      expect(result.user).toMatchObject({ id: 1, roleId: 10, activePlantId: 20 });
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:1:/),
        "1",
        expect.any(Number),
      );
      expect(redisService.set).toHaveBeenCalledWith(
        "permissions:1",
        JSON.stringify(["platform.user.manage"]),
        expect.any(Number),
      );
    });
  });

  describe("refresh", () => {
    it("rejects when no refresh token is provided", async () => {
      const { service } = buildService();
      await expect(service.refresh(undefined)).rejects.toThrow("Missing refresh token");
    });

    it("rejects when the refresh token fails verification", async () => {
      const { service, jwtService } = buildService();
      jwtService.verifyAsync.mockRejectedValue(new Error("bad signature"));

      await expect(service.refresh("garbage")).rejects.toThrow("Invalid or expired refresh token");
    });

    it("rejects a replayed token whose Redis key was already rotated away", async () => {
      const { service, jwtService, redisService } = buildService();
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: "old-jti" });
      redisService.get.mockResolvedValue(null); // already rotated/revoked

      await expect(service.refresh("stale-token")).rejects.toThrow(
        "Refresh token has been revoked",
      );
    });

    it("rotates on use: deletes the old key before issuing a new pair", async () => {
      const { service, jwtService, redisService, authRepository } = buildService();
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: "old-jti" });
      redisService.get.mockResolvedValue("1");
      authRepository.findActiveUserById.mockResolvedValue(mockUser);

      const result = await service.refresh("valid-refresh-token");

      expect(redisService.del).toHaveBeenCalledWith("refresh:1:old-jti");
      expect(result.accessToken).toBe("signed-token");
      // The old key must be gone before the new one is written.
      const delOrder = redisService.del.mock.invocationCallOrder[0]!;
      const setOrder = redisService.set.mock.invocationCallOrder[0]!;
      expect(delOrder).toBeLessThan(setOrder);
    });

    it("rejects when the user backing the token is no longer active", async () => {
      const { service, jwtService, redisService, authRepository } = buildService();
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: "old-jti" });
      redisService.get.mockResolvedValue("1");
      authRepository.findActiveUserById.mockResolvedValue(null);

      await expect(service.refresh("valid-refresh-token")).rejects.toThrow(
        "User is no longer active",
      );
    });
  });

  describe("logout", () => {
    it("is a no-op when no refresh token is present", async () => {
      const { service, redisService } = buildService();
      await service.logout(undefined);
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it("revokes the refresh key and the cached permission set", async () => {
      const { service, jwtService, redisService } = buildService();
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, jti: "jti-1" });

      await service.logout("a-valid-refresh-token");

      expect(redisService.del).toHaveBeenCalledWith("refresh:1:jti-1");
      expect(redisService.del).toHaveBeenCalledWith("permissions:1");
    });

    it("does not throw when the token is already invalid/expired", async () => {
      const { service, jwtService } = buildService();
      jwtService.verifyAsync.mockRejectedValue(new Error("expired"));

      await expect(service.logout("expired-token")).resolves.toBeUndefined();
    });
  });
});
