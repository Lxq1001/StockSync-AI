import { useEffect, type ReactNode } from 'react';
import { Package, X } from 'lucide-react';
import type { StoreData } from '@/lib/procurement';

export type Updater = (fn: (d: StoreData) => StoreData) => boolean;
export type PageProps = { data: StoreData; update: Updater; toast: (s: string) => void };

export const money = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const when = (s: string) => new Date(s).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
export const itemName = (d: StoreData, id: string) => d.skus.find(x => x.id === id)?.name || 'Unknown item';
export const itemUnit = (d: StoreData, id: string) => d.skus.find(x => x.id === id)?.unit || 'unit';
export const supplierName = (d: StoreData, id: string) => d.suppliers.find(x => x.id === id)?.name || 'Unknown supplier';

export function PageTitle({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle && <p className="subtitle">{subtitle}</p>}</div>{right}</div>;
}
export function Stat({ label, value, foot, icon }: { label: string; value: number | string; foot: string; icon: ReactNode }) {
  return <div className="stat"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="stat-label">{label}</span><span style={{ color: '#638277' }}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>;
}
export function Empty({ title, detail, children }: { title: string; detail: string; children?: ReactNode }) {
  return <div className="blank"><div className="blank-mark"><Package /></div><b style={{ display: 'block', color: '#35584e', marginBottom: 5 }}>{title}</b>{detail}{children && <div style={{ marginTop: 14 }}>{children}</div>}</div>;
}
export function Modal({ title, copy, onClose, children, footer, testId, wide }: { title: string; copy?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; testId: string; wide?: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={`${testId}-heading`} data-testid={testId}>
      <div className="modal-head"><div><h2 id={`${testId}-heading`}>{title}</h2>{copy && <p className="modal-copy">{copy}</p>}</div><button className="button small" onClick={onClose} aria-label="Close" data-testid={`button-close-${testId}`}><X /></button></div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </section>
  </div>;
}
export function FormError({ message }: { message: string }) {
  return message ? <div className="form-error" role="alert" data-testid="text-form-error">{message}</div> : null;
}
