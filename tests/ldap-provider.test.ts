import { describe, expect, test } from "vitest";
import { findLdapUser, verifyLdapUserPassword, type LdapClientLike } from "../lib/auth/ldap-provider";
import type { LdapConfig } from "../lib/auth/ldap-config";

type SearchCall = {
  baseDn: Parameters<LdapClientLike["search"]>[0];
  options: Parameters<LdapClientLike["search"]>[1];
};

type FakeClientOptions = {
  bindCalls?: string[];
  bindError?: Error;
  entries?: Record<string, unknown>[];
  searchCalls?: SearchCall[];
  searchError?: Error;
  unbindCalls?: string[];
};

const config: LdapConfig = {
  authMode: "HYBRID",
  baseDn: "DC=example,DC=local",
  bindDn: "CN=ldap-reader,DC=example,DC=local",
  bindPassword: "service-secret",
  displayNameAttribute: "displayName",
  emailAttribute: "mail",
  enabled: true,
  idAttribute: "objectGUID",
  tlsRejectUnauthorized: true,
  url: "ldap://example.local:389",
  userFilter: "(sAMAccountName={{username}})",
};

const ldapEntry = {
  displayName: "Somchai S.",
  dn: "CN=Somchai S,OU=IT,DC=example,DC=local",
  mail: "somchai.s@example.local",
  objectGUID: Buffer.from([1, 2, 3, 4]),
  sAMAccountName: "somchai.s",
};

function fakeClient(options: FakeClientOptions = {}): LdapClientLike {
  const entries = options.entries ?? [];
  return {
    async bind(dn, password) {
      options.bindCalls?.push(`${dn}:${password}`);
      if (options.bindError) throw options.bindError;
    },
    async search(baseDn, searchOptions) {
      options.searchCalls?.push({ baseDn, options: searchOptions });
      if (options.searchError) throw options.searchError;
      return { searchEntries: entries, baseDn, options: searchOptions };
    },
    async unbind() {
      options.unbindCalls?.push("unbind");
    },
  };
}

