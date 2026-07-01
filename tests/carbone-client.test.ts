import { afterEach, describe, expect, test, vi } from "vitest";
import { CarboneRenderError, renderCarboneTemplate } from "../lib/carbone-client";

describe("Carbone client hardening", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  test("returns rendered output when Carbone responds successfully", async () => {
    vi.stubEnv("CARBONE_URL", "http://carbone.local:4000");
    vi.stubEnv("CARBONE_TIMEOUT_MS", "60000");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(Buffer.from("%PDF"), { headers: { "content-type": "application/pdf" }, status: 200 })),
    );

    await expect(renderCarboneTemplate({ data: { ok: true }, template: Buffer.from("docx") })).resolves.toMatchObject({
      contentType: "application/pdf",
      output: Buffer.from("%PDF"),
    });
  });

  test("maps HTTP errors to safe Carbone errors without leaking response body", async () => {
    vi.stubEnv("CARBONE_URL", "http://carbone.local:4000");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("stack trace with internal details", { status: 500 })),
    );

    await expect(renderCarboneTemplate({ data: {}, template: Buffer.from("docx") })).rejects.toMatchObject({
      code: "CARBONE_HTTP",
      message: "Carbone render failed with HTTP 500",
      status: 500,
    });
    await expect(renderCarboneTemplate({ data: {}, template: Buffer.from("docx") })).rejects.not.toThrow("internal details");
  });

  test("maps timeout and network errors to operational error codes", async () => {
    vi.stubEnv("CARBONE_URL", "http://carbone.local:4000");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation was aborted.", "AbortError");
      }),
    );

    await expect(renderCarboneTemplate({ data: {}, template: Buffer.from("docx") })).rejects.toMatchObject({
      code: "CARBONE_TIMEOUT",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED carbone.local:4000");
      }),
    );

    await expect(renderCarboneTemplate({ data: {}, template: Buffer.from("docx") })).rejects.toMatchObject({
      code: "CARBONE_NETWORK",
    });
  });

  test("uses a typed error when Carbone is not configured", async () => {
    await expect(renderCarboneTemplate({ data: {}, template: Buffer.from("docx") })).rejects.toBeInstanceOf(CarboneRenderError);
    await expect(renderCarboneTemplate({ data: {}, template: Buffer.from("docx") })).rejects.toMatchObject({
      code: "CARBONE_CONFIG",
      message: "Carbone render service is not configured",
    });
  });
});
