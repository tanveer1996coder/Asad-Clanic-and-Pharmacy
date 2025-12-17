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
    Card,
    CardContent,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { Add, Delete, ShoppingCart } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';

export default function CreateEditPODialog({ open, onClose, purchaseOrder, suppliers }) {
    const isEdit = !!purchaseOrder;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [formData, setFormData] = useState({
        supplier_id: '',
        order_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const [items, setItems] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

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
        // Initialize search results with existing products
        setSearchResults(data || []);
    };

    const searchMedicineReference = async (query) => {
        if (!query || query.length < 2) {
            setSearchResults(products);
            return;
        }

        setSearching(true);
        try {
            // 1. Filter existing products locally
            const localMatches = products.filter(p => 
                p.name.toLowerCase().includes(query.toLowerCase())
            );

            // 2. Search medicine reference
            const { data: refData } = await supabase
                .from('medicine_reference')
                .select('*')
                .or(`brand_name.ilike.%${query}%,generic_name.ilike.%${query}%`)
                .limit(20);

            // 3. Combine results
            // Filter out reference items that already exist in products (by name match approx)
            const newRefItems = refData?.filter(ref => 
                !products.some(p => p.name.toLowerCase() === ref.brand_name.toLowerCase())
            ).map(ref => ({
                ...ref,
                id: `REF-${ref.id}`, // Temporary ID for UI
                isReference: true,
                name: ref.brand_name,
                // Map reference fields to product fields
                items_per_box: ref.standard_packaging ? extractItemsPerBox(ref.standard_packaging) : 1
            })) || [];

            setSearchResults([...localMatches, ...newRefItems]);
        } catch (error) {
            console.error('Error searching:', error);
            setSearchResults(products); // Fallback to local
        } finally {
            setSearching(false);
        }
    };

    // Helper from ProductsPage
    const extractItemsPerBox = (packagingString) => {
        if (!packagingString) return 1;
        const match = packagingString.match(/(\d+)\s*(tablets?|items?|capsules?)/i);
        return match ? parseInt(match[1]) : 1;
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

        // If product changed (from autocomplete)
        if (field === 'product_id') {
            // Value could be a real product ID, a REF- ID, or a custom string name
            // But here 'value' passed from handleItemChange is just the ID or Name
            
            // We need to find the full object from searchResults (or products)
            // However, handleItemChange gets the value directly.
            // Let's adjust handleItemChange usage in Autocomplete onChange instead.
            
            // For now, let's look up in searchResults which keeps growing? 
            // Better: look up in products OR check if it is a ref item stored in items state
            
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

    const handleKeyDown = (e, index) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Move to next field or add new item if on last item
            if (index === items.length - 1) {
                handleAddItem();
            }
        }
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
                    .insert(await Promise.all(items.map(async (item) => {
                        let finalProductId = item.product_id;

                        // Check if it's a new item (custom or reference)
                        if (!products.some(p => p.id === item.product_id)) {
                            // It's a new item. Create it in products table first.
                            const { data: newProd, error: createError } = await supabase
                                .from('products')
                                .insert([{
                                    organization_id: session.user.id,
                                    name: item.product_name,
                                    // If it was a reference item, we might want more data?
                                    // For now, minimal valid product
                                    price: 0, // Default price
                                    stock: 0,
                                    items_per_box: item.items_per_box || 1,
                                    // We could add more fields if we stored them in item state
                                }])
                                .select()
                                .single();
                            
                            if (createError) throw createError;
                            finalProductId = newProd.id;
                        }

                        return {
                            purchase_order_id: purchaseOrder.id,
                            product_id: finalProductId,
                            quantity_ordered: item.quantity_ordered,
                            boxes_ordered: item.boxes_ordered ? parseInt(item.boxes_ordered) : null,
                            items_per_box: item.items_per_box ? parseInt(item.items_per_box) : 1,
                            unit_price: 0,
                        };
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
                    .insert(await Promise.all(items.map(async (item) => {
                         let finalProductId = item.product_id;

                        // Check if it's a new item (custom or reference)
                         if (!products.some(p => p.id === item.product_id)) {
                            // It's a new item. Create it in products table first.
                            const { data: newProd, error: createError } = await supabase
                                .from('products')
                                .insert([{
                                    organization_id: session.user.id,
                                    name: item.product_name,
                                    price: 0,
                                    stock: 0,
                                    items_per_box: item.items_per_box || 1,
                                }])
                                .select()
                                .single();
                            
                            if (createError) throw createError;
                            finalProductId = newProd.id;
                        }

                        return {
                            purchase_order_id: newPO.id,
                            product_id: finalProductId,
                            quantity_ordered: item.quantity_ordered,
                            boxes_ordered: item.boxes_ordered ? parseInt(item.boxes_ordered) : null,
                            items_per_box: item.items_per_box ? parseInt(item.items_per_box) : 1,
                            unit_price: 0,
                        };
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

                        {isMobile ? (
                            // Mobile view - Cards instead of table
                            <Box>
                                {items.map((item, index) => (
                                    <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                                        <CardContent>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                        <Typography variant="subtitle2" fontWeight={600}>
                                                            Item #{index + 1}
                                                        </Typography>
                                                        <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Autocomplete
                                                        size="small"
                                                        freeSolo
                                                        options={searchResults}
                                                        loading={searching}
                                                        getOptionLabel={(option) => {
                                                            if (typeof option === 'string') return option;
                                                            return option.name || '';
                                                        }}
                                                        value={
                                                            // Logic to display correct value
                                                            products.find(p => p.id === item.product_id) || 
                                                            (item.product_name ? { name: item.product_name } : null)
                                                        }
                                                        onInputChange={(event, newInputValue) => {
                                                            searchMedicineReference(newInputValue);
                                                        }}
                                                        onChange={(e, newValue) => {
                                                            let newVal = '';
                                                            let newName = '';
                                                            let newItemsPerBox = 1;

                                                            if (typeof newValue === 'string') {
                                                                // Custom manual entry
                                                                newVal = `CUSTOM-${Date.now()}`; // Temp ID
                                                                newName = newValue;
                                                            } else if (newValue) {
                                                                // Selected from list (Product or Reference)
                                                                newVal = newValue.id;
                                                                newName = newValue.name;
                                                                newItemsPerBox = newValue.items_per_box || 1;
                                                            }

                                                            const newItems = [...items];
                                                            newItems[index].product_id = newVal;
                                                            newItems[index].product_name = newName;
                                                            newItems[index].items_per_box = newItemsPerBox;
                                                            
                                                            // Recalculate quantity (reset boxes maybe?)
                                                            newItems[index].boxes_ordered = ''; // Clear boxes on product change to avoid confusion
                                                            newItems[index].quantity_ordered = 1;

                                                            setItems(newItems);
                                                        }}
                                                        renderInput={(params) => (
                                                            <TextField 
                                                                {...params} 
                                                                label="Product" 
                                                                placeholder="Search or type new..." 
                                                                helperText="Select or type new product name"
                                                            />
                                                        )}
                                                        renderOption={(props, option) => {
                                                            return (
                                                            <li {...props}>
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight={option.isReference ? 600 : 400}>
                                                                        {option.name}
                                                                        {option.isReference && <span style={{color: 'green', fontSize: '0.8em', marginLeft: 8}}>(Database)</span>}
                                                                        {!option.isReference && !option.id && <span style={{color: 'orange', fontSize: '0.8em', marginLeft: 8}}>(New)</span>}
                                                                    </Typography>
                                                                    {option.generic_name && (
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {option.generic_name}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </li>
                                                        )}}
                                                    />
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        type="number"
                                                        label="Boxes"
                                                        placeholder="Boxes"
                                                        value={item.boxes_ordered}
                                                        onChange={(e) => handleItemChange(index, 'boxes_ordered', e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                                        inputProps={{ min: 1 }}
                                                    />
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        type="number"
                                                        label="Items/Box"
                                                        placeholder="Per Box"
                                                        value={item.items_per_box}
                                                        onChange={(e) => handleItemChange(index, 'items_per_box', e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                                        inputProps={{ min: 1 }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        type="number"
                                                        label="Total Items"
                                                        value={item.quantity_ordered}
                                                        onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                                        inputProps={{ min: 1 }}
                                                        helperText="Total Units"
                                                    />
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        ) : (
                            // Desktop view - Table
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
                                                        freeSolo
                                                        options={searchResults}
                                                        loading={searching}
                                                        getOptionLabel={(option) => {
                                                            if (typeof option === 'string') return option;
                                                            return option.name || '';
                                                        }}
                                                        value={
                                                            products.find(p => p.id === item.product_id) || 
                                                            (item.product_name ? { name: item.product_name } : null)
                                                        }
                                                        onInputChange={(event, newInputValue) => {
                                                            searchMedicineReference(newInputValue);
                                                        }}
                                                        onChange={(e, newValue) => {
                                                            let newVal = '';
                                                            let newName = '';
                                                            let newItemsPerBox = 1;

                                                            if (typeof newValue === 'string') {
                                                                newVal = `CUSTOM-${Date.now()}`;
                                                                newName = newValue;
                                                            } else if (newValue) {
                                                                newVal = newValue.id;
                                                                newName = newValue.name;
                                                                newItemsPerBox = newValue.items_per_box || 1;
                                                            }

                                                            const newItems = [...items];
                                                            newItems[index].product_id = newVal;
                                                            newItems[index].product_name = newName;
                                                            newItems[index].items_per_box = newItemsPerBox;
                                                            newItems[index].boxes_ordered = ''; 
                                                            newItems[index].quantity_ordered = 1;
                                                            setItems(newItems);
                                                        }}
                                                        renderInput={(params) => (
                                                            <TextField {...params} placeholder="Search or type new..." />
                                                        )}
                                                        renderOption={(props, option) => (
                                                            <li {...props}>
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight={option.isReference ? 600 : 400}>
                                                                        {option.name}
                                                                        {option.isReference && <span style={{color: 'green', fontSize: '0.8em', marginLeft: 8}}>(Database)</span>}
                                                                    </Typography>
                                                                    {option.generic_name && (
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {option.generic_name}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </li>
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
                                                        onKeyDown={(e) => handleKeyDown(e, index)}
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
                                                        onKeyDown={(e) => handleKeyDown(e, index)}
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
                                                        onKeyDown={(e) => handleKeyDown(e, index)}
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
                        )}
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
