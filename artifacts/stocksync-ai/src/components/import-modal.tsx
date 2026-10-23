import { useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { Modal, type PageProps } from '@/components/common';
import { MANAGER } from '@/lib/procurement';
import { applyImport, IMPORT_MAX_BYTES, parseSalesFile, previewImport, sampleCsv, type ImportPreview } from '@/lib/sales-import';

export function ImportModal({ data, update, toast, onClose, providedImportData }: PageProps & { onClose: () => void; providedImportData?: unknown[] }) {
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    setErrors([]); setPreview(null); setFileName(file?.name ?? '');
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (lower.includes('.env')) { setErrors(['Environment files are not accepted.']); return; }
    if (!lower.endsWith('.csv') && !lower.endsWith('.json')) { setErrors(['Choose a .csv or .json file.']); return; }
    if (file.size > IMPORT_MAX_BYTES) { setErrors([`File is larger than ${IMPORT_MAX_BYTES / 1024} KB.`]); return; }
    setBusy(true);
    try {
      const result = parseSalesFile(file.name, await file.text(), data.skus);
      if (result.ok) setPreview(previewImport(data, result.rows)); else setErrors(result.errors);
    } catch (e) { setErrors([`Could not read the file: ${e instanceof Error ? e.message : 'unknown error'}`]); }
    finally { setBusy(false); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([sampleCsv(data.skus)], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'stocksync-sample-sales.csv'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const apply = () => {
    if (!preview) return;
    if (update(d => applyImport(d, preview, MANAGER))) { toast(`Imported ${preview.rows} sales rows. On-hand stock, demand, and suggestions updated.`); onClose(); }
  };

  return <Modal title="Import sales transactions" copy="Deducts sales from available stock without allowing on-hand quantity below zero, then recalculates recent daily demand." onClose={onClose} testId="modal-import" wide
    footer={<><button className="button" onClick={onClose} data-testid="button-cancel-import">Cancel</button><button className="button primary" disabled={!preview || busy} onClick={apply} data-testid="button-apply-import">Apply import</button></>}>
    <div className="format-box" data-testid="text-import-formats">
      <b>Accepted formats only</b>
      <div><span className="mono">CSV</span> with header <code>itemId,date,quantity</code> (quoted fields allowed)</div>
      <div><span className="mono">JSON</span> array of <code>{'{ "itemId": "SKU2", "date": "2026-10-12", "quantity": 9 }'}</code>, or receipts with <code>sales_id</code>, <code>orderDate</code>, and <code>items</code> (an object or list).</div>
      <div className="item-detail">Dates as YYYY-MM-DD, quantity 0 or more, itemId must match an inventory item. Max {IMPORT_MAX_BYTES / 1024} KB. This is not a database connection; SQL dumps and other formats are not supported. If any row is invalid, nothing is imported.</div>
      <div className="item-detail">Known item IDs: {data.skus.map(s => s.id).join(', ')}</div>
      <button type="button" className="inline-link link-button" onClick={download} data-testid="button-download-sample"><Download size={13} /> Download sample CSV</button>
      <div className="item-detail">The sample uses small one-unit sales and adjusts to current stock, leaving at least one unit on hand.</div>
    </div>
    <label className="file-drop" data-testid="label-import-file">
      <FileUp size={18} /><span>{fileName || 'Choose a .csv or .json file'}</span>
      <input type="file" accept=".csv,.json,text/csv,application/json" onChange={e => { void onFile(e.target.files?.[0]); e.target.value = ''; }} data-testid="input-import-file" />
    </label>
    {busy && <div className="skeleton-line" />}
    {errors.length > 0 && <div className="form-error" role="alert" data-testid="text-import-errors"><b>Import not applied.</b><ul>{errors.map(e => <li key={e}>{e}</li>)}</ul></div>}
    {preview && <div className="import-preview" data-testid="panel-import-preview">
      <div className="item-name">{preview.rows} valid rows · {preview.items.length} item{preview.items.length === 1 ? '' : 's'} · window {preview.windowStart} to {preview.windowEnd}</div>
      {preview.outside > 0 && <div className="item-detail">{preview.outside} row{preview.outside === 1 ? '' : 's'} fall outside the 7-day window and are ignored for demand.</div>}
      {preview.items.some(i => i.stockShortfall > 0) && <div className="item-detail" role="status" data-testid="text-import-stock-shortfall">
        Some imported historical sales exceed current on-hand stock. Stock is reduced only by what is available and never below zero; the full sales quantities still count toward demand.
      </div>}
      <table className="data-table compact"><thead><tr><th>Item</th><th>On hand after</th><th>Avg/day after</th></tr></thead>
        <tbody>{preview.items.map(i => <tr key={i.id}><td>{i.name}</td><td><div className="mono">{i.stockBefore} − {i.stockDeducted} = <b>{i.stockAfter}</b></div>
          {i.stockShortfall > 0 && <div className="item-detail" data-testid={`text-stock-shortfall-${i.id}`}>{i.importedQuantity} imported · {i.stockShortfall} beyond available stock</div>}
        </td><td className="mono">{i.after}</td></tr>)}</tbody></table>
    </div>}
  </Modal>;
}