import { getCarboneConfig } from "./carbone-config";

export type RenderCarboneTemplateInput = {
  data: unknown;
  template: Buffer;
  convertTo?: "pdf" | "docx" | "xlsx";
};

export type CarboneRenderErrorCode = "CARBONE_CONFIG" | "CARBONE_HTTP" | "CARBONE_NETWORK" | "CARBONE_TIMEOUT";

export class CarboneRenderError extends Error {
  code: CarboneRenderErrorCode;
  detail?: string;
  status?: number;

  constructor(message: string, { code, detail, status }: { code: CarboneRenderErrorCode; detail?: string; status?: number }) {
    super(message);
    this.name = "CarboneRenderError";
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function renderCarboneTemplate({ data, template, convertTo = "pdf" }: RenderCarboneTemplateInput) {
  let config: ReturnType<typeof getCarboneConfig>;

  try {
    config = getCarboneConfig();
  } catch (error) {
    throw new CarboneRenderError("Carbone render service is not configured", {
      code: "CARBONE_CONFIG",
      detail: error instanceof Error ? error.message : undefined,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.url}/render/template?download=true`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "carbone-version": config.version,
      },
      body: JSON.stringify({
        convertTo,
        data,
        template: template.toString("base64"),
      }),
      signal: controller.signal,
    });

    const output = Buffer.from(await response.arrayBuffer());

    if (!response.ok) {
      throw new CarboneRenderError(`Carbone render failed with HTTP ${response.status}`, {
        code: "CARBONE_HTTP",
        detail: output.toString("utf8").slice(0, 1000),
        status: response.status,
      });
    }

    return {
      contentType: response.headers.get("content-type") || "application/octet-stream",
      output,
    };
  } catch (error) {
    if (error instanceof CarboneRenderError) throw error;

    if (isAbortError(error)) {
      throw new CarboneRenderError("Carbone render timed out", {
        code: "CARBONE_TIMEOUT",
      });
    }

    throw new CarboneRenderError("Carbone render service is unavailable", {
      code: "CARBONE_NETWORK",
      detail: error instanceof Error ? error.message : undefined,
    });
  } finally {
    clearTimeout(timeout);
  }
}
