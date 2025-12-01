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
    TablePagination,
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
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({
        start: '',
        end: '',
    });

    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchAllSales();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, dateFilter, page, rowsPerPage]);

    async function fetchAllSales() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const orgId = session.user.id;

            let query = supabase
                .from('sales')
                .select('*, products(name, form, strength)', { count: 'exact' })
                .eq('organization_id', orgId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            // Apply date filters using created_at
            if (dateFilter.start) {
                const startDate = new Date(dateFilter.start);
                startDate.setHours(0, 0, 0, 0);
                query = query.gte('created_at', startDate.toISOString());
            }
            if (dateFilter.end) {
                const endDate = new Date(dateFilter.end);
                endDate.setHours(23, 59, 59, 999);
                query = query.lte('created_at', endDate.toISOString());
            }

            const from = page * rowsPerPage;
            const to = from + rowsPerPage - 1;

            const { data, count, error } = await query.range(from, to);

            if (error) throw error;

            // Client-side filtering for product name/category if search term exists
            let filteredData = data || [];
            if (searchTerm && data) {
                const search = searchTerm.toLowerCase();
                filteredData = data.filter(sale =>
                    sale.products?.name?.toLowerCase().includes(search) ||
                    sale.products?.form?.toLowerCase().includes(search) ||
                    sale.id.toLowerCase().includes(search)
                );
            }

            setSales(filteredData);
            setTotalCount(count || 0);

            // Calculate totals from all matching records
            const { data: allData } = await supabase
                .from('sales')
                .select('quantity, price_at_sale')
                .eq('organization_id', orgId)
                .is('deleted_at', null);

            if (allData) {
                const revenue = allData.reduce((sum, sale) => sum + (sale.quantity * sale.price_at_sale), 0);
                const items = allData.reduce((sum, sale) => sum + sale.quantity, 0);
                setTotalRevenue(revenue);
                setTotalItems(items);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
            toast.error('Failed to load sales history');
        } finally {
            setLoading(false);
        }
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
        setPage(0);
    }

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    function exportToCSV() {
        // For export, we need all filtered data, not just current page
        // This is a limitation - for now export current page only
        const csvData = sales.map(sale => ({
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

    // Summary stats from totals calculated in fetch

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
                        disabled={sales.length === 0}
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
                                {formatNumber(totalCount)}
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
                        <Chip
                            label={`Showing ${sales.length} of ${totalCount}`}
                            size="small"
                            color="primary"
                            sx={{ ml: 2 }}
                        />
                    </Typography>
                    <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Date & Time</strong></TableCell>
                                    <TableCell><strong>Sale ID</strong></TableCell>
                                    <TableCell><strong>Product</strong></TableCell>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell align="right"><strong>Unit</strong></TableCell>
                                    <TableCell align="right"><strong>Items</strong></TableCell>
                                    <TableCell align="right"><strong>Boxes</strong></TableCell>
                                    <TableCell align="right"><strong>Unit Price</strong></TableCell>
                                    <TableCell align="right"><strong>Total Amount</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">Loading...</TableCell>
                                    </TableRow>
                                ) : sales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            {sales.length === 0 ? 'No sales recorded yet' : 'No sales match your filters'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sales.map((sale) => {
                                        const isBoxSale = sale.selling_unit === 'box';
                                        const itemsPerBox = sale.items_per_box || 1;
                                        const boxes = isBoxSale ? sale.quantity : 0;
                                        const items = isBoxSale ? sale.quantity * itemsPerBox : sale.quantity;

                                        return (
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
                                                    <Chip
                                                        label={isBoxSale ? 'Box' : 'Item'}
                                                        size="small"
                                                        color={isBoxSale ? 'secondary' : 'primary'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {formatNumber(items)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {boxes > 0 ? formatNumber(boxes) : '—'}
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
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    <TablePagination
                        rowsPerPageOptions={[25, 50, 100, 200]}
                        component="div"
                        count={totalCount}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </CardContent>
            </Card>
        </Container>
    );
}
