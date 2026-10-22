import { jsPDF } from 'jspdf';
import { formatMoney, type FinalizedPO } from './procurement';

export function createPurchaseOrderPdf(po: FinalizedPO): Blob {
  const doc = new jsPDF();
  doc.setProperties({ title: `Finalized purchase order ${po.orderId}`, author: 'StockSync AI Demo', subject: po.documentId });
  doc.setCreationDate(new Date(po.approvedAt));
  doc.setFillColor(36, 90, 78);
  doc.rect(0, 0, 210, 43, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(23);
  doc.text('StockSync AI', 18, 20);
  doc.setFontSize(11);
  doc.text('FINALIZED PURCHASE ORDER', 18, 31);
  doc.setTextColor(35, 57, 49);
  doc.setFontSize(18);
  doc.text(po.orderId, 18, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const approvedDate = new Date(po.approvedAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  doc.text(`Supplier: ${po.supplierName}`, 18, 72);
  doc.text('Buyer: StockSync AI demo store, Kuala Lumpur', 18, 80);
  doc.text(`Approved by: ${po.approvedBy}`, 18, 88);
  doc.text(`Approval time: ${approvedDate}`, 18, 96);
  doc.setFillColor(239, 242, 233);
  doc.rect(18, 108, 174, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 22, 116);
  doc.text('Quantity', 100, 116);
  doc.text('Unit price', 137, 116);
  doc.text('Total', 187, 116, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(po.itemName, 70), 22, 130);
  doc.text(`${po.quantity} ${po.unit}`, 100, 130);
  doc.text(formatMoney(po.unitCost), 137, 130);
  doc.text(formatMoney(po.totalCost), 187, 130, { align: 'right' });
  doc.setDrawColor(215, 222, 210);
  doc.line(18, 145, 192, 145);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`TOTAL (MYR): ${formatMoney(po.totalCost)}`, 192, 158, { align: 'right' });
  doc.setFontSize(10);
  doc.text('Manager note', 18, 178);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(po.note.slice(0, 800), 174), 18, 188);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Document reference: ${po.documentId}`, 18, 265);
  doc.text('DEMO DOCUMENT - synthetic data. Supplier dispatch is mocked; nothing was sent.', 18, 274);
  doc.text('This PDF reflects the finalized approval snapshot. It is not proof of delivery.', 18, 280);
  return doc.output('blob');
}

export function downloadPurchaseOrder(po: FinalizedPO): void {
  const url = URL.createObjectURL(createPurchaseOrderPdf(po));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${po.orderId}-final.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
