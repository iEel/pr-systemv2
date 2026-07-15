import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("seed data", () => {
  test("keeps explicit seed ids within the SQL Server id column length", () => {
    const source = readFileSync("prisma/seed.mjs", "utf8");
    const explicitIds = [...source.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]);
    const tooLong = explicitIds.filter((id) => id.length > 30);

    expect(tooLong).toEqual([]);
  });

  test("seeds the approved PR category codes", () => {
    const source = readFileSync("prisma/seed.mjs", "utf8");

    for (const code of ["HARDWARE", "SOFTWARE_LICENSE", "SUBSCRIPTION_RENEWAL", "SERVICE_MAINTENANCE", "NETWORK_INFRASTRUCTURE", "CLOUD_HOSTING", "OTHER"]) {
      expect(source).toContain(code);
    }
  });
});
