import { useEffect, useState, useCallback } from 'react';
import useSupabase from './useSupabase';

export default function useStock() {
    const { client } = useSupabase();
    const [stock, setStock] = useState([]);

    const loadStock = useCallback(async () => {
        if (!client) return;
        const { data, error } = await client
            .from('stock')
            .select('id, product_id, quantity, products(name)')
            .order('updated_at', { ascending: false });
        if (!error) setStock(data || []);
    }, [client]);

    const updateStock = useCallback(
        async (stockId, newQuantity) => {
            if (!client) return;
            const { data, error } = await client
                .from('stock')
                .update({ quantity: newQuantity, updated_at: new Date() })
                .eq('id', stockId)
                .select();
            if (!error) loadStock();
            return { data, error };
        },
        [client, loadStock]
    );

    useEffect(() => {
        loadStock();
    }, [loadStock]);

    return { stock, loadStock, updateStock };
}
