import { createClient } from '@supabase/supabase-js';

function readConfig() {
  try {
    const url = process.env.REACT_APP_SUPABASE_URL || window.localStorage.getItem('SUPABASE_URL') || '';
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY || window.localStorage.getItem('SUPABASE_ANON_KEY') || '';
    return { url, key };
  } catch (e) {
    return { url: '', key: '' };
  }
}

export function getSupabaseClientAtRuntime() {
  const { url, key } = readConfig();
  if (url && key) return createClient(url, key);
  return null;
}

export const supabase = getSupabaseClientAtRuntime();