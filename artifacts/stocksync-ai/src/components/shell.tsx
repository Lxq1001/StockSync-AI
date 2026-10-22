import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Boxes, ClipboardList, Mail, Menu, Store } from 'lucide-react';
import { MANAGER } from '@/lib/procurement';

const navItems = [
  { path: '/', label: 'Overview', icon: Store },
  { path: '/inventory', label: 'Inventory', icon: Boxes },
  { path: '/purchase-orders', label: 'Purchase orders', icon: ClipboardList },
  { path: '/template', label: 'Order email', icon: Mail },
  { path: '/activity', label: 'Activity log', icon: Activity },
];
export function pageName(path: string) {
  return navItems.find(n => n.path === path)?.label ?? 'Not found';
}

export function Shell({ open, setOpen, children, right }: { open: boolean; setOpen: (v: boolean) => void; children: ReactNode; right?: ReactNode }) {
  const [path] = useLocation();
  const closeOnMobile = () => { if (window.matchMedia('(max-width: 680px)').matches) setOpen(false); };
  return <div className={`app-shell ${open ? 'nav-open' : 'nav-collapsed'}`}>
    <aside className="sidebar" id="app-sidebar" aria-label="Sidebar" hidden={!open}>
      <div className="brand"><div className="brand-mark">S</div><div><div className="brand-name">StockSync AI</div><span className="brand-sub">STORE OPERATIONS</span></div></div>
      <div className="nav-caption">Workspace</div>
      <nav className="nav-list" aria-label="Main navigation">{navItems.map(({ path: p, label, icon: Icon }) =>
        <Link key={p} href={p} onClick={closeOnMobile} className={`nav-link ${path === p ? 'active' : ''}`} aria-current={path === p ? 'page' : undefined} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon /><span>{label}</span></Link>)}</nav>
      <div className="side-bottom">
        <div className="demo-flag"><strong>DEMO · SYNTHETIC DATA</strong>Supplier emails are simulated and stored in this browser. No message will be sent.</div>
        <div className="side-user"><div className="user-avatar">AR</div><div><div className="user-label">{MANAGER}</div><div className="user-role">Store manager · demo persona</div></div></div>
      </div>
    </aside>
    {open && <div className="nav-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
    <div className="main-area">
      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="app-sidebar" aria-label={open ? 'Collapse navigation' : 'Expand navigation'} data-testid="button-toggle-sidebar"><Menu size={19} /></button>
          <div className="crumb">Operations / <b>{pageName(path)}</b></div>
        </div>
        <div className="top-actions">{right}</div>
      </header>
      {children}
    </div>
  </div>;
}
