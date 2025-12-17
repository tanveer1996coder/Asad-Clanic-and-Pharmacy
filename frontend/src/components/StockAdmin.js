import React, { useEffect, useState } from 'react';
import useSupabase from '../hooks/useSupabase';
import { Card } from './UI';

export default function StockAdmin({ onStockUpdated, setDbError }) {
  const { client } = useSupabase();
  const [products, setProducts] = useState([]);
  const [editedStock, setEditedStock] = useState({});

  async function fetchProducts() {
    if (!client) return;
    const { data, error } = await client.from('products').select('id,name,price,stock').order('name');
    if (error) {
      setDbError?.(error.message);
    } else {
      setProducts(data);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, [client, onStockUpdated]);

  function handleChange(id, value) {
    setEditedStock((prev) => ({ ...prev, [id]: value }));
  }

  async function saveStock(id) {
    const s = parseInt(editedStock[id], 10);
    if (Number.isNaN(s) || s < 0) return window.alert('Enter valid stock');
    const { error } = await client.from('products').update({ stock: s }).eq('id', id);
    if (error) return window.alert(error.message);
    window.alert('Stock updated');
    setEditedStock((prev) => ({ ...prev, [id]: undefined }));
    fetchProducts();
    if (typeof onStockUpdated === 'function') onStockUpdated();
  }

  return (
    <Card title="Stock Management">
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Save</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.price}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  value={editedStock[p.id] !== undefined ? editedStock[p.id] : p.stock}
                  onChange={(e) => handleChange(p.id, e.target.value)}
                  style={{ width: '70px' }}
                />
              </td>
              <td>
                <button onClick={() => saveStock(p.id)}>Save</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
