import crypto from "node:crypto";

type ConfirmationInput = { categoryId: string; scheduleIds: string[]; now?: Date; ttlMs?: number };

type ConfirmationPayload = { categoryId: string; expiresAt: number; fingerprint: string; version: 1 };

const defaultTtlMs = 5 * 60 * 1000;
const confirmationSecret = process.env.AUTH_SECRET || "dev-only-it-pr-dms-auth-secret-change-before-production";

function fingerprint(categoryId: string, scheduleIds: string[]) {
  return crypto.createHash("sha256").update(JSON.stringify({ categoryId, scheduleIds: [...scheduleIds].sort() })).digest("base64url");
}

function sign(encodedPayload: string) {
  return crypto.createHmac("sha256", confirmationSecret).update(encodedPayload).digest("base64url");
}

function signatureMatches(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createCategoryDeactivationConfirmation({ categoryId, scheduleIds, now = new Date(), ttlMs = defaultTtlMs }: ConfirmationInput) {
  const payload: ConfirmationPayload = {
    categoryId,
    expiresAt: now.getTime() + ttlMs,
    fingerprint: fingerprint(categoryId, scheduleIds),
    version: 1,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyCategoryDeactivationConfirmation({ categoryId, scheduleIds, token, now = new Date() }: ConfirmationInput & { token: string }) {
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra || !signatureMatches(signature, sign(encodedPayload))) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<ConfirmationPayload>;
    return payload.version === 1 &&
      payload.categoryId === categoryId &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > now.getTime() &&
      payload.fingerprint === fingerprint(categoryId, scheduleIds);
  } catch {
    return false;
  }
}
