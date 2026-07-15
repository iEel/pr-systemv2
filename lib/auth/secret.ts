type SecretEnvironment = Record<string, string | undefined>;

export function readConfiguredSecret(value: string | undefined) {
  const secret = value?.trim();

  return secret || undefined;
}

export function requireAuthSecret(environment: SecretEnvironment = process.env) {
  const secret = readConfiguredSecret(environment.AUTH_SECRET);

  if (!secret) {
    throw new Error("AUTH_SECRET must be configured before starting the application");
  }

  return secret;
}
