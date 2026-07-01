import { describe, expect, test } from "vitest";
import { getCarboneConfig, redactCarboneConfig } from "../lib/carbone-config";

describe("Carbone config", () => {
  test("reads Carbone settings with safe defaults", () => {
    expect(
      getCarboneConfig({
        CARBONE_URL: "http://carbone.local:4000",
        CARBONE_VERSION: "5",
        CARBONE_CONVERTER: "L",
        CARBONE_TIMEOUT_MS: "60000",
      }),
    ).toEqual({
      url: "http://carbone.local:4000",
      version: "5",
      converter: "L",
      timeoutMs: 60000,
    });
  });

  test("rejects missing Carbone URL", () => {
    expect(() => getCarboneConfig({})).toThrow("Missing CARBONE_URL");
  });

  test("redacts the URL before logging config", () => {
    expect(redactCarboneConfig({ url: "http://secret.local:4000", version: "5", converter: "L", timeoutMs: 60000 })).toEqual({
      url: "<set>",
      version: "5",
      converter: "L",
      timeoutMs: 60000,
    });
  });
});
