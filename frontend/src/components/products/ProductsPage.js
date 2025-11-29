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
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Chip,
    Box,
    MenuItem,
    InputAdornment,
    Tooltip,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Search,
    Warning,
    CheckCircle,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, getExpiryStatus, getStockStatus } from '../../utils/dateHelpers';
import useSettings from '../../hooks/useSettings';
import ConfirmDialog from '../shared/ConfirmDialog';

export default function ProductsPage() {
    const { settings } = useSettings();
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        cost_price: '',
        stock: '',
        min_stock_level: settings.low_stock_threshold || '10',
        expiry_date: '',
        supplier_id: '',
        category: '',
        barcode: '',
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
                toast.error('Please log in to view products');
                setLoading(false);
                return;
            }
            const orgId = session.user.id;

            const { data, error } = await supabase
                .from('products')
                .select('*, suppliers(name)')
                .eq('organization_id', orgId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

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
            .order('name');
        setSuppliers(data || []);
    }

    const handleOpenDialog = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name || '',
                price: product.price || '',
                cost_price: product.cost_price || '',
                stock: product.stock || '',
                min_stock_level: product.min_stock_level || settings.low_stock_threshold || '10',
                expiry_date: product.expiry_date || '',
                supplier_id: product.supplier_id || '',
                category: product.category || '',
                barcode: product.barcode || '',
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                price: '',
                cost_price: '',
                stock: '',
                min_stock_level: settings.low_stock_threshold || '10',
                expiry_date: '',
                supplier_id: '',
                category: '',
                barcode: '',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingProduct(null);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.price) {
            toast.error('Please fill in required fields');
            return;
        }

        try {
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Please log in to save changes');
                return;
            }

            const productData = {
                name: formData.name.trim(),
                price: parseFloat(formData.price),
                cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
                stock: formData.stock ? parseInt(formData.stock) : 0,
                min_stock_level: formData.min_stock_level ? parseInt(formData.min_stock_level) : 10,
                expiry_date: formData.expiry_date || null,
                supplier_id: formData.supplier_id || null,
                category: formData.category || null,
                barcode: formData.barcode || null,
            };

            if (editingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', editingProduct.id);

                if (error) throw error;
                toast.success('Product updated successfully!');
            } else {
                // Explicitly set organization_id for new product
                const { error } = await supabase
                    .from('products')
                    .insert([{ ...productData, organization_id: session.user.id }]);

                if (error) throw error;
                toast.success('Product added successfully!');
            }

            handleCloseDialog();
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Failed to save product: ' + (error.message || 'Unknown error'));
        }
    };

    const handleDeleteClick = (id) => {
        setProductToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!productToDelete) return;

        try {
            // Soft delete: update deleted_at
            const { error } = await supabase
                .from('products')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', productToDelete);

            if (error) throw error;
            toast.success('Product deleted successfully!');
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product: ' + (error.message || 'Please try again'));
        } finally {
            setDeleteDialogOpen(false);
            setProductToDelete(null);
        }
    };

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.barcode && product.barcode.includes(searchTerm))
    );

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Container maxWidth="xl">
            <Box
                display="flex"
                flexDirection={isMobile ? 'column' : 'row'}
                justifyContent="space-between"
                alignItems={isMobile ? 'flex-start' : 'center'}
                gap={2}
                mb={3}
            >
                <Typography variant="h4" fontWeight={700} color="primary">
                    Products
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    fullWidth={isMobile}
                >
                    Add Product
                </Button>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <TextField
                        fullWidth
                        placeholder="Search products by name, category, or barcode..."
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
                </CardContent>
            </Card>

            {isMobile ? (
                <Box>
                    {loading ? (
                        <Typography align="center">Loading...</Typography>
                    ) : filteredProducts.length === 0 ? (
                        <Typography align="center">No products found</Typography>
                    ) : (
                        filteredProducts.map((product) => {
                            const expiryStatus = product.expiry_date
                                ? getExpiryStatus(product.expiry_date, 7, parseInt(settings.expiry_alert_days || '15'))
                                : null;
                            const stockStatus = getStockStatus(product.stock, product.min_stock_level);

                            return (
                                <Card key={product.id} variant="outlined" sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                            <Box>
                                                <Typography variant="h6" fontWeight={600}>
                                                    {product.name}
                                                </Typography>
                                                {product.barcode && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {product.barcode}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Box>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleOpenDialog(product)}
                                                >
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDeleteClick(product.id)}
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>

                                        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                                            {product.category && (
                                                <Chip label={product.category} size="small" variant="outlined" />
                                            )}
                                            <Chip
                                                label={`${formatNumber(product.stock)} units`}
                                                size="small"
                                                color={stockStatus.color}
                                                icon={
                                                    stockStatus.type === 'out' ? <ErrorIcon /> :
                                                        stockStatus.type === 'low' ? <Warning /> :
                                                            <CheckCircle />
                                                }
                                            />
                                            {expiryStatus && (
                                                <Tooltip title={`Expires: ${formatDate(product.expiry_date)}`}>
                                                    <Chip
                                                        label={expiryStatus.label}
                                                        size="small"
                                                        color={expiryStatus.color}
                                                    />
                                                </Tooltip>
                                            )}
                                        </Box>

                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">
                                                    Price: <strong>{formatCurrency(product.price, settings.currency_symbol)}</strong>
                                                </Typography>
                                                {product.cost_price && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Cost: {formatCurrency(product.cost_price, settings.currency_symbol)}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {product.suppliers?.name || 'No Supplier'}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </Box>
            ) : (
                <Card>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell><strong>Price</strong></TableCell>
                                    <TableCell><strong>Stock</strong></TableCell>
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
                                ) : filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">No products found</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map((product) => {
                                        const expiryStatus = product.expiry_date
                                            ? getExpiryStatus(product.expiry_date, 7, parseInt(settings.expiry_alert_days || '15'))
                                            : null;
                                        const stockStatus = getStockStatus(product.stock, product.min_stock_level);

                                        return (
                                            <TableRow key={product.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {product.name}
                                                    </Typography>
                                                    {product.barcode && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {product.barcode}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {product.category && (
                                                        <Chip label={product.category} size="small" variant="outlined" />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {formatCurrency(product.price, settings.currency_symbol)}
                                                    </Typography>
                                                    {product.cost_price && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            Cost: {formatCurrency(product.cost_price, settings.currency_symbol)}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={`${formatNumber(product.stock)} units`}
                                                        size="small"
                                                        color={stockStatus.color}
                                                        icon={
                                                            stockStatus.type === 'out' ? <ErrorIcon /> :
                                                                stockStatus.type === 'low' ? <Warning /> :
                                                                    <CheckCircle />
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {expiryStatus ? (
                                                        <Tooltip title={`Expires: ${formatDate(product.expiry_date)}`}>
                                                            <Chip
                                                                label={expiryStatus.label}
                                                                size="small"
                                                                color={expiryStatus.color}
                                                            />
                                                        </Tooltip>
                                                    ) : (
                                                        <Typography variant="caption" color="text.secondary">
                                                            No expiry
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption">
                                                        {product.suppliers?.name || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleOpenDialog(product)}
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteClick(product.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Product Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    placeholder="e.g., Tablets, Syrup, Injection"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    type="number"
                                    label="Selling Price"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">{settings.currency_symbol}</InputAdornment>,
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Cost Price"
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
                                    type="number"
                                    label="Stock Quantity"
                                    name="stock"
                                    value={formData.stock}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Minimum Stock Level"
                                    name="min_stock_level"
                                    value={formData.min_stock_level}
                                    onChange={handleChange}
                                    helperText="Alert when stock falls below this"
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
                            <Grid item xs={12} sm={6}>
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
                                    label="Barcode"
                                    name="barcode"
                                    value={formData.barcode}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button type="submit" variant="contained">
                            {editingProduct ? 'Update' : 'Add'} Product
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Product"
                content="Are you sure you want to delete this product? This action cannot be undone."
            />
        </Container>
    );
}
