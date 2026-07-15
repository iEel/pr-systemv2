import { describe, expect, test } from "vitest";
import { requireAuthSecret } from "../lib/auth/secret";

describe("Auth.js signing secret", () => {
  test.each([
    ["blank", "   "],
    ["public placeholder", "CHANGE_ME_GENERATE_A_LONG_RANDOM_SECRET"],
    ["whitespace and lowercase placeholder", "  change_me_generate_a_long_random_secret  "],
    ["generic public placeholder", "change_me"],
  ])("rejects a %s AUTH_SECRET", (_label, value) => {
    expect(() => requireAuthSecret({ AUTH_SECRET: value })).toThrow("AUTH_SECRET must be configured");
  });
});
