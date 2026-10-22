import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Activity, AlertTriangle, Boxes, Check, CheckCheck, ChevronDown, ClipboardList, Package, Search, Settings2, ShieldCheck, Store, Truck, X, RotateCcw, ArrowUpRight, CircleDollarSign, FileClock } from 'lucide-react';

type SKU = { id:string; name:string; category:string; onHand:number; unit:string; avgDailyDemand:number; leadTimeDays:number; reorderBuffer:number; supplierId:string; unitCost:number; recentSales:number[]; batchSize:number };

type ApiInventoryItem = {
  id: string;
  name: string;
  stock: number;
  threshold: number;
};



function mapApiInventoryItem(
  item: ApiInventoryItem,
  existing?: SKU,
  matchedSupplier?: Supplier,
): SKU {
  const demoDefaults: Record<
    string,
    {
      category: string;
      unit: string;
      avgDailyDemand: number;
      leadTimeDays: number;
      unitCost: number;
      batchSize: number;
      recentSales: number[];
    }
  > = {
    SKU2: {
      category: "Bakery",
      unit: "loaf",
      avgDailyDemand: 6,
      leadTimeDays: 1,
      unitCost: 4.5,
      batchSize: 12,
      recentSales: [5, 6, 7, 5, 6, 6, 7],
    },
    SKU3: {
      category: "Fresh protein",
      unit: "pack",
      avgDailyDemand: 2,
      leadTimeDays: 2,
      unitCost: 5.5,
      batchSize: 12,
      recentSales: [2, 2, 1, 3, 2, 2, 2],
    },
    SKU4: {
      category: "Dry goods",
      unit: "bag",
      avgDailyDemand: 1,
      leadTimeDays: 2,
      unitCost: 25,
      batchSize: 10,
      recentSales: [1, 1, 0, 1, 1, 1, 2],
    },
  };

  const defaults = demoDefaults[item.id];

  const avgDailyDemand =
    existing?.avgDailyDemand ??
    defaults?.avgDailyDemand ??
    1;

  const leadTimeDays =
    existing?.leadTimeDays ??
    matchedSupplier?.leadTimeDays ??
    defaults?.leadTimeDays ??
    3;

  
return {
  id: item.id,
  name: item.name,

  category: defaults?.category ?? existing?.category ?? "General",
  onHand: item.stock,
  unit: defaults?.unit ?? existing?.unit ?? "units",

  avgDailyDemand:
    defaults?.avgDailyDemand ?? existing?.avgDailyDemand ?? 1,

  leadTimeDays:
    defaults?.leadTimeDays ??
    existing?.leadTimeDays ??
    matchedSupplier?.leadTimeDays ??
    3,

  reorderBuffer: Math.max(
    0,
    item.threshold /
      (defaults?.avgDailyDemand ?? existing?.avgDailyDemand ?? 1) -
      (defaults?.leadTimeDays ?? existing?.leadTimeDays ?? 3),
  ),

  supplierId:
    matchedSupplier?.id ?? existing?.supplierId ?? "",

  unitCost: defaults?.unitCost ?? existing?.unitCost ?? 0,

  recentSales:
    defaults?.recentSales ?? existing?.recentSales ?? [],

  batchSize:
    defaults?.batchSize ?? existing?.batchSize ?? 1,
};
}

