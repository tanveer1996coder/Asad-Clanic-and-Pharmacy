import React, { useState, useEffect } from 'react';
import useSupabase from '../hooks/useSupabase';
import { Card, Field } from './UI';

export default function AddSaleForm({ onSaleAdded }) {
  const { client } = useSupabase();
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    let mounted = true;
    async function fetchProducts() {
      if (!client) return;
      try {
        const { data, error } = await client.from('products').select('*').order('name');
        if (error) throw error;
        if (!mounted) return;
        const list = data || [];
        setProducts(list);
        if (list.length && !productId) {
          setProductId(list[0].id);
          setPrice(String(list[0].price));
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchProducts();
    return () => {
      mounted = false;
    };
  }, [client, productId]);

  useEffect(() => {
    const selected = products.find((p) => p.id === productId);
    if (selected && (!price || price === '')) setPrice(String(selected.price));
    if (selected) setQuery(selected.name || '');
  }, [productId, products]);

  useEffect(() => {
    if (!query) return setSuggestions([]);
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => (p.name || '').toLowerCase().includes(q)).slice(0, 8);
    setSuggestions(list);
    setActiveIndex(-1);
  }, [query, products]);

  async function handleSubmit(e) {
  e.preventDefault();
  if (!client) return;
  if (!productId) return window.alert('Select a product');
  const q = parseInt(quantity, 10);
  const p = parseFloat(price);
  if (Number.isNaN(q) || q <= 0 || Number.isNaN(p))
    return window.alert('Provide valid quantity and price');

  // 1. Insert sale
  const payload = { product_id: productId, quantity: q, price_at_sale: p, sale_date: saleDate };
  try {
    const { error } = await client.from('sales').insert(payload);
    if (error) throw error;

    // 2. Decrease stock in products
    const { error: stockErr } = await client.rpc('decrease_stock', {
      p_id: productId,
      q_sold: q,
    });
    if (stockErr) throw stockErr;

    setQuantity(1);
    setPrice('');
    if (typeof onSaleAdded === 'function') onSaleAdded();
  } catch (err) {
    window.alert('Insert sale failed: ' + (err.message || err));
  }
}


  return (
    <Card title="Add Sale">
      <form className="form-compact" onSubmit={handleSubmit}>
        <Field label="Product">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search product..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  if (activeIndex >= 0 && suggestions[activeIndex]) {
                    const s = suggestions[activeIndex];
                    setProductId(s.id);
                    setPrice(String(s.price));
                    setQuery(s.name);
                    setSuggestions([]);
                    e.preventDefault();
                  }
                } else if (e.key === 'Escape') {
                  setSuggestions([]);
                }
              }}
            />
            {suggestions && suggestions.length > 0 && (
              <ul className="suggestions-list">
                {suggestions.map((s, idx) => (
                  <li
                    key={s.id}
                    className={idx === activeIndex ? 'active' : ''}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      setProductId(s.id);
                      setPrice(String(s.price));
                      setQuery(s.name);
                      setSuggestions([]);
                    }}
                  >
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>
        <Field label="Quantity">
          <input type="number" value={quantity} min={1} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Price at sale">
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Sale date">
          <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
        </Field>
        <div>
          <button type="submit">Record Sale</button>
        </div>
      </form>
    </Card>
  );
}
