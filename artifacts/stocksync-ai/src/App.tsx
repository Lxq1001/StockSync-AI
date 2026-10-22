import { useEffect, useRef, useState } from 'react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { RotateCcw } from 'lucide-react';
import { PageTitle, type Updater } from '@/components/common';
import { Shell } from '@/components/shell';
import { ImportModal } from '@/components/import-modal';
import { OverviewPage } from '@/pages/overview';
import { InventoryPage } from '@/pages/inventory';
import { OrdersPage } from '@/pages/orders';
import { TemplatePage } from '@/pages/template';
import { ActivityPage } from '@/pages/activity';
import { buildDraft, initialData, loadProvidedDataset, loadStore, saveStore, setDraft, type StoreData } from '@/lib/procurement';
import { datasetRevision, type DatasetBundle } from '@/lib/dataset';

const storage = (() => { try { return typeof window !== 'undefined' ? window.localStorage : undefined; } catch { return undefined; } })();

function Workspace() {
  const [boot] = useState(() => loadStore(storage));
  const [data, setData] = useState<StoreData>(boot.data);
  const dataRef = useRef(data);
  const [supplierRecipients, setSupplierRecipients] = useState<Record<string, string>>({});
  const [dataset, setDataset] = useState<DatasetBundle | null>(null);
  const [datasetError, setDatasetError] = useState('');
  const [datasetAttempt, setDatasetAttempt] = useState(0);
  const [notice, setNotice] = useState(boot.message ?? '');
  const [importing, setImporting] = useState(false);
  const [open, setOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia('(max-width: 680px)').matches);
  const [, navigate] = useLocation();
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(''), 7000); return () => window.clearTimeout(t); }, [notice]);
  useEffect(() => {
    let cancelled = false;
    setDatasetError('');
    fetch('/api/stock-dataset')
      .then(async response => {
        if (!response.ok) throw new Error('The provided datasets could not be loaded from the API.');
        const bundle = await response.json() as DatasetBundle;
        initialData(bundle); // Validate relationships and sales before exposing a load action.
        if (cancelled) return;
        setDataset(bundle);
        if (dataRef.current.skus.length === 0) {
          const next = loadProvidedDataset(dataRef.current, bundle);
          try { saveStore(storage, next); } catch (e) {
            setNotice(e instanceof Error ? e.message : 'Browser storage is unavailable.');
          }
          dataRef.current = next;
          setData(next);
        }
      })
      .catch(e => { if (!cancelled) setDatasetError(e instanceof Error ? e.message : 'Could not load the provided datasets.'); });
    return () => { cancelled = true; };
  }, [datasetAttempt]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/email/config')
      .then(async response => {
        const result = await response.json().catch(() => ({})) as { configured?: boolean; recipients?: Record<string, string> };
        if (!response.ok || !result.configured || !result.recipients || cancelled) return;
        setSupplierRecipients(result.recipients);
        const current = dataRef.current;
        const suppliers = current.suppliers.map(s => result.recipients?.[s.id] ? { ...s, email: result.recipients[s.id] } : s);
        const activeSupplier = suppliers.find(s => s.id === current.draft?.supplierId);
        const draft = current.draft && activeSupplier?.email ? { ...current.draft, to: activeSupplier.email } : current.draft;
        const next = { ...current, suppliers, draft };
        if (JSON.stringify(next) !== JSON.stringify(current)) {
          try {
            saveStore(storage, next);
            dataRef.current = next;
            setData(next);
          } catch (e) {
            setNotice(e instanceof Error ? e.message : 'Could not save supplier email settings.');
          }
        }
      })
      .catch(() => { /* The workspace remains usable without Gmail being configured. */ });
    return () => { cancelled = true; };
  }, [data.datasetRevision]);
  const toast = (s: string) => setNotice(s);
  const update: Updater = fn => {
    try { const next = fn(dataRef.current); if (next === dataRef.current) return true; saveStore(storage, next); dataRef.current = next; setData(next); return true; }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save this change.'); return false; }
  };
  const startDraft = (skuId: string, qty: number) => {
    if (dataRef.current.draft && !window.confirm('Replace the unsent email draft with a new one?')) { navigate('/template'); return; }
    if (update(d => setDraft(d, buildDraft(d, skuId, qty)))) navigate('/template');
  };
  const reset = () => {
    if (!dataset || !window.confirm('Reset this browser to the provided inventory and starting sales history? This clears local edits, orders, drafts and activity.')) return;
    const sample = initialData(dataset);
    sample.suppliers = sample.suppliers.map(s => supplierRecipients[s.id] ? { ...s, email: supplierRecipients[s.id] } : s);
    if (update(() => sample)) toast('Provided inventory and starting sales history restored.');
  };
  const loadDataset = () => {
    if (!dataset || !window.confirm('Load the provided inventory and starting sales history? Stock, prices, and demand for matching products will be replaced. Existing orders, drafts, and activity will be kept.')) return;
    if (update(current => loadProvidedDataset(current, dataset))) toast('Provided dataset loaded. Orders, drafts, and activity were kept.');
  };
  const props = { data, update, toast };
  return <Shell open={open} setOpen={setOpen} right={<button className="store-chip" onClick={reset} data-testid="button-reset-demo"><span className="online-dot" /> Local workspace <RotateCcw size={12} /></button>}>
    {datasetError && <div className="form-error" role="alert" style={{ margin: '16px 40px' }}>{datasetError} <button className="button small" onClick={() => setDatasetAttempt(n => n + 1)}>Retry</button></div>}
    {!dataset && !datasetError && <div role="status" style={{ margin: '16px 40px' }}>Loading provided datasets…</div>}
    {dataset && data.datasetRevision !== datasetRevision(dataset) && <section className="format-box" style={{ margin: '16px 40px 0' }} data-testid="panel-dataset-update">
      <b>Provided dataset available</b>
      <p>Your saved browser workspace has been kept. Load the {dataset.inventory.length} products and starting sales history when ready; existing orders and activity will remain.</p>
      <button className="button primary" onClick={loadDataset} data-testid="button-load-provided-dataset">Load provided dataset</button>
    </section>}
    <Switch>
      <Route path="/"><OverviewPage {...props} onImport={() => setImporting(true)} /></Route>
      <Route path="/user-portal"><Redirect to="/" replace /></Route>
      <Route path="/inventory"><InventoryPage {...props} startDraft={startDraft} /></Route>
      <Route path="/purchase-orders"><OrdersPage {...props} /></Route>
      <Route path="/template"><TemplatePage {...props} /></Route>
      <Route path="/activity"><ActivityPage data={data} /></Route>
      <Route><main className="content"><PageTitle eyebrow="Page not found" title="This view is not in the workspace" subtitle="Use the navigation to return to stock, orders or the activity log." /><Link href="/" className="button primary" data-testid="link-back-overview">Back to overview</Link></main></Route>
    </Switch>
    {importing && <ImportModal {...props} providedImportData={dataset?.importData} onClose={() => setImporting(false)} />}
    {notice && <div className="toast" role="status" data-testid="status-toast">{notice}</div>}
  </Shell>;
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Workspace /></WouterRouter>;
}
export default App;
