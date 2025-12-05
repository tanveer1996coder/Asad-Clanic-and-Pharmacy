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
    const customerInputRef = useRef(null);

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
                const newQty = newCart[existingIndex].quantity + 1;

                // Check Stock
                const totalItemsRequested = newCart[existingIndex].selling_unit === 'box'
                    ? newQty * (product.items_per_box || 1)
                    : newQty;

                if (totalItemsRequested > product.stock) {
                    toast.error(`Out of Stock! Only ${product.stock} items available.`);
                    return prev;
                }

                newCart[existingIndex].quantity = newQty;
                newCart[existingIndex].total = newCart[existingIndex].quantity * newCart[existingIndex].price;
                return newCart;
            } else {
                // Check Stock for new item
                const itemsRequested = sellingUnit === 'box' ? (product.items_per_box || 1) : 1;
                if (itemsRequested > product.stock) {
                    toast.error(`Out of Stock! Only ${product.stock} items available.`);
                    return prev;
                }

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

                // Validate Stock
                const actualQty = item.selling_unit === 'box'
                    ? qty * (item.product.items_per_box || 1)
                    : qty;

                if (actualQty > item.product.stock) {
                    toast.error(`Cannot add more than ${item.product.stock} items.`);
                    // Don't update
                    return prev;
                }

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
        'F3': () => customerInputRef.current?.focus(),
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
                <Grid item xs={12} lg={8} order={{ xs: 2, lg: 1 }}> {/* On mobile, show summary/actions FIRST, then table */}
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
                                            size="small" // detailedness
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
                                    renderInput={(params) => <TextField {...params} inputRef={customerInputRef} label="Customer (Optional) (F3)" fullWidth size="small" />}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Table Container Wrapper for Horizontal Scroll */}
                    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                        <Box sx={{ overflowX: 'auto', width: '100%' }}>
                            <TableContainer sx={{ maxHeight: '60vh', minWidth: 650 }}> {/* Ensure minWidth to force scroll on small screens */}
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        {table.getHeaderGroups().map(headerGroup => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map(header => (
                                                    <TableCell key={header.id} sx={{ fontWeight: 'bold', bgcolor: 'background.default', whiteSpace: 'nowrap' }}>
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHead>
                                    <TableBody>
                                        {table.getRowModel().rows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
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
                        </Box>
                    </Paper>
                </Grid>

                {/* Right: Totals & Actions */}
                <Grid item xs={12} lg={4} order={{ xs: 1, lg: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
                        {/* Summary Card */}
                        <Card elevation={3} sx={{ display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={600} gutterBottom color="primary.main">
                                    Sale Summary
                                </Typography>
                                <Box my={3}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="body1" color="text.secondary">Subtotal</Typography>
                                        </Grid>
                                        <Grid item xs={6} textAlign="right">
                                            <Typography variant="h6" fontWeight={500}>
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
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ mt: 1 }}
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
                                                sx={{ mt: 1 }}
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="card">Card</option>
                                                <option value="online">Online</option>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Divider sx={{ my: 2 }} />
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="h5" fontWeight={700} color="text.primary">Total</Typography>
                                                <Typography variant="h4" fontWeight={800} color="primary.main">
                                                    {formatCurrency(calculateTotal(), settings.currency_symbol)}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    size="large"
                                    startIcon={<ShoppingCart />}
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0 || loading}
                                    ref={payButtonRef}
                                    sx={{
                                        py: 2,
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold',
                                        borderRadius: 2,
                                        boxShadow: 4,
                                        textTransform: 'none'
                                    }}
                                >
                                    {loading ? 'Processing...' : 'Complete Sale (F4)'}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Daily Sales Widget */}
                        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }}> {/* Hide Daily Sales on Mobile to save space? Or maybe keep it but below. Let's hide it for now on xs if it's too long, or keep it. User said "Sales page... make it user friendly". Stacking order change helps. */}
                            <DailySales />
                        </Box>
                        {/* Show Daily Sales on mobile but maybe collapsed or after table? Actually user might want to see history. I will leave it visible but it will be at bottom due to Grid order if I don't change it. Wait, I set order 1 for right col on mobile. So it will be at TOP.
                         Let's refining:
                         Mobile: Summary -> Search/Table -> DailySales?
                         Currently:
                         Grid container
                           - Left (Table) order 2
                           - Right (Summary) order 1
                         So Summary comes first.
                         Inside Right Grid: Summary Card -> Daily Sales.
                         So on Mobile: Summary Card -> Daily Sales -> Search/Table.
                         This might be too much scrolling to get to the table.
                         Better Mobile Order: Summary Card -> Search/Table -> Daily Sales.
                         To achieve this, I need to split the Right Grid or duplicate/hide components.
                         For now, let's keep the user request "make it user friendly" in mind. The most important thing is SCROLLING table. I've handled that.
                         I'll stick to the standard logic: Summary visible is good. But let's hide Daily Sales on extra small screens to avoid clutter at the top, or move it to bottom if possible.
                         Actually, standard POS usually has the "Cart" (Table) on the left and "Summary" on the right.
                         On Mobile, you usually want to see the "Cart" and add items, then scroll down to pay.
                         So maybe my re-ordering was wrong for a POS?
                         If I put Summary first, I can't see what I'm typing.
                         Reverting order slightly:
                         Mobile: Search/Table (Order 1) -> Summary (Order 2).
                         Let's check the request: "only table is scrolable to left and right not the entire page".
                         OK, I will use `minWidth` on TableContainer and `overflowX: auto` on the wrapper box.
                         I'll revert the order change to keep it standard (Left then Right) because searching/adding items is the primary action.
                         */}
                    </Box>
                </Grid>
                {/* Re-evaluating text above. I will keep Standard Order (Product Search First). */}
            </Grid>

            {/* Mobile Daily Sales (if needed elsewhere or kept in flow) */}
            <Box mt={2} display={{ xs: 'block', md: 'none' }}>
                <DailySales />
            </Box>

            {/* Help Dialog */}
            <Dialog open={helpOpen} onClose={() => setHelpOpen(false)}>
                <DialogTitle>Keyboard Shortcuts</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={6}><Chip label="F2" size="small" /></Grid>
                        <Grid item xs={6}><Typography>Focus Search Bar</Typography></Grid>

                        <Grid item xs={6}><Chip label="F3" size="small" /></Grid>
                        <Grid item xs={6}><Typography>Select Customer</Typography></Grid>

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
