import { useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Boxes, Save, Send, Trash2 } from 'lucide-react';
import { Empty, FormError, PageTitle, type PageProps } from '@/components/common';
import { buildMailtoUrl, sendDraft, setDraft, validateDraft, type TemplateDraft } from '@/lib/procurement';

type Field = 'to' | 'from' | 'subject' | 'body';

export function TemplatePage({ data, update, toast }: PageProps) {
  const [, navigate] = useLocation();
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
  const openEmailApp = () => {
    const problem = validateDraft(draft);
    if (problem) { setError(problem); return; }
    window.location.href = buildMailtoUrl(draft);
  };
  const markSent = () => {
    if (sendingRef.current) return;
    const problem = validateDraft(draft);
    if (problem) { setError(problem); return; }
    if (!window.confirm('Confirm you sent this email in your mail app? This creates a Sent purchase order in this browser. The app cannot verify delivery.')) return;
    sendingRef.current = true; setSending(true);
    let id = '';
    const ok = update(d => { const r = sendDraft(d, d.draft ?? draft); id = r.order.id; return r.data; });
    if (ok) { toast(`${id} recorded as Sent based on your confirmation.`); navigate('/purchase-orders'); }
    else { sendingRef.current = false; setSending(false); }
  };
  const discard = () => { if (window.confirm('Discard this unsent draft?') && update(d => setDraft(d, undefined))) toast('Draft discarded.'); };
  const save = () => {
    const problem = validateDraft(draft);
    if (problem) { setError(problem); return; }
    if (update(d => setDraft(d, draft))) { setError(''); toast('Email draft saved.'); }
  };
  const row = (f: Exclude<Field, 'body'>, label: string) => <label className="mail-row"><span>{label}</span><input value={draft[f]} disabled={sending} onChange={e => setField(f, e.target.value)} data-testid={`input-mail-${f}`} /></label>;

  return <main className="content">
    <PageTitle title="Order email" />
    <section className="mail-window" data-testid="panel-mail">
      {row('to', 'To')}{row('subject', 'Subject')}
      <textarea className="mail-body" value={draft.body} disabled={sending} onChange={e => setField('body', e.target.value)} aria-label="Content" rows={16} data-testid="input-mail-body" />
      {!draft.to && <p className="item-detail" style={{ padding: '0 24px' }}>This supplier has no assigned email address. Enter a valid To address before sending.</p>}
      <FormError message={error} />
      <div className="mail-actions">
        <button className="button primary" onClick={openEmailApp} disabled={sending} data-testid="button-send-email"><Send /> Open email app</button>
        <button className="button" onClick={markSent} disabled={sending} data-testid="button-mark-sent">{sending ? 'Recording...' : 'I sent it — create order'}</button>
        <button className="button" onClick={save} disabled={sending} data-testid="button-save-email"><Save /> Save</button>
        <button className="button small danger push" onClick={discard} disabled={sending} data-testid="button-discard-draft"><Trash2 /> Discard</button>
      </div>
    </section>
  </main>;
}
