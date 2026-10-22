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
import { buildDraft, loadStore, saveStore, setDraft, type StoreData } from '@/lib/procurement';
import { activateProvidedWorkspace, mergeSupplierContacts, providedWorkspace, type ProvidedDataset } from '@/lib/provided-dataset';
import { readDatasetResponse } from '@/lib/dataset-request';

const storage = (() => { try { return typeof window !== 'undefined' ? window.localStorage : undefined; } catch { return undefined; } })();

function Workspace() {
  const [boot] = useState(() => loadStore(storage));
  const [data, setData] = useState<StoreData>(boot.data);
  const dataRef = useRef(data);
  const [notice, setNotice] = useState(boot.message ?? '');
  const [importing, setImporting] = useState(false);
  const [dataset, setDataset] = useState<ProvidedDataset | null>(null);
  const [datasetError, setDatasetError] = useState('');
  const [datasetAttempt, setDatasetAttempt] = useState(0);
  const [datasetReady, setDatasetReady] = useState(false);
  const [open, setOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia('(max-width: 680px)').matches);
  const [, navigate] = useLocation();
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(''), 7000); return () => window.clearTimeout(t); }, [notice]);
  const toast = (s: string) => setNotice(s);
  const update: Updater = fn => {
    try { const next = fn(dataRef.current); if (next === dataRef.current) return true; saveStore(storage, next); dataRef.current = next; setData(next); return true; }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save this change.'); return false; }
  };
  useEffect(() => {
    let cancelled = false;
    setDatasetError('');
    fetch('/api/stock-dataset').then(readDatasetResponse).then(bundle => {
      if (cancelled) return;
      const result = activateProvidedWorkspace(dataRef.current, bundle, storage);
      setDataset(bundle);
      dataRef.current = result.data; setData(result.data); setDatasetReady(true);
      if (result.message) toast(result.message);
    }).catch(error => { if (!cancelled) setDatasetError(error instanceof Error ? error.message : 'Could not load supplier contacts.'); });
    return () => { cancelled = true; };
  }, [datasetAttempt]);
  const startDraft = (skuId: string, qty: number) => {
    if (dataRef.current.draft && !window.confirm('Replace the unsent email draft with a new one?')) { navigate('/template'); return; }
    if (update(d => {
      const current = dataset ? mergeSupplierContacts(d, dataset) : d;
      return setDraft(current, buildDraft(current, skuId, qty));
    })) navigate('/template');
  };
  const reset = () => { if (dataset && window.confirm('Restore only the supplied datasets? Local edits, orders, drafts and activity will be erased.') && update(() => providedWorkspace(dataset))) toast('Supplied datasets restored.'); };
  const props = { data, update, toast };
  return <Shell open={open} setOpen={setOpen} right={<button className="store-chip" onClick={reset} disabled={!datasetReady} data-testid="button-reset-demo"><span className="online-dot" /> Local workspace <RotateCcw size={12} /></button>}>
    {datasetError && <div className="form-error" role="alert" style={{ margin: '16px 40px' }}>{datasetError} <button className="button small" onClick={() => setDatasetAttempt(n => n + 1)}>Retry</button></div>}
    {!datasetReady && !datasetError && <main className="content" role="status">Loading supplied datasets…</main>}
    {datasetReady && <Switch>
      <Route path="/"><OverviewPage {...props} onImport={() => setImporting(true)} /></Route>
      <Route path="/user-portal"><Redirect to="/" replace /></Route>
      <Route path="/inventory"><InventoryPage {...props} startDraft={startDraft} /></Route>
      <Route path="/purchase-orders"><OrdersPage {...props} /></Route>
      <Route path="/template"><TemplatePage {...props} /></Route>
      <Route path="/activity"><ActivityPage data={data} /></Route>
      <Route><main className="content"><PageTitle eyebrow="Page not found" title="This view is not in the workspace" subtitle="Use the navigation to return to stock, orders or the activity log." /><Link href="/" className="button primary" data-testid="link-back-overview">Back to overview</Link></main></Route>
    </Switch>}
    {importing && <ImportModal {...props} providedImportData={dataset?.importData} onClose={() => setImporting(false)} />}
    {notice && <div className="toast" role="status" data-testid="status-toast">{notice}</div>}
  </Shell>;
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Workspace /></WouterRouter>;
}
export default App;
