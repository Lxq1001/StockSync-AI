import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Boxes, Pencil, Save, Send, Trash2 } from 'lucide-react';
import { Empty, FormError, Modal, PageTitle, type PageProps } from '@/components/common';
import { buildGmailComposeUrl, sendDraft, setDraft, validateEmailContent, type TemplateDraft } from '@/lib/procurement';

type Field = 'subject' | 'body';

export function TemplatePage({ data, update, toast }: PageProps) {
  const [, navigate] = useLocation();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const draft = data.draft;
  const [working, setWorking] = useState<TemplateDraft | undefined>(draft);
  const [editing, setEditing] = useState(false);
  const [handoff, setHandoff] = useState<TemplateDraft | null>(null);
  useEffect(() => { setWorking(draft); setEditing(false); }, [draft]);

  if (!draft) return <main className="content">
    <PageTitle eyebrow="Supplier email" title="Order email" subtitle="Drafts appear here when you approve a suggestion or confirm an order." />
    <div className="panel"><Empty title="No draft to send" detail="Go to Inventory, then choose Approve on a suggested task or Order on any item to generate an email.">
      <Link href="/inventory" className="button primary" data-testid="link-template-inventory"><Boxes /> Open Inventory</Link>
    </Empty></div>
  </main>;

  const displayed = working ?? draft;
  const setField = (f: Field, v: string) => { setError(''); setWorking({ ...displayed, [f]: v }); };
  const recordSent = () => {
    if (sendingRef.current || !handoff) return;
    sendingRef.current = true; setSending(true);
    let id = '';
    const ok = update(d => {
      if (d.draft?.createdAt !== handoff.createdAt || d.draft?.itemId !== handoff.itemId ||
          d.draft.subject !== handoff.subject || d.draft.body !== handoff.body || d.draft.to !== handoff.to)
        throw new Error('The saved draft changed. The earlier Gmail template cannot be recorded as this order.');
      const result = sendDraft(d, handoff); id = result.order.id; return result.data;
    });
    if (ok) { toast(`${id} recorded as Sent based on your confirmation. Gmail delivery is not verified.`); navigate('/purchase-orders'); }
    else { setError('Could not record the order. The draft has been kept; do not send another email.'); sendingRef.current = false; setSending(false); }
  };
  const discard = () => {
    if (editing) {
      if (window.confirm('Discard your unsaved edits and restore the saved template?')) { setWorking(draft); setEditing(false); setError(''); }
    } else if (window.confirm('Discard this draft? If you already attempted a send, check Gmail Sent first: discarding cannot recall an email.') && update(d => setDraft(d, undefined))) toast('Draft discarded.');
  };
  const save = () => {
    const problem = validateEmailContent(displayed);
    if (problem) { setError(problem); return; }
    if (update(d => setDraft(d, displayed))) { setEditing(false); setError(''); toast('Email draft saved.'); }
  };
  const row = (f: 'to' | 'subject', label: string) => <label className="mail-row"><span>{label}</span><input value={displayed[f]} readOnly={!editing || f === 'to'} disabled={sending} onChange={e => { if (f === 'subject') setField(f, e.target.value); }} data-testid={`input-mail-${f}`} /></label>;

  return <main className="content">
    <PageTitle title="Order email" />
    <section className="mail-window" data-testid="panel-mail">
      <label className="mail-row"><span>From</span><input value="Choose your sending account in Gmail" readOnly aria-label="Sender" data-testid="input-mail-from" /></label>
      {row('to', 'To')}{row('subject', 'Subject')}
      <textarea className="mail-body" value={displayed.body} readOnly={!editing} disabled={sending} onChange={e => setField('body', e.target.value)} aria-label="Content" rows={16} data-testid="input-mail-body" />
      <p className="item-detail" style={{ padding: '0 18px' }}>Open Gmail to sign in if needed, review the filled template, and click Send there. To use your shared mailbox, select that account in Gmail. If sign-in opens your inbox instead, return here and click Open Gmail again.</p>
      <FormError message={error} />
      <div className="mail-actions">
        <a className="button primary" href={buildGmailComposeUrl(draft)} target="_blank" rel="noopener noreferrer"
          aria-disabled={editing || sending} style={editing || sending ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          data-testid="button-send-email" onClick={event => {
            const problem = validateEmailContent(draft);
            if (editing || sending || problem) { event.preventDefault(); if (problem) setError(problem); return; }
            setError(''); setHandoff({ ...draft });
          }}><Send /> Open Gmail</a>
        <button className="button" onClick={() => { setWorking(draft); setEditing(true); setError(''); }} disabled={sending || editing} data-testid="button-edit-email"><Pencil /> Edit</button>
        <button className="button" onClick={save} disabled={sending || !editing} data-testid="button-save-email"><Save /> Save</button>
        <button className="button small danger push" onClick={discard} disabled={sending} data-testid="button-discard-draft"><Trash2 /> Discard</button>
      </div>
    </section>
    {handoff && <Modal title="Finish sending in Gmail" copy="Opening Gmail does not send the email." testId="modal-gmail-confirmation" onClose={() => { if (!sending) setHandoff(null); }}
      footer={<><button className="button" disabled={sending} onClick={() => setHandoff(null)}>Not sent yet</button>
        <button className="button primary" disabled={sending} onClick={recordSent} data-testid="button-confirm-gmail-sent">{sending ? 'Recording...' : 'I sent it — record order'}</button></>}>
      <p>In the Gmail tab, choose the correct sending account, review the recipient and template, then click Gmail’s Send button.</p>
      <p>Return here only after sending. StockSync cannot detect the Gmail send or verify delivery. Confirming below creates a Sent purchase order in this browser based on your confirmation.</p>
      <FormError message={error} />
    </Modal>}
  </main>;
}
