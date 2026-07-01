export function normalizeShortUsername(value: string) {
  const username = value.trim().toLowerCase();

  if (!/^[a-z0-9._-]{2,80}$/.test(username)) {
    throw new Error("Short username is required");
  }

  return username;
}

export function tryNormalizeShortUsername(value: string) {
  try {
    return normalizeShortUsername(value);
  } catch {
    return "";
  }
}

export function escapeLdapFilterValue(value: string) {
  return value.replace(/[\0()*\\]/g, (char) => {
    if (char === "\0") return "\\00";
    if (char === "(") return "\\28";
    if (char === ")") return "\\29";
    if (char === "*") return "\\2a";
    return "\\5c";
  });
}

export function valueToStableString(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;

  if (Buffer.isBuffer(first)) return first.toString("hex");
  if (typeof first === "string") return first;
  if (first === null || first === undefined) return "";

  return String(first);
}
