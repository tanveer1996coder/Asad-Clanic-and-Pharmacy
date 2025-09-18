import React, { useEffect, useRef, useState } from 'react';
import useSupabase from '../hooks/useSupabase';
import { Card } from './UI';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function WeeklyReport() {
  const { client } = useSupabase();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function fetch() {
      if (!client) return;
      try {
        // Fetch raw sales with product name and aggregate client-side into weekly summaries
        const { data, error } = await client
          .from('sales')
          .select('id, product_id, quantity, price_at_sale, sale_date, created_at, products(name)')
          .order('sale_date', { ascending: false });
        if (error) throw error;
        if (!mounted) return;
        const sales = data || [];

        const summaries = aggregateWeekly(sales);
        setRows(summaries);
      } catch (err) {
        console.error(err);
      }
    }
    fetch();
    return () => {
      mounted = false;
    };
  }, [client]);

  function exportCsv() {
    // CSV export removed in favor of PDF export
  }

  const printableRef = useRef();

  async function exportPdf() {
    if (!rows || !rows.length) return window.alert('No rows to export');
    const ele = printableRef.current;
    if (!ele) return window.alert('Nothing to print');

    // Use html2canvas to render the element
    try {
      const canvas = await html2canvas(ele, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // calculate image dimensions to fit A4 width while keeping aspect ratio
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 20; // 10mm margin each side
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      // If content taller than page, add pages
      let remainingHeight = imgHeight;
      while (remainingHeight > pageHeight - 20) {
        position = position - (pageHeight - 20);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        remainingHeight -= (pageHeight - 20);
      }

      const fileName = `weekly-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF export failed', err);
      window.alert('Failed to generate PDF');
    }
  }

  return (
    <Card title="Weekly Report">
      <div style={{ marginBottom: 8 }}>
        <button onClick={exportPdf}>Download PDF</button>
      </div>
      {/* Hidden printable area (styled copy of the table) */}
      <div ref={printableRef} style={{ padding: 8, background: '#fff' }}>
        <table className="table-list">
        <thead>
          <tr>
            <th>Week</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td>{String(r.week_start)}</td>
              <td>{String(r.product_name)}</td>
              <td>{String(r.total_quantity)}</td>
              <td>{formatCurrency(r.total_amount)}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </Card>
  );
}

// Helpers: aggregate sales into weekly summaries per product
function startOfWeekIso(date) {
  const dt = new Date(date);
  // set to Monday of the week (ISO week start)
  const day = dt.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  const monday = new Date(dt);
  monday.setDate(dt.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function aggregateWeekly(sales) {
  const map = {};
  (sales || []).forEach((s) => {
    const date = s.sale_date || s.created_at || new Date().toISOString();
    const week = startOfWeekIso(date);
    const prodName = (() => {
      const p = s.products;
      if (!p) return 'Unknown';
      if (Array.isArray(p)) return p[0]?.name || 'Unknown';
      return p.name || 'Unknown';
    })();
    const key = `${week}::${s.product_id}::${prodName}`;
    if (!map[key]) map[key] = { week_start: week, product_name: prodName, total_quantity: 0, total_amount: 0 };
    const q = Number(s.quantity) || 0;
    const p = Number(s.price_at_sale) || 0;
    map[key].total_quantity += q;
    map[key].total_amount += q * p;
  });
  // convert to array and sort by week desc then product
  return Object.values(map).sort((a, b) => (a.week_start < b.week_start ? 1 : -1));
}

function formatCurrency(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '\u2014';
  return n.toFixed(2);
}