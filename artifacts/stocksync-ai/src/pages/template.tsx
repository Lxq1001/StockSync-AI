import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Boxes, Pencil, Save, Send, Trash2 } from 'lucide-react';
import { Empty, FormError, PageTitle, type PageProps } from '@/components/common';
import { sendDraft, setDraft, validateDraft, type TemplateDraft } from '@/lib/procurement';
import type { EmailSettings, EmailReceipt } from '@workspace/api-client-react';

type Field = 'to' | 'from' | 'subject' | 'body';

export function TemplatePage({ data, update, toast }: PageProps) {
  const [, navigate] = useLocation();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const draft = data.draft;
  const [working, setWorking] = useState<TemplateDraft | undefined>(draft);
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [settingsError, setSettingsError] = useState('');
  useEffect(() => { setWorking(draft); setEditing(false); }, [draft]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/email/settings').then(async response => {
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Email settings could not be loaded. Check the API connection and README setup.');
      return response.json() as Promise<EmailSettings>;
    }).then(value => { if (!cancelled) setSettings(value); }).catch(e => { if (!cancelled) setSettingsError(e.message); });
    return () => { cancelled = true; };
  }, []);

  if (!draft) return <main className="content">
    <PageTitle eyebrow="Supplier email" title="Order email" subtitle="Drafts appear here when you approve a suggestion or confirm an order." />
    <div className="panel"><Empty title="No draft to send" detail="Go to Inventory, then choose Approve on a suggested task or Order on any item to generate an email.">
      <Link href="/inventory" className="button primary" data-testid="link-template-inventory"><Boxes /> Open Inventory</Link>
    </Empty></div>
  </main>;

  const displayed = working ?? draft;
  const approved = settings?.approvedSupplierIds.includes(draft.supplierId);
  const setField = (f: Field, v: string) => { setError(''); setWorking({ ...displayed, [f]: v }); };
  const send = async () => {
    if (sendingRef.current) return;
    if (!settings?.ready || !approved || editing) return;
    const problem = validateDraft(draft);
    if (problem) { setError(problem); return; }
    if (!window.confirm(`Send this real order email from ${settings.sender} to ${draft.to}?`)) return;
    sendingRef.current = true; setSending(true);
    setError('');
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendId: draft.sendId ?? `legacy-${draft.itemId}-${draft.createdAt}`, itemId: draft.itemId,
          supplierId: draft.supplierId, quantity: draft.quantity, to: draft.to, subject: draft.subject, body: draft.body,
        }),
      });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('No valid email receipt was received. Check Gmail Sent before retrying.');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Email could not be sent.');
      const receipt = result as EmailReceipt;
      if (!receipt.messageId || !receipt.from || !receipt.acceptedAt) throw new Error('No valid email receipt was received. Check Gmail Sent before retrying.');
      let id = '';
      const ok = update(d => {
        if (d.draft?.createdAt !== draft.createdAt || d.draft?.itemId !== draft.itemId) throw new Error('Email accepted, but the active draft changed. Keep the original draft to recover its receipt.');
        const r = sendDraft(d, { ...draft, from: receipt.from }, receipt.acceptedAt, receipt); id = r.order.id; return r.data;
      });
      if (ok) { toast(`${id}: Gmail accepted the email. Supplier delivery is not yet verified.`); navigate('/purchase-orders'); }
      else setError('Gmail accepted the email, but this browser could not save the order. Keep this draft and press Send again to recover its receipt without sending another email.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The send outcome is unknown. Check Gmail Sent before retrying.');
    } finally { sendingRef.current = false; setSending(false); }
  };
  const discard = () => {
    if (editing) {
      if (window.confirm('Discard your unsaved edits and restore the saved template?')) { setWorking(draft); setEditing(false); setError(''); }
    } else if (window.confirm('Discard this draft? If you already attempted a send, check Gmail Sent first: discarding cannot recall an email.') && update(d => setDraft(d, undefined))) toast('Draft discarded.');
  };
  const save = () => {
    const problem = validateDraft(displayed);
    if (problem) { setError(problem); return; }
    if (update(d => setDraft(d, displayed))) { setEditing(false); setError(''); toast('Email draft saved.'); }
  };
  const row = (f: 'to' | 'subject', label: string) => <label className="mail-row"><span>{label}</span><input value={displayed[f]} readOnly={!editing || f === 'to'} disabled={sending} onChange={e => setField(f, e.target.value)} data-testid={`input-mail-${f}`} /></label>;

  return <main className="content">
    <PageTitle title="Order email" />
    <section className="mail-window" data-testid="panel-mail">
      <label className="mail-row"><span>From</span><input value={settings?.sender ?? ''} placeholder="Shared Gmail mailbox" readOnly aria-label="Sender" data-testid="input-mail-from" /></label>
      {row('to', 'To')}{row('subject', 'Subject')}
      <textarea className="mail-body" value={displayed.body} readOnly={!editing} disabled={sending} onChange={e => setField('body', e.target.value)} aria-label="Content" rows={16} data-testid="input-mail-body" />
      {(settingsError || settings?.reason || (settings && !approved)) && <p className="item-detail" style={{ padding: '0 24px' }}>{settingsError || settings?.reason || 'This supplier is not approved for direct sending. Ask the mailbox owner to update the server recipient allowlist.'}</p>}
      <FormError message={error} />
      <div className="mail-actions">
        <button className="button primary" onClick={send} disabled={sending || editing || !settings?.ready || !approved} data-testid="button-send-email"><Send /> {sending ? 'Sending...' : 'Send email'}</button>
        <button className="button" onClick={() => { setWorking(draft); setEditing(true); setError(''); }} disabled={sending || editing} data-testid="button-edit-email"><Pencil /> Edit</button>
        <button className="button" onClick={save} disabled={sending || !editing} data-testid="button-save-email"><Save /> Save</button>
        <button className="button small danger push" onClick={discard} disabled={sending} data-testid="button-discard-draft"><Trash2 /> Discard</button>
      </div>
    </section>
  </main>;
}
