import { describe, expect, test } from "vitest";
import { getPrismaClient } from "../lib/prisma";

describe("Prisma client wrapper", () => {
  test("reuses the same Prisma client instance in one process", () => {
    expect(getPrismaClient()).toBe(getPrismaClient());
  });
});
