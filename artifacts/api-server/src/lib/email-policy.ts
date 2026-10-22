import inventory from "../data/mock_db.json";
import suppliers from "../data/suppliers.json";
import type { OrderEmailInput } from "@workspace/api-zod";

export class EmailError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function approvedSuppliers(raw = process.env.STOCKSYNC_SUPPLIER_RECIPIENTS_JSON): string[] {
  if (!raw) return [];
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return []; }
  // Accept existing ID/name mappings, nested { email/recipients: ... } entries,
  // and explicit email lists without exposing the secret's contents.
  // Addresses must ALSO match the supplied supplier catalog.
  const collect = (v: unknown, depth = 0): string[] => {
    if (typeof v === "string") return [v.trim().toLowerCase()];
    if (!v || typeof v !== "object" || depth > 8) return [];
    return Object.values(v).flatMap(child => collect(child, depth + 1));
  };
  const emails = new Set(collect(value));
  return suppliers.filter(s => emails.has(s.email.toLowerCase())).map(s => s.supplier_id);
}

export function validateOrderEmail(input: OrderEmailInput, approved = approvedSuppliers()) {
  const item = inventory.find(i => i.id === input.itemId);
  const supplier = suppliers.find(s => s.supplier_id === input.supplierId);
  if (!item || !supplier || item.supplier_id !== supplier.supplier_id)
    throw new EmailError(400, "INVALID_SUPPLIER", "This item is not assigned to the selected supplier.");
  if (!approved.includes(supplier.supplier_id) || input.to.trim().toLowerCase() !== supplier.email.toLowerCase())
    throw new EmailError(403, "RECIPIENT_NOT_APPROVED", "Sending is restricted to this supplier's catalog email and the server's approved recipient list.");
  if (/[\r\n]/.test(input.subject) || !input.subject.trim() || !input.body.trim())
    throw new EmailError(400, "INVALID_CONTENT", "Enter a subject without line breaks and non-empty email content.");
  return supplier.email;
}

export function validEmailOrigin(origin: string | undefined, host: string | undefined, forwardedHost: string | undefined, fetchSite?: string) {
  if (!origin || fetchSite === "cross-site") return false;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) &&
      [host, forwardedHost?.split(",")[0]?.trim()].filter(Boolean).includes(parsed.host);
  } catch { return false; }
}
