import React, { useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

export default function SettingsPanel({ onSaved }) {
  const [storedUrl, setStoredUrl] = useLocalStorage('SUPABASE_URL', '');
  const [storedKey, setStoredKey] = useLocalStorage('SUPABASE_ANON_KEY', '');
  const [tempUrl, setTempUrl] = useState(storedUrl || '');
  const [tempKey, setTempKey] = useState(storedKey || '');

  useEffect(() => {
    setTempUrl(storedUrl || '');
    setTempKey(storedKey || '');
  }, [storedUrl, storedKey]);

  function handleSave(e) {
    e.preventDefault();
    setStoredUrl(tempUrl || '');
    setStoredKey(tempKey || '');
    if (typeof onSaved === 'function') onSaved();
  }

  function handleClear() {
    setStoredUrl('');
    setStoredKey('');
    setTempUrl('');
    setTempKey('');
    if (typeof onSaved === 'function') onSaved();
  }

  return (
    <div>
      <h3>Runtime Settings</h3>
      <form onSubmit={handleSave}>
        <div className="field">
          <label className="field-label">Supabase URL</label>
          <input value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="field">
          <label className="field-label">Supabase ANON KEY</label>
          <input value={tempKey} onChange={(e) => setTempKey(e.target.value)} placeholder="anon..." />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">Save</button>
          <button type="button" onClick={handleClear}>Clear</button>
        </div>
      </form>
    </div>
  );
}