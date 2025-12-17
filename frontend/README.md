# Supabase Sales App (Create React App)

This is a small React app (Create React App) that uses Supabase (Postgres) to store and sync sales data.

Features

- Manage products
- Record sales
- Recent sales list
- Weekly report (from DB view) and CSV export
- Settings panel to provide Supabase URL and anon key at runtime

Setup

1. Create a `.env` file at the project root (frontend/.env) with these variables (optional — you can also paste them in the Settings panel at runtime):

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

2. Run the SQL schema in Supabase SQL editor (create tables and view):

```sql
CREATE TABLE products (
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
ORDER BY week_start DESC, product_name;
```

3. Install dependencies and run:

```powershell
cd "C:\Users\user\Desktop\Web app\frontend"
npm install
npm start
```

Notes

- The app uses the Supabase anon public key only. Do not put a service_role key in the client.
- If you don't have a `.env`, open the Settings panel in the app and paste the Supabase URL and anon key. They will be stored in localStorage.
- CSV export uses simple CSV generation.
