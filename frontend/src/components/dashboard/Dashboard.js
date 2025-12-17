import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    CircularProgress,
    Chip,
    IconButton,
    Tooltip,
    Button,
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    Inventory,
    Warning,
    AttachMoney,
    ShoppingCart,
    Refresh,
    Keyboard
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, getExpiryStatus } from '../../utils/dateHelpers';
import useSettings from '../../hooks/useSettings';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { useKeyboard } from '../../contexts/KeyboardContext';

export default function Dashboard() {
    const { settings } = useSettings();
    const { toggleHelp } = useKeyboard();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todaySales: 0,
        todayRevenue: 0,
        todayCashOut: 0,
        lowStockCount: 0,
        nearExpiryCount: 0,
        totalProducts: 0,
        totalStock: 0,
    });
    const [salesChart, setSalesChart] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [nearExpiryItems, setNearExpiryItems] = useState([]);

    // -- Keyboard Shortcuts --


    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const expiryThreshold = parseInt(settings?.expiry_alert_days || '15');

            // Parallelize the two main requests
            const [statsResult, chartResult, topProductsResult, lowStockResult, nearExpiryResult] = await Promise.all([
                supabase.rpc('get_dashboard_stats', { expiry_days_threshold: expiryThreshold }),
                supabase.rpc('get_sales_chart_data', { days_back: 7 }),
                supabase.rpc('get_top_products', { limit_count: 5, days_back: 30 }),
                supabase.rpc('get_low_stock_products'),
                supabase.rpc('get_near_expiry_products', { days_threshold: expiryThreshold })
            ]);

            // Process Stats
            if (statsResult.data && statsResult.data.length > 0) {
                const s = statsResult.data[0];
                setStats({
                    todaySales: s.today_sales_count,
                    todayRevenue: s.today_revenue,
                    todayCashOut: s.today_cash_out || 0, // Handle potential undefined if migration not run
                    lowStockCount: s.low_stock_count,
                    nearExpiryCount: s.near_expiry_count,
                    totalProducts: s.total_products_count,
                    totalStock: s.total_stock_count,
                });
            } else if (statsResult.error) {
                console.error('Error fetching dashboard stats:', statsResult.error);
            }

            // Process Chart
            if (chartResult.data) {
                const formattedChartData = chartResult.data.map(item => ({
                    date: formatDate(item.sale_date, 'MMM dd'),
                    revenue: item.daily_revenue
                }));
                // If RPC returns empty (no sales ever), basic check, but handled by generate_series in SQL usually
                setSalesChart(formattedChartData);
            } else if (chartResult.error) {
                console.error('Error fetching sales chart:', chartResult.error);
            }

            // Process Lists
            setTopProducts(topProductsResult.data || []);
            setLowStockItems((lowStockResult.data || []).slice(0, 5));
            setNearExpiryItems((nearExpiryResult.data || []).slice(0, 5));

        } catch (error) {
            console.error('Error in dashboard data fetch:', error);
        } finally {
            setLoading(false);
        }
    }, [settings]);

    // -- Keyboard Shortcuts --
    useKeyboardShortcuts({
        'Alt+r': () => fetchDashboardData(),
        'Alt+n': () => navigate('/sales'),
        'Alt+p': () => navigate('/products'),
        'Shift+?': () => { /* Help handled globally, but good to document/allow override */ }
    }, 'Dashboard');

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        // Auto-refresh when window regains focus (user returns to dashboard)
        const handleFocus = () => {
            if (settings) {
                fetchDashboardData();
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [settings, fetchDashboardData]);

    // Individual fetch functions removed in favor of single optimized batchAbove


    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    const netCashInHouse = stats.todayRevenue - (stats.todayCashOut || 0);

    return (
        <Container maxWidth="xl">
            <Box
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                gap={2}
                mb={3}
            >
                <Typography variant="h4" fontWeight={700} color="primary">
                    Dashboard
                </Typography>
                <Box display="flex" gap={1}>
                    <Button
                        variant="outlined"
                        startIcon={<Keyboard />}
                        onClick={toggleHelp}
                        size="small"
                    >
                        Shortcuts
                    </Button>
                    <Tooltip title="Refresh (Alt+r)">
                        <IconButton onClick={fetchDashboardData} color="primary">
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Today's Sales"
                        value={formatNumber(stats.todaySales)}
                        subtitle={formatCurrency(stats.todayRevenue, settings.currency_symbol)}
                        icon={<ShoppingCart />}
                        color="primary"
                        onClick={() => navigate(`/sales?date=${new Date().toISOString().split('T')[0]}`)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Daily Cash Flow"
                        value={formatCurrency(netCashInHouse, settings.currency_symbol)}
                        subtitle={`In: ${formatNumber(stats.todayRevenue)} | Out: ${formatNumber(stats.todayCashOut || 0)}`}
                        icon={<AttachMoney />}
                        color={netCashInHouse >= 0 ? "success" : "error"}
                        alert={netCashInHouse < 0}
                        onClick={() => {}} // No specific navigation for now
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Low Stock Items"
                        value={formatNumber(stats.lowStockCount)}
                        subtitle="Need reordering"
                        icon={<Warning />}
                        color="warning"
                        alert={stats.lowStockCount > 0}
                        onClick={() => navigate('/reports?tab=2')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatsCard
                        title="Near Expiry"
                        value={formatNumber(stats.nearExpiryCount)}
                        subtitle={`Within ${settings.expiry_alert_days || 15} days`}
                        icon={<Warning />}
                        color="error"
                        alert={stats.nearExpiryCount > 0}
                        onClick={() => navigate('/reports?tab=1')}
                    />
                </Grid>
            </Grid>

            {/* Charts and Lists */}
            <Grid container spacing={3}>
                {/* Sales Chart */}
                <Grid item xs={12} lg={8}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Sales Trend (Last 7 Days)
                            </Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={salesChart}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Top Products */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Top Selling Products
                            </Typography>
                            {topProducts.length === 0 ? (
                                <Typography color="text.secondary">No sales data yet</Typography>
                            ) : (
                                topProducts.map((product, index) => (
                                    <Box key={index} mb={2}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" fontWeight={600}>
                                                {product.product_name}
                                            </Typography>
                                            <Chip label={`${product.total_quantity} sold`} size="small" color="primary" />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {formatCurrency(product.total_revenue, settings.currency_symbol)}
                                        </Typography>
                                    </Box>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Low Stock Items */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2} color="warning.main">
                                Low Stock Alert
                            </Typography>
                            {lowStockItems.length === 0 ? (
                                <Typography color="text.secondary">All products are well stocked!</Typography>
                            ) : (
                                lowStockItems.map((item, index) => (
                                    <Box key={index} mb={2}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" fontWeight={600}>
                                                {item.name}
                                            </Typography>
                                            <Chip
                                                label={`${item.stock} / ${item.min_stock_level}`}
                                                size="small"
                                                color={item.stock === 0 ? 'error' : 'warning'}
                                            />
                                        </Box>
                                    </Box>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Near Expiry Items */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2} color="error.main">
                                Expiry Alert
                            </Typography>
                            {nearExpiryItems.length === 0 ? (
                                <Typography color="text.secondary">No products near expiry!</Typography>
                            ) : (
                                nearExpiryItems.map((item, index) => {
                                    const status = getExpiryStatus(item.expiry_date, 7, parseInt(settings.expiry_alert_days || '15'));
                                    return (
                                        <Box key={index} mb={2}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" fontWeight={600}>
                                                    {item.name}
                                                </Typography>
                                                <Chip
                                                    label={status.label}
                                                    size="small"
                                                    color={status.color}
                                                />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Expires: {formatDate(item.expiry_date)}
                                            </Typography>
                                        </Box>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

function StatsCard({ title, value, subtitle, icon, color, alert, onClick }) {
    return (
        <Card
            onClick={onClick}
            sx={{
                background: alert
                    ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: alert ? '2px solid #ef4444' : 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                },
            }}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box
                        sx={{
                            backgroundColor: `${color}.main`,
                            color: 'white',
                            borderRadius: 2,
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
                <Typography variant="h4" fontWeight={700} color={alert ? 'error.main' : 'text.primary'}>
                    {value}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {subtitle}
                </Typography>
            </CardContent>
        </Card>
    );
}
