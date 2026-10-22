import { Link } from 'wouter';
import { ArrowUpRight, Boxes, ClipboardList, FileUp, Send, Truck } from 'lucide-react';
import { PageTitle, Stat, type PageProps } from '@/components/common';
import { estimatedCover, isLowCover, MANAGER, suggestions } from '@/lib/procurement';

export function OverviewPage({ data, onImport }: PageProps & { onImport: () => void }) {
  const tasks = suggestions(data), atRisk = data.skus.filter(isLowCover).sort((a, b) => estimatedCover(a) - estimatedCover(b));
  const inMotion = data.orders.filter(o => o.status !== 'Received');
  return <main className="content">
    <PageTitle title={`Good morning, ${MANAGER.split(' ')[0]}`}
      right={<button className="button primary" onClick={onImport} data-testid="button-import"><FileUp /> Import</button>} />
    <div className="stats">
      <Stat label="Sent / pending" value={inMotion.length} foot="Sent orders awaiting receipt" icon={<Truck />} />
      <Stat label="Inventory items" value={data.skus.length} foot={`Across ${data.suppliers.length} local suppliers`} icon={<Boxes />} />
    </div>
    <section className="modules-area">
      <div className="panel-head bare"><div><div className="panel-title">Modules</div></div><Link href="/purchase-orders" className="inline-link" data-testid="link-view-all">View all <ArrowUpRight size={13} /></Link></div>
      <div className="module-grid">
        <Link href="/inventory" className="module-block" data-testid="link-module-inventory">
          <div className="module-icon"><Boxes /></div>
          <div className="module-title">Inventory</div>
          <p>Stock cover, AI suggested reorders, edits and order drafts.</p>
          <div className="module-foot"><span><b>{tasks.length}</b> suggested task{tasks.length === 1 ? '' : 's'}</span><span><b>{atRisk.length}</b> at risk</span><ArrowUpRight size={16} /></div>
        </Link>
        <Link href="/purchase-orders" className="module-block alt" data-testid="link-module-purchase-orders">
          <div className="module-icon"><ClipboardList /></div>
          <div className="module-title">Purchase Orders</div>
          <p>Track sent orders through pending delivery to received.</p>
          <div className="module-foot"><span><b>{data.orders.filter(o => o.status === 'Sent').length}</b> sent</span><span><b>{data.orders.filter(o => o.status === 'Pending Delivery').length}</b> pending delivery</span><ArrowUpRight size={16} /></div>
        </Link>
      </div>
    </section>
    {data.lastImport && <p className="item-detail" style={{ marginTop: 14 }} data-testid="text-last-import"><Send size={11} /> Sales transaction sample: {data.lastImport.rows} rows, window {data.lastImport.windowStart} to {data.lastImport.windowEnd}.</p>}
  </main>;
}
