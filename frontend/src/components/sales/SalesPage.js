import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    TablePagination,
    ToggleButton,
    ToggleButtonGroup,
    CircularProgress,
} from '@mui/material';
import { Add, Delete, ShoppingCart } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, formatTime } from '../../utils/dateHelpers';
import { saveOfflineSale } from '../../utils/offlineStorage';
import useSettings from '../../hooks/useSettings';
import DailySales from './DailySales';
import ReceiptModal from '../shared/ReceiptModal';

export default function SalesPage() {
    const { settings } = useSettings();
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState({ invoice: null, items: [] });

    // Pagination State
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);

    // Cart & Form State
    const [cart, setCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Check for date parameter from URL and set initial sale_date
    const urlDate = searchParams.get('date');

    // Calculate local today date YYYY-MM-DD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localToday = `${year}-${month}-${day}`;

    const [formData, setFormData] = useState({
        quantity: '1',
        price_at_sale: '',
        sale_date: urlDate || localToday,
        payment_method: 'cash',
        discount: '0',
        notes: '',
        selling_unit: 'item', // 'box' or 'item'
    });

    useEffect(() => {
        fetchCustomers();

        // Listen for auth changes
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
                fetchCustomers();
            }
        });

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
                localStorage.removeItem('quick_reorder');
            } catch (error) {
                console.error('Error loading quick reorder:', error);
                localStorage.removeItem('quick_reorder');
            }
        }

        return () => {
            authSubscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        fetchRecentSales();
    }, [page, rowsPerPage]);

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

    // Server-side search for products
    const searchProducts = async (query) => {
        if (!query || query.length < 2) {
            setProducts([]);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .rpc('search_products', {
                    search_term: query,
                    p_limit: 50
                });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error searching products:', error);
            // Fallback to empty if RPC fails (e.g. migration not run)
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounce the search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (selectedProduct === null) { // Only search if not selecting a product
                // We don't auto-search on mount anymore, only on input
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, []);

    async function fetchRecentSales() {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setLoading(false);
            return;
        }
        const orgId = session.user.id;

        const from = page * rowsPerPage;
        const to = from + rowsPerPage - 1;

        const { data, count, error } = await supabase
            .from('sales')
            .select('*, products(name)', { count: 'exact' })
            .eq('organization_id', orgId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching sales:', error);
        } else {
            setSales(data || []);
            setTotalCount(count || 0);
        }
        setLoading(false);
    }

    const handleProductChange = (event, newValue) => {
        setSelectedProduct(newValue);
        if (newValue) {
            // Default to 'item' unless product is only sold by box
            const defaultUnit = newValue.selling_unit === 'box' ? 'box' : 'item';

            let price = newValue.price;
            if (defaultUnit === 'box') {
                price = newValue.price_per_box || (newValue.price * (newValue.items_per_box || 1));
            }

            setFormData(prev => ({
                ...prev,
                price_at_sale: price,
                selling_unit: defaultUnit,
                quantity: '1'
            }));
        }
    };

    const handleUnitChange = (event, newUnit) => {
        if (newUnit !== null && selectedProduct) {
            let price = selectedProduct.price;

            if (newUnit === 'box') {
                price = selectedProduct.price_per_box || (selectedProduct.price * (selectedProduct.items_per_box || 1));
            }

            setFormData(prev => ({
                ...prev,
                selling_unit: newUnit,
                price_at_sale: price
            }));
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
        let price = parseFloat(formData.price_at_sale);
        let actualQuantity = quantity; // Quantity in items to deduct from stock

        if (quantity <= 0 || isNaN(price)) {
            toast.error('Invalid quantity or price');
            return;
        }

        // Handle box-based selling
        if (formData.selling_unit === 'box') {
            const itemsPerBox = selectedProduct.items_per_box || 1;
            actualQuantity = quantity * itemsPerBox;

            // Use price_per_box if available, otherwise calculate from item price
            if (selectedProduct.price_per_box) {
                price = parseFloat(selectedProduct.price_per_box);
            } else {
                price = parseFloat(selectedProduct.price) * itemsPerBox;
            }
        } else {
            // Item-based selling - apply rounding rules
            const priceDecimal = price - Math.floor(price);
            if (priceDecimal >= 0.25) {
                // Round up to next integer
                price = Math.ceil(price);
            } else {
                // Round down
                price = Math.floor(price);
            }
        }

        if (selectedProduct.stock < actualQuantity) {
            toast.error(`Not enough stock! Available: ${selectedProduct.stock} items`);
            return;
        }

        // Check if product already in cart
        const existingItemIndex = cart.findIndex(item =>
            item.product.id === selectedProduct.id &&
            item.selling_unit === formData.selling_unit
        );

        if (existingItemIndex >= 0) {
            const newCart = [...cart];
            newCart[existingItemIndex].quantity += quantity;
            newCart[existingItemIndex].actual_quantity += actualQuantity;
            newCart[existingItemIndex].total = newCart[existingItemIndex].quantity * newCart[existingItemIndex].price;
            setCart(newCart);
        } else {
            setCart([...cart, {
                product: selectedProduct,
                quantity, // Display quantity (boxes or items)
                actual_quantity: actualQuantity, // Actual items to deduct
                price,
                total: quantity * price,
                selling_unit: formData.selling_unit,
            }]);
        }

        // Reset product selection but keep date/customer
        setSelectedProduct(null);
        setFormData(prev => ({ ...prev, quantity: '1', price_at_sale: '', selling_unit: 'item' }));
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
            // 2. Create Sales Records
            const salesDataWithUnits = cart.map(item => ({
                invoice_id: invoice.id,
                product_id: item.product.id,
                quantity: item.quantity,
                price_at_sale: item.price,
                sale_date: formData.sale_date,
                organization_id: session.user.id,
                selling_unit: item.selling_unit,
                items_per_box: item.product.items_per_box
            }));

            // Try inserting with new columns first
            const { error: salesError } = await supabase
                .from('sales')
                .insert(salesDataWithUnits);

            if (salesError) {
                // Fallback: If column doesn't exist (migration not run), insert without unit details
                if (salesError.message?.includes('column') || salesError.code === 'PGRST204') {
                    console.warn('Migration not run? Retrying without unit details...');
                    const salesDataLegacy = cart.map(item => ({
                        invoice_id: invoice.id,
                        product_id: item.product.id,
                        quantity: item.quantity,
                        price_at_sale: item.price,
                        sale_date: formData.sale_date,
                        organization_id: session.user.id
                    }));

                    const { error: retryError } = await supabase
                        .from('sales')
                        .insert(salesDataLegacy);

                    if (retryError) throw retryError;
                } else {
                    throw salesError;
                }
            }

            // 3. Update Stock - use actual_quantity for box sales
            for (const item of cart) {
                await supabase.rpc('decrease_stock', {
                    p_id: item.product.id,
                    q_sold: item.actual_quantity || item.quantity
                });
            }

            // 4. Clear cart and show success
            const savedInvoice = { ...invoice, id: invoice.id };
            const savedItems = cart.map(item => ({
                ...item,
                products: item.product
            }));

            toast.success('Sale completed successfully!');

            // Show receipt modal
            setReceiptData({ invoice: savedInvoice, items: savedItems });
            setReceiptModalOpen(true);

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

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

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
                                                    filterOptions={(x) => x}
                                                    onInputChange={(event, newInputValue) => {
                                                        if (event && event.type === 'change') {
                                                            searchProducts(newInputValue);
                                                        }
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            label="Search Product"
                                                            required={!selectedProduct}
                                                            placeholder="Type to search (min 2 chars)..."
                                                            InputProps={{
                                                                ...params.InputProps,
                                                                endAdornment: (
                                                                    <React.Fragment>
                                                                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                                                        {params.InputProps.endAdornment}
                                                                    </React.Fragment>
                                                                ),
                                                            }}
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
                                            {selectedProduct && (selectedProduct.selling_unit === 'both' || selectedProduct.selling_unit === 'box') && (
                                                <Grid item xs={12}>
                                                    <Typography variant="caption" color="text.secondary" gutterBottom>
                                                        Selling Unit
                                                    </Typography>
                                                    <ToggleButtonGroup
                                                        value={formData.selling_unit}
                                                        exclusive
                                                        onChange={handleUnitChange}
                                                        fullWidth
                                                        size="small"
                                                        color="primary"
                                                    >
                                                        <ToggleButton value="item" disabled={selectedProduct.selling_unit === 'box'}>
                                                            Item (Unit)
                                                        </ToggleButton>
                                                        <ToggleButton value="box" disabled={selectedProduct.selling_unit === 'item'}>
                                                            Box ({selectedProduct.items_per_box} items)
                                                        </ToggleButton>
                                                    </ToggleButtonGroup>
                                                </Grid>
                                            )}
                                            <Grid item xs={6}>
                                                <TextField
                                                    fullWidth
                                                    required
                                                    type="number"
                                                    label={formData.selling_unit === 'box' ? 'Boxes' : 'Quantity'}
                                                    name="quantity"
                                                    value={formData.quantity}
                                                    onChange={handleChange}
                                                    inputProps={{ min: 1 }}
                                                    helperText={
                                                        formData.selling_unit === 'box' && selectedProduct
                                                            ? `= ${parseInt(formData.quantity || 1) * (selectedProduct.items_per_box || 1)} items`
                                                            : ''
                                                    }
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
                        </Grid >

                        {/* Right Side: Cart & Checkout */}
                        < Grid item xs={12} md={6} >
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
                        </Grid >
                    </Grid >
                </Grid >

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
                                        <Chip label={formatDate(date)} color="primary" variant="outlined" sx={{ mb: 2 }} />
                                        <TableContainer sx={{ overflowX: 'auto' }}>
                                            <Table sx={{ minWidth: 650 }}>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Product</TableCell>
                                                        <TableCell align="right">Unit</TableCell>
                                                        <TableCell align="right">Items</TableCell>
                                                        <TableCell align="right">Boxes</TableCell>
                                                        <TableCell align="right">Price</TableCell>
                                                        <TableCell align="right">Total</TableCell>
                                                        <TableCell align="right">Time</TableCell>
                                                        <TableCell align="right">Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {daySales.map((sale) => {
                                                        const isBoxSale = sale.selling_unit === 'box';
                                                        const itemsPerBox = sale.items_per_box || 1;
                                                        const boxes = isBoxSale ? sale.quantity : 0;
                                                        const items = isBoxSale ? sale.quantity * itemsPerBox : sale.quantity;

                                                        return (
                                                            <TableRow key={sale.id}>
                                                                <TableCell>{sale.products?.name || 'Unknown'}</TableCell>
                                                                <TableCell align="right">
                                                                    <Chip
                                                                        label={isBoxSale ? 'Box' : 'Item'}
                                                                        size="small"
                                                                        color={isBoxSale ? 'secondary' : 'primary'}
                                                                        variant="outlined"
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right">{formatNumber(items)}</TableCell>
                                                                <TableCell align="right">{boxes > 0 ? formatNumber(boxes) : '—'}</TableCell>
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
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                ))
                            )}
                        </CardContent>
                        <TablePagination
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            component="div"
                            count={totalCount}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                    </Card>
                </Grid >
            </Grid >

            <ReceiptModal
                open={receiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                invoice={receiptData.invoice}
                items={receiptData.items}
                settings={settings}
            />
        </Container >
    );
}
