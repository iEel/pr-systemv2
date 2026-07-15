import crypto from "node:crypto";
import { readConfiguredSecret } from "./auth/secret";

type ConfirmationContext = {
  categoryId: string;
  categoryIsActive: boolean;
  categoryUpdatedAt: Date | string;
  scheduleIds: string[];
};

type ConfirmationInput = ConfirmationContext & { now?: Date; ttlMs?: number };

type ConfirmationPayload = {
  categoryId: string;
  categoryIsActive: true;
  categoryUpdatedAt: string;
  expiresAt: number;
  scheduleIdsFingerprint: string;
  version: 2;
};

type SecretEnvironment = Record<string, string | undefined>;

const defaultTtlMs = 5 * 60 * 1000;

function scheduleIdsFingerprint(scheduleIds: string[]) {
  return crypto.createHash("sha256").update(JSON.stringify([...scheduleIds].sort())).digest("base64url");
}

function categoryUpdatedAtIso(value: Date | string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Category revision is invalid");
  }

  return date.toISOString();
}

function signatureMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function requireConfirmationSecret(getSecret: () => string | undefined) {
  const secret = readConfiguredSecret(getSecret());

  if (!secret) {
    throw new Error("CATEGORY_DEACTIVATION_CONFIRMATION_SECRET or AUTH_SECRET must be configured before category deactivation");
  }

  return secret;
}

export function resolveCategoryDeactivationConfirmationSecret(environment: SecretEnvironment = process.env) {
  return readConfiguredSecret(environment.CATEGORY_DEACTIVATION_CONFIRMATION_SECRET)
    || readConfiguredSecret(environment.AUTH_SECRET);
}

export function createCategoryDeactivationConfirmationService({
  getSecret = () => resolveCategoryDeactivationConfirmationSecret(),
}: {
  getSecret?: () => string | undefined;
} = {}) {
  function sign(encodedPayload: string) {
    return crypto.createHmac("sha256", requireConfirmationSecret(getSecret)).update(encodedPayload).digest("base64url");
  }

  function create({ categoryId, categoryIsActive, categoryUpdatedAt, scheduleIds, now = new Date(), ttlMs = defaultTtlMs }: ConfirmationInput) {
    if (!categoryIsActive) {
      throw new Error("An inactive category cannot be confirmed for deactivation");
    }

    const payload: ConfirmationPayload = {
      categoryId,
      categoryIsActive: true,
      categoryUpdatedAt: categoryUpdatedAtIso(categoryUpdatedAt),
      expiresAt: now.getTime() + ttlMs,
      scheduleIdsFingerprint: scheduleIdsFingerprint(scheduleIds),
      version: 2,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

    return `${encodedPayload}.${sign(encodedPayload)}`;
  }

  function verify({ categoryId, categoryIsActive, categoryUpdatedAt, scheduleIds, token, now = new Date() }: ConfirmationContext & { token: string; now?: Date }) {
    const [encodedPayload, signature, extra] = token.split(".");

    if (!categoryIsActive || !encodedPayload || !signature || extra || !signatureMatches(signature, sign(encodedPayload))) return false;

    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<ConfirmationPayload>;

      return payload.version === 2
        && payload.categoryId === categoryId
        && payload.categoryIsActive === true
        && payload.categoryUpdatedAt === categoryUpdatedAtIso(categoryUpdatedAt)
        && typeof payload.expiresAt === "number"
        && payload.expiresAt > now.getTime()
        && payload.scheduleIdsFingerprint === scheduleIdsFingerprint(scheduleIds);
    } catch {
      return false;
    }
  }

  return { create, verify };
}

const confirmations = createCategoryDeactivationConfirmationService();

export function createCategoryDeactivationConfirmation(input: ConfirmationInput) {
  return confirmations.create(input);
}

export function verifyCategoryDeactivationConfirmation(input: ConfirmationContext & { token: string; now?: Date }) {
  return confirmations.verify(input);
}
