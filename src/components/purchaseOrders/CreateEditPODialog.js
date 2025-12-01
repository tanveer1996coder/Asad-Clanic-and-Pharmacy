import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    Box,
    Typography,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Autocomplete,
    Divider,
} from '@mui/material';
import { Add, Delete, ShoppingCart } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';

export default function CreateEditPODialog({ open, onClose, purchaseOrder, suppliers }) {
    const isEdit = !!purchaseOrder;

    const [formData, setFormData] = useState({
        supplier_id: '',
        order_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const [items, setItems] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchProducts();
            if (isEdit) {
                loadPOData();
            } else {
                resetForm();
            }
        }
    }, [open, purchaseOrder]);

    const fetchProducts = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('organization_id', session.user.id)
            .is('deleted_at', null)
            .order('name');

        setProducts(data || []);
    };

    const loadPOData = async () => {
        if (!purchaseOrder) return;

        setFormData({
            supplier_id: purchaseOrder.supplier_id || '',
            order_date: purchaseOrder.order_date || new Date().toISOString().split('T')[0],
            notes: purchaseOrder.notes || '',
        });

        // Fetch PO items
        const { data } = await supabase
            .from('purchase_order_items')
            .select('*, products(name)')
            .eq('purchase_order_id', purchaseOrder.id);

        if (data) {
            setItems(data.map(item => ({
                product_id: item.product_id,
                product_name: item.products?.name,
                quantity_ordered: item.quantity_ordered,
                boxes_ordered: item.boxes_ordered || '',
                items_per_box: item.items_per_box || 1,
            })));
        }
    };

    const resetForm = () => {
        setFormData({
            supplier_id: '',
            order_date: new Date().toISOString().split('T')[0],
            notes: '',
        });
        setItems([]);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleAddItem = () => {
        setItems([...items, {
            product_id: '',
            product_name: '',
            quantity_ordered: 1,
            boxes_ordered: '',
            items_per_box: 1,
        }]);
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // If product changed, update product name and default items_per_box
        if (field === 'product_id') {
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].product_name = product.name;
                newItems[index].items_per_box = product.items_per_box || 1;
                // Recalculate if boxes are already entered
                if (newItems[index].boxes_ordered) {
                    newItems[index].quantity_ordered = newItems[index].boxes_ordered * (product.items_per_box || 1);
                }
            }
        }

        // Auto-calculate total quantity if boxes or items_per_box change
        if (field === 'boxes_ordered' || field === 'items_per_box') {
            const boxes = field === 'boxes_ordered' ? value : newItems[index].boxes_ordered;
            const perBox = field === 'items_per_box' ? value : newItems[index].items_per_box;

            if (boxes && perBox) {
                newItems[index].quantity_ordered = parseInt(boxes) * parseInt(perBox);
            }
        }

        setItems(newItems);
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.supplier_id) {
            toast.error('Please select a supplier');
            return;
        }
        if (items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }
        if (items.some(item => !item.product_id || item.quantity_ordered <= 0)) {
            toast.error('Please fill in all item details correctly');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            if (isEdit) {
                // Update existing PO
                const { error: poError } = await supabase
                    .from('purchase_orders')
                    .update({
                        supplier_id: formData.supplier_id,
                        order_date: formData.order_date,
                        notes: formData.notes,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', purchaseOrder.id);

                if (poError) throw poError;

                // Delete existing items
                await supabase
                    .from('purchase_order_items')
                    .delete()
                    .eq('purchase_order_id', purchaseOrder.id);

                // Insert new items
                const { error: itemsError } = await supabase
                    .from('purchase_order_items')
                    .insert(items.map(item => ({
                        purchase_order_id: purchaseOrder.id,
                        product_id: item.product_id,
                        quantity_ordered: item.quantity_ordered,
                        boxes_ordered: item.boxes_ordered ? parseInt(item.boxes_ordered) : null,
                        items_per_box: item.items_per_box ? parseInt(item.items_per_box) : 1,
                        unit_price: 0,
                    })));

                if (itemsError) throw itemsError;

                toast.success('PO updated successfully!');
                onClose(); // Close without passing data for edits
            } else {
                // Generate PO number
                const { data: poNumberData } = await supabase.rpc('generate_po_number');
                const poNumber = poNumberData || `PO-${Date.now()}`;

                // Create new PO
                const { data: newPO, error: poError } = await supabase
                    .from('purchase_orders')
                    .insert([{
                        po_number: poNumber,
                        supplier_id: formData.supplier_id,
                        currency_id: null,
                        order_date: formData.order_date,
                        status: 'draft',
                        notes: formData.notes,
                        created_by: session.user.id,
                        organization_id: session.user.id,
                        total_amount: 0,
                        final_amount: 0,
                    }])
                    .select()
                    .single();

                if (poError) throw poError;

                // Insert items
                const { error: itemsError } = await supabase
                    .from('purchase_order_items')
                    .insert(items.map(item => ({
                        purchase_order_id: newPO.id,
                        product_id: item.product_id,
                        quantity_ordered: item.quantity_ordered,
                        boxes_ordered: item.boxes_ordered ? parseInt(item.boxes_ordered) : null,
                        items_per_box: item.items_per_box ? parseInt(item.items_per_box) : 1,
                        unit_price: 0,
                    })));

                if (itemsError) throw itemsError;

                toast.success('Purchase Order created successfully!');

                // Pass the created PO data back to parent for receipt modal
                const itemsWithNames = items.map(item => ({
                    ...item,
                    product_name: products.find(p => p.id === item.product_id)?.name
                }));

                onClose(newPO, itemsWithNames, suppliers.find(s => s.id === formData.supplier_id));
            }
        } catch (error) {
            console.error('Error saving PO:', error);
            toast.error('Failed to save purchase order: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose()} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <ShoppingCart color="primary" />
                    {isEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </Box>
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select
                            fullWidth
                            required
                            label="Supplier"
                            name="supplier_id"
                            value={formData.supplier_id}
                            onChange={handleChange}
                        >
                            {suppliers.map((supplier) => (
                                <MenuItem key={supplier.id} value={supplier.id}>
                                    {supplier.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            required
                            type="date"
                            label="Order Date"
                            name="order_date"
                            value={formData.order_date}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Items to Order</Typography>
                            <Button startIcon={<Add />} onClick={handleAddItem}>
                                Add Item
                            </Button>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Product</strong></TableCell>
                                        <TableCell width="100"><strong>Boxes</strong></TableCell>
                                        <TableCell width="100"><strong>Items/Box</strong></TableCell>
                                        <TableCell width="120"><strong>Total Items</strong></TableCell>
                                        <TableCell width="50"></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Autocomplete
                                                    size="small"
                                                    options={products}
                                                    getOptionLabel={(option) => option.name || ''}
                                                    value={products.find(p => p.id === item.product_id) || null}
                                                    onChange={(e, newValue) => {
                                                        handleItemChange(index, 'product_id', newValue?.id || '');
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField {...params} placeholder="Select product" />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    type="number"
                                                    placeholder="Boxes"
                                                    value={item.boxes_ordered}
                                                    onChange={(e) => handleItemChange(index, 'boxes_ordered', e.target.value)}
                                                    inputProps={{ min: 1 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    type="number"
                                                    placeholder="Per Box"
                                                    value={item.items_per_box}
                                                    onChange={(e) => handleItemChange(index, 'items_per_box', e.target.value)}
                                                    inputProps={{ min: 1 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    fullWidth
                                                    type="number"
                                                    value={item.quantity_ordered}
                                                    onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
                                                    inputProps={{ min: 1 }}
                                                    helperText="Total Units"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Notes (Optional)"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Any special instructions for the supplier..."
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Box bgcolor="info.light" p={2} borderRadius={1}>
                            <Typography variant="body2" color="info.dark">
                                <strong>Note:</strong> Prices will be entered when you receive the stock from the supplier.
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose()}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {isEdit ? 'Update Order' : 'Create Order'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
