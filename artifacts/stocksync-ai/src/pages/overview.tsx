import { Link } from 'wouter';
import { AlertTriangle, ArrowUpRight, Boxes, ClipboardList, FileUp, Send, Truck } from 'lucide-react';
import { Empty, PageTitle, Stat, itemName, money, supplierName, when, type PageProps } from '@/components/common';
import { estimatedCover, isLowCover, MANAGER, suggestions } from '@/lib/procurement';

export function OverviewPage({ data, onImport }: PageProps & { onImport: () => void }) {
  const tasks = suggestions(data), atRisk = data.skus.filter(isLowCover).sort((a, b) => estimatedCover(a) - estimatedCover(b));
  const inMotion = data.orders.filter(o => o.status !== 'Received');
  return <main className="content">
    <PageTitle title={`Good morning, ${MANAGER.split(' ')[0]}`}
      right={<button className="button primary" onClick={onImport} data-testid="button-import"><FileUp /> Import</button>} />
    <div className="stats">
      <Stat label="Stock at risk" value={atRisk.length} foot="Estimated cover 7 days or less" icon={<AlertTriangle />} />
      <Stat label="Sent / pending" value={inMotion.length} foot="Simulated emails, not yet received" icon={<Truck />} />
      <Stat label="Inventory items" value={data.skus.length} foot={`Across ${data.suppliers.length} local suppliers`} icon={<Boxes />} />
    </div>
    <section className="modules-area">
      <div className="panel-head bare"><div><div className="panel-title">Modules</div><div className="panel-meta">Open a workspace to act on stock or orders</div></div><Link href="/purchase-orders" className="inline-link" data-testid="link-view-all">View all <ArrowUpRight size={13} /></Link></div>
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
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Orders in motion</div><div className="panel-meta">Sent and pending delivery · status tracking only</div></div><Link href="/purchase-orders" className="inline-link" data-testid="link-view-order-status">Order status <ArrowUpRight size={13} /></Link></div>
        {inMotion.length ? <div className="order-list">{inMotion.slice(0, 5).map(o => <div className="order-row" key={o.id}><div><div className="item-name">{itemName(data, o.itemId)}</div><div className="item-detail">{o.id} · {supplierName(data, o.supplierId)}</div></div><div className="mono">{money(o.totalCost)}</div><div><span className={`pill ${o.status === 'Pending Delivery' ? 'delivery' : 'sent'}`}>{o.status}</span></div><div className="hide-small item-detail">{when(o.createdAt)}</div><div className="hide-small item-detail">{o.send ? 'Simulated send' : 'Sample order'}</div></div>)}</div>
          : <Empty title="No orders in motion" detail="Approve a suggested task in Inventory to draft and simulate a supplier email." />}
      </section>
      <section className="panel"><div className="panel-head"><div><div className="panel-title">Stock to watch</div><div className="panel-meta">Based on recent average daily usage</div></div><Link href="/inventory" className="inline-link" data-testid="link-stock-watch">Inventory <ArrowUpRight size={13} /></Link></div>
        {atRisk.length ? <div className="risk-list">{atRisk.slice(0, 4).map(i => <div className="risk-row" key={i.id}><div className="risk-icon"><AlertTriangle /></div><div style={{ flex: 1 }}><div className="risk-name">{i.name}</div><div className="risk-detail">{i.onHand} {i.unit} left · approx. {estimatedCover(i).toFixed(1)} days at current use</div></div><div className="mono cover-low">{estimatedCover(i).toFixed(1)}d</div></div>)}</div>
          : <Empty title="Nothing at risk" detail="Every item has more than 7 days of estimated cover." />}
      </section>
    </div>
    {data.lastImport && <p className="item-detail" style={{ marginTop: 14 }} data-testid="text-last-import"><Send size={11} /> Last sales import: {data.lastImport.rows} rows, window {data.lastImport.windowStart} to {data.lastImport.windowEnd}.</p>}
  </main>;
}