type Supplier = { id:string; name:string; contactMethod:string; MOQ:number; leadTimeDays:number };
type OrderStatus = 'Awaiting approval'|'Pending Delivery'|'Received'|'Rejected';
type PurchaseOrder = { id:string; itemId:string; supplierId:string; quantity:number; unitCost:number; totalCost:number; status:OrderStatus; createdAt:string; depletionDays:number; approvalDetails?:string; approvedBy?:string };
type AuditEntry = { id:string; timestamp:string; actor:string; action:string; details:string };
type StoreData = { skus:SKU[]; suppliers:Supplier[]; orders:PurchaseOrder[]; audit:AuditEntry[]; budgetCap:number };
type AppProps = { data:StoreData; update:(fn:(d:StoreData)=>StoreData)=>void; toast:(s:string)=>void; reset:()=>void; setSettings:()=>void };
const STORE_KEY='stocksync-demo-v1';
const initialData:StoreData={
 skus:[
  {id:'sku-001',name:'Jasmine rice',category:'Dry goods',onHand:18,unit:'kg',avgDailyDemand:5.2,leadTimeDays:2,reorderBuffer:2,supplierId:'sup-01',unitCost:4.8,recentSales:[4,5,6,5,4,6,6],batchSize:25},
  {id:'sku-002',name:'Fresh milk',category:'Chilled',onHand:9,unit:'L',avgDailyDemand:8.4,leadTimeDays:1,reorderBuffer:1,supplierId:'sup-02',unitCost:7.2,recentSales:[8,9,7,9,8,10,8],batchSize:30},
  {id:'sku-003',name:'Chicken breast',category:'Fresh protein',onHand:14,unit:'kg',avgDailyDemand:6.1,leadTimeDays:1,reorderBuffer:2,supplierId:'sup-02',unitCost:18.9,recentSales:[5,6,7,5,6,7,6],batchSize:20},
  {id:'sku-004',name:'Cooking oil',category:'Dry goods',onHand:31,unit:'L',avgDailyDemand:3.1,leadTimeDays:3,reorderBuffer:3,supplierId:'sup-03',unitCost:8.5,recentSales:[3,4,3,3,2,4,3],batchSize:24},
  {id:'sku-005',name:'Kopi beans, medium roast',category:'Beverage',onHand:4.5,unit:'kg',avgDailyDemand:1.4,leadTimeDays:4,reorderBuffer:1,supplierId:'sup-04',unitCost:42,recentSales:[1,2,1,1,2,1,2],batchSize:12},
  {id:'sku-006',name:'Brown sugar',category:'Dry goods',onHand:12,unit:'kg',avgDailyDemand:1.8,leadTimeDays:2,reorderBuffer:2,supplierId:'sup-01',unitCost:5.6,recentSales:[2,2,1,2,2,1,2],batchSize:20},
  {id:'sku-007',name:'Eggs, grade A',category:'Fresh protein',onHand:42,unit:'tray',avgDailyDemand:7.2,leadTimeDays:1,reorderBuffer:3,supplierId:'sup-03',unitCost:13.5,recentSales:[7,8,6,8,7,8,7],batchSize:30},
  {id:'sku-008',name:'Oat milk',category:'Chilled',onHand:16,unit:'carton',avgDailyDemand:2.3,leadTimeDays:2,reorderBuffer:2,supplierId:'sup-02',unitCost:11.9,recentSales:[2,3,2,2,3,2,2],batchSize:18}
 ],
 suppliers:[
  {id:'sup-01',name:'Sinar Pantry Supply',contactMethod:'Phone',MOQ:10,leadTimeDays:2},
  {id:'sup-02',name:'Pasar Segar Wholesale',contactMethod:'Phone',MOQ:6,leadTimeDays:1},
  {id:'sup-03',name:'Kedai Mart Trading',contactMethod:'Email',MOQ:12,leadTimeDays:2},
  {id:'sup-04',name:'Bukit Roast Cooperative',contactMethod:'Phone',MOQ:4,leadTimeDays:4}
 ],
 orders:[
  {id:'PO-2408',itemId:'sku-005',supplierId:'sup-04',quantity:8,unitCost:42,totalCost:336,status:'Awaiting approval',createdAt:'2025-04-18T08:35:00',depletionDays:3.2},
  {id:'PO-2407',itemId:'sku-002',supplierId:'sup-02',quantity:18,unitCost:7.2,totalCost:129.6,status:'Awaiting approval',createdAt:'2025-04-18T07:55:00',depletionDays:1.1},
  {id:'PO-2406',itemId:'sku-001',supplierId:'sup-01',quantity:24,unitCost:4.8,totalCost:115.2,status:'Pending Delivery',createdAt:'2025-04-17T14:20:00',depletionDays:3.4,approvedBy:'Aina Rahman'},
  {id:'PO-2405',itemId:'sku-003',supplierId:'sup-02',quantity:12,unitCost:18.9,totalCost:226.8,status:'Received',createdAt:'2025-04-16T11:10:00',depletionDays:2.3,approvedBy:'Aina Rahman'}
 ],
 audit:[
  {id:'log-1',timestamp:'2025-04-18T08:35:00',actor:'StockSync AI',action:'Suggested order',details:'8 kg Kopi beans, medium roast · Bukit Roast Cooperative · RM 336.00'},
  {id:'log-2',timestamp:'2025-04-18T07:55:00',actor:'StockSync AI',action:'Suggested order',details:'18 L Fresh milk · Pasar Segar Wholesale · RM 129.60'},
  {id:'log-3',timestamp:'2025-04-17T14:20:00',actor:'Aina Rahman',action:'Approved order',details:'PO-2406 · 24 kg Jasmine rice · RM 115.20 · Pending Delivery'},
  {id:'log-4',timestamp:'2025-04-16T11:10:00',actor:'Aina Rahman',action:'Marked received',details:'PO-2405 · 12 kg Chicken breast · received at store'}
 ],
 budgetCap:500
};
const money=(n:number)=>`RM ${n.toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const when=(s:string)=>new Date(s).toLocaleString('en-MY',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false});
const now=()=>new Date().toISOString();
function loadData():StoreData { try { const stored=localStorage.getItem(STORE_KEY); if(stored) return JSON.parse(stored) as StoreData; } catch {} return initialData; }

function App(){
 const [data,setData]=useState<StoreData>(loadData);

  
useEffect(() => {
  let cancelled = false;

  async function loadInventoryFromApi() {
    try {
      const response = await fetch("/api/inventory");

      if (!response.ok) {
        throw new Error(
          `Inventory API failed: ${response.status}`,
        );
      }

      const items: ApiInventoryItem[] = await response.json();

      if (!Array.isArray(items)) {
        throw new Error("Inventory API did not return an array");
      }

      if (cancelled) return;

      
setData((current) => {
  const skuMatches: Record<string, string> = {
    SKU1: "sku-002", // Fresh Milk -> Fresh milk
    SKU5: "sku-004", // Cooking Oil (1L) -> Cooking oil
  };

  const supplierMatches: Record<string, string> = {
  SKU1: "sup-02", // Fresh Milk
  SKU2: "sup-02", // Wholemeal Bread — demo assumption
  SKU3: "sup-03", // Eggs — demo assumption
  SKU4: "sup-01", // Rice — demo assumption
  SKU5: "sup-03", // Cooking Oil
};

  const skus = items.map((item) => {
    const oldId = skuMatches[item.id];

    // Look up original demo data, even after API data was saved.
    const existing =
      (oldId
        ? initialData.skus.find((sku) => sku.id === oldId)
        : undefined) ??
      current.skus.find((sku) => sku.id === item.id);

    const supplierId = supplierMatches[item.id];
    const supplier = supplierId
      ? current.suppliers.find((s) => s.id === supplierId)
      : undefined;

    const mapped = mapApiInventoryItem(
      item,
      existing,
      supplier,
    );

    return {
      ...mapped,
      supplierId: supplier?.id ?? existing?.supplierId ?? "",
    };
  });

  return {
    ...current,
    skus,
  };
});

    } catch (error) {
      console.error(
        "Unable to load inventory from API:",
        error,
      );
    }
  }

  void loadInventoryFromApi();

  return () => {
    cancelled = true;
  };
}, []);

 const [notice,setNotice]=useState('');
 const [modal,setModal]=useState<{type:'edit'|'reject'|'dispatch'|'settings';id?:string}|null>(null);
 const pageName=usePageName();
 useEffect(()=>{localStorage.setItem(STORE_KEY,JSON.stringify(data));},[data]);
 useEffect(()=>{if(!notice)return;const t=window.setTimeout(()=>setNotice(''),3200);return()=>window.clearTimeout(t)},[notice]);
 const update=(fn:(d:StoreData)=>StoreData)=>setData(d=>fn(d));
 const toast=(s:string)=>setNotice(s);
 const reset=()=>{localStorage.removeItem(STORE_KEY);setData(initialData);toast('Demo data restored to the original sample.');};
 const setSettings=()=>setModal({type:'settings'});
 const props={data,update,toast,reset,setSettings,openModal:setModal};
 return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/,'')}>
  <div className="app-shell">
   <Sidebar/>
   <div className="main-area">
    <header className="topbar"><div className="crumb">Operations / <b>{pageName}</b></div><div className="top-actions"><div className="store-chip"><span className="online-dot"/> Demo workspace <ChevronDown size={13}/></div></div></header>
    <Switch>
     <Route path="/" component={()=> <Overview {...props}/>} />
     <Route path="/inventory" component={()=> <Inventory {...props}/>} />
     <Route path="/purchase-orders" component={()=> <OrdersPage {...props}/>} />
     <Route path="/activity" component={()=> <ActivityPage {...props}/>} />
     <Route component={()=> <NotFound/>}/>
    </Switch>
   </div>
   {modal&&<ActionModal modal={modal} close={()=>setModal(null)} data={data} update={update} toast={toast} reset={reset}/>}
   {notice&&<div className="toast" role="status" data-testid="status-toast">{notice}</div>}
  </div>
 </WouterRouter>;
}
function usePageName(){const [path]=useLocation();return path==='/'?'Overview':path==='/inventory'?'Inventory':path==='/purchase-orders'?'Purchase orders':path==='/activity'?'Activity log':'Not found'}
const navItems=[{path:'/',label:'Overview',icon:Store},{path:'/inventory',label:'Inventory',icon:Boxes},{path:'/purchase-orders',label:'Purchase orders',icon:ClipboardList},{path:'/activity',label:'Activity log',icon:Activity}];
function Sidebar(){const [path]=useLocation();return <aside className="sidebar"><div className="brand"><div className="brand-mark">S</div><div><div className="brand-name">StockSync AI</div><span className="brand-sub">STORE OPERATIONS</span></div></div><div className="nav-caption">Workspace</div><nav className="nav-list" aria-label="Main navigation">{navItems.map(({path:p,label,icon:Icon})=><Link key={p} href={p} className={`nav-link ${path===p?'active':''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ','-')}`}><Icon/><span>{label}</span></Link>)}</nav><div className="side-bottom"><div className="demo-flag"><strong>DEMO · SYNTHETIC DATA</strong>Supplier contact and dispatch are simulated. No message will be sent.</div><div className="side-user"><div className="user-avatar">AR</div><div><div className="user-label">Aina Rahman</div><div className="user-role">Store manager · approval role</div></div></div></div></aside>}
function PageTitle({eyebrow,title,subtitle,right}:{eyebrow:string;title:string;subtitle:string;right?:ReactNode}){return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{right}</div>}
function Overview({data,update,toast,openModal}:AppProps&{openModal:(m:{type:'edit'|'reject'|'dispatch'|'settings';id?:string}|null)=>void}){
 const awaiting=data.orders.filter(o=>o.status==='Awaiting approval'),atRisk=data.skus.filter(i=>i.onHand/i.avgDailyDemand<=i.leadTimeDays+i.reorderBuffer),pendingTotal=awaiting.reduce((s,o)=>s+o.totalCost,0);
 return <main className="content"><PageTitle eyebrow="Friday, 18 April · Kuala Lumpur" title="Good morning, Aina" subtitle="A clear view of what needs attention before the next service." right={<button className="button" onClick={()=>openModal({type:'settings'})} data-testid="button-budget-settings"><Settings2/> Controls</button>}/>
 <div className="warning" style={{marginBottom:18}}><ShieldCheck/><span><b>Manager approval stays in your hands.</b> AI suggestions are estimates from synthetic sales data. Review each quantity and budget before approval; no supplier is contacted.</span></div>
 <div className="stats">
  <Stat label="Needs your review" value={awaiting.length} foot={`${money(pendingTotal)} awaiting approval`} icon={<FileClock/>}/>
  <Stat label="Stock at risk" value={atRisk.length} foot="At or below lead-time cover" icon={<AlertTriangle/>}/>
  <Stat label="Pending delivery" value={data.orders.filter(o=>o.status==='Pending Delivery').length} foot="Approved · dispatch simulated" icon={<Truck/>}/>
  <Stat label="Inventory items" value={data.skus.length} foot="Across 4 local suppliers" icon={<Boxes/>}/>
 </div>
 <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><div className="panel-title">Approval inbox</div><div className="panel-meta">Suggestions waiting for a manager decision</div></div><Link href="/purchase-orders" className="inline-link" data-testid="link-all-orders">View all <ArrowUpRight size={13}/></Link></div>
  {awaiting.length? <div className="order-list">{awaiting.map(o=><div className="order-row" key={o.id}><div><div className="item-name">{itemName(data,o.itemId)}</div><div className="item-detail">{supplierName(data,o.supplierId)} · {o.quantity} {itemUnit(data,o.itemId)}</div></div><div className="mono">{money(o.totalCost)}</div><div className="hide-small"><span className="pill">{o.status}</span></div><div className="hide-small item-detail">{o.depletionDays.toFixed(1)}d cover</div><div className="row-actions"><button className="button small" onClick={()=>openModal({type:'edit',id:o.id})} data-testid={`button-edit-${o.id}`}>Review</button><button className="button small primary" onClick={()=>approveOrder(data,update,o,toast)} data-testid={`button-approve-${o.id}`}><Check/> Approve</button></div></div>)}</div>:<Empty title="Inbox is clear" detail="New reorder suggestions will appear here when stock approaches its buffer."/>}
 </section>
 <section className="panel"><div className="panel-head"><div><div className="panel-title">Stock to watch</div><div className="panel-meta">Based on recent average daily usage</div></div><Link href="/inventory" className="inline-link" data-testid="link-stock-watch">Inventory <ArrowUpRight size={13}/></Link></div>
  <div className="risk-list">{atRisk.slice(0,4).map(i=><div className="risk-row" key={i.id}><div className="risk-icon"><AlertTriangle/></div><div style={{flex:1}}><div className="risk-name">{i.name}</div><div className="risk-detail">{i.onHand} {i.unit} left · approx. {(i.onHand/i.avgDailyDemand).toFixed(1)} days at current use</div></div><div className="mono" style={{color:'#916833'}}>{(i.onHand/i.avgDailyDemand).toFixed(1)}d</div></div>)}</div>
 </section></div>
 <section className="panel" style={{marginTop:17}}><div className="panel-head"><div><div className="panel-title">Orders in motion</div><div className="panel-meta">Approved orders wait here until a manager simulates receipt</div></div><Link href="/purchase-orders" className="inline-link" data-testid="link-view-order-status">Order status <ArrowUpRight size={13}/></Link></div>
  {data.orders.some(o=>o.status==='Pending Delivery')?<div className="order-list">{data.orders.filter(o=>o.status==='Pending Delivery').map(o=><div className="order-row" key={o.id}><div><div className="item-name">{itemName(data,o.itemId)}</div><div className="item-detail">{o.id} · Approved by {o.approvedBy||'manager'}</div></div><div className="mono">{money(o.totalCost)}</div><div><span className="pill delivery">{o.status}</span></div><div className="hide-small item-detail">Supplier not contacted</div><div className="row-actions"><button className="button small" onClick={()=>openModal({type:'dispatch',id:o.id})} data-testid={`button-simulate-dispatch-${o.id}`}><Truck/> Simulate receipt</button></div></div>)}</div>:<Empty title="No deliveries in progress" detail="Approved purchase orders will be listed here."/>}
 </section>
 </main>
}
function Stat({label,value,foot,icon}:{label:string;value:number|string;foot:string;icon:ReactNode}){return <div className="stat"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span className="stat-label">{label}</span><span style={{color:'#638277'}}>{icon}</span></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></div>}
function Inventory({data,update,toast}:AppProps){const [query,setQuery]=useState(''),[category,setCategory]=useState('All categories'),[sort,setSort]=useState('risk');
 const categories=['All categories',...Array.from(new Set(data.skus.map(s=>s.category)))];
 const filtered=useMemo(()=>data.skus.filter(s=>(s.name.toLowerCase().includes(query.toLowerCase())||s.category.toLowerCase().includes(query.toLowerCase()))&&(category==='All categories'||s.category===category)).sort((a,b)=>sort==='risk'?(a.onHand/a.avgDailyDemand)-(b.onHand/b.avgDailyDemand):a.name.localeCompare(b.name)),[data.skus,query,category,sort]);
 const suggest=(sku:SKU)=>{const existing=data.orders.some(o=>o.itemId===sku.id&&o.status==='Awaiting approval');if(existing){toast('An approval suggestion already exists for this item.');return}const q=Math.min(sku.batchSize*2,Math.max(sku.batchSize,Math.ceil((sku.avgDailyDemand*(sku.leadTimeDays+sku.reorderBuffer)-sku.onHand)/sku.batchSize)*sku.batchSize));const po:PurchaseOrder={id:`PO-${Math.floor(2409+Math.random()*500)}`,itemId:sku.id,supplierId:sku.supplierId,quantity:q,unitCost:sku.unitCost,totalCost:q*sku.unitCost,status:'Awaiting approval',createdAt:now(),depletionDays:sku.onHand/sku.avgDailyDemand};update(d=>({...d,orders:[po,...d.orders],audit:[{id:crypto.randomUUID(),timestamp:now(),actor:'Aina Rahman',action:'Created suggestion',details:`${po.id} · ${q} ${sku.unit} ${sku.name} · ${money(po.totalCost)}`},...d.audit]}));toast(`Draft suggestion created for ${sku.name}; manager approval required.`)};
 return <main className="content"><PageTitle eyebrow="Stock levels & forecasts" title="Inventory" subtitle="A practical view of stock cover, reorder timing and suggested quantities." right={<span className="pill delivery">Synthetic sales data</span>}/>
 <div className="warning"><AlertTriangle/><span>Forecasts are directional estimates, not guarantees. Demand uses recent average daily sales; actual usage, deliveries and supplier availability can vary.</span></div>
 <div className="stats" style={{marginTop:16}}><Stat label="Tracked items" value={data.skus.length} foot="Across dry, chilled & fresh goods" icon={<Package/>}/><Stat label="At reorder point" value={data.skus.filter(i=>i.onHand/i.avgDailyDemand<=i.leadTimeDays+i.reorderBuffer).length} foot="Stock cover within lead + buffer" icon={<AlertTriangle/>}/><Stat label="Est. on-hand value" value={money(data.skus.reduce((s,i)=>s+i.onHand*i.unitCost,0))} foot="Indicative MYR inventory cost" icon={<CircleDollarSign/>}/><Stat label="Suppliers" value={data.suppliers.length} foot="Malaysian wholesale partners" icon={<Store/>}/></div>
 <div className="toolbar"><label className="searchbox"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search stock or category" data-testid="input-inventory-search"/></label><select className="select" value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filter category" data-testid="select-inventory-category">{categories.map(c=><option key={c}>{c}</option>)}</select><select className="select" value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort inventory" data-testid="select-inventory-sort"><option value="risk">Sort: depletion risk</option><option value="name">Sort: name A–Z</option></select></div>
 <div className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>On hand</th><th>Average use</th><th>Estimated cover</th><th>Reorder point</th><th>Unit cost</th><th>Action</th></tr></thead><tbody>{filtered.map(i=>{const days=i.onHand/i.avgDailyDemand,threshold=i.avgDailyDemand*(i.leadTimeDays+i.reorderBuffer),risk=days<=i.leadTimeDays+i.reorderBuffer;return <tr key={i.id} data-testid={`row-inventory-${i.id}`}><td><div className="item-name">{i.name}</div><div className="item-detail">{i.category} · {supplierName(data,i.supplierId)}</div></td><td><b>{i.onHand}</b> {i.unit}<div className="stock-meter"><span className={risk?'low':''} style={{width:`${Math.min(100,i.onHand/Math.max(threshold*2,1)*100)}%`}}/></div></td><td>{i.avgDailyDemand} {i.unit}/day</td><td><span className={`forecast ${risk?'urgent':''}`}>{days.toFixed(1)} days</span></td><td>{threshold.toFixed(1)} {i.unit}</td><td>{money(i.unitCost)}/{i.unit}</td><td><button className={`button small ${risk?'primary':''}`} onClick={()=>suggest(i)} data-testid={`button-suggest-${i.id}`}>{risk?'Draft order':'Suggest order'}</button></td></tr>})}</tbody></table>{filtered.length===0&&<Empty title="No matching stock" detail="Try another item name or clear the category filter."/>}</div></div>
 </main>
}
function OrdersPage({data,update,toast,openModal}:AppProps&{openModal:(m:{type:'edit'|'reject'|'dispatch'|'settings';id?:string}|null)=>void}){const [query,setQuery]=useState(''),[status,setStatus]=useState('All statuses');
 const statuses=['All statuses','Awaiting approval','Pending Delivery','Received','Rejected'];const orders=useMemo(()=>data.orders.filter(o=>(status==='All statuses'||o.status===status)&&(`${o.id} ${itemName(data,o.itemId)} ${supplierName(data,o.supplierId)}`.toLowerCase().includes(query.toLowerCase()))),[data,query,status]);
 const statusAction=(o:PurchaseOrder)=>{if(o.status==='Awaiting approval'){return <><button className="button small" onClick={()=>openModal({type:'edit',id:o.id})} data-testid={`button-review-${o.id}`}>Review</button><button className="button small primary" onClick={()=>approveOrder(data,update,o,toast)} data-testid={`button-approve-order-${o.id}`}><Check/> Approve</button><button className="button small danger" onClick={()=>openModal({type:'reject',id:o.id})} data-testid={`button-reject-${o.id}`}>Reject</button></>}if(o.status==='Pending Delivery')return <button className="button small" onClick={()=>openModal({type:'dispatch',id:o.id})} data-testid={`button-dispatch-${o.id}`}><Truck/> Simulate receipt</button>;return <span className="item-detail">{o.status==='Received'?'Stock received':'No further action'}</span>};
 return <main className="content"><PageTitle eyebrow="Order tracking" title="Purchase orders" subtitle="Review suggestions, keep approved orders visible, and simulate local delivery updates." right={<button className="button" onClick={()=>openModal({type:'settings'})} data-testid="button-order-controls"><Settings2/> Budget controls</button>}/>
 <div className="warning"><ShieldCheck/><span>Approvals are manager-only in this demo. Approval changes status to Pending Delivery only; simulated receipt is a separate manager action. Nothing is sent to suppliers.</span></div>
 <div className="toolbar"><label className="searchbox"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search item, supplier or PO" data-testid="input-order-search"/></label><select className="select" value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter order status" data-testid="select-order-status">{statuses.map(s=><option key={s}>{s}</option>)}</select><span className="item-detail" style={{marginLeft:'auto'}}>{orders.length} order{orders.length===1?'':'s'} shown</span></div>
 <div className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>Purchase order</th><th>Supplier</th><th>Qty</th><th>Total</th><th>Status</th><th>Created</th><th>Manager action</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} data-testid={`row-order-${o.id}`}><td><div className="item-name">{o.id}</div><div className="item-detail">{itemName(data,o.itemId)}</div></td><td>{supplierName(data,o.supplierId)}</td><td>{o.quantity} {itemUnit(data,o.itemId)}</td><td className="mono">{money(o.totalCost)}</td><td><span className={`pill ${o.status==='Pending Delivery'?'delivery':o.status==='Received'?'received':o.status==='Rejected'?'rejected':''}`}>{o.status}</span></td><td className="item-detail">{when(o.createdAt)}</td><td><div className="row-actions">{statusAction(o)}</div></td></tr>)}</tbody></table>{orders.length===0&&<Empty title="No orders match" detail="Try another search or choose a different status."/>}</div></div>
 </main>
}
function ActivityPage({data}:AppProps){const [query,setQuery]=useState(''),filtered=data.audit.filter(a=>`${a.actor} ${a.action} ${a.details}`.toLowerCase().includes(query.toLowerCase()));return <main className="content"><PageTitle eyebrow="Decision history" title="Activity log" subtitle="A chronological record of local demo decisions. Each approval and status change stays visible." right={<span className="pill delivery">Local audit trail</span>}/>
 <div className="warning"><Activity/><span>This log is stored in this browser only. Entries document simulated demo actions; no external supplier communication takes place.</span></div>
 <div className="toolbar"><label className="searchbox"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search actor or activity" data-testid="input-activity-search"/></label><span className="item-detail" style={{marginLeft:'auto'}}>{filtered.length} entries</span></div>
 <div className="panel"><div className="panel-head"><div><div className="panel-title">Recent activity</div><div className="panel-meta">Newest entries first · times shown in local browser time</div></div><FileClock size={17} color="#638277"/></div>{filtered.length?<div>{filtered.map(a=><div className="activity-row" key={a.id} data-testid={`row-activity-${a.id}`}><div className="item-detail">{when(a.timestamp)}</div><div className="actor">{a.actor}</div><div><div className="activity-action">{a.action}</div><div className="activity-detail">{a.details}</div></div></div>)}</div>:<Empty title="No activity found" detail="When you approve or update an order, the decision will be recorded here."/>}</div>
 </main>}
