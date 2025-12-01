import React, { useEffect, useState, useCallback } from 'react';
import { Card } from './UI';
import useSupabase from '../hooks/useSupabase';
import { v4 as uuidv4 } from 'uuid';

export default function ProductsAdmin() {
  const { client, connected } = useSupabase();
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  // add missing states for editing
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const fetchProducts = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!client) return;
    const trimmedName = (name || '').trim();
    const parsedPrice = parseFloat(price);
    if (!trimmedName || Number.isNaN(parsedPrice))
      return window.alert('Please provide a valid name and price');
    const newRow = { id: uuidv4(), name: trimmedName, price: parsedPrice };
    try {
      const { error } = await client.from('products').insert(newRow);
      if (error) throw error;
      setName('');
      setPrice('');
      fetchProducts();
    } catch (err) {
      window.alert('Insert failed: ' + (err.message || err));
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditName(p.name || '');
    setEditPrice(String(p.price ?? ''));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditPrice('');
  }

  async function saveEdit(id) {
    if (!client) return;
    const trimmed = (editName || '').trim();
    const parsed = parseFloat(editPrice);
    if (!trimmed || Number.isNaN(parsed))
      return window.alert('Provide valid name and price');
    try {
      const { error } = await client
        .from('products')
        .update({ name: trimmed, price: parsed })
        .eq('id', id);
      if (error) throw error;
      cancelEdit();
      fetchProducts();
    } catch (err) {
      window.alert('Update failed: ' + (err.message || err));
    }
  }

  async function deleteProduct(id) {
    if (!client) return;
    if (!confirm('Delete this product?')) return;
    try {
      const { error } = await client.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchProducts();
    } catch (err) {
      window.alert('Delete failed: ' + (err.message || err));
    }
  }

  return (
    <Card title="Products">
      {!connected && (
        <div className="warn">
          Supabase not configured. Use Settings to add keys.
        </div>
      )}
      <form onSubmit={handleAdd} className="form-compact">
        <div>
          <input
            placeholder="Product name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <input
            placeholder="Price"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <button type="submit">Add Product</button>
        </div>
      </form>

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table-list">
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {editingId === p.id ? (
                      <input
                        className="cell-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      p.name
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {editingId === p.id ? (
                      <input
                        className="cell-input"
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                      />
                    ) : (
                      Number(p.price).toFixed(2)
                    )}
                  </td>
                  <td>
                    {editingId === p.id ? (
                      <>
                        <button onClick={() => saveEdit(p.id)}>Save</button>
                        <button onClick={cancelEdit} style={{ marginLeft: 8 }}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(p)}>Edit</button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          style={{ marginLeft: 8, background: '#ef4444' }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
