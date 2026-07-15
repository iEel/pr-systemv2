import { describe, expect, test } from "vitest";
import {
  createCategoryDeactivationConfirmationService,
  resolveCategoryDeactivationConfirmationSecret,
} from "../lib/category-deactivation-confirmation.server";

const category = {
  categoryId: "cat_hardware",
  categoryIsActive: true,
  categoryUpdatedAt: new Date("2026-07-15T06:00:00.000Z"),
  scheduleIds: ["schedule_b", "schedule_a"],
};

describe("category deactivation confirmations", () => {
  test("uses the dedicated secret before the established Auth.js secret", () => {
    expect(resolveCategoryDeactivationConfirmationSecret({
      AUTH_SECRET: "auth-secret-for-tests",
      CATEGORY_DEACTIVATION_CONFIRMATION_SECRET: "category-secret-for-tests",
    })).toBe("category-secret-for-tests");
    expect(resolveCategoryDeactivationConfirmationSecret({ AUTH_SECRET: "auth-secret-for-tests" })).toBe("auth-secret-for-tests");
  });

  test.each([
    ["production", { NODE_ENV: "production" }],
    ["missing", {}],
    ["blank", { AUTH_SECRET: "   ", CATEGORY_DEACTIVATION_CONFIRMATION_SECRET: "" }],
  ])("fails closed when the %s environment has no configured signing secret", (_label, env) => {
    const confirmations = createCategoryDeactivationConfirmationService({
      getSecret: () => resolveCategoryDeactivationConfirmationSecret(env),
    });

    expect(() => confirmations.create(category)).toThrow("CATEGORY_DEACTIVATION_CONFIRMATION_SECRET");
  });

  test("binds an injected signer to category active state, revision, sorted schedules, and expiry", () => {
    const confirmations = createCategoryDeactivationConfirmationService({ getSecret: () => "unit-test-secret" });
    const token = confirmations.create({ ...category, now: new Date("2026-07-15T07:00:00.000Z") });

    expect(confirmations.verify({ ...category, scheduleIds: ["schedule_a", "schedule_b"], token, now: new Date("2026-07-15T07:01:00.000Z") })).toBe(true);
    expect(confirmations.verify({ ...category, categoryIsActive: false, token })).toBe(false);
    expect(confirmations.verify({ ...category, categoryUpdatedAt: new Date("2026-07-15T06:00:00.001Z"), token })).toBe(false);
    expect(confirmations.verify({ ...category, scheduleIds: ["schedule_a"], token })).toBe(false);
    expect(confirmations.verify({ ...category, token, now: new Date("2026-07-15T07:06:00.000Z") })).toBe(false);
  });
});
