type SqlServerEnv = Partial<Record<string, string | undefined>>;

const REQUIRED_KEYS = ["SQLSERVER_HOST", "SQLSERVER_DATABASE", "SQLSERVER_USER", "SQLSERVER_PASSWORD"] as const;

function encodeSqlServerValue(value: string) {
  return /[:\\=;\/\[\]{}]/.test(value) ? "{" + value.replaceAll("}", "}}") + "}" : value;
}

export function buildSqlServerUrl(env: SqlServerEnv) {
  const missing = REQUIRED_KEYS.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing SQL Server environment variable(s): ${missing.join(", ")}`);
  }

  const host = env.SQLSERVER_HOST!;
  const endpoint = env.SQLSERVER_INSTANCE ? `${host}\\${env.SQLSERVER_INSTANCE}` : `${host}${env.SQLSERVER_PORT ? `:${env.SQLSERVER_PORT}` : ""}`;
  const trustCert = env.SQLSERVER_TRUST_CERT === "false" ? "false" : "true";

  return [
    `sqlserver://${endpoint}`,
    `database=${encodeSqlServerValue(env.SQLSERVER_DATABASE!)}`,
    `user=${encodeSqlServerValue(env.SQLSERVER_USER!)}`,
    `password=${encodeSqlServerValue(env.SQLSERVER_PASSWORD!)}`,
    "encrypt=true",
    `trustServerCertificate=${trustCert}`,
    "schema=dbo",
  ].join(";");
}

export function resolveDatabaseUrl(env: SqlServerEnv = process.env) {
  const hasSqlServerValues = REQUIRED_KEYS.every((key) => env[key]);

  return hasSqlServerValues ? buildSqlServerUrl(env) : env.DATABASE_URL || buildSqlServerUrl(env);
}

export function redactDatabaseUrl(url: string) {
  return url
    .replace(/([;]user=)[^;]*/i, "$1<redacted>")
    .replace(/([;]password=)[^;]*/i, "$1<redacted>");
}
