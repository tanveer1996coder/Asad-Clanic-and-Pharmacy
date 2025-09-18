import React, { useEffect, useState } from 'react';
import useSupabase from '../hooks/useSupabase';
import { Card } from './UI';

export default function RecentSalesList({ triggerRefresh, setDbError }) {
  const { client } = useSupabase();
  const [sales, setSales] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function fetchRecent() {
      if (!client) return;
      try {
        const { data, error } = await client
          .from('sales')
          .select('id, quantity, price_at_sale, sale_date, created_at, products(name)')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        if (!mounted) return;
        setSales(data || []);
      } catch (err) {
        console.error(err);
        if (typeof setDbError === 'function') setDbError(String(err.message || err));
      }
    }
    fetchRecent();
    return () => {
      mounted = false;
    };
  }, [client, triggerRefresh]);

  async function handleDelete(id) {
    if (!client) return window.alert('No database client');
    if (!window.confirm('Delete this sale? This cannot be undone.')) return;
    try {
      const { error } = await client.from('sales').delete().eq('id', id);
      if (error) throw error;
      // remove locally to avoid refetch
      setSales((prev) => (prev || []).filter((s) => s.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
      if (typeof setDbError === 'function') setDbError(String(err.message || err));
      window.alert('Failed to delete sale: ' + (err.message || err));
    }
  }

  return (
    <Card title="Recent Sales">
      <div className="recent-sales-grouped">
        {/* Group sales by date (YYYY-MM-DD) */}
        {Object.entries(groupSalesByDate(sales)).map(([date, items]) => (
          <div className="sales-day" key={date}>
            <div className="sales-day-header">{formatDisplayDate(date)}</div>
            <table className="table-list">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td>{productNameFromRow(s)}</td>
                    <td>{String(s.quantity)}</td>
                    <td>{formatCurrency(calcLineTotal(s))}</td>
                    <td>{formatTime(s.created_at || s.sale_date)}</td>
                    <td>
                      <button className="btn-link" onClick={() => handleDelete(s.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Helpers
function productNameFromRow(row) {
  if (!row) return '—';
  const p = row.products;
  if (!p) return '—';
  if (Array.isArray(p)) return p[0]?.name || '—';
  if (typeof p === 'object') return p.name || '—';
  return String(p);
}

function groupSalesByDate(sales) {
  // group by local date string YYYY-MM-DD using created_at or sale_date
  const map = {};
  (sales || []).forEach((s) => {
    const d = s.sale_date || s.created_at;
    const dt = d ? new Date(d) : new Date();
    const key = dt.toISOString().slice(0, 10);
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });
  // sort keys descending (newest first)
  const ordered = Object.keys(map)
    .sort((a, b) => (a < b ? 1 : -1))
    .reduce((acc, k) => {
      // sort items within a day by created_at desc
      acc[k] = (map[k] || []).sort((x, y) => {
        const tx = new Date(x.created_at || x.sale_date).getTime();
        const ty = new Date(y.created_at || y.sale_date).getTime();
        return ty - tx;
      });
      return acc;
    }, {});
  return ordered;
}

function formatDisplayDate(isoDate) {
  try {
    const dt = new Date(isoDate + 'T00:00:00');
    return dt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return isoDate;
  }
}

function formatTime(ts) {
  try {
    const dt = new Date(ts);
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(ts || '');
  }
}

function formatCurrency(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '\u2014';
  return n.toFixed(2);
}

function calcLineTotal(s) {
  const q = Number(s.quantity) || 0;
  const p = Number(s.price_at_sale) || 0;
  return q * p;
}