describe("LDAP Search + Bind provider", () => {
  test("finds one LDAP user by short username", async () => {
    const bindCalls: string[] = [];
    const searchCalls: SearchCall[] = [];
    const unbindCalls: string[] = [];
    const result = await findLdapUser("somchai.s", config, () =>
      fakeClient({ bindCalls, entries: [ldapEntry], searchCalls, unbindCalls }),
    );

    expect(bindCalls).toEqual(["CN=ldap-reader,DC=example,DC=local:service-secret"]);
    expect(unbindCalls).toEqual(["unbind"]);
    expect(searchCalls).toHaveLength(1);
    expect(searchCalls[0]?.baseDn).toBe(config.baseDn);
    expect(searchCalls[0]?.options.filter).toBe("(sAMAccountName=somchai.s)");
    expect(searchCalls[0]?.options.scope).toBe("sub");
    expect(searchCalls[0]?.options.sizeLimit).toBe(2);
    expect(searchCalls[0]?.options.attributes).toEqual(
      expect.arrayContaining(["dn", "sAMAccountName", "objectGUID", "displayName", "mail"]),
    );
    expect(searchCalls[0]?.options.explicitBufferAttributes).toEqual(expect.arrayContaining(["objectGUID"]));
    expect(result).toEqual({
      displayName: "Somchai S.",
      dn: "CN=Somchai S,OU=IT,DC=example,DC=local",
      email: "somchai.s@example.local",
      externalId: "01020304",
      username: "somchai.s",
    });
  });

  test("uses the configured filter template with a normalized short username", async () => {
    const cnConfig: LdapConfig = {
      ...config,
      userFilter: "(cn={{username}})",
    };
    const searchCalls: SearchCall[] = [];

    await findLdapUser(" Somchai.S ", cnConfig, () =>
      fakeClient({
        entries: [ldapEntry],
        searchCalls,
      }),
    );

    expect(searchCalls[0]?.options.filter).toBe("(cn=somchai.s)");
  });

  test("replaces every username placeholder in the configured filter", async () => {
    const multiPlaceholderConfig: LdapConfig = {
      ...config,
      userFilter: "(|(sAMAccountName={{username}})(cn={{username}}))",
    };
    const searchCalls: SearchCall[] = [];

    await findLdapUser("somchai.s", multiPlaceholderConfig, () => fakeClient({ entries: [ldapEntry], searchCalls }));

    expect(searchCalls[0]?.options.filter).toBe("(|(sAMAccountName=somchai.s)(cn=somchai.s))");
  });

  test("throws before searching when the configured filter is missing the username placeholder", async () => {
    const malformedConfig: LdapConfig = {
      ...config,
      userFilter: "(sAMAccountName=somchai.s)",
    };
    let clientCreated = false;

    await expect(
      findLdapUser("somchai.s", malformedConfig, () => {
        clientCreated = true;
        return fakeClient({ entries: [ldapEntry] });
      }),
    ).rejects.toThrow("LDAP user filter must include {{username}}");
    expect(clientCreated).toBe(false);
  });

  test("rejects missing and ambiguous LDAP search results", async () => {
    await expect(findLdapUser("missing.u", config, () => fakeClient())).rejects.toThrow("LDAP user not found");
    await expect(
      findLdapUser("dup.u", config, () => fakeClient({ entries: [{ dn: "one" }, { dn: "two" }] })),
    ).rejects.toThrow("LDAP search returned multiple users");
  });

  test("unbinds when LDAP search throws", async () => {
    const unbindCalls: string[] = [];

    await expect(
      findLdapUser("somchai.s", config, () =>
        fakeClient({ entries: [ldapEntry], searchError: new Error("LDAP search failed"), unbindCalls }),
      ),
    ).rejects.toThrow("LDAP search failed");
    expect(unbindCalls).toEqual(["unbind"]);
  });

  test("rejects missing DN or external identity and unbinds", async () => {
    const missingDnUnbindCalls: string[] = [];
    const missingExternalIdUnbindCalls: string[] = [];

    await expect(
      findLdapUser("somchai.s", config, () =>
        fakeClient({
          entries: [{ ...ldapEntry, dn: "" }],
          unbindCalls: missingDnUnbindCalls,
        }),
      ),
    ).rejects.toThrow("LDAP user result is missing DN or external identity");
    await expect(
      findLdapUser("somchai.s", config, () =>
        fakeClient({
          entries: [{ ...ldapEntry, objectGUID: "" }],
          unbindCalls: missingExternalIdUnbindCalls,
        }),
      ),
    ).rejects.toThrow("LDAP user result is missing DN or external identity");
    expect(missingDnUnbindCalls).toEqual(["unbind"]);
    expect(missingExternalIdUnbindCalls).toEqual(["unbind"]);
  });

  test("binds as the found DN with the submitted password", async () => {
    const bindCalls: string[] = [];
    const unbindCalls: string[] = [];
    const ok = await verifyLdapUserPassword("CN=Somchai S,DC=example,DC=local", "ad-password", config, () =>
      fakeClient({ bindCalls, unbindCalls }),
    );

    expect(ok).toBe(true);
    expect(bindCalls).toEqual(["CN=Somchai S,DC=example,DC=local:ad-password"]);
    expect(unbindCalls).toEqual(["unbind"]);
  });

  test("returns false and unbinds when password bind throws", async () => {
    const bindCalls: string[] = [];
    const unbindCalls: string[] = [];
    const ok = await verifyLdapUserPassword("CN=Somchai S,DC=example,DC=local", "bad-password", config, () =>
      fakeClient({ bindCalls, bindError: new Error("invalid credentials"), unbindCalls }),
    );

    expect(ok).toBe(false);
    expect(bindCalls).toEqual(["CN=Somchai S,DC=example,DC=local:bad-password"]);
    expect(unbindCalls).toEqual(["unbind"]);
  });

  test("returns false for empty password without creating a client", async () => {
    const ok = await verifyLdapUserPassword("CN=Somchai S,DC=example,DC=local", "", config, () => {
      throw new Error("client factory should not be called");
    });

    expect(ok).toBe(false);
  });
});
