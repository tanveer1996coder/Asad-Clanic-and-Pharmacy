import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
} from '@mui/material';
import { LocalShipping, Inventory } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';

export default function ReceiveStockDialog({ open, onClose, purchaseOrder, poItems }) {
    const [receivingData, setReceivingData] = useState([]);
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && poItems) {
            fetchProductDetails();
        }
    }, [open, poItems]);

    const fetchProductDetails = async () => {
        try {
            // Get all product IDs
            const productIds = poItems.map(item => item.product_id);

            // Fetch current product details (especially selling price)
            const { data: products, error } = await supabase
                .from('products')
                .select('id, price, cost_price, items_per_box')
                .in('id', productIds);

            if (error) throw error;

            // Map products for easy lookup
            const productMap = {};
            products?.forEach(p => {
                productMap[p.id] = p;
            });

            // Initialize receiving data
            setReceivingData(poItems.map(item => {
                const product = productMap[item.product_id];
                return {
                    po_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.product_name || item.products?.name,
                    quantity_ordered: item.quantity_ordered,
                    quantity_already_received: item.quantity_received,
                    quantity_remaining: item.quantity_ordered - item.quantity_received,
                    quantity_to_receive: 0,
                    unit_price: item.unit_price || product?.cost_price || 0, // Purchasing Price (per item)
                    selling_price: product?.price || 0, // Selling Price (per item)
                    boxes_received: '',
                    items_per_box: item.items_per_box || product?.items_per_box || 1,
                    cost_per_box: '',
                    total_cost: '', // User entry: Total Purchasing Cost
                    selling_price_per_box: '', // User entry: Selling Price per Box (MRP)
                    total_selling_price: 0, // Calculated: selling_price_per_box * boxes_received
                };
            }));
        } catch (error) {
            console.error('Error fetching product details:', error);
            toast.error('Failed to load product details');
        }
    };

    const handleQuantityChange = (index, field, value) => {
        const newData = [...receivingData];

        if (field === 'boxes_received' || field === 'items_per_box') {
            newData[index][field] = value;

            const boxes = parseFloat(newData[index].boxes_received) || 0;
            const perBox = parseFloat(newData[index].items_per_box) || 1;

            // Auto-calculate total quantity
            if (boxes > 0) {
                const totalQty = Math.round(boxes * perBox);
                const maxReceivable = newData[index].quantity_remaining;
                newData[index].quantity_to_receive = Math.min(totalQty, maxReceivable);
            }
        } else {
            // Direct quantity update
            const maxReceivable = newData[index].quantity_remaining;
            const qty = Math.min(parseInt(value) || 0, maxReceivable);
            newData[index].quantity_to_receive = qty;
        }

        setReceivingData(newData);
    };

    const handlePriceChange = (index, field, value) => {
        const newData = [...receivingData];
        newData[index][field] = parseFloat(value) || 0;

        const boxes = parseFloat(newData[index].boxes_received) || 0;
        const perBox = parseFloat(newData[index].items_per_box) || 1;
        const totalItems = boxes * perBox;

        // Auto-calculate costs based on Total Cost
        if (field === 'total_cost' || field === 'boxes_received' || field === 'items_per_box') {
            const totalCost = parseFloat(field === 'total_cost' ? value : newData[index].total_cost) || 0;

            if (boxes > 0) {
                newData[index].cost_per_box = totalCost / boxes;
                if (totalItems > 0) {
                    newData[index].unit_price = totalCost / totalItems;
                }
            }
        }

        // Auto-calculate selling price per item based on Selling Price/Box
        if (field === 'selling_price_per_box' || field === 'items_per_box' || field === 'boxes_received') {
            const sellBox = parseFloat(field === 'selling_price_per_box' ? value : newData[index].selling_price_per_box) || 0;

            if (perBox > 0) {
                newData[index].selling_price = sellBox / perBox;
            }

            // Calculate Total Selling Price
            if (boxes > 0) {
                newData[index].total_selling_price = sellBox * boxes;
            }
        }

        setReceivingData(newData);
    };

    const handleReceiveAll = (index) => {
        const newData = [...receivingData];
        newData[index].quantity_to_receive = newData[index].quantity_remaining;
        setReceivingData(newData);
    };

    const handleSubmit = async () => {
        const itemsToReceive = receivingData.filter(item => item.quantity_to_receive > 0);

        if (itemsToReceive.length === 0) {
            toast.error('Please enter quantities to receive');
            return;
        }

        // Validate prices are entered
        const itemsWithoutPrice = itemsToReceive.filter(item => item.unit_price <= 0 || item.selling_price <= 0);
        if (itemsWithoutPrice.length > 0) {
            toast.error('Please enter both purchasing and selling prices for all items being received');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            // Process each item
            for (const item of itemsToReceive) {
                // Create stock receipt
                const { data: stockReceipt, error: receiptError } = await supabase
                    .from('stock_receipts')
                    .insert([{
                        product_id: item.product_id,
                        quantity: item.quantity_to_receive,
                        received_date: receivedDate,
                        notes,
                        purchase_order_id: purchaseOrder.id,
                        organization_id: session.user.id // Ensure org_id is set
                    }])
                    .select()
                    .single();

                if (receiptError) throw receiptError;

                // Fetch current stock to ensure accuracy
                const { data: currentProduct, error: fetchError } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', item.product_id)
                    .single();

                if (fetchError) throw fetchError;

                const newStock = (currentProduct?.stock || 0) + parseInt(item.quantity_to_receive);

                // Update product stock, cost price, selling price, and box details
                const { error: updateError } = await supabase
                    .from('products')
                    .update({
                        stock: newStock,
                        cost_price: item.unit_price, // Update cost price
                        price: item.selling_price,   // Update selling price (per item)
                        items_per_box: item.items_per_box, // Update items per box
                        price_per_box: item.selling_price_per_box // Update MRP/Selling Price per Box
                    })
                    .eq('id', item.product_id);

                if (updateError) throw updateError;

                // Update PO item with received quantity and price
                const { error: poItemError } = await supabase
                    .from('purchase_order_items')
                    .update({
                        quantity_received: item.quantity_already_received + item.quantity_to_receive,
                        unit_price: item.unit_price, // Save the purchasing price
                    })
                    .eq('id', item.po_item_id);

                if (poItemError) throw poItemError;

                // Record in receiving history
                await supabase
                    .from('po_receiving_history')
                    .insert([{
                        purchase_order_id: purchaseOrder.id,
                        po_item_id: item.po_item_id,
                        quantity_received: item.quantity_to_receive,
                        received_date: receivedDate,
                        received_by: session.user.id,
                        stock_receipt_id: stockReceipt.id,
                        notes,
                        boxes_received: item.boxes_received ? parseInt(item.boxes_received) : null,
                    }]);
            }

            // Check if PO is fully received
            const allReceived = receivingData.every(item =>
                (item.quantity_already_received + item.quantity_to_receive) >= item.quantity_ordered
            );

            if (allReceived) {
                await supabase
                    .from('purchase_orders')
                    .update({ status: 'received' })
                    .eq('id', purchaseOrder.id);
            } else {
                await supabase
                    .from('purchase_orders')
                    .update({ status: 'partially_received' })
                    .eq('id', purchaseOrder.id);
            }

            toast.success('Stock received successfully!');
            onClose();
        } catch (error) {
            console.error('Error receiving stock:', error);
            toast.error('Failed to receive stock: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const totalToReceive = receivingData.reduce((sum, item) => sum + item.quantity_to_receive, 0);
    const totalAmount = receivingData.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <LocalShipping color="primary" />
                    Receive Stock - PO: {purchaseOrder?.po_number}
                </Box>
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Received Date"
                            value={receivedDate}
                            onChange={(e) => setReceivedDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TableContainer sx={{ overflowX: 'auto', maxHeight: '60vh' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Product</TableCell>
                                        <TableCell align="center">Ordered</TableCell>
                                        <TableCell align="center">Received</TableCell>
                                        <TableCell align="center">Remaining</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#e3f2fd' }}>Boxes Received</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#e3f2fd' }}>Items/Box</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#e3f2fd' }}>Total Cost</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#e3f2fd' }}>MRP/Box</TableCell>

                                        {/* System Calculated Fields */}
                                        <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>Total Items</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>Cost/Box</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>Cost/Item</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>Sale/Item</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>Total Selling</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {receivingData.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.product_name}</TableCell>
                                            <TableCell align="center">
                                                <Chip label={item.quantity_ordered} size="small" />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={item.quantity_already_received}
                                                    size="small"
                                                    color={item.quantity_already_received > 0 ? 'success' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={item.quantity_remaining}
                                                    size="small"
                                                    color={item.quantity_remaining > 0 ? 'warning' : 'success'}
                                                />
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#f5faff' }}>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    placeholder="Boxes"
                                                    value={item.boxes_received}
                                                    onChange={(e) => handleQuantityChange(index, 'boxes_received', e.target.value)}
                                                    inputProps={{ min: 0, style: { width: '60px', textAlign: 'center' } }}
                                                    disabled={item.quantity_remaining === 0}
                                                />
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#f5faff' }}>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    placeholder="/Box"
                                                    value={item.items_per_box}
                                                    onChange={(e) => handleQuantityChange(index, 'items_per_box', e.target.value)}
                                                    inputProps={{ min: 1, style: { width: '50px', textAlign: 'center' } }}
                                                    disabled={item.quantity_remaining === 0}
                                                />
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#f5faff' }}>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    placeholder="Total"
                                                    value={item.total_cost}
                                                    onChange={(e) => handlePriceChange(index, 'total_cost', e.target.value)}
                                                    inputProps={{ min: 0, step: 0.01, style: { width: '80px', textAlign: 'center' } }}
                                                />
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#f5faff' }}>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={item.selling_price_per_box}
                                                    onChange={(e) => handlePriceChange(index, 'selling_price_per_box', e.target.value)}
                                                    placeholder="MRP"
                                                    inputProps={{
                                                        min: 0,
                                                        step: 0.01,
                                                        style: { width: '80px', textAlign: 'center' }
                                                    }}
                                                />
                                            </TableCell>

                                            {/* Calculated Values */}
                                            <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {item.quantity_to_receive}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>
                                                <Typography variant="body2">
                                                    {item.cost_per_box ? parseFloat(item.cost_per_box).toFixed(2) : '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>
                                                <Typography variant="body2">
                                                    {item.unit_price ? parseFloat(item.unit_price).toFixed(2) : '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>
                                                <Typography variant="body2">
                                                    {item.selling_price ? parseFloat(item.selling_price).toFixed(2) : '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#f5f5f5' }}>
                                                <Typography variant="body2" fontWeight={600} color="success.main">
                                                    {item.total_selling_price ? parseFloat(item.total_selling_price).toFixed(2) : '-'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {item.quantity_remaining > 0 && (
                                                    <Button
                                                        size="small"
                                                        onClick={() => handleReceiveAll(index)}
                                                    >
                                                        All
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>

                    <Grid item xs={12}>
                        <Box bgcolor="primary.main" color="white" p={2} borderRadius={1}>
                            <Grid container>
                                <Grid item xs={6}>
                                    <Typography variant="h6">
                                        Total Items: {totalToReceive}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="h6" align="right">
                                        Total Cost: Rs {totalAmount.toFixed(2)}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Delivery Notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes about this delivery (condition, packaging, etc.)"
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    startIcon={<Inventory />}
                    onClick={handleSubmit}
                    disabled={loading || totalToReceive === 0}
                >
                    Receive Stock
                </Button>
            </DialogActions>
        </Dialog>
    );
}
