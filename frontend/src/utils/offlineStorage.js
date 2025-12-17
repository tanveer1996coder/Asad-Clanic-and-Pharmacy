import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

const PENDING_SALES_KEY = 'pending_sales';

export const saveOfflineSale = (saleData) => {
    try {
        const pendingSales = JSON.parse(localStorage.getItem(PENDING_SALES_KEY) || '[]');
        pendingSales.push({
            ...saleData,
            offline_id: Date.now(), // Temporary ID
            created_at: new Date().toISOString(),
            organization_id: saleData.organization_id,
        });
        localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(pendingSales));
        return true;
    } catch (error) {
        console.error('Error saving offline sale:', error);
        return false;
    }
};

export const getPendingSales = () => {
    return JSON.parse(localStorage.getItem(PENDING_SALES_KEY) || '[]');
};

export const clearPendingSales = () => {
    localStorage.removeItem(PENDING_SALES_KEY);
};

export const syncOfflineSales = async () => {
    const pendingSales = getPendingSales();
    if (pendingSales.length === 0) return;

    toast.info(`Syncing ${pendingSales.length} offline sales...`);

    const failedSales = [];
    let successCount = 0;

    for (const sale of pendingSales) {
        try {
            // Remove temporary offline fields
            const { offline_id, ...saleData } = sale;

            // Insert sale
            const { error: saleError } = await supabase
                .from('sales')
                .insert([saleData]);

            if (saleError) throw saleError;

            // Decrease stock
            const { error: stockError } = await supabase.rpc('decrease_stock', {
                p_id: saleData.product_id,
                q_sold: saleData.quantity,
            });

            if (stockError) throw stockError;

            successCount++;
        } catch (error) {
            console.error('Error syncing sale:', error);
            failedSales.push(sale);
        }
    }

    if (failedSales.length > 0) {
        localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(failedSales));
        toast.warning(`Synced ${successCount} sales. ${failedSales.length} failed and kept offline.`);
    } else {
        clearPendingSales();
        toast.success(`Successfully synced all ${successCount} offline sales!`);
    }
};

// Auto-sync when online
window.addEventListener('online', () => {
    syncOfflineSales();
});
