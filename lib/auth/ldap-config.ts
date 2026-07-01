export type AuthMode = "LOCAL" | "LDAP" | "HYBRID";

export type LdapConfig = {
  authMode: AuthMode;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  displayNameAttribute: string;
  emailAttribute: string;
  enabled: boolean;
  idAttribute: string;
  tlsRejectUnauthorized: boolean;
  url: string;
  userFilter: string;
};

type LdapEnv = Record<string, string | undefined>;

function normalizeAuthMode(value: string | undefined): AuthMode {
  const mode = String(value || "HYBRID").trim().toUpperCase();
  return mode === "LOCAL" || mode === "LDAP" || mode === "HYBRID" ? mode : "HYBRID";
}

function boolValue(value: string | undefined, fallback: boolean) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

export function parseLdapConfig(env: LdapEnv = process.env): LdapConfig {
  return {
    authMode: normalizeAuthMode(env.AUTH_MODE),
    baseDn: String(env.LDAP_BASE_DN || ""),
    bindDn: String(env.LDAP_BIND_DN || ""),
    bindPassword: String(env.LDAP_BIND_PASSWORD || ""),
    displayNameAttribute: String(env.LDAP_DISPLAY_NAME_ATTRIBUTE || "displayName"),
    emailAttribute: String(env.LDAP_EMAIL_ATTRIBUTE || "mail"),
    enabled: boolValue(env.LDAP_ENABLED, false),
    idAttribute: String(env.LDAP_ID_ATTRIBUTE || "objectGUID"),
    tlsRejectUnauthorized: boolValue(env.LDAP_TLS_REJECT_UNAUTHORIZED, true),
    url: String(env.LDAP_URL || ""),
    userFilter: String(env.LDAP_USER_FILTER || "(sAMAccountName={{username}})"),
  };
}

export function assertLdapConfigReady(config: LdapConfig) {
  const missing = [
    ["LDAP_URL", config.url],
    ["LDAP_BIND_DN", config.bindDn],
    ["LDAP_BIND_PASSWORD", config.bindPassword],
    ["LDAP_BASE_DN", config.baseDn],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`LDAP configuration is missing: ${missing.map(([key]) => key).join(", ")}`);
  }
}
