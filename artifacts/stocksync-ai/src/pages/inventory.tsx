import { useMemo, useState } from 'react';
import { Check, CircleDollarSign, Package, Pencil, Search, ShoppingCart, Sparkles, Store, X } from 'lucide-react';
import { Empty, PageTitle, Stat, money, supplierName, type PageProps } from '@/components/common';
import { EditItemModal, OrderItemModal } from '@/components/item-modals';
import { estimatedCover, formatCover, isLowCover, rejectSuggestion, suggestions } from '@/lib/procurement';

export function InventoryPage({ data, update, toast, startDraft }: PageProps & { startDraft: (skuId: string, qty: number) => void }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('All categories'), [sort, setSort] = useState('risk');
  const [modal, setModal] = useState<{ type: 'edit' | 'order'; id: string } | null>(null);
  const categories = ['All categories', ...Array.from(new Set(data.skus.map(s => s.category)))];
  const filtered = useMemo(() => data.skus.filter(s => (s.name.toLowerCase().includes(query.toLowerCase()) || s.category.toLowerCase().includes(query.toLowerCase())) && (category === 'All categories' || s.category === category))
    .sort((a, b) => sort === 'risk' ? estimatedCover(a) - estimatedCover(b) : a.name.localeCompare(b.name)), [data.skus, query, category, sort]);
  const tasks = suggestions(data);
  const sku = modal ? data.skus.find(s => s.id === modal.id) : undefined;
  const reject = (id: string, name: string) => { if (update(d => rejectSuggestion(d, id))) toast(`Suggestion for ${name} rejected. It stays dismissed until you reset the demo.`); };

  return <main className="content">
    <PageTitle title="Inventory" />
    <section className="panel ai-tasks" data-testid="panel-ai-tasks">
      <div className="panel-head"><div><div className="panel-title"><Sparkles size={15} /> AI suggested tasks</div><div className="panel-meta">Items with estimated cover of 7 days or less · you decide every order</div></div></div>
      {tasks.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Suggested qty</th><th>Total cost</th><th>Cover</th><th>Action</th></tr></thead><tbody>
        {tasks.map(t => <tr key={t.sku.id} data-testid={`row-task-${t.sku.id}`}>
          <td><div className="item-name">{t.sku.name}</div><div className="item-detail">{supplierName(data, t.sku.supplierId)}</div></td>
          <td className="mono">{t.quantity} {t.sku.unit}</td><td className="mono">{money(t.totalCost)}</td>
          <td><span className="forecast urgent">{formatCover(t.sku)}</span></td>
          <td><div className="row-actions start"><button className="button small primary" onClick={() => startDraft(t.sku.id, t.quantity)} data-testid={`button-approve-task-${t.sku.id}`}><Check /> Approve</button><button className="button small danger" onClick={() => reject(t.sku.id, t.sku.name)} data-testid={`button-reject-task-${t.sku.id}`}><X /> Reject</button></div></td>
        </tr>)}</tbody></table></div>
        : <Empty title="No suggested tasks" detail="Every item has more than 7 days of cover, or remaining suggestions were rejected." />}
    </section>
    <div className="stats" style={{ marginTop: 16 }}><Stat label="Tracked items" value={data.skus.length} foot="Across dry, chilled & fresh goods" icon={<Package />} /><Stat label="Est. on-hand value" value={money(data.skus.reduce((s, i) => s + i.onHand * i.unitCost, 0))} foot="Indicative MYR inventory cost" icon={<CircleDollarSign />} /><Stat label="Suppliers" value={data.suppliers.length} foot="Malaysian wholesale partners" icon={<Store />} /></div>
    <div className="toolbar"><label className="searchbox"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search stock or category" data-testid="input-inventory-search" /></label><select className="select" value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter category" data-testid="select-inventory-category">{categories.map(c => <option key={c}>{c}</option>)}</select><select className="select" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort inventory" data-testid="select-inventory-sort"><option value="risk">Sort: depletion risk</option><option value="name">Sort: name A-Z</option></select></div>
    <div className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>On hand</th><th>Average use</th><th>Estimated cover</th><th>Unit cost</th><th>Action</th></tr></thead><tbody>
      {filtered.map(i => { const low = isLowCover(i); return <tr key={i.id} data-testid={`row-inventory-${i.id}`}>
        <td><div className="item-name">{i.name}</div><div className="item-detail">{i.category} · {supplierName(data, i.supplierId)}</div></td>
        <td><b>{i.onHand}</b> {i.unit}<div className="stock-meter"><span className={low ? 'low' : ''} style={{ width: `${Math.min(100, (Number.isFinite(estimatedCover(i)) ? estimatedCover(i) : 14) / 14 * 100)}%` }} /></div></td>
        <td>{i.avgDailyDemand} {i.unit}/day</td>
        <td><span className={`forecast ${low ? 'cover-low' : ''}`} data-testid={`text-cover-${i.id}`}>{formatCover(i)}</span></td>
        <td>{money(i.unitCost)}/{i.unit}</td>
        <td><div className="row-actions start"><button className="button small" onClick={() => setModal({ type: 'edit', id: i.id })} data-testid={`button-edit-${i.id}`}><Pencil /> Edit</button><button className={`button small ${low ? 'primary' : ''}`} onClick={() => setModal({ type: 'order', id: i.id })} data-testid={`button-order-${i.id}`}><ShoppingCart /> Order</button></div></td>
      </tr>; })}
    </tbody></table>{filtered.length === 0 && <Empty title="No matching stock" detail="Try another item name or clear the category filter." />}</div></div>
    {modal?.type === 'edit' && sku && <EditItemModal key={sku.id} sku={sku} update={update} toast={toast} onClose={() => setModal(null)} />}
    {modal?.type === 'order' && sku && <OrderItemModal key={sku.id} sku={sku} supplier={supplierName(data, sku.supplierId)} onClose={() => setModal(null)} onConfirm={q => { setModal(null); startDraft(sku.id, q); }} />}
  </main>;
}
