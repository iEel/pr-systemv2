import { describe, expect, test } from "vitest";
import { hashPassword, verifyLocalCredentials } from "../lib/auth/local-provider";

describe("local credential provider", () => {
  test("rejects missing users", async () => {
    const result = await verifyLocalCredentials(
      { username: "missing", password: "secret" },
      {
        findUserByUsername: async () => null,
      },
    );

    expect(result).toBeNull();
  });

  test("rejects inactive users", async () => {
    const passwordHash = await hashPassword("secret");
    const result = await verifyLocalCredentials(
      { username: "admin", password: "secret" },
      {
        findUserByUsername: async () => ({
          displayName: "Admin User",
          email: "admin@example.local",
          id: "user_admin",
          isActive: false,
          passwordHash,
          role: "ADMIN",
          username: "admin",
        }),
      },
    );

    expect(result).toBeNull();
  });

  test("rejects invalid passwords", async () => {
    const passwordHash = await hashPassword("correct");
    const result = await verifyLocalCredentials(
      { username: "admin", password: "wrong" },
      {
        findUserByUsername: async () => ({
          displayName: "Admin User",
          email: "admin@example.local",
          id: "user_admin",
          isActive: true,
          passwordHash,
          role: "ADMIN",
          username: "admin",
        }),
      },
    );

    expect(result).toBeNull();
  });

  test("rejects local users without a password hash", async () => {
    const result = await verifyLocalCredentials(
      { username: "admin", password: "secret" },
      {
        findUserByUsername: async () => ({
          displayName: "Admin User",
          email: "admin@example.local",
          id: "user_admin",
          isActive: true,
          passwordHash: null,
          role: "ADMIN",
          username: "admin",
        }),
      },
    );

    expect(result).toBeNull();
  });

  test("returns active users with normalized role after valid credentials", async () => {
    const passwordHash = await hashPassword("secret");
    const result = await verifyLocalCredentials(
      { username: "admin", password: "secret" },
      {
        findUserByUsername: async () => ({
          displayName: "Admin User",
          email: "admin@example.local",
          id: "user_admin",
          isActive: true,
          passwordHash,
          role: "ADMIN",
          username: "admin",
        }),
      },
    );

    expect(result).toEqual({
      displayName: "Admin User",
      email: "admin@example.local",
      id: "user_admin",
      role: "ADMIN",
      username: "admin",
    });
  });
});
