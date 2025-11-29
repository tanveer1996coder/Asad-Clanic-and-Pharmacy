import React, { useState, useEffect } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Divider,
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
import { Add, Delete, ShoppingCart } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, formatTime } from '../../utils/dateHelpers';
import { saveOfflineSale } from '../../utils/offlineStorage';
import useSettings from '../../hooks/useSettings';
import DailySales from './DailySales';
import { printReceipt } from '../../utils/printReceipt';

export default function SalesPage() {
    const { settings } = useSettings();
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cart & Form State
    const [cart, setCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [formData, setFormData] = useState({
        quantity: '1',
        price_at_sale: '',
        sale_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        discount: '0',
        notes: ''
    });

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        fetchRecentSales();

        // Check for quick reorder data
        const quickReorderData = localStorage.getItem('quick_reorder');
        if (quickReorderData) {
            try {
                const { customer, items } = JSON.parse(quickReorderData);
                setSelectedCustomer(customer);

                // Add items to cart
                const cartItems = items.map(item => ({
                    product: item.product,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.quantity * item.price
                }));

                setCart(cartItems);
                toast.success(`Loaded ${items.length} items for ${customer.name}`);

                // Clear the localStorage
                localStorage.removeItem('quick_reorder');
            } catch (error) {
                console.error('Error loading quick reorder:', error);
                localStorage.removeItem('quick_reorder');
            }
        }
    }, []);

    async function fetchCustomers() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const orgId = session.user.id;

        const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('organization_id', orgId)
            .is('deleted_at', null)
            .order('name');
        setCustomers(data || []);
    }

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
            .is('deleted_at', null)
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

    const handleAddToCart = (e) => {
        e.preventDefault();
        if (!selectedProduct) {
            toast.error('Please select a product');
            return;
        }

        const quantity = parseInt(formData.quantity);
        const price = parseFloat(formData.price_at_sale);

        if (quantity <= 0 || isNaN(price)) {
            toast.error('Invalid quantity or price');
            return;
        }

        if (selectedProduct.stock < quantity) {
            toast.error(`Not enough stock! Available: ${selectedProduct.stock}`);
            return;
        }

        // Check if product already in cart
        const existingItemIndex = cart.findIndex(item => item.product.id === selectedProduct.id);
        if (existingItemIndex >= 0) {
            const newCart = [...cart];
            newCart[existingItemIndex].quantity += quantity;
            setCart(newCart);
        } else {
            setCart([...cart, {
                product: selectedProduct,
                quantity,
                price,
                total: quantity * price
            }]);
        }

        // Reset product selection but keep date/customer
        setSelectedProduct(null);
        setFormData(prev => ({ ...prev, quantity: '1', price_at_sale: '' }));
        toast.success('Added to cart');
    };

    const handleRemoveFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const calculateCartTotal = () => {
        return cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Please log in');
                return;
            }

            const totalAmount = calculateCartTotal();
            const discount = parseFloat(formData.discount) || 0;
            const finalAmount = totalAmount - discount;

            // 1. Create Invoice
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert([{
                    customer_id: selectedCustomer?.id || null,
                    total_amount: finalAmount,
                    discount: discount,
                    payment_method: formData.payment_method,
                    notes: formData.notes,
                    organization_id: session.user.id
                }])
                .select()
                .single();

            if (invoiceError) throw invoiceError;

            // 2. Create Sales Records
            const salesData = cart.map(item => ({
                invoice_id: invoice.id,
                product_id: item.product.id,
                quantity: item.quantity,
                price_at_sale: item.price,
                sale_date: formData.sale_date,
                organization_id: session.user.id
            }));

            const { error: salesError } = await supabase
                .from('sales')
                .insert(salesData);

            if (salesError) throw salesError;

            // 3. Update Stock
            for (const item of cart) {
                await supabase.rpc('decrease_stock', {
                    p_id: item.product.id,
                    q_sold: item.quantity
                });
            }

            // 4. Clear cart and show success
            const savedInvoice = { ...invoice, id: invoice.id };
            const savedItems = cart.map(item => ({
                ...item,
                products: item.product
            }));

            toast.success('Sale completed successfully!');

            // Trigger print automatically
            setTimeout(() => {
                printReceipt(savedInvoice, savedItems, settings);
            }, 500);

            setCart([]);
            setFormData(prev => ({ ...prev, discount: '0', notes: '' }));
            setSelectedCustomer(null);
            fetchProducts();
            fetchRecentSales();
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Checkout failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSale = async (id) => {
        if (!window.confirm('Delete this sale? Stock will NOT be restored.')) return;

        try {
            // Soft delete
            const { error } = await supabase
                .from('sales')
                .update({ deleted_at: new Date().toISOString() })
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
                <Grid item xs={12} md={3}>
                    <DailySales />
                </Grid>

                <Grid item xs={12} md={9}>
                    <Grid container spacing={3}>
                        {/* Left Side: Input Form */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight={600} mb={2}>
                                        Add Items
                                    </Typography>
                                    <form onSubmit={handleAddToCart}>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <Autocomplete
                                                    value={selectedCustomer}
                                                    onChange={(e, newValue) => setSelectedCustomer(newValue)}
                                                    options={customers}
                                                    getOptionLabel={(option) => option.name}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Select Customer (Optional)"
                                                            placeholder="Search customer..."
                                                        />
                                                    )}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Autocomplete
                                                    value={selectedProduct}
                                                    onChange={handleProductChange}
                                                    options={products}
                                                    getOptionLabel={(option) => option.name}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Select Product"
                                                            required={!selectedProduct}
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
                                            <Grid item xs={6}>
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
                                            <Grid item xs={6}>
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
                                                <Button
                                                    type="submit"
                                                    variant="contained"
                                                    fullWidth
                                                    size="large"
                                                    startIcon={<Add />}
                                                    disabled={!selectedProduct}
                                                >
                                                    Add to Cart
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </form>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Right Side: Cart & Checkout */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6" fontWeight={600}>
                                            Current Cart
                                        </Typography>
                                        <Chip label={`${cart.length} items`} color="primary" size="small" />
                                    </Box>

                                    <Box sx={{ maxHeight: 300, overflowY: 'auto', mb: 2 }}>
                                        {cart.length === 0 ? (
                                            <Typography color="text.secondary" align="center" py={4}>
                                                Cart is empty
                                            </Typography>
                                        ) : (
                                            cart.map((item, index) => (
                                                <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1} p={1} bgcolor="background.default" borderRadius={1}>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600}>{item.product.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {item.quantity} x {formatCurrency(item.price, settings.currency_symbol)}
                                                        </Typography>
                                                    </Box>
                                                    <Box display="flex" alignItems="center">
                                                        <Typography variant="body2" fontWeight={600} mr={1}>
                                                            {formatCurrency(item.total, settings.currency_symbol)}
                                                        </Typography>
                                                        <IconButton size="small" color="error" onClick={() => handleRemoveFromCart(index)}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                            ))
                                        )}
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Discount"
                                                name="discount"
                                                type="number"
                                                value={formData.discount}
                                                onChange={handleChange}
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                select
                                                label="Payment"
                                                name="payment_method"
                                                value={formData.payment_method}
                                                onChange={handleChange}
                                                SelectProps={{ native: true }}
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="card">Card</option>
                                                <option value="online">Online</option>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                <Typography variant="h6">Total:</Typography>
                                                <Typography variant="h4" color="primary" fontWeight={700}>
                                                    {formatCurrency(calculateCartTotal() - (parseFloat(formData.discount) || 0), settings.currency_symbol)}
                                                </Typography>
                                            </Box>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                fullWidth
                                                size="large"
                                                onClick={handleCheckout}
                                                disabled={cart.length === 0 || loading}
                                            >
                                                {loading ? 'Processing...' : 'Complete Sale'}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Recent Sales
                            </Typography>
                            {loading && sales.length === 0 ? (
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
