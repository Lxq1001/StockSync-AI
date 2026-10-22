import { useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Boxes, Pencil, Send, Trash2 } from 'lucide-react';
import { Empty, FormError, PageTitle, money, supplierName, type PageProps } from '@/components/common';
import { sendDraft, setDraft, validateDraft, type TemplateDraft } from '@/lib/procurement';

type Field = 'to' | 'from' | 'subject' | 'body';

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

  const sku = data.skus.find(s => s.id === draft.itemId);
  const setField = (f: Field, v: string) => { setError(''); update(d => d.draft ? setDraft(d, { ...d.draft, [f]: v } as TemplateDraft) : d); };
  const send = () => {
    if (sendingRef.current) return;
    const problem = validateDraft(draft);
    if (problem) { setError(problem); setEditing(true); return; }
    sendingRef.current = true; setSending(true);
    let id = '';
    const ok = update(d => { const r = sendDraft(d, d.draft ?? draft); id = r.order.id; return r.data; });
    if (ok) { toast(`${id} recorded as Sent. Demo only: no real email was sent.`); navigate('/purchase-orders'); }
    else { sendingRef.current = false; setSending(false); }
  };
  const discard = () => { if (window.confirm('Discard this unsent draft?') && update(d => setDraft(d, undefined))) toast('Draft discarded.'); };
  const ro = !editing || sending;
  const row = (f: Exclude<Field, 'body'>, label: string) => <label className="mail-row"><span>{label}</span><input value={draft[f]} readOnly={ro} onChange={e => setField(f, e.target.value)} data-testid={`input-mail-${f}`} /></label>;

  return <main className="content">
    <PageTitle eyebrow="Supplier email · draft saved in this browser" title="Order email" subtitle={`${draft.quantity} ${sku?.unit ?? ''} ${sku?.name ?? 'Unknown item'} from ${supplierName(data, draft.supplierId)} · ${money(draft.quantity * draft.unitCost)}`} />
    <section className="mail-window" data-testid="panel-mail">
      <div className="mail-bar"><span className="mail-title">New message</span><span className="pill">{editing ? 'Editing' : 'Read-only'}</span></div>
      {row('to', 'To')}{row('from', 'From')}{row('subject', 'Subject')}
      <textarea className="mail-body" value={draft.body} readOnly={ro} onChange={e => setField('body', e.target.value)} aria-label="Content" rows={16} data-testid="input-mail-body" />
      <FormError message={error} />
      <div className="mail-actions">
        <button className="button primary" onClick={send} disabled={sending} data-testid="button-send-email"><Send /> {sending ? 'Recording...' : 'Send (demo)'}</button>
        <button className="button" onClick={() => setEditing(e => !e)} aria-pressed={editing} disabled={sending} data-testid="button-edit-email"><Pencil /> {editing ? 'Done editing' : 'Edit'}</button>
        <button className="button small danger push" onClick={discard} disabled={sending} data-testid="button-discard-draft"><Trash2 /> Discard</button>
      </div>
    </section>
  </main>;
}
