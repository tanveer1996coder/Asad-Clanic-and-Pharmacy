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
                .select('id, price, cost_price')
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
                    unit_price: item.unit_price || product?.cost_price || 0, // Purchasing Price
                    selling_price: product?.price || 0, // Selling Price
                };
            }));
        } catch (error) {
            console.error('Error fetching product details:', error);
            toast.error('Failed to load product details');
        }
    };

    const handleQuantityChange = (index, value) => {
        const newData = [...receivingData];
        const maxReceivable = newData[index].quantity_remaining;
        const qty = Math.min(parseInt(value) || 0, maxReceivable);
        newData[index].quantity_to_receive = qty;
        setReceivingData(newData);
    };

    const handlePriceChange = (index, field, value) => {
        const newData = [...receivingData];
        newData[index][field] = parseFloat(value) || 0;
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

                // Update product stock, cost price, AND selling price
                const { error: updateError } = await supabase
                    .from('products')
                    .update({
                        stock: newStock,
                        cost_price: item.unit_price, // Update cost price
                        price: item.selling_price,   // Update selling price
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
    const totalAmount = receivingData.reduce((sum, item) =>
        sum + (item.quantity_to_receive * item.unit_price), 0
    );

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
                                        <TableCell align="center" sx={{ bgcolor: '#e3f2fd' }}>Receive Now</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#e3f2fd' }}>Purchasing Price</TableCell>
                                        <TableCell align="center" sx={{ bgcolor: '#fff3e0' }}>Selling Price</TableCell>
                                        <TableCell align="right">Total Cost</TableCell>
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
                                                    value={item.quantity_to_receive}
                                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                    inputProps={{
                                                        min: 0,
                                                        max: item.quantity_remaining,
                                                        style: { width: '70px', textAlign: 'center', fontWeight: 'bold' }
                                                    }}
                                                    disabled={item.quantity_remaining === 0}
                                                />
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#f5faff' }}>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={item.unit_price}
                                                    onChange={(e) => handlePriceChange(index, 'unit_price', e.target.value)}
                                                    placeholder="Cost"
                                                    inputProps={{
                                                        min: 0,
                                                        step: 0.01,
                                                        style: { width: '90px', textAlign: 'center' }
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="center" sx={{ bgcolor: '#fff8f0' }}>
                                                <TextField
                                                    type="number"
                                                    size="small"
                                                    value={item.selling_price}
                                                    onChange={(e) => handlePriceChange(index, 'selling_price', e.target.value)}
                                                    placeholder="Sale"
                                                    inputProps={{
                                                        min: 0,
                                                        step: 0.01,
                                                        style: { width: '90px', textAlign: 'center' }
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600}>
                                                    Rs {(item.quantity_to_receive * item.unit_price).toFixed(2)}
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
