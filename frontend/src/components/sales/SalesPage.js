import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    InputAdornment,
    Divider
} from '@mui/material';
import {
    Add,
    Delete,
    ShoppingCart,
    Search,
    Save,
    Keyboard,
    Close
} from '@mui/icons-material';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from '@tanstack/react-table';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency } from '../../utils/formatters';
import useSettings from '../../hooks/useSettings';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import DailySales from './DailySales';
import ReceiptModal from '../shared/ReceiptModal';

export default function SalesPage() {
    const { settings } = useSettings();
    const [searchParams] = useSearchParams();

    // -- State --
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState({ invoice: null, items: [] });
    const [helpOpen, setHelpOpen] = useState(false);

    // Cart & Selection
    const [cart, setCart] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    // Form Data (Global for sale)
    const [globalDiscount, setGlobalDiscount] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [saleDate, setSaleDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    // Refs for focus management
    const searchInputRef = useRef(null);
    const discountInputRef = useRef(null);
    const payButtonRef = useRef(null);

    // -- Effects --
    useEffect(() => {
        fetchCustomers();
        // Focus search on mount
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    // -- Data Fetching --
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
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // -- Cart Logic --
    const addToCart = (product) => {
        if (!product) return;

        // Default to item unit
        const sellingUnit = product.selling_unit === 'box' ? 'box' : 'item';
        const price = sellingUnit === 'box'
            ? (product.price_per_box || (product.price * (product.items_per_box || 1)))
            : product.price;

        setCart(prev => {
            const existingIndex = prev.findIndex(item => item.product.id === product.id && item.selling_unit === sellingUnit);
            if (existingIndex >= 0) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += 1;
                newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].price;
                return newCart;
            } else {
                return [...prev, {
                    product,
                    quantity: 1,
                    price: parseFloat(price),
                    selling_unit: sellingUnit,
                    total: parseFloat(price)
                }];
            }
        });

        // Reset selection and focus back to search
        setSelectedProduct(null);
        if (searchInputRef.current) searchInputRef.current.focus();
        toast.success(`Added ${product.name}`);
    };

    const updateCartItem = (index, field, value) => {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[index];

            if (field === 'quantity') {
                const qty = parseInt(value) || 0;
                item.quantity = qty;
                item.total = qty * item.price;
            } else if (field === 'price') {
                const price = parseFloat(value) || 0;
                item.price = price;
                item.total = item.quantity * price;
            } else if (field === 'selling_unit') {
                const newUnit = value;
                item.selling_unit = newUnit;

                // Recalculate price based on new unit
                if (newUnit === 'box') {
                    item.price = parseFloat(item.product.price_per_box || (item.product.price * (item.product.items_per_box || 1)));
                } else {
                    item.price = parseFloat(item.product.price);
                }
                item.total = item.quantity * item.price;
            }

            return newCart;
        });
    };

    const removeFromCart = (index) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
        return subtotal - (parseFloat(globalDiscount) || 0);
    };

    // -- Checkout Logic --
    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const totalAmount = calculateTotal();
            const discount = parseFloat(globalDiscount) || 0;

            // 1. Create Invoice
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert([{
                    customer_id: selectedCustomer?.id || null,
                    total_amount: totalAmount,
                    discount: discount,
                    payment_method: paymentMethod,
                    notes: notes,
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
                sale_date: saleDate,
                organization_id: session.user.id,
                selling_unit: item.selling_unit,
                items_per_box: item.product.items_per_box
            }));

            const { error: salesError } = await supabase.from('sales').insert(salesData);
            if (salesError) throw salesError;

            // 3. Update Stock
            for (const item of cart) {
                const actualQty = item.selling_unit === 'box'
                    ? item.quantity * (item.product.items_per_box || 1)
                    : item.quantity;

                await supabase.rpc('decrease_stock', {
                    p_id: item.product.id,
                    q_sold: actualQty
                });
            }

            // 4. Success
            toast.success('Sale completed!');
            setReceiptData({
                invoice: { ...invoice },
                items: cart.map(i => ({ ...i, products: i.product }))
            });
            setReceiptModalOpen(true);

            // Reset
            setCart([]);
            setGlobalDiscount('0');
            setNotes('');
            setSelectedCustomer(null);
            if (searchInputRef.current) searchInputRef.current.focus();

        } catch (error) {
            console.error('Checkout error:', error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleUnit = (index) => {
        if (index < 0 || index >= cart.length) return;
        const item = cart[index];
        const newUnit = item.selling_unit === 'box' ? 'item' : 'box';
        updateCartItem(index, 'selling_unit', newUnit);
    };

    const handleInputKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // On Enter, move focus back to search to add next item
            searchInputRef.current?.focus();
        }
    };

    // -- Keyboard Shortcuts --
    useKeyboardShortcuts({
        'F2': () => searchInputRef.current?.focus(),
        'F4': () => handleCheckout(), // Pay / Checkout
        'F8': () => toggleUnit(cart.length - 1), // Toggle Unit of last item
        'F9': () => discountInputRef.current?.focus(),
        'Escape': () => {
            setSelectedProduct(null);
            if (document.activeElement === searchInputRef.current) {
                searchInputRef.current.blur();
            } else {
                searchInputRef.current?.focus();
            }
        },
        'Shift+?': () => setHelpOpen(true)
    });

    // -- Table Config --
    const columns = useMemo(() => [
        {
            header: 'Product',
            accessorKey: 'product.name',
            cell: info => (
                <Box>
                    <Typography variant="body2" fontWeight="bold">{info.getValue()}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Stock: {info.row.original.product.stock} | Exp: {info.row.original.product.expiry_date || 'N/A'}
                    </Typography>
                </Box>
            )
        },
        {
            header: 'Stock',
            accessorKey: 'product.stock',
            cell: info => (
                <Typography variant="body2" color={info.getValue() < 10 ? 'error' : 'text.primary'}>
                    {info.getValue()}
                </Typography>
            )
        },
        {
            header: 'Unit',
            accessorKey: 'selling_unit',
            cell: info => (
                <Chip
                    label={info.getValue().toUpperCase()}
                    size="small"
                    color={info.getValue() === 'box' ? 'secondary' : 'default'}
                    variant="outlined"
                    onClick={() => {
                        const currentUnit = info.getValue();
                        const newUnit = currentUnit === 'box' ? 'item' : 'box';
                        updateCartItem(info.row.index, 'selling_unit', newUnit);
                    }}
                    sx={{ cursor: 'pointer', minWidth: 60 }}
                />
            )
        },
        {
            header: 'Price',
            accessorKey: 'price',
            cell: info => (
                <TextField
                    type="number"
                    variant="standard"
                    size="small"
                    value={info.getValue()}
                    onChange={e => updateCartItem(info.row.index, 'price', e.target.value)}
                    onKeyDown={(e) => handleInputKeyDown(e, info.row.index)}
                    InputProps={{ disableUnderline: true }}
                    sx={{ width: 80 }}
                />
            )
        },
        {
            header: 'Qty',
            accessorKey: 'quantity',
            cell: info => (
                <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    autoFocus={info.row.index === cart.length - 1} // Auto-focus new rows
                    value={info.getValue()}
                    onChange={e => updateCartItem(info.row.index, 'quantity', e.target.value)}
                    onKeyDown={(e) => handleInputKeyDown(e, info.row.index)}
                    sx={{ width: 80 }}
                    inputProps={{ min: 1 }}
                />
            )
        },
        {
            header: 'Total',
            accessorKey: 'total',
            cell: info => (
                <Typography fontWeight="bold">
                    {formatCurrency(info.getValue(), settings.currency_symbol)}
                </Typography>
            )
        },
        {
            id: 'actions',
            cell: info => (
                <IconButton color="error" size="small" onClick={() => removeFromCart(info.row.index)}>
                    <Delete fontSize="small" />
                </IconButton>
            )
        }
    ], [cart, settings.currency_symbol]);

    const table = useReactTable({
        data: cart,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <Container maxWidth="xl" sx={{ pb: 4 }}>
            {/* Header & Search */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight={700} color="primary">
                    Sales Terminal
                </Typography>
                <Button startIcon={<Keyboard />} onClick={() => setHelpOpen(true)} size="small">
                    Shortcuts
                </Button>
            </Box>

            <Grid container spacing={2}>
                {/* Left: Sales Table & Search */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={8}>
                                <Autocomplete
                                    id="product-search"
                                    options={products}
                                    getOptionLabel={(option) => option.name}
                                    filterOptions={(x) => x}
                                    value={selectedProduct}
                                    onChange={(e, val) => {
                                        if (val) addToCart(val);
                                    }}
                                    onInputChange={(e, val) => {
                                        if (e?.type === 'change') searchProducts(val);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            inputRef={searchInputRef}
                                            label="Scan Barcode or Search Product (F2)"
                                            placeholder="Type product name..."
                                            fullWidth
                                            InputProps={{
                                                ...params.InputProps,
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Search color="action" />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <>
                                                        {loading ? <CircularProgress size={20} /> : null}
                                                        {params.InputProps.endAdornment}
                                                    </>
                                                )
                                            }}
                                        />
                                    )}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Box display="flex" justifyContent="space-between" width="100%">
                                                <Box>
                                                    <Typography variant="body1">{option.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {option.category}
                                                    </Typography>
                                                </Box>
                                                <Box textAlign="right">
                                                    <Typography variant="body2" color={option.stock < 10 ? 'error.main' : 'success.main'}>
                                                        {option.stock} in stock
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {formatCurrency(option.price, settings.currency_symbol)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </li>
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Autocomplete
                                    options={customers}
                                    getOptionLabel={(option) => option.name}
                                    value={selectedCustomer}
                                    onChange={(e, val) => setSelectedCustomer(val)}
                                    renderInput={(params) => <TextField {...params} label="Customer (Optional)" fullWidth />}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <TableCell key={header.id} sx={{ fontWeight: 'bold', bgcolor: 'background.default' }}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHead>
                            <TableBody>
                                {table.getRowModel().rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                            <Typography color="text.secondary">
                                                No items in cart. Search to add products.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    table.getRowModel().rows.map(row => (
                                        <TableRow key={row.id} hover>
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                {/* Right: Totals & Actions */}
                <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
                        {/* Summary Card */}
                        <Card sx={{ display: 'flex', flexDirection: 'column' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Sale Summary</Typography>
                                <Box my={2}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography color="text.secondary">Subtotal</Typography>
                                        </Grid>
                                        <Grid item xs={6} textAlign="right">
                                            <Typography variant="h6">
                                                {formatCurrency(cart.reduce((s, i) => s + i.total, 0), settings.currency_symbol)}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                label="Discount (F9)"
                                                fullWidth
                                                size="small"
                                                type="number"
                                                value={globalDiscount}
                                                onChange={e => setGlobalDiscount(e.target.value)}
                                                inputRef={discountInputRef}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                select
                                                label="Payment Method"
                                                fullWidth
                                                size="small"
                                                SelectProps={{ native: true }}
                                                value={paymentMethod}
                                                onChange={e => setPaymentMethod(e.target.value)}
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="card">Card</option>
                                                <option value="online">Online</option>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Divider sx={{ my: 1 }} />
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="h5" fontWeight="bold">Total</Typography>
                                                <Typography variant="h4" color="primary" fontWeight="bold">
                                                    {formatCurrency(calculateTotal(), settings.currency_symbol)}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Button
                                    variant="contained"
                                    color="success"
                                    fullWidth
                                    size="large"
                                    startIcon={<ShoppingCart />}
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0 || loading}
                                    ref={payButtonRef}
                                    sx={{ mt: 2, py: 2, fontSize: '1.2rem' }}
                                >
                                    {loading ? 'Processing...' : 'Complete Sale (F4)'}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Daily Sales Widget */}
                        <Box sx={{ flexGrow: 1 }}>
                            <DailySales />
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            {/* Help Dialog */}
            <Dialog open={helpOpen} onClose={() => setHelpOpen(false)}>
                <DialogTitle>Keyboard Shortcuts</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={6}><Chip label="F2" size="small" /></Grid>
                        <Grid item xs={6}><Typography>Focus Search Bar</Typography></Grid>

                        <Grid item xs={6}><Chip label="F4" size="small" /></Grid>
                        <Grid item xs={6}><Typography>Complete Sale / Pay</Typography></Grid>

                        <Grid item xs={6}><Chip label="F9" size="small" /></Grid>
                        <Grid item xs={6}><Typography>Focus Discount Field</Typography></Grid>

                        <Grid item xs={6}><Chip label="F8" size="small" /></Grid>
                        <Grid item xs={6}><Typography>Toggle Unit (Item/Box)</Typography></Grid>

                        <Grid item xs={6}><Chip label="Esc" size="small" /></Grid>
                        <Grid item xs={6}><Typography>Clear Selection / Blur</Typography></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHelpOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <ReceiptModal
                open={receiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                invoice={receiptData.invoice}
                items={receiptData.items}
                settings={settings}
            />
        </Container>
    );
}