function ActionModal({modal,close,data,update,toast,reset}:{modal:{type:'edit'|'reject'|'dispatch'|'settings';id?:string};close:()=>void;data:StoreData;update:(fn:(d:StoreData)=>StoreData)=>void;toast:(s:string)=>void;reset:()=>void}){
 const order=data.orders.find(o=>o.id===modal.id);const sku=order?data.skus.find(s=>s.id===order.itemId):undefined;
 const [qty,setQty]=useState(order?.quantity||0),[note,setNote]=useState(''),[cap,setCap]=useState(data.budgetCap);
 if(modal.type==='settings')return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading"><div className="modal-head"><div><h2 id="modal-heading">Manager controls</h2><p className="modal-copy">Set a hard MYR cap for every suggested order.</p></div><button className="button small" onClick={close} aria-label="Close controls" data-testid="button-close-settings"><X/></button></div><div className="modal-body"><div className="warning"><AlertTriangle/><span>Approval is blocked above this MYR cap. Reduce the order quantity or update the cap before a manager can approve it. Every approval remains explicit.</span></div><div className="budget-settings"><div><b style={{fontSize:12}}>Hard per-order budget cap</b><div className="item-detail" style={{marginTop:4}}>Synthetic MYR approval guardrail</div></div><label className="mono">RM <input type="number" min="1" max="50000" value={cap} onChange={e=>setCap(Number(e.target.value))} data-testid="input-budget-cap"/></label></div><div className="budget-settings"><div><b style={{fontSize:12}}>Restore original demo</b><div className="item-detail" style={{marginTop:4}}>Resets all local edits, orders and audit entries.</div></div><button className="button small" onClick={()=>{reset();close()}} data-testid="button-reset-demo-data"><RotateCcw size={14}/> Reset demo</button></div></div><div className="modal-foot"><button className="button" onClick={close} data-testid="button-cancel-settings">Cancel</button><button className="button primary" onClick={()=>{update(d=>({...d,budgetCap:Math.max(1,cap)}));close();toast(`Hard approval cap set to ${money(cap)}.`)}} data-testid="button-save-budget">Save control</button></div></section></div>;
 if(!order||!sku)return null;
 const closeLog=(action:string,details:string,status?:OrderStatus)=>{update(d=>({...d,orders:d.orders.map(o=>o.id===order.id?{...o,...(status?{status}:{}),...(modal.type==='edit'?{quantity:qty,totalCost:qty*o.unitCost,approvalDetails:note||'Quantity reviewed by manager'}:{})}:o),audit:[{id:crypto.randomUUID(),timestamp:now(),actor:'Aina Rahman',action,details},...d.audit]}));close();toast(`${order.id} ${action.toLowerCase()}.`);};
 if(modal.type==='dispatch')return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading"><div className="modal-head"><div><h2 id="modal-heading">Simulate delivery</h2><p className="modal-copy">This is a local demo status change only.</p></div><button className="button small" onClick={close} aria-label="Close" data-testid="button-close-dispatch"><X/></button></div><div className="modal-body"><div className="warning"><Truck/><span><b>No dispatch or supplier message will be sent.</b> Marking received will add the ordered quantity to local stock and create an audit entry.</span></div><div className="budget-settings"><div><b>{sku.name}</b><div className="item-detail">{order.id} · {supplierName(data,order.supplierId)}</div></div><span className="mono">+{order.quantity} {sku.unit}</span></div></div><div className="modal-foot"><button className="button" onClick={close} data-testid="button-cancel-dispatch">Cancel</button><button className="button primary" onClick={()=>{update(d=>({...d,orders:d.orders.map(o=>o.id===order.id?{...o,status:'Received'}:o),skus:d.skus.map(s=>s.id===sku.id?{...s,onHand:s.onHand+order.quantity}:s),audit:[{id:crypto.randomUUID(),timestamp:now(),actor:'Aina Rahman',action:'Simulated delivery received',details:`${order.id} · ${sku.name} · +${order.quantity} ${sku.unit} added to local stock`},...d.audit]}));close();toast('Simulated receipt complete. Local stock was updated.')}} data-testid="button-confirm-simulated-receipt"><CheckCheck/> Mark received</button></div></section></div>;
 if(modal.type==='reject')return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading"><div className="modal-head"><div><h2 id="modal-heading">Reject suggestion?</h2><p className="modal-copy">The order will remain in your history as rejected.</p></div><button className="button small" onClick={close} aria-label="Close" data-testid="button-close-reject"><X/></button></div><div className="modal-body"><div className="budget-settings"><b>{sku.name}</b><span className="mono">{money(order.totalCost)}</span></div><div className="field"><label htmlFor="reject-note">Reason (optional)</label><textarea id="reject-note" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a short reason for the audit log" data-testid="input-reject-note"/></div></div><div className="modal-foot"><button className="button" onClick={close} data-testid="button-cancel-reject">Keep suggestion</button><button className="button danger" onClick={()=>closeLog('Rejected suggestion',`${order.id} · ${sku.name} · ${note||'No reason added'}`,'Rejected')} data-testid="button-confirm-reject">Reject suggestion</button></div></section></div>;
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading"><div className="modal-head"><div><h2 id="modal-heading">Review suggested order</h2><p className="modal-copy">Adjust the quantity before making a manager decision.</p></div><button className="button small" onClick={close} aria-label="Close" data-testid="button-close-review"><X/></button></div><div className="modal-body"><div className="budget-settings"><div><b>{sku.name}</b><div className="item-detail">{supplierName(data,order.supplierId)} · {money(order.unitCost)} / {sku.unit}</div></div><span className="pill">{order.status}</span></div><div className="field"><label htmlFor="order-quantity">Quantity ({sku.unit}) · max {sku.batchSize*2} ({sku.batchSize} historical batch × 2)</label><input id="order-quantity" type="number" min={1} max={sku.batchSize*2} step="1" value={qty} onChange={e=>setQty(Math.min(sku.batchSize*2,Math.max(1,Number(e.target.value))))} data-testid="input-order-quantity"/></div><div className="field"><label htmlFor="manager-note">Manager note (optional)</label><textarea id="manager-note" rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Why does this quantity make sense?" data-testid="input-manager-note"/></div><div className="budget-settings"><span className="item-name">Estimated total</span><strong className="mono">{money(qty*order.unitCost)}</strong></div>{qty*order.unitCost>data.budgetCap&&<div className="warning"><AlertTriangle/><span>Above your {money(data.budgetCap)} review cap. Review carefully; approval is still an explicit manager action.</span></div>}</div><div className="modal-foot"><button className="button" onClick={()=>closeLog('Edited suggestion',`${order.id} · ${sku.name} · quantity set to ${qty} ${sku.unit}${note?` · ${note}`:''}`)} data-testid="button-save-order-edit">Save review</button><button className="button primary" onClick={()=>{if(qty*order.unitCost>data.budgetCap){toast('This order exceeds the review cap. Reduce the quantity or confirm with the manager before approval.');return}approveOrder(data,update,{...order,quantity:qty,totalCost:qty*order.unitCost},toast,note);close()}} data-testid="button-approve-reviewed-order"><Check/> Approve {money(qty*order.unitCost)}</button></div></section></div>;
}
function approveOrder(data:StoreData,update:(fn:(d:StoreData)=>StoreData)=>void,o:PurchaseOrder,toast:(s:string)=>void,note?:string){if(o.status!=='Awaiting approval'){toast('Only a pending suggestion can be approved.');return}if(o.totalCost>data.budgetCap){toast(`Above ${money(data.budgetCap)} review cap. Review or adjust before approval.`);return}update(d=>({...d,orders:d.orders.map(x=>x.id===o.id?{...x,quantity:o.quantity,totalCost:o.totalCost,status:'Pending Delivery',approvedBy:'Aina Rahman',approvalDetails:note||'Approved by manager'}:x),audit:[{id:crypto.randomUUID(),timestamp:now(),actor:'Aina Rahman',action:'Approved order',details:`${o.id} · ${itemName(data,o.itemId)} · ${o.quantity} ${itemUnit(data,o.itemId)} · ${money(o.totalCost)} · Pending Delivery${note?` · ${note}`:''}`},...d.audit]}));toast(`${o.id} approved. It is now Pending Delivery; dispatch remains simulated.`)}
function Empty({title,detail}:{title:string;detail:string}){return <div className="blank"><div className="blank-mark"><Package/></div><b style={{display:'block',color:'#35584e',marginBottom:5}}>{title}</b>{detail}</div>}
function itemName(d:StoreData,id:string){return d.skus.find(x=>x.id===id)?.name||'Unknown item'}
function itemUnit(d:StoreData,id:string){return d.skus.find(x=>x.id===id)?.unit||'unit'}
function supplierName(d:StoreData,id:string){return d.suppliers.find(x=>x.id===id)?.name||'Unknown supplier'}
function NotFound(){return <main className="content"><PageTitle eyebrow="Page not found" title="This view is not in the workspace" subtitle="Use the navigation to return to stock, orders or the activity log."/><Link href="/" className="button primary" data-testid="link-back-overview">Back to overview</Link></main>}
export default App;