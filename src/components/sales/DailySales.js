import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    Divider,
    CircularProgress,
} from '@mui/material';
import { ReceiptLong, Download, TableChart } from '@mui/icons-material';
import { supabase } from '../../supabaseClient';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import useSettings from '../../hooks/useSettings';

export default function DailySales() {
    const { settings } = useSettings();
    const [todaySales, setTodaySales] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchTodaySales();

        // Listen for auth changes (in case session isn't ready on mount)
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
                fetchTodaySales();
            }
        });

        // Subscribe to realtime changes
        const subscription = supabase
            .channel('public:sales')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, () => {
                // Always fetch on new sale to be safe and ensure UI is in sync
                fetchTodaySales();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
            authSubscription.unsubscribe();
        };
    }, []);

    async function fetchTodaySales() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const orgId = session.user.id;

        // Calculate today's date in local time (YYYY-MM-DD)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        const { data, error } = await supabase
            .from('sales')
            .select('*, products(name)')
            .eq('organization_id', orgId)
            .eq('sale_date', today)
            .is('deleted_at', null);

        if (error) {
            console.error('Error fetching today sales:', error);
            return;
        }

        setTodaySales(data || []);
        const total = (data || []).reduce((sum, sale) => sum + (sale.quantity * sale.price_at_sale), 0);
        setTotalAmount(total);
        setLoading(false);
    }

    const handleDownloadPDF = async () => {
        if (todaySales.length === 0) {
            toast.info('No sales to report for today.');
            return;
        }

        setDownloading(true);
        try {
            const doc = new jsPDF();
            const today = new Date().toLocaleDateString();
            const storeName = settings?.store_name || 'Medical Store';
            const currency = settings?.currency_symbol || '$';

            // Header
            doc.setFontSize(20);
            doc.text(storeName, 105, 15, { align: 'center' });
            doc.setFontSize(14);
            doc.text(`Daily Sales Report - ${today}`, 105, 25, { align: 'center' });

            // Summary
            doc.setFontSize(12);
            doc.text(`Total Sales Count: ${todaySales.length}`, 14, 35);
            doc.text(`Total Revenue: ${formatCurrency(totalAmount, currency)}`, 14, 42);

            // Table
            const tableColumn = ["Time", "Product", "Qty", "Unit", "Price", "Total"];
            const tableRows = todaySales.map(sale => [
                new Date(sale.created_at).toLocaleTimeString(),
                sale.products?.name || 'Unknown Product',
                sale.quantity,
                sale.selling_unit === 'box' ? 'Box' : 'Item',
                formatCurrency(sale.price_at_sale, currency),
                formatCurrency(sale.quantity * sale.price_at_sale, currency)
            ]);

            // Use autoTable as a function
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 50,
                styles: { fontSize: 10 },
                headStyles: { fillColor: [99, 102, 241] },
            });

            // Footer
            const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 50;
            doc.setFontSize(10);
            doc.text('_______________________', 150, finalY + 30);
            doc.text('Authorized Signature', 150, finalY + 40);

            doc.save(`daily_sales_${today.replace(/\//g, '-')}.pdf`);
            toast.success('PDF downloaded successfully!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error(`Failed to generate PDF: ${error.message}`);
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadCSV = () => {
        if (todaySales.length === 0) {
            toast.info('No sales to export for today.');
            return;
        }

        setDownloading(true);
        try {
            const today = new Date().toLocaleDateString();
            const currency = settings?.currency_symbol || '$';

            // CSV Headers
            let csvContent = "Time,Product,Quantity,Unit,Price,Total,Payment Method,Customer\n";

            // CSV Rows
            todaySales.forEach(sale => {
                const time = new Date(sale.created_at).toLocaleTimeString();
                const product = (sale.products?.name || 'Unknown Product').replace(/"/g, '""'); // Escape quotes
                const qty = sale.quantity;
                const unit = sale.selling_unit === 'box' ? 'Box' : 'Item';
                const price = sale.price_at_sale;
                const total = qty * price;
                const payment = sale.payment_method || 'N/A';
                const customer = sale.customers?.name || 'Walk-in';

                csvContent += `"${time}","${product}",${qty},"${unit}",${price},${total},"${payment}","${customer}"\n`;
            });

            // Add summary rows
            csvContent += `\n"Summary",,,,,,\n`;
            csvContent += `"Total Transactions",${todaySales.length},,,,,\n`;
            csvContent += `"Total Revenue",${totalAmount},,,,,\n`;

            // Create and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `daily_sales_${today.replace(/\//g, '-')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('CSV downloaded successfully!');
        } catch (error) {
            console.error('Error generating CSV:', error);
            toast.error(`Failed to generate CSV: ${error.message}`);
        } finally {
            setDownloading(false);
        }
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

                <Box display="flex" gap={1}>
                    <Button
                        variant="contained"
                        color="secondary"
                        fullWidth
                        size="large"
                        sx={{ minHeight: 48 }}
                        startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <Download />}
                        onClick={handleDownloadPDF}
                        disabled={loading || todaySales.length === 0 || downloading}
                    >
                        PDF
                    </Button>
                    <Button
                        variant="outlined"
                        fullWidth
                        size="large"
                        sx={{
                            minHeight: 48,
                            borderColor: 'white',
                            color: 'white',
                            '&:hover': {
                                borderColor: 'white',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                            }
                        }}
                        startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <TableChart />}
                        onClick={handleDownloadCSV}
                        disabled={loading || todaySales.length === 0 || downloading}
                    >
                        CSV
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}
