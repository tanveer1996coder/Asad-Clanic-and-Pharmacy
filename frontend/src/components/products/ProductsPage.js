import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    TablePagination,
    Divider,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Search,
    Warning,
    CheckCircle,
    Error as ErrorIcon,
    Close,
    LocalPharmacy,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatDate, getExpiryStatus, getStockStatus } from '../../utils/dateHelpers';
import useSettings from '../../hooks/useSettings';
import ConfirmDialog from '../shared/ConfirmDialog';
import MedicineSearchAutocomplete from '../shared/MedicineSearchAutocomplete';

export default function ProductsPage() {
    const { settings } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [activeFilter, setActiveFilter] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        generic_name: '',
        drug_type: '',
        strength: '',
        price: '',
        cost_price: '',
        stock: '',
        min_stock_level: settings.low_stock_threshold || '10',
        expiry_date: '',
        supplier_id: '',
        form: '',
        batch_number: '',
        items_per_box: '1',
        price_per_box: '',
        selling_unit: 'item',
    });

    useEffect(() => {
        fetchSuppliers();
        // Check for filter parameter in URL
        const filterParam = searchParams.get('filter');
        if (filterParam) {
            setActiveFilter(filterParam);
        }
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, page, rowsPerPage, activeFilter]);

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

            let query = supabase
                .from('products')
                .select('*, suppliers(name)', { count: 'exact' })
                .eq('organization_id', orgId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,form.ilike.%${searchTerm}%,batch_number.ilike.%${searchTerm}%`);
            }

            // Apply filters based on activeFilter
            if (activeFilter === 'lowStock') {
                // Filter for products with stock <= min_stock_level
                const { data: allProducts } = await supabase
                    .from('products')
                    .select('*')
                    .eq('organization_id', orgId)
                    .is('deleted_at', null);

                const lowStockIds = allProducts
                    ?.filter(p => p.stock <= (p.min_stock_level || 10))
                    .map(p => p.id) || [];

                if (lowStockIds.length > 0) {
                    query = query.in('id', lowStockIds);
                } else {
                    // No low stock items, return empty
                    setProducts([]);
                    setTotalCount(0);
                    setLoading(false);
                    return;
                }
            } else if (activeFilter === 'nearExpiry') {
                // Filter for products expiring within threshold days
                const expiryThreshold = parseInt(settings.expiry_alert_days || '15');
                const thresholdDate = new Date();
                thresholdDate.setDate(thresholdDate.getDate() + expiryThreshold);
                const thresholdDateStr = thresholdDate.toISOString().split('T')[0];

                query = query
                    .not('expiry_date', 'is', null)
                    .lte('expiry_date', thresholdDateStr);
            }

            const from = page * rowsPerPage;
            const to = from + rowsPerPage - 1;

            const { data, count, error } = await query.range(from, to);

            if (error) throw error;
            setProducts(data || []);
            setTotalCount(count || 0);
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
                generic_name: product.generic_name || '',
                drug_type: product.drug_type || '',
                strength: product.strength || '',
                price: product.price || '',
                cost_price: product.cost_price || '',
                stock: product.stock || '',
                min_stock_level: product.min_stock_level || settings.low_stock_threshold || '10',
                expiry_date: product.expiry_date || '',
                supplier_id: product.supplier_id || '',
                form: product.form || '',
                batch_number: product.batch_number || '',
                items_per_box: product.items_per_box || '1',
                price_per_box: product.price_per_box || '',
                selling_unit: product.selling_unit || 'item',
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                generic_name: '',
                drug_type: '',
                strength: '',
                price: '',
                cost_price: '',
                stock: '',
                min_stock_level: settings.low_stock_threshold || '10',
                expiry_date: '',
                supplier_id: '',
                form: '',
                batch_number: '',
                items_per_box: '1',
                price_per_box: '',
                selling_unit: 'item',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingProduct(null);
    };

    // Helper function to extract items per box from packaging string
    const extractItemsPerBox = (packagingString) => {
        if (!packagingString) return null;

        // Try to match patterns like "10 tablets per strip" or "100 items per box"
        const match = packagingString.match(/(\d+)\s*(tablets?|items?|capsules?)/i);
        if (match) {
            return parseInt(match[1]);
        }
        return null;
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
                generic_name: formData.generic_name?.trim() || null,
                drug_type: formData.drug_type || null,
                strength: formData.strength?.trim() || null,
                price: parseFloat(formData.price),
                cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
                stock: formData.stock ? parseInt(formData.stock) : 0,
                min_stock_level: formData.min_stock_level ? parseInt(formData.min_stock_level) : 10,
                expiry_date: formData.expiry_date || null,
                supplier_id: formData.supplier_id || null,
                items_per_box: formData.items_per_box ? parseInt(formData.items_per_box) : 1,
                price_per_box: formData.price_per_box ? parseFloat(formData.price_per_box) : null,
                selling_unit: formData.selling_unit || 'item',
                form: formData.form || null,
                batch_number: formData.batch_number || null,
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

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Removed client-side filtering as we now do it on the server
    const filteredProducts = products;

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

            {/* Active Filter Indicator */}
            {activeFilter && (
                <Box mb={2}>
                    <Chip
                        label={
                            activeFilter === 'lowStock'
                                ? 'Low Stock Filter Active'
                                : 'Near Expiry Filter Active'
                        }
                        color={activeFilter === 'lowStock' ? 'warning' : 'error'}
                        icon={<Warning />}
                        onDelete={() => {
                            setActiveFilter(null);
                            setSearchParams({});
                        }}
                        deleteIcon={<Close />}
                    />
                </Box>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <TextField
                        fullWidth
                        placeholder="Search products by name, form, or batch number..."
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
                                                {product.generic_name && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        {product.generic_name}
                                                    </Typography>
                                                )}
                                                {product.batch_number && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {product.batch_number}
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
                                            {product.drug_type && (
                                                <Chip label={product.drug_type} size="small" variant="outlined" color="primary" />
                                            )}
                                            {product.form && (
                                                <Chip label={product.form} size="small" variant="outlined" />
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
                    <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                        <Table sx={{ minWidth: 800 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Form</strong></TableCell>
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
                                                    {product.generic_name && (
                                                        <Typography variant="caption" color="text.secondary" display="block">
                                                            {product.generic_name}
                                                        </Typography>
                                                    )}
                                                    {product.batch_number && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {product.batch_number}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {product.form && (
                                                        <Chip label={product.form} size="small" variant="outlined" color="primary" sx={{ mr: 0.5 }} />
                                                    )}
                                                    {product.strength && (
                                                        <Chip label={product.strength} size="small" variant="outlined" />
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

            <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            {/* Medicine Reference Search - Only show when adding new product */}
                            {!editingProduct && (
                                <>
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                                            <LocalPharmacy color="primary" fontSize="small" />
                                            <Typography variant="body2" color="primary" fontWeight={600}>
                                                Search Medicine Database (Optional)
                                            </Typography>
                                        </Box>
                                        <MedicineSearchAutocomplete
                                            onSelect={(medicine) => {
                                                // Auto-populate fields from medicine reference
                                                setFormData(prev => ({
                                                    ...prev,
                                                    name: medicine.brand_name || '',
                                                    generic_name: medicine.generic_name || '',
                                                    form: medicine.dosage_form || '',
                                                    strength: medicine.strength || '',
                                                    drug_type: medicine.dosage_form ? medicine.dosage_form.charAt(0).toUpperCase() + medicine.dosage_form.slice(1) : '',
                                                    items_per_box: extractItemsPerBox(medicine.standard_packaging) || prev.items_per_box,
                                                }));
                                                toast.success(`Auto-filled from ${medicine.brand_name}`);
                                            }}
                                            label="Search by brand or generic name"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Divider />
                                    </Grid>
                                </>
                            )}

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
                                    label="Generic Name"
                                    name="generic_name"
                                    value={formData.generic_name}
                                    onChange={handleChange}
                                    placeholder="e.g., Acetaminophen, Ibuprofen"
                                    helperText="Scientific/generic name of the drug"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Strength"
                                    name="strength"
                                    value={formData.strength}
                                    onChange={handleChange}
                                    placeholder="e.g., 500mg, 10ml"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Drug Type"
                                    name="drug_type"
                                    value={formData.drug_type}
                                    onChange={handleChange}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="">Select Type</option>
                                    <option value="Tablet">Tablet</option>
                                    <option value="Capsule">Capsule</option>
                                    <option value="Syrup">Syrup</option>
                                    <option value="Injection">Injection</option>
                                    <option value="Cream">Cream</option>
                                    <option value="Ointment">Ointment</option>
                                    <option value="Drops">Drops</option>
                                    <option value="Inhaler">Inhaler</option>
                                    <option value="Powder">Powder</option>
                                    <option value="Other">Other</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Form"
                                    name="form"
                                    value={formData.form}
                                    onChange={handleChange}
                                    placeholder="e.g., Tablet, Syrup, Injection"
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
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Items per Box"
                                    name="items_per_box"
                                    value={formData.items_per_box}
                                    onChange={handleChange}
                                    helperText="Number of tablets/items in one box"
                                    inputProps={{ min: 1 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Price per Box"
                                    name="price_per_box"
                                    value={formData.price_per_box}
                                    onChange={(e) => {
                                        handleChange(e);
                                        // Auto-calculate price per item
                                        if (e.target.value && formData.items_per_box) {
                                            const pricePerItem = parseFloat(e.target.value) / parseInt(formData.items_per_box);
                                            setFormData(prev => ({ ...prev, price: pricePerItem.toFixed(2) }));
                                        }
                                    }}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">{settings.currency_symbol}</InputAdornment>,
                                    }}
                                    helperText="Auto-calculates price per item"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Selling Unit"
                                    name="selling_unit"
                                    value={formData.selling_unit}
                                    onChange={handleChange}
                                    helperText="How this product is sold"
                                >
                                    <MenuItem value="item">Item Only</MenuItem>
                                    <MenuItem value="box">Box Only</MenuItem>
                                    <MenuItem value="both">Both Box & Item</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Batch Number"
                                    name="batch_number"
                                    value={formData.batch_number}
                                    onChange={handleChange}
                                    placeholder="Optional - for tracking batches"
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
