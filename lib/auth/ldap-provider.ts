import { Client, type SearchOptions } from "ldapts";
import { assertLdapConfigReady, type LdapConfig } from "./ldap-config";
import { escapeLdapFilterValue, normalizeShortUsername, valueToStableString } from "./ldap-utils";

export type LdapClientLike = {
  bind(dn: string, password: string): Promise<void>;
  search(baseDn: string, options: SearchOptions): Promise<{ searchEntries: Record<string, unknown>[] }>;
  unbind(): Promise<void>;
};

export type LdapUserProfile = {
  displayName: string;
  dn: string;
  email: string | null;
  externalId: string;
  username: string;
};

export function createLdapClient(config: LdapConfig): LdapClientLike {
  return new Client({
    tlsOptions: { rejectUnauthorized: config.tlsRejectUnauthorized },
    url: config.url,
  });
}

function buildUserSearchFilter(userFilter: string, username: string) {
  const usernamePlaceholder = "{{username}}";

  if (!userFilter.includes(usernamePlaceholder)) {
    throw new Error("LDAP user filter must include {{username}}");
  }

  return userFilter.split(usernamePlaceholder).join(escapeLdapFilterValue(username));
}

export async function findLdapUser(
  usernameInput: string,
  config: LdapConfig,
  clientFactory: (config: LdapConfig) => LdapClientLike = createLdapClient,
): Promise<LdapUserProfile> {
  assertLdapConfigReady(config);

  const username = normalizeShortUsername(usernameInput);
  const filter = buildUserSearchFilter(config.userFilter, username);
  const client = clientFactory(config);

  try {
    await client.bind(config.bindDn, config.bindPassword);
    const result = await client.search(config.baseDn, {
      attributes: ["dn", "sAMAccountName", config.idAttribute, config.displayNameAttribute, config.emailAttribute],
      explicitBufferAttributes: [config.idAttribute],
      filter,
      scope: "sub",
      sizeLimit: 2,
    });

    if (result.searchEntries.length === 0) {
      throw new Error("LDAP user not found");
    }

    if (result.searchEntries.length > 1) {
      throw new Error("LDAP search returned multiple users");
    }

    const entry = result.searchEntries[0];
    const dn = valueToStableString(entry.dn);
    const externalId = valueToStableString(entry[config.idAttribute]);

    if (!dn || !externalId) {
      throw new Error("LDAP user result is missing DN or external identity");
    }

    return {
      displayName: valueToStableString(entry[config.displayNameAttribute]) || username,
      dn,
      email: valueToStableString(entry[config.emailAttribute]) || null,
      externalId,
      username,
    };
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

export async function verifyLdapUserPassword(
  dn: string,
  password: string,
  config: LdapConfig,
  clientFactory: (config: LdapConfig) => LdapClientLike = createLdapClient,
): Promise<boolean> {
  assertLdapConfigReady(config);

  if (!password) return false;

  const client = clientFactory(config);

  try {
    await client.bind(dn, password);
    return true;
  } catch {
    return false;
  } finally {
    await client.unbind().catch(() => undefined);
  }
}
