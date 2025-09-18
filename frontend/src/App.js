import React, { useState } from 'react';
import ProductsAdmin from './components/ProductsAdmin';
import AddSaleForm from './components/AddSaleForm';
import RecentSalesList from './components/RecentSalesList';
import WeeklyReport from './components/WeeklyReport';
// SettingsPanel intentionally not used when .env provides Supabase credentials
import useSupabase from './hooks/useSupabase';

export default function App() {
  const { connected, refresh } = useSupabase();
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [dbError, setDbError] = useState('');

  function handleSettingsSaved() {
    refresh();
    setRefreshFlag((f) => f + 1);
  }

  function onSaleAdded() {
    setRefreshFlag((f) => f + 1);
  }

  return (
    <div className="app-root">
  <header className="app-header">Asad Clanic and Pharmacy</header>

      <div className="container">
        <aside className="left-col">
          <ProductsAdmin setDbError={setDbError} />
          <AddSaleForm onSaleAdded={onSaleAdded} setDbError={setDbError} />
        </aside>

        <main className="right-col">
          {!connected && (
            <div className="warn">Supabase not connected. Add keys in Settings or add .env.local and restart.</div>
          )}
          {dbError && dbError.toLowerCase().includes('could not find the table') && (
            <div className="card" style={{background:'#fff7ed',border:'1px solid #ffedd5'}}>
              <h3>Database schema missing</h3>
              <div className="muted">The app couldn't find expected tables in your Supabase database. Run the SQL below in the Supabase SQL editor (Project → SQL Editor) to create the required tables and view.</div>
              <pre style={{whiteSpace:'pre-wrap',marginTop:8,background:'#fff',padding:8,borderRadius:6}}>
{`CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_sale numeric(10,2) NOT NULL,
  sale_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE VIEW weekly_sales_summary AS
SELECT
  to_char(sale_date, 'IYYY-IW') AS iso_week,
  date_trunc('week', sale_date)::date AS week_start,
  p.id as product_id,
  p.name as product_name,
  SUM(s.quantity) AS total_quantity,
  SUM(s.quantity * s.price_at_sale) AS total_revenue
FROM sales s
JOIN products p ON p.id = s.product_id
GROUP BY 1,2,3,4
ORDER BY week_start DESC, product_name;`}
              </pre>
            </div>
          )}

          <RecentSalesList triggerRefresh={refreshFlag} setDbError={setDbError} />
          <WeeklyReport setDbError={setDbError} />
        </main>
      </div>

      <footer className="app-footer">Built by Muhammad Tanveer (03089020131)</footer>
    </div>
  );
}