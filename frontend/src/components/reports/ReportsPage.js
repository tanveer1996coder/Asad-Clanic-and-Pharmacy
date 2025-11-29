import React, { useState, useEffect } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    Grid,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Button,
    Tabs,
    Tab,
    Chip,
} from '@mui/material';
import { Download, TrendingUp, Warning, AttachMoney } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatNumber, formatPercentage, getChartColor } from '../../utils/formatters';
import { formatDate, getExpiryStatus, getDateDaysAgo } from '../../utils/dateHelpers';
import useSettings from '../../hooks/useSettings';
import Papa from 'papaparse';

export default function ReportsPage() {
    const { settings } = useSettings();
    const [activeTab, setActiveTab] = useState(0);
    const [dateRange, setDateRange] = useState({
        start: getDateDaysAgo(30),
        end: new Date().toISOString().split('T')[0],
    });
    const [loading, setLoading] = useState(false);
    const [salesReport, setSalesReport] = useState(null);
    const [profitReport, setProfitReport] = useState(null);
    const [expiryReport, setExpiryReport] = useState([]);
    const [lowStockReport, setLowStockReport] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    async function fetchReports() {
        setLoading(true);
        try {
            await Promise.all([
                fetchSalesReport(),
                fetchProfitReport(),
                fetchExpiryReport(),
                fetchLowStockReport(),
                fetchTopProducts(),
            ]);
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    }

    async function fetchSalesReport() {
        const { data } = await supabase.rpc('get_sales_summary', {
            start_date: dateRange.start,
            end_date: dateRange.end,
        });
        setSalesReport(data?.[0] || { total_sales: 0, total_revenue: 0, total_items_sold: 0 });
    }

    async function fetchProfitReport() {
        const { data } = await supabase.rpc('get_profit_summary', {
            start_date: dateRange.start,
            end_date: dateRange.end,
        });
        setProfitReport(data?.[0] || { total_revenue: 0, total_cost: 0, total_profit: 0, profit_margin: 0 });
    }

    async function fetchExpiryReport() {
        const { data } = await supabase.rpc('get_near_expiry_products', {
            days_threshold: parseInt(settings.expiry_alert_days || '15'),
        });
        setExpiryReport(data || []);
    }

    async function fetchLowStockReport() {
        const { data } = await supabase.rpc('get_low_stock_products');
        setLowStockReport(data || []);
    }

    async function fetchTopProducts() {
        const { data } = await supabase.rpc('get_top_products', {
            limit_count: 10,
            days_back: 30,
        });
        setTopProducts(data || []);
    }

    const handleDateChange = (e) => {
        setDateRange({
            ...dateRange,
            [e.target.name]: e.target.value,
        });
    };

    const handleExport = () => {
        let dataToExport = [];
        let fileName = 'report';

        if (activeTab === 0) {
            // Top Products
            dataToExport = topProducts.map(p => ({
                Product: p.product_name,
                'Quantity Sold': p.total_quantity,
                Revenue: p.total_revenue,
                'Sales Count': p.sales_count
            }));
            fileName = 'top_products_report';
        } else if (activeTab === 1) {
            // Expiry
            dataToExport = expiryReport.map(p => ({
                Product: p.name,
                'Expiry Date': p.expiry_date,
                'Days Left': p.days_until_expiry,
                Stock: p.stock
            }));
            fileName = 'expiry_report';
        } else if (activeTab === 2) {
            // Low Stock
            dataToExport = lowStockReport.map(p => ({
                Product: p.name,
                Category: p.category,
                Stock: p.stock,
                'Min Level': p.min_stock_level
            }));
            fileName = 'low_stock_report';
        }

        if (dataToExport.length === 0) {
            toast.info('No data to export');
            return;
        }

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Container maxWidth="xl">
            <Typography variant="h4" fontWeight={700} color="primary" mb={3}>
                Reports & Analytics
            </Typography>

            {/* Date Range Selector */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Start Date"
                                name="start"
                                value={dateRange.start}
                                onChange={handleDateChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="date"
                                label="End Date"
                                name="end"
                                value={dateRange.end}
                                onChange={handleDateChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Download />}
                                onClick={handleExport}
                            >
                                Export to Excel
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <TrendingUp color="primary" />
                                <Typography variant="body2" color="text.secondary">
                                    Total Sales
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={700}>
                                {formatNumber(salesReport?.total_sales || 0)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatNumber(salesReport?.total_items_sold || 0)} items sold
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <AttachMoney color="success" />
                                <Typography variant="body2" color="text.secondary">
                                    Revenue
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={700} color="success.main">
                                {formatCurrency(salesReport?.total_revenue || 0, settings.currency_symbol)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <AttachMoney color="info" />
                                <Typography variant="body2" color="text.secondary">
                                    Profit
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={700} color="info.main">
                                {formatCurrency(profitReport?.total_profit || 0, settings.currency_symbol)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Margin: {formatPercentage(profitReport?.profit_margin || 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Warning color="warning" />
                                <Typography variant="body2" color="text.secondary">
                                    Alerts
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight={700} color="warning.main">
                                {lowStockReport.length + expiryReport.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {lowStockReport.length} low stock, {expiryReport.length} expiring
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs for Different Reports */}
            <Card>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable">
                    <Tab label="Top Products" />
                    <Tab label="Expiry Report" />
                    <Tab label="Low Stock" />
                </Tabs>

                <CardContent>
                    {/* Top Products */}
                    {activeTab === 0 && (
                        <Box>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Top Selling Products (Last 30 Days)
                            </Typography>
                            {topProducts.length === 0 ? (
                                <Typography color="text.secondary">No sales data available</Typography>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={topProducts.slice(0, 5)}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="product_name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="total_quantity" fill="#6366f1" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <TableContainer sx={{ mt: 3, overflowX: 'auto' }}>
                                        <Table sx={{ minWidth: 600 }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell><strong>Product</strong></TableCell>
                                                    <TableCell><strong>Quantity Sold</strong></TableCell>
                                                    <TableCell><strong>Revenue</strong></TableCell>
                                                    <TableCell><strong>Sales Count</strong></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {topProducts.map((product, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{product.product_name}</TableCell>
                                                        <TableCell>{formatNumber(product.total_quantity)}</TableCell>
                                                        <TableCell>{formatCurrency(product.total_revenue, settings.currency_symbol)}</TableCell>
                                                        <TableCell>{formatNumber(product.sales_count)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </Box>
                    )}

                    {/* Expiry Report */}
                    {activeTab === 1 && (
                        <Box>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Products Near Expiry (Within {settings.expiry_alert_days || 15} Days)
                            </Typography>
                            {expiryReport.length === 0 ? (
                                <Typography color="text.secondary">No products near expiry!</Typography>
                            ) : (
                                <TableContainer sx={{ overflowX: 'auto' }}>
                                    <Table sx={{ minWidth: 600 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>Product</strong></TableCell>
                                                <TableCell><strong>Expiry Date</strong></TableCell>
                                                <TableCell><strong>Days Left</strong></TableCell>
                                                <TableCell><strong>Stock</strong></TableCell>
                                                <TableCell><strong>Status</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {expiryReport.map((item, index) => {
                                                const status = getExpiryStatus(item.expiry_date, 7, parseInt(settings.expiry_alert_days || '15'));
                                                return (
                                                    <TableRow key={index}>
                                                        <TableCell>{item.name}</TableCell>
                                                        <TableCell>{formatDate(item.expiry_date)}</TableCell>
                                                        <TableCell>{item.days_until_expiry} days</TableCell>
                                                        <TableCell>{formatNumber(item.stock)}</TableCell>
                                                        <TableCell>
                                                            <Chip label={status.label} size="small" color={status.color} />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}

                    {/* Low Stock Report */}
                    {activeTab === 2 && (
                        <Box>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Low Stock Items
                            </Typography>
                            {lowStockReport.length === 0 ? (
                                <Typography color="text.secondary">All products are well stocked!</Typography>
                            ) : (
                                <TableContainer sx={{ overflowX: 'auto' }}>
                                    <Table sx={{ minWidth: 600 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell><strong>Product</strong></TableCell>
                                                <TableCell><strong>Category</strong></TableCell>
                                                <TableCell><strong>Current Stock</strong></TableCell>
                                                <TableCell><strong>Min Level</strong></TableCell>
                                                <TableCell><strong>Status</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {lowStockReport.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell>{item.category || '—'}</TableCell>
                                                    <TableCell>{formatNumber(item.stock)}</TableCell>
                                                    <TableCell>{item.min_stock_level}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={item.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                                                            size="small"
                                                            color={item.stock === 0 ? 'error' : 'warning'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
