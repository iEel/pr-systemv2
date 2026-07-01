type CarboneEnv = Partial<Record<string, string | undefined>>;

export type CarboneConfig = {
  url: string;
  version: string;
  converter: string;
  timeoutMs: number;
};

export function getCarboneConfig(env: CarboneEnv = process.env): CarboneConfig {
  const url = env.CARBONE_URL?.trim();

  if (!url) {
    throw new Error("Missing CARBONE_URL");
  }

  return {
    url: url.replace(/\/+$/, ""),
    version: env.CARBONE_VERSION?.trim() || "5",
    converter: env.CARBONE_CONVERTER?.trim() || "L",
    timeoutMs: Number(env.CARBONE_TIMEOUT_MS || 60000),
  };
}

export function redactCarboneConfig(config: CarboneConfig): CarboneConfig {
  return {
    ...config,
    url: config.url ? "<set>" : "",
  };
}
