import { useState } from 'react';
import { FileClock, Search, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Empty, PageTitle, when } from '@/components/common';
import type { StoreData } from '@/lib/procurement';

export function ActivityPage({data}:{data:StoreData}){const [query,setQuery]=useState(''),filtered=data.audit.filter(a=>`${a.actor} ${a.action} ${a.details}`.toLowerCase().includes(query.toLowerCase()));
function exportActivityPdf() {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const bottomMargin = 18;

    const columns = [
      { title: 'Timestamp', width: 38 },
      { title: 'Actor', width: 38 },
      { title: 'Activity', width: 48 },
      { title: 'Details', width: pageWidth - margin * 2 - 124 },
    ];

    // Report title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(30, 69, 60);
    pdf.text('StockSync AI - Activity Log', margin, 18);

    // Export information
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text(
      `Exported: ${new Date().toLocaleString()}`,
      margin,
      25
    );
    pdf.text(`Total entries: ${filtered.length}`, margin, 30);

    function drawTableHeader(y: number) {
      pdf.setFillColor(36, 90, 78);
      pdf.rect(margin, y - 5, pageWidth - margin * 2, 9, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);

      let x = margin;

      columns.forEach(column => {
        pdf.text(column.title, x + 2, y);
        x += column.width;
      });

      pdf.setTextColor(0, 0, 0);
      return y + 8;
    }

    let y = drawTableHeader(39);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(40, 40, 40);

    filtered.forEach(a => {
      const values = [
        when(a.timestamp),
        a.actor,
        a.action,
        a.details,
      ];

      const wrapped = values.map((value, index) =>
        pdf.splitTextToSize(
          String(value ?? ''),
          columns[index].width - 4
        )
      );

      const lineCount = Math.max(
        ...wrapped.map(lines => lines.length)
      );
      const rowHeight = Math.max(8, lineCount * 4 + 4);

      // Add a new page when the current page is full
      if (y + rowHeight > pageHeight - bottomMargin) {
        pdf.addPage();
        y = drawTableHeader(18);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(40, 40, 40);
      }

      // Draw a separator under each record
      pdf.setDrawColor(225, 225, 225);
      pdf.line(
        margin,
        y + rowHeight - 2,
        pageWidth - margin,
        y + rowHeight - 2
      );

      let x = margin;

      wrapped.forEach((lines, index) => {
        pdf.text(lines, x + 2, y + 2);
        x += columns[index].width;
      });

      y += rowHeight;
    });

    // Add page numbers
    const totalPages = pdf.getNumberOfPages();

    for (let page = 1; page <= totalPages; page++) {
      pdf.setPage(page);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 7,
        { align: 'right' }
      );
    }

    // Download the PDF
    const date = new Date().toISOString().slice(0, 10);
    pdf.save(`StockSync-Activity-Log-${date}.pdf`);
  }
return <main className="content"><PageTitle title="Activity log"/>
 <div className="toolbar"><label className="searchbox"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search actor or activity" data-testid="input-activity-search"/></label><span className="item-detail" style={{marginLeft:'auto'}}>{filtered.length} entries</span></div>
 <div className="panel"><div className="panel-head"><div><div className="panel-title">Recent activity</div><div className="panel-meta">Newest entries first · times shown in local browser time</div></div><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><button
      type="button"
      className="button"
      onClick={exportActivityPdf}
      title="Export activity log to PDF"
    >
      <Download size={15} />
      Export PDF
    </button><FileClock size={17} color="#638277"/></div></div>{filtered.length?<div>{filtered.map(a=><div className="activity-row" key={a.id} data-testid={`row-activity-${a.id}`}><div className="item-detail">{when(a.timestamp)}</div><div className="actor">{a.actor}</div><div><div className="activity-action">{a.action}</div><div className="activity-detail">{a.details}</div></div></div>)}</div>:<Empty title="No activity found" detail="When you approve or update an order, the decision will be recorded here."/>}</div>
 </main>}
