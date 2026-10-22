import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import type { EmailReceipt, OrderEmailInput } from "@workspace/api-zod";
import { EmailError } from "./email-policy";

type Entry = { fingerprint: string; status: string; receipt: string | null };

/** A private, single-instance journal. Pending/uncertain attempts NEVER auto-resend. */
export class EmailOutbox {
  private db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS email_attempts (
        id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, status TEXT NOT NULL,
        started_at INTEGER NOT NULL, receipt TEXT
      );`);
  }
  close() { this.db.close(); }
  reserve(input: OrderEmailInput, now = Date.now()): EmailReceipt | undefined {
    const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const old = this.db.prepare("SELECT fingerprint, status, receipt FROM email_attempts WHERE id = ?").get(input.sendId) as Entry | undefined;
      if (old) {
        if (old.fingerprint !== fingerprint) throw new EmailError(409, "DRAFT_CHANGED", "This draft already has a send attempt. Do not change or resend it without checking Gmail Sent first.");
        if (old.status === "accepted" && old.receipt) {
          this.db.exec("COMMIT"); return JSON.parse(old.receipt);
        }
        if (old.status !== "rejected") throw new EmailError(409, "SEND_UNCERTAIN", "An earlier send is in progress or its outcome is uncertain. Check Gmail Sent before taking any further action; automatic resending is blocked.");
      }
      const count = this.db.prepare("SELECT count(*) AS n FROM email_attempts WHERE started_at > ?").get(now - 86400000) as { n: number };
      const recent = this.db.prepare("SELECT count(*) AS n FROM email_attempts WHERE started_at > ?").get(now - 10000) as { n: number };
      if (count.n >= 10 || recent.n > 0) throw new EmailError(429, "SEND_LIMIT", "Shared-mailbox sending limit reached. Wait at least 10 seconds between sends; at most 10 drafts may be attempted per 24 hours.");
      this.db.prepare(`INSERT INTO email_attempts(id, fingerprint, status, started_at) VALUES (?, ?, 'pending', ?)
        ON CONFLICT(id) DO UPDATE SET status = 'pending', started_at = excluded.started_at`).run(input.sendId, fingerprint, now);
      this.db.exec("COMMIT");
      return undefined;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  accept(id: string, receipt: EmailReceipt) {
    this.db.prepare("UPDATE email_attempts SET status = 'accepted', receipt = ? WHERE id = ?").run(JSON.stringify(receipt), id);
  }
  fail(id: string, definiteRejection: boolean) {
    this.db.prepare("UPDATE email_attempts SET status = ? WHERE id = ?").run(definiteRejection ? "rejected" : "uncertain", id);
  }
}
