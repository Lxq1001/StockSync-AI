import { useMemo, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { Empty, PageTitle, itemName, itemUnit, money, supplierName, when, type PageProps } from '@/components/common';
import { ORDER_STATUSES, setOrderStatus, type OrderStatus } from '@/lib/procurement';

export function OrdersPage({ data, update, toast }: PageProps) {
  const [query, setQuery] = useState(''), [status, setStatus] = useState('All statuses');
  const orders = useMemo(() => data.orders.filter(o => (status === 'All statuses' || o.status === status) && `${o.id} ${itemName(data, o.itemId)} ${supplierName(data, o.supplierId)}`.toLowerCase().includes(query.toLowerCase())), [data, query, status]);
  const change = (id: string, next: OrderStatus) => { if (update(d => setOrderStatus(d, id, next))) toast(`${id} marked ${next}. Status tracking only; stock on hand was not changed.`); };
  return <main className="content">
    <PageTitle eyebrow="Order tracking" title="Purchase orders" subtitle="Orders created from simulated supplier emails, tracked from Sent to Received." />
    <div className="warning"><ShieldCheck /><span>Status is <b>tracking only</b>: changing it never adds or removes stock, so switching back and forth cannot double count. Update On hand in Inventory after counting a delivery. Supplier emails are demo records; nothing was really sent.</span></div>
    <div className="toolbar"><label className="searchbox"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search item, supplier or PO" data-testid="input-order-search" /></label><select className="select" value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter order status" data-testid="select-order-status-filter">{['All statuses', ...ORDER_STATUSES].map(s => <option key={s}>{s}</option>)}</select><span className="item-detail" style={{ marginLeft: 'auto' }}>{orders.length} order{orders.length === 1 ? '' : 's'} shown</span></div>
    <div className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Purchase order</th><th>Supplier</th><th>Qty</th><th>Total</th><th>Status</th><th>Created</th></tr></thead><tbody>
      {orders.map(o => <tr key={o.id} data-testid={`row-order-${o.id}`}>
        <td><div className="item-name">{o.id}</div><div className="item-detail">{itemName(data, o.itemId)}{o.send ? ' · simulated email' : ''}</div></td>
        <td>{supplierName(data, o.supplierId)}</td><td>{o.quantity} {itemUnit(data, o.itemId)}</td><td className="mono">{money(o.totalCost)}</td>
        <td><select className={`select status-select s-${o.status.replace(' ', '-').toLowerCase()}`} value={o.status} onChange={e => change(o.id, e.target.value as OrderStatus)} aria-label={`Status for ${o.id}`} data-testid={`select-status-${o.id}`}>{ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
        <td className="item-detail">{when(o.createdAt)}</td>
      </tr>)}
    </tbody></table>{orders.length === 0 && <Empty title="No orders match" detail="Try another search or status. New orders appear after you send an email from the template." />}</div></div>
    {data.legacyOrders.length > 0 && <details className="legacy" data-testid="panel-legacy-orders"><summary>{data.legacyOrders.length} earlier suggestion{data.legacyOrders.length === 1 ? '' : 's'} from the previous version (not tracked)</summary>
      <p className="item-detail">These were awaiting approval or rejected and were never sent, so they are not shown as Sent. Use Inventory to create a fresh order if still needed.</p>
      <ul>{data.legacyOrders.map(o => <li key={o.id} className="item-detail">{o.id} · {itemName(data, o.itemId)} · {o.quantity} {itemUnit(data, o.itemId)} · {money(o.totalCost)} · {o.status}</li>)}</ul></details>}
  </main>;
}
