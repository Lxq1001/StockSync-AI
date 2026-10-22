import { useEffect, useRef, useState } from 'react';
import { CheckCheck, Download, FileText, MessageSquare, X } from 'lucide-react';
import { Link } from 'wouter';
import type { AuditEntry, PurchaseOrder } from '@/lib/procurement';
import { formatMoney } from '@/lib/procurement';
import { downloadPurchaseOrder } from '@/lib/purchase-order-pdf';

export function ApprovalOutcome({ order, audit, close }: {
  order: PurchaseOrder; audit: AuditEntry[]; close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  useEffect(() => { ref.current?.showModal(); }, []);
  const po = order.finalized;
  const dispatch = order.dispatch;
  if (!po || !dispatch) return null;
  const entries = audit.filter(a => a.orderId === order.id);
  return (
    <dialog ref={ref} className="modal outcome-modal" onCancel={close} aria-labelledby="outcome-title">
      <div className="modal-head">
        <div>
          <div className="eyebrow">Visible outcome · {order.id}</div>
          <h2 id="outcome-title">PO finalized · mock send recorded</h2>
          <p className="modal-copy">The PDF is ready. No supplier has actually been contacted.</p>
        </div>
        <button className="button small" onClick={close} aria-label="Close approval result" data-testid="button-close-outcome"><X /></button>
      </div>
      <div className="modal-body">
        <div className="outcome-steps" aria-label="Approval workflow completed">
          {['Manager approved', 'PDF generated', 'Mock dispatch accepted', order.status].map(step => (
            <div key={step}><CheckCheck size={16} /><span>{step}</span></div>
          ))}
        </div>
        <div className="outcome-grid">
          <section className="outcome-document" aria-label="Finalized purchase order">
            <FileText size={25} />
            <div className="eyebrow" style={{ marginTop: 12 }}>Finalized PDF PO</div>
            <h3>{po.orderId}</h3>
            <p className="item-detail">Supplier: {po.supplierName}</p>
            <div className="outcome-line"><span>{po.itemName}</span><b>{po.quantity} {po.unit}</b></div>
            <div className="outcome-line"><span>Unit cost</span><span>{formatMoney(po.unitCost)}</span></div>
            <div className="outcome-line"><b>Total (MYR)</b><b>{formatMoney(po.totalCost)}</b></div>
            <p className="item-detail">Approved by {po.approvedBy}<br />{new Date(po.approvedAt).toLocaleString('en-MY')}</p>
            <p className="outcome-note">{po.note}</p>
            <button className="button primary" data-testid="button-download-po" onClick={() => {
              try { downloadPurchaseOrder(po); setError(''); }
              catch { setError('PDF download failed. Please retry; the finalized order is still saved.'); }
            }}><Download /> Download {dispatch.attachment}</button>
            {error && <p role="alert" className="outcome-error">{error}</p>}
          </section>
          <section className="outcome-message" aria-label="Mock supplier message">
            <div className="panel-title"><MessageSquare size={16} /> {dispatch.channel === 'email' ? 'Email' : 'WhatsApp'} outbox · mock</div>
            <p className="item-detail">Local mock adapter. No external API call or real recipient delivery.</p>
            <dl className="outcome-meta">
              <dt>To</dt><dd>{dispatch.recipient}</dd>
              <dt>Subject</dt><dd>{dispatch.subject}</dd>
              <dt>Attachment</dt><dd>{dispatch.attachment}</dd>
              <dt>Result</dt><dd>{dispatch.status} · not sent</dd>
            </dl>
            <pre className="mock-message" data-testid="mock-supplier-message">{dispatch.body}</pre>
            <div className="item-detail outcome-reference">Receipt: {dispatch.id}</div>
          </section>
        </div>
        <section className="outcome-audit" aria-label="Order audit events">
          <div className="panel-title">Recorded activity · {entries.length} events</div>
          <p className="item-detail">Read-only in this UI, stored in this browser. Not an immutable production audit log.</p>
          <ol>{[...entries].reverse().map(entry => <li key={entry.id}><b>{entry.action}</b><span>{new Date(entry.timestamp).toLocaleTimeString('en-MY')} · {entry.actor}</span></li>)}</ol>
        </section>
      </div>
      <div className="modal-foot">
        <Link href="/activity" className="button" onClick={close} data-testid="link-outcome-activity">View full activity log</Link>
        <button className="button primary" onClick={close} data-testid="button-outcome-done">Done</button>
      </div>
    </dialog>
  );
}
