const allowedIds = new Set(["S1", "S2", "S3"]);
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function parseSupplierRecipients(raw: string | undefined) {
  const empty = (status: string) => ({
    status, configuredSupplierCount: 0, validAddressCount: 0,
    recipients: null as Record<string, string> | null,
  });
  if (!raw) return empty("missing");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
    // Also accept a JSON object pasted as an encoded JSON string.
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
  } catch {
    return empty("invalid_json");
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "suppliers" in parsed) {
    parsed = parsed.suppliers;
  }
  let entries: [string, unknown][];
  if (Array.isArray(parsed)) {
    entries = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object" || typeof row.supplier_id !== "string") return empty("invalid_shape");
      entries.push([row.supplier_id, row.email]);
    }
  } else if (parsed && typeof parsed === "object") {
    entries = Object.entries(parsed);
  } else {
    return empty("invalid_shape");
  }
  const configuredIds = entries.filter(([id]) => allowedIds.has(id)).map(([id]) => id);
  if (new Set(configuredIds).size !== configuredIds.length) return empty("duplicate_supplier");
  const recipients: Record<string, string> = {};
  for (const [id, address] of entries) {
    if (allowedIds.has(id) && typeof address === "string" && emailPattern.test(address.trim())) {
      recipients[id] = address.trim();
    }
  }
  const validAddressCount = Object.keys(recipients).length;
  return {
    status: validAddressCount === allowedIds.size ? "ready" : "incomplete_or_invalid",
    configuredSupplierCount: configuredIds.length,
    validAddressCount,
    recipients: validAddressCount === allowedIds.size ? recipients : null,
  };
}
