import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    Divider,
} from '@mui/material';
import { ReceiptLong, Download } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import useSettings from '../../hooks/useSettings';

export default function DailySales() {
    const { settings } = useSettings();
    const [todaySales, setTodaySales] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTodaySales();

        // Subscribe to realtime changes
        const subscription = supabase
            .channel('public:sales')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, payload => {
                const saleDate = payload.new.sale_date || payload.new.created_at.split('T')[0];
                const today = new Date().toISOString().split('T')[0];
                if (saleDate === today) {
                    fetchTodaySales();
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    async function fetchTodaySales() {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('sales')
            .select('*, products(name)')
            .eq('sale_date', today);

        if (error) {
            console.error('Error fetching today sales:', error);
            return;
        }

        setTodaySales(data || []);
        const total = (data || []).reduce((sum, sale) => sum + (sale.quantity * sale.price_at_sale), 0);
        setTotalAmount(total);
        setLoading(false);
    }

    const handleCloseDay = () => {
        if (todaySales.length === 0) {
            toast.info('No sales to report for today.');
            return;
        }

        const doc = new jsPDF();
        const today = new Date().toLocaleDateString();

        // Header
        doc.setFontSize(20);
        doc.text(settings.store_name || 'Medical Store', 105, 15, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`Daily Sales Report - ${today}`, 105, 25, { align: 'center' });

        // Summary
        doc.setFontSize(12);
        doc.text(`Total Sales Count: ${todaySales.length}`, 14, 35);
        doc.text(`Total Revenue: ${formatCurrency(totalAmount, settings.currency_symbol)}`, 14, 42);

        // Table
        const tableColumn = ["Time", "Product", "Qty", "Price", "Total"];
        const tableRows = todaySales.map(sale => [
            new Date(sale.created_at).toLocaleTimeString(),
            sale.products?.name || 'Unknown',
            sale.quantity,
            formatCurrency(sale.price_at_sale, settings.currency_symbol),
            formatCurrency(sale.quantity * sale.price_at_sale, settings.currency_symbol)
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 50,
        });

        // Footer
        const finalY = doc.lastAutoTable.finalY || 50;
        doc.text('_______________________', 150, finalY + 30);
        doc.text('Signature', 150, finalY + 40);

        doc.save(`daily_sales_${today.replace(/\//g, '-')}.pdf`);
        toast.success('Daily report downloaded!');
    };

    return (
        <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white' }}>
            <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <ReceiptLong />
                    <Typography variant="h6" fontWeight={600}>
                        Today's Sales
                    </Typography>
                </Box>

                <Typography variant="h3" fontWeight={700} mb={1}>
                    {formatCurrency(totalAmount, settings.currency_symbol)}
                </Typography>

                <Typography variant="body2" sx={{ opacity: 0.8, mb: 3 }}>
                    {todaySales.length} transactions today
                </Typography>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />

                <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    startIcon={<Download />}
                    onClick={handleCloseDay}
                    disabled={loading || todaySales.length === 0}
                >
                    Close Day & Report
                </Button>
            </CardContent>
        </Card>
    );
}
