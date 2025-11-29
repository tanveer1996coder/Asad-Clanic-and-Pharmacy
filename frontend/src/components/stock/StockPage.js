import React, { useState, useEffect } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Box,
    MenuItem,
    Chip,
    InputAdornment,
} from '@mui/material';
import { Add, LocalShipping } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, getExpiryStatus, getStockStatus } from '../../utils/dateHelpers';
import { openWhatsAppOrder } from '../../utils/whatsappHelper';
import useSettings from '../../hooks/useSettings';

export default function StockPage() {
    const { settings } = useSettings();
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [formData, setFormData] = useState({
        quantity: '',
        cost_price: '',
        expiry_date: '',
        supplier_id: '',
        received_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    useEffect(() => {
        fetchProducts();
        fetchSuppliers();
    }, []);

    async function fetchProducts() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }
            const orgId = session.user.id;

            const { data, error } = await supabase
                .from('products')
                .select('*, suppliers(name)')
                .eq('organization_id', orgId)
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }

    async function fetchSuppliers() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const orgId = session.user.id;

        const { data } = await supabase
            .from('suppliers')
            .select('*')
            .eq('organization_id', orgId)
            .is('deleted_at', null)
            .order('name');
        setSuppliers(data || []);
    }

    const handleOpenDialog = (product) => {
        setSelectedProduct(product);
        setFormData({
            quantity: '',
            cost_price: product.cost_price?.toString() || '',
            expiry_date: '',
            supplier_id: product.supplier_id || '',
            received_date: new Date().toISOString().split('T')[0],
            notes: '',
        });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedProduct(null);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const quantity = parseInt(formData.quantity);
        if (!quantity || quantity <= 0) {
            toast.error('Please enter valid quantity');
            return;
        }

        try {
            // Record stock receipt - let database DEFAULT set organization_id
            const { error: receiptError } = await supabase
                .from('stock_receipts')
                .insert([{
                    product_id: selectedProduct.id,
                    supplier_id: formData.supplier_id || null,
                    quantity,
                    cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
                    expiry_date: formData.expiry_date || null,
                    received_date: formData.received_date,
                    notes: formData.notes || null,
                }]);

            if (receiptError) throw receiptError;

            // Update product stock and expiry
            const { error: updateError } = await supabase.rpc('add_stock', {
                p_id: selectedProduct.id,
                q_added: quantity,
                new_expiry: formData.expiry_date || null,
                new_cost: formData.cost_price ? parseFloat(formData.cost_price) : null,
            });

            if (updateError) throw updateError;

            toast.success('Stock added successfully!');
            handleCloseDialog();
            fetchProducts();
        } catch (error) {
            console.error('Error adding stock:', error);
            toast.error('Failed to add stock: ' + error.message);
        }
    };

    return (
        <Container maxWidth="xl">
            <Typography variant="h4" fontWeight={700} color="primary" mb={3}>
                Stock Management
            </Typography>

            <Card>
                <CardContent>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                        Current Stock Levels
                    </Typography>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Product</strong></TableCell>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell><strong>Current Stock</strong></TableCell>
                                    <TableCell><strong>Min Level</strong></TableCell>
                                    <TableCell><strong>Expiry</strong></TableCell>
                                    <TableCell><strong>Supplier</strong></TableCell>
                                    <TableCell align="right"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">Loading...</TableCell>
                                    </TableRow>
                                ) : products.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">No products found</TableCell>
                                    </TableRow>
                                ) : (
                                    products.map((product) => {
                                        const stockStatus = getStockStatus(product.stock, product.min_stock_level);
                                        const expiryStatus = product.expiry_date
                                            ? getExpiryStatus(product.expiry_date, 7, parseInt(settings.expiry_alert_days || '15'))
                                            : null;

                                        return (
                                            <TableRow key={product.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {product.name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {product.category && (
                                                        <Chip label={product.category} size="small" variant="outlined" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={`${formatNumber(product.stock)} units`}
                                                        size="small"
                                                        color={stockStatus.color}
                                                    />
                                                </TableCell>
                                                <TableCell>{product.min_stock_level}</TableCell>
                                                <TableCell>
                                                    {expiryStatus ? (
                                                        <Chip
                                                            label={expiryStatus.label}
                                                            size="small"
                                                            color={expiryStatus.color}
                                                        />
                                                    ) : (
                                                        '—'
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption">
                                                        {product.suppliers?.name || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Box display="flex" gap={1} justifyContent="flex-end">
                                                        {(stockStatus.type === 'low' || stockStatus.type === 'out') && product.suppliers?.phone && (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                color="success"
                                                                onClick={() => openWhatsAppOrder(
                                                                    product.suppliers.phone,
                                                                    product.name,
                                                                    product.stock,
                                                                    settings.store_name
                                                                )}
                                                            >
                                                                Order
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<Add />}
                                                            onClick={() => handleOpenDialog(product)}
                                                        >
                                                            Add Stock
                                                        </Button>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Add Stock Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>
                        <Box display="flex" alignItems="center" gap={1}>
                            <LocalShipping color="primary" />
                            Add Stock - {selectedProduct?.name}
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    type="number"
                                    label="Quantity to Add"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    inputProps={{ min: 1 }}
                                    helperText={`Current stock: ${selectedProduct?.stock || 0}`}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Cost Price (per unit)"
                                    name="cost_price"
                                    value={formData.cost_price}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">{settings.currency_symbol}</InputAdornment>,
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Expiry Date"
                                    name="expiry_date"
                                    value={formData.expiry_date}
                                    onChange={handleChange}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Supplier"
                                    name="supplier_id"
                                    value={formData.supplier_id}
                                    onChange={handleChange}
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {suppliers.map((supplier) => (
                                        <MenuItem key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Received Date"
                                    name="received_date"
                                    value={formData.received_date}
                                    onChange={handleChange}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Notes"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Optional notes about this stock receipt"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button type="submit" variant="contained">
                            Add Stock
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Container>
    );
}
