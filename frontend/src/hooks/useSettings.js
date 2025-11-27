import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook to manage app settings (store name, currency, thresholds, etc.)
 */
export default function useSettings() {
    const [settings, setSettings] = useState({
        store_name: 'My Medical Store',
        currency_symbol: 'PKR',
        expiry_alert_days: '15',
        low_stock_threshold: '10',
        theme_color: '#6366f1',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch settings from database
    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('settings')
                .select('key, value');

            if (error) throw error;

            if (data && data.length > 0) {
                const settingsObj = {};
                data.forEach(item => {
                    settingsObj[item.key] = item.value;
                });
                setSettings(prev => ({ ...prev, ...settingsObj }));
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Update a single setting
    async function updateSetting(key, value) {
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ key, value, updated_at: new Date().toISOString() });

            if (error) throw error;

            setSettings(prev => ({ ...prev, [key]: value }));
            return { success: true };
        } catch (err) {
            console.error('Error updating setting:', err);
            return { success: false, error: err.message };
        }
    }

    // Update multiple settings at once
    async function updateSettings(newSettings) {
        try {
            const updates = Object.entries(newSettings).map(([key, value]) => ({
                key,
                value,
                updated_at: new Date().toISOString(),
            }));

            const { error } = await supabase
                .from('settings')
                .upsert(updates);

            if (error) throw error;

            setSettings(prev => ({ ...prev, ...newSettings }));
            return { success: true };
        } catch (err) {
            console.error('Error updating settings:', err);
            return { success: false, error: err.message };
        }
    }

    return {
        settings,
        loading,
        error,
        updateSetting,
        updateSettings,
        refetch: fetchSettings,
    };
}
