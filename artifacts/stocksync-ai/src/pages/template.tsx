import { useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Boxes, Pencil, Send, Trash2 } from 'lucide-react';
import { Empty, FormError, PageTitle, supplierName, type PageProps } from '@/components/common';
import { buildTestEmail, recordTestEmail, sendDraft, setDraft, validateDraft, type TemplateDraft } from '@/lib/procurement';

type Field = 'to' | 'subject' | 'body';

export function TemplatePage({ data, update, toast }: PageProps) {
  const [, navigate] = useLocation();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const draft = data.draft;

  if (!draft) return <main className="content">
    <PageTitle eyebrow="Supplier email" title="Order email" subtitle="Drafts appear here when you approve a suggestion or confirm an order." />
    <div className="panel"><Empty title="No draft to send" detail="Go to Inventory, then choose Approve on a suggested task or Order on any item to generate an email.">
      <Link href="/inventory" className="button primary" data-testid="link-template-inventory"><Boxes /> Open Inventory</Link>
    </Empty></div>
  </main>;

  const setField = (f: Field, v: string) => { setError(''); update(d => d.draft ? setDraft(d, { ...d.draft, [f]: v } as TemplateDraft) : d); };
  const sendWithGmail = async () => {
    const problem = validateDraft(draft);
    if (problem) { setError(problem); setEditing(true); return; }
    if (sendingRef.current) return;
    const approved = window.confirm(
      `Send this real email through the connected Gmail account?\n\nTo: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`,
    );
    if (!approved) return;
    sendingRef.current = true; setSending(true);
    setError('');
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: draft.itemId, supplierId: draft.supplierId, to: draft.to,
          subject: draft.subject, body: draft.body,
        }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; id?: string; alreadySent?: boolean };
      if (!response.ok || !result.id) throw new Error(result.error || 'Gmail did not confirm the send. Check the connected mailbox before retrying.');
      let orderId = '';
      const ok = update(d => {
        const r = sendDraft(d, d.draft ?? draft, new Date().toISOString(), result.id);
        orderId = r.order.id;
        return r.data;
      });
      if (ok) {
        toast(result.alreadySent ? `${orderId} recorded; this email was already sent.` : `${orderId} sent to ${supplierName(data, draft.supplierId)} via Gmail.`);
        navigate('/purchase-orders');
      } else {
        setError('Gmail confirmed the send, but this browser could not save the order. Retry this same draft to recover the Gmail confirmation; do not edit it first.');
        sendingRef.current = false;
        setSending(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the email. Check the connected mailbox before retrying.');
      sendingRef.current = false;
      setSending(false);
    }
  };
  const sendTestWithGmail = async () => {
    let testMessage: ReturnType<typeof buildTestEmail>;
    try {
      testMessage = buildTestEmail(data, draft);
      if (!testMessage.to.trim()) throw new Error('Supplier email settings are not configured on the server.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare the test email.');
      return;
    }
    if (sendingRef.current) return;
    if (!window.confirm(
      `Send this TEST ONLY email through the connected Gmail account?\n\nTo: ${testMessage.to}\nSubject: ${testMessage.subject}\n\n${testMessage.body}`,
    )) return;
    sendingRef.current = true; setSending(true); setError('');
    try {
      const response = await fetch('/api/email/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: draft.itemId, supplierId: draft.supplierId }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; id?: string };
      if (!response.ok || !result.id) throw new Error(result.error || 'Gmail did not confirm the test email. Check Sent before retrying.');
      const ok = update(d => recordTestEmail(d, testMessage.to, result.id!));
      if (ok) toast(`Test email sent to ${testMessage.to}. No purchase order was created.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the test email. Check Sent before retrying.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };
  const discard = () => { if (window.confirm('Discard this unsent draft?') && update(d => setDraft(d, undefined))) toast('Draft discarded.'); };
  const ro = !editing || sending;
  const row = (f: Exclude<Field, 'body'>, label: string) => <label className="mail-row"><span>{label}</span><input value={draft[f]} readOnly={ro} onChange={e => setField(f, e.target.value)} data-testid={`input-mail-${f}`} /></label>;

  return <main className="content">
    <PageTitle title="Order email" />
    <section className="mail-window" data-testid="panel-mail">
      <div className="mail-bar"><span className="mail-title">New message</span><span className="pill">{editing ? 'Editing' : 'Read-only'}</span></div>
      {row('to', 'To')}{row('subject', 'Subject')}
      <textarea className="mail-body" value={draft.body} readOnly={ro} onChange={e => setField('body', e.target.value)} aria-label="Content" rows={16} data-testid="input-mail-body" />
      <FormError message={error} />
      <div className="mail-actions">
        <button className="button primary" onClick={sendTestWithGmail} disabled={sending} data-testid="button-send-test-email"><Send /> {sending ? 'Sending…' : 'Send test email'}</button>
        <button className="button" onClick={sendWithGmail} disabled={sending} data-testid="button-send-email"><Send /> Send purchase order</button>
        <button className="button" onClick={() => setEditing(e => !e)} aria-pressed={editing} disabled={sending} data-testid="button-edit-email"><Pencil /> {editing ? 'Done editing' : 'Edit'}</button>
        <button className="button small danger push" onClick={discard} disabled={sending} data-testid="button-discard-draft"><Trash2 /> Discard</button>
      </div>
    </section>
  </main>;
}
