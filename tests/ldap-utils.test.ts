import { describe, expect, test } from "vitest";
import {
  escapeLdapFilterValue,
  normalizeShortUsername,
  tryNormalizeShortUsername,
  valueToStableString,
} from "../lib/auth/ldap-utils";
import { assertLdapConfigReady, parseLdapConfig } from "../lib/auth/ldap-config";

describe("LDAP utilities", () => {
  test("normalizes allowed short usernames", () => {
    expect(normalizeShortUsername(" Somchai.S ")).toBe("somchai.s");
    expect(normalizeShortUsername("it-user_01")).toBe("it-user_01");
  });

  test("rejects email, domain, spaces, and LDAP filter characters", () => {
    expect(() => normalizeShortUsername("somchai.s@example.local")).toThrow("Short username is required");
    expect(() => normalizeShortUsername("DOMAIN\\somchai.s")).toThrow("Short username is required");
    expect(() => normalizeShortUsername("somchai s")).toThrow("Short username is required");
    expect(() => normalizeShortUsername("somchai*")).toThrow("Short username is required");
  });

  test("tries to normalize short usernames without throwing", () => {
    expect(tryNormalizeShortUsername(" Somchai.S ")).toBe("somchai.s");
    expect(tryNormalizeShortUsername("somchai*")).toBe("");
  });

  test("escapes LDAP filter values using RFC4515 replacements", () => {
    expect(escapeLdapFilterValue("a*b(c)d\\e\u0000")).toBe("a\\2ab\\28c\\29d\\5ce\\00");
  });

  test("converts binary LDAP identifiers to stable strings", () => {
    expect(valueToStableString(Buffer.from([0xde, 0xad, 0xbe, 0xef]))).toBe("deadbeef");
    expect(valueToStableString("abc")).toBe("abc");
    expect(valueToStableString(["abc"])).toBe("abc");
    expect(valueToStableString(undefined)).toBe("");
  });

  test("parses LDAP config from environment", () => {
    expect(
      parseLdapConfig({
        AUTH_MODE: "HYBRID",
        LDAP_BASE_DN: "DC=example,DC=local",
        LDAP_BIND_DN: "CN=ldap-reader,DC=example,DC=local",
        LDAP_BIND_PASSWORD: "secret",
        LDAP_ENABLED: "true",
        LDAP_URL: "ldap://example.local:389",
      }),
    ).toMatchObject({
      authMode: "HYBRID",
      baseDn: "DC=example,DC=local",
      bindDn: "CN=ldap-reader,DC=example,DC=local",
      bindPassword: "secret",
      enabled: true,
      url: "ldap://example.local:389",
      userFilter: "(sAMAccountName={{username}})",
    });
  });

  test("parses boolean config values only from explicit true or false", () => {
    expect(parseLdapConfig({ LDAP_TLS_REJECT_UNAUTHORIZED: "true " }).tlsRejectUnauthorized).toBe(true);
    expect(parseLdapConfig({ LDAP_TLS_REJECT_UNAUTHORIZED: "false" }).tlsRejectUnauthorized).toBe(false);
    expect(parseLdapConfig({ LDAP_TLS_REJECT_UNAUTHORIZED: "tru" }).tlsRejectUnauthorized).toBe(true);
    expect(parseLdapConfig({ LDAP_ENABLED: "yes" }).enabled).toBe(false);
  });

  test("asserts required LDAP config without leaking secret values", () => {
    const config = parseLdapConfig({
      LDAP_BIND_PASSWORD: "super-secret",
    });

    expect(() => assertLdapConfigReady(config)).toThrow(
      "LDAP configuration is missing: LDAP_URL, LDAP_BIND_DN, LDAP_BASE_DN",
    );

    try {
      assertLdapConfigReady(config);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain("super-secret");
    }
  });
});
