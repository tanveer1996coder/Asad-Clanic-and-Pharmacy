// src/hooks/useSupabase.js
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClientAtRuntime } from '../supabaseClient';

export default function useSupabase() {
  const [client, setClient] = useState(() => getSupabaseClientAtRuntime());
  const [connected, setConnected] = useState(Boolean(client));

  const refresh = useCallback(() => {
    const c = getSupabaseClientAtRuntime();
    setClient(c);
    setConnected(Boolean(c));
  }, []);

  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'SUPABASE_URL' || e.key === 'SUPABASE_ANON_KEY') refresh();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  return { client, connected, refresh };
}
