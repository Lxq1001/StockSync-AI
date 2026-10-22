import { useState } from 'react';
import { FormError, Modal, money, type PageProps } from '@/components/common';
import { editItem, suggestedQuantity, validateItemEdit, type SKU } from '@/lib/procurement';

export function EditItemModal({ sku, update, toast, onClose }: Omit<PageProps, 'data'> & { sku: SKU; onClose: () => void }) {
  const [name, setName] = useState(sku.name), [onHand, setOnHand] = useState(String(sku.onHand)), [unitCost, setUnitCost] = useState(String(sku.unitCost));
  const [error, setError] = useState('');
  const save = () => {
    const v = validateItemEdit({ name, onHand, unitCost });
    if ('error' in v) { setError(v.error); return; }
    if (update(d => editItem(d, sku.id, { name, onHand, unitCost }))) { toast(`${v.name} saved.`); onClose(); }
  };
  return <Modal title="Edit item" onClose={onClose} testId="modal-edit-item"
    footer={<><button className="button" onClick={onClose} data-testid="button-cancel-edit-item">Cancel</button><button className="button primary" onClick={save} data-testid="button-save-item">Save</button></>}>
    <div className="field"><label htmlFor="edit-name">Item name</label><input id="edit-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} data-testid="input-item-name" /></div>
    <div className="field"><label htmlFor="edit-onhand">On hand quantity ({sku.unit})</label><input id="edit-onhand" required type="number" min="0" step="any" value={onHand} onChange={e => setOnHand(e.target.value)} data-testid="input-item-onhand" /></div>
    <div className="field"><label htmlFor="edit-cost">Unit cost (RM per {sku.unit})</label><input id="edit-cost" required type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} data-testid="input-item-unitcost" /></div>
    <FormError message={error} />
  </Modal>;
}

export function OrderItemModal({ sku, supplier, onConfirm, onClose }: { sku: SKU; supplier: string; onConfirm: (qty: number) => void; onClose: () => void }) {
  const [qty, setQty] = useState(suggestedQuantity(sku) > 0 ? String(suggestedQuantity(sku)) : '');
  const [error, setError] = useState('');
  const n = Number(qty);
  const valid = qty.trim() !== '' && Number.isSafeInteger(n) && n >= 1 && n <= 100000;
  const confirm = () => { if (!valid) { setError('Reorder quantity must be a whole number from 1 to 100,000.'); return; } onConfirm(n); };
  return <Modal title={`Order ${sku.name}`} copy={`Supplier: ${supplier}`} onClose={onClose} testId="modal-order-item"
    footer={<><button className="button" onClick={onClose} data-testid="button-cancel-order-item">Cancel</button><button className="button primary" onClick={confirm} data-testid="button-confirm-order">Confirm</button></>}>
    <div className="field"><label htmlFor="order-qty">Reorder quantity ({sku.unit})</label><input id="order-qty" type="number" min="1" step="1" value={qty} onChange={e => { setQty(e.target.value); setError(''); }} data-testid="input-order-qty" /></div>
    <div className="budget-settings"><span className="item-name">Total cost</span><strong className="mono" data-testid="text-order-total">{valid ? money(n * sku.unitCost) : '-'}</strong></div>
    <FormError message={error} />
  </Modal>;
}
