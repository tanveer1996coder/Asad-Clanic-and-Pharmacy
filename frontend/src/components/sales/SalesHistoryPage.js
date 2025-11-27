import React, { useState, useEffect } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Grid,
    Box,
    Chip,
    IconButton,
    Tooltip,
    Button,
    MenuItem,
    InputAdornment,
    Pagination,
} from '@mui/material';
import {
    Search,
    Refresh,
    Download,
    FilterList,
    Receipt,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, formatTime } from '../../utils/dateHelpers';
import useSettings from '../../hooks/useSettings';

export default function SalesHistoryPage() {
    const { settings } = useSettings();
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({
        start: '',
        end: '',
    });
    const [page, setPage] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {
        fetchAllSales();
    }, []);

    useEffect(() => {
        filterSales();
    }, [sales, searchTerm, dateFilter]);

    async function fetchAllSales() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sales')
                .select('*, products(name, category)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error('Error fetching sales:', error);
            toast.error('Failed to load sales history');
        } finally {
            setLoading(false);
        }
    }

    function filterSales() {
        let filtered = [...sales];

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(sale =>
                sale.products?.name?.toLowerCase().includes(search) ||
                sale.products?.category?.toLowerCase().includes(search) ||
                sale.id.toLowerCase().includes(search)
            );
        }

        // Date filter
        if (dateFilter.start) {
            filtered = filtered.filter(sale => {
                const saleDate = sale.sale_date || sale.created_at?.split('T')[0];
                return saleDate >= dateFilter.start;
            });
        }

        if (dateFilter.end) {
            filtered = filtered.filter(sale => {
                const saleDate = sale.sale_date || sale.created_at?.split('T')[0];
                return saleDate <= dateFilter.end;
            });
        }

        setFilteredSales(filtered);
        setPage(1); // Reset to first page when filtering
    }

    function handleDateChange(e) {
        setDateFilter({
            ...dateFilter,
            [e.target.name]: e.target.value,
        });
    }

    function clearFilters() {
        setSearchTerm('');
        setDateFilter({ start: '', end: '' });
    }

    function exportToCSV() {
        const csvData = filteredSales.map(sale => ({
            'Sale ID': sale.id,
            'Date': formatDate(sale.sale_date || sale.created_at),
            'Time': formatTime(sale.created_at),
            'Product': sale.products?.name || '—',
            'Category': sale.products?.category || '—',
            'Quantity': sale.quantity,
            'Price': sale.price_at_sale,
            'Total': sale.quantity * sale.price_at_sale,
        }));

        const headers = Object.keys(csvData[0]).join(',');
        const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
        const csv = headers + '\n' + rows;

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-history-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Sales history exported!');
    }

    // Calculate summary stats
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.quantity * sale.price_at_sale), 0);
    const totalItems = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);

    // Pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSales = filteredSales.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

    return (
        <Container maxWidth="xl">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Receipt color="primary" sx={{ fontSize: 40 }} />
                    <Typography variant="h4" fontWeight={700} color="primary">
                        Sales History & Audit Log
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchAllSales} color="primary">
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={exportToCSV}
                        disabled={filteredSales.length === 0}
                    >
                        Export CSV
                    </Button>
                </Box>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Total Transactions
                            </Typography>
                            <Typography variant="h4" fontWeight={700} color="primary">
                                {formatNumber(totalSales)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Total Revenue
                            </Typography>
                            <Typography variant="h4" fontWeight={700} color="success.main">
                                {formatCurrency(totalRevenue, settings.currency_symbol)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Items Sold
                            </Typography>
                            <Typography variant="h4" fontWeight={700} color="info.main">
                                {formatNumber(totalItems)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                placeholder="Search by product, category, or sale ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Start Date"
                                name="start"
                                value={dateFilter.start}
                                onChange={handleDateChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="End Date"
                                name="end"
                                value={dateFilter.end}
                                onChange={handleDateChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={clearFilters}
                                startIcon={<FilterList />}
                            >
                                Clear Filters
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Sales Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                        All Sales Transactions
                        {filteredSales.length !== sales.length && (
                            <Chip
                                label={`${filteredSales.length} of ${sales.length}`}
                                size="small"
                                color="primary"
                                sx={{ ml: 2 }}
                            />
                        )}
                    </Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Date & Time</strong></TableCell>
                                    <TableCell><strong>Sale ID</strong></TableCell>
                                    <TableCell><strong>Product</strong></TableCell>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell align="right"><strong>Quantity</strong></TableCell>
                                    <TableCell align="right"><strong>Unit Price</strong></TableCell>
                                    <TableCell align="right"><strong>Total Amount</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">Loading...</TableCell>
                                    </TableRow>
                                ) : paginatedSales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            {sales.length === 0 ? 'No sales recorded yet' : 'No sales match your filters'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSales.map((sale) => (
                                        <TableRow key={sale.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {formatDate(sale.sale_date || sale.created_at)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatTime(sale.created_at)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Sale ID">
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                        {sale.id.substring(0, 8)}...
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {sale.products?.name || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {sale.products?.category && (
                                                    <Chip label={sale.products.category} size="small" variant="outlined" />
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    {formatNumber(sale.quantity)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    {formatCurrency(sale.price_at_sale, settings.currency_symbol)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={700} color="success.main">
                                                    {formatCurrency(sale.quantity * sale.price_at_sale, settings.currency_symbol)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Box display="flex" justifyContent="center" mt={3}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(e, value) => setPage(value)}
                                color="primary"
                            />
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
