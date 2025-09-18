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
  }, [productId, products]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!client) return;
    if (!productId) return window.alert('Select a product');
    const q = parseInt(quantity, 10);
    const p = parseFloat(price);
    if (Number.isNaN(q) || q <= 0 || Number.isNaN(p)) return window.alert('Provide valid quantity and price');
    const payload = { product_id: productId, quantity: q, price_at_sale: p, sale_date: saleDate };
    try {
      const { error } = await client.from('sales').insert(payload);
      if (error) throw error;
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
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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