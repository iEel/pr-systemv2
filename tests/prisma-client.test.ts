import { Prisma } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { getPrismaClient } from "../lib/prisma";

describe("Prisma client wrapper", () => {
  test("reuses the same Prisma client instance in one process", () => {
    expect(getPrismaClient()).toBe(getPrismaClient());
  });

  test("exposes the PR category delegate and nullable PR category relation", () => {
    const purchaseRequest = Prisma.dmmf.datamodel.models.find((model) => model.name === "PurchaseRequest");

    expect(getPrismaClient().purchaseRequestCategory.findMany).toBeTypeOf("function");
    expect(purchaseRequest?.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "scalar", isRequired: false, name: "categoryId", type: "String" }),
        expect.objectContaining({ kind: "object", isRequired: false, name: "category", type: "PurchaseRequestCategory" }),
      ]),
    );
  });
});
