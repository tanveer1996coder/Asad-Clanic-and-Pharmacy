import React, { useState, useEffect } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Box,
    Autocomplete,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, formatTime } from '../../utils/dateHelpers';
import { saveOfflineSale } from '../../utils/offlineStorage';
import useSettings from '../../hooks/useSettings';
import DailySales from './DailySales';

export default function SalesPage() {
    const { settings } = useSettings();
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [formData, setFormData] = useState({
        quantity: '1',
        price_at_sale: '',
        sale_date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        fetchProducts();
        fetchRecentSales();
    }, []);

    async function fetchProducts() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const orgId = session.user.id;

        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('organization_id', orgId)
            .order('name');
        setProducts(data || []);
    }

    async function fetchRecentSales() {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setLoading(false);
            return;
        }
        const orgId = session.user.id;

        const { data } = await supabase
            .from('sales')
            .select('*, products(name)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(50);
        setSales(data || []);
        setLoading(false);
    }

    const handleProductChange = (event, newValue) => {
        setSelectedProduct(newValue);
        if (newValue) {
            setFormData({
                ...formData,
                price_at_sale: newValue.price.toString(),
            });
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedProduct) {
            toast.error('Please select a product');
            return;
        }

        const quantity = parseInt(formData.quantity);
        const price = parseFloat(formData.price_at_sale);

        if (quantity <= 0 || isNaN(price)) {
            toast.error('Please enter valid quantity and price');
            return;
        }

        if (selectedProduct.stock < quantity) {
            toast.error(`Not enough stock! Available: ${selectedProduct.stock}`);
            return;
        }

        try {
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Please log in to record sales');
                return;
            }

            if (!navigator.onLine) {
                const success = saveOfflineSale({
                    product_id: selectedProduct.id,
                    quantity,
                    price_at_sale: price,
                    sale_date: formData.sale_date,
                    organization_id: session.user.id,
                });

                if (success) {
                    toast.success('Sale saved offline! Will sync when online.');
                    setSelectedProduct(null);
                    setFormData({
                        quantity: '1',
                        price_at_sale: '',
                        sale_date: new Date().toISOString().split('T')[0],
                    });
                } else {
                    toast.error('Failed to save offline sale.');
                }
                return;
            }

            // Explicitly set organization_id for new sale
            const { error: saleError } = await supabase
                .from('sales')
                .insert([{
                    product_id: selectedProduct.id,
                    quantity,
                    price_at_sale: price,
                    sale_date: formData.sale_date,
                    organization_id: session.user.id,
                }]);

            if (saleError) throw saleError;

            const { error: stockError } = await supabase.rpc('decrease_stock', {
                p_id: selectedProduct.id,
                q_sold: quantity,
            });

            if (stockError) throw stockError;

            toast.success('Sale recorded successfully!');

            setSelectedProduct(null);
            setFormData({
                quantity: '1',
                price_at_sale: '',
                sale_date: new Date().toISOString().split('T')[0],
            });

            fetchProducts();
            fetchRecentSales();
        } catch (error) {
            console.error('Error recording sale:', error);
            toast.error('Failed to record sale: ' + (error.message || 'Unknown error'));
        }
    };

    const handleDeleteSale = async (id) => {
        if (!window.confirm('Delete this sale? Stock will NOT be restored.')) return;

        try {
            const { error } = await supabase
                .from('sales')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Sale deleted');
            fetchRecentSales();
        } catch (error) {
            toast.error('Failed to delete sale');
        }
    };

    const groupedSales = sales.reduce((acc, sale) => {
        const date = sale.sale_date || sale.created_at?.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(sale);
        return acc;
    }, {});

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Container maxWidth="xl">
            <Typography variant="h4" fontWeight={700} color="primary" mb={3}>
                Sales
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <DailySales />
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Record New Sale
                            </Typography>
                            <form onSubmit={handleSubmit}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Autocomplete
                                            value={selectedProduct}
                                            onChange={handleProductChange}
                                            options={products}
                                            getOptionLabel={(option) => option.name}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Product"
                                                    required
                                                    placeholder="Search product..."
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <li {...props}>
                                                    <Box>
                                                        <Typography variant="body2">{option.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Stock: {option.stock} | Price: {formatCurrency(option.price, settings.currency_symbol)}
                                                        </Typography>
                                                    </Box>
                                                </li>
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            required
                                            type="number"
                                            label="Quantity"
                                            name="quantity"
                                            value={formData.quantity}
                                            onChange={handleChange}
                                            inputProps={{ min: 1 }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            required
                                            type="number"
                                            label="Price"
                                            name="price_at_sale"
                                            value={formData.price_at_sale}
                                            onChange={handleChange}
                                            inputProps={{ step: '0.01' }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            type="date"
                                            label="Sale Date"
                                            name="sale_date"
                                            value={formData.sale_date}
                                            onChange={handleChange}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            fullWidth
                                            size="large"
                                            startIcon={<Add />}
                                        >
                                            Record Sale
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Recent Sales
                            </Typography>
                            {loading ? (
                                <Typography>Loading...</Typography>
                            ) : Object.keys(groupedSales).length === 0 ? (
                                <Typography color="text.secondary">No sales recorded yet</Typography>
                            ) : (
                                Object.entries(groupedSales).map(([date, daySales]) => (
                                    <Box key={date} mb={3}>
                                        <Chip
                                            label={formatDate(date)}
                                            color="primary"
                                            variant="outlined"
                                            sx={{ mb: 1 }}
                                        />
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Product</TableCell>
                                                        <TableCell align="right">Qty</TableCell>
                                                        <TableCell align="right">Price</TableCell>
                                                        <TableCell align="right">Total</TableCell>
                                                        <TableCell align="right">Time</TableCell>
                                                        <TableCell align="right">Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {daySales.map((sale) => (
                                                        <TableRow key={sale.id}>
                                                            <TableCell>{sale.products?.name || 'Unknown'}</TableCell>
                                                            <TableCell align="right">{formatNumber(sale.quantity)}</TableCell>
                                                            <TableCell align="right">{formatCurrency(sale.price_at_sale, settings.currency_symbol)}</TableCell>
                                                            <TableCell align="right">
                                                                {formatCurrency(sale.quantity * sale.price_at_sale, settings.currency_symbol)}
                                                            </TableCell>
                                                            <TableCell align="right">{formatTime(sale.created_at)}</TableCell>
                                                            <TableCell align="right">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => handleDeleteSale(sale.id)}
                                                                >
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}
