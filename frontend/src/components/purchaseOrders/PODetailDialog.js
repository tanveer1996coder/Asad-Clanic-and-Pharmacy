import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Grid,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Send,
    Download,
    LocalShipping,
    Close,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency } from '../../utils/formatters';
import ReceiveStockDialog from '../stock/ReceiveStockDialog';
import { generatePOPDF } from '../../utils/poPdfGenerator';
import { openWhatsApp } from '../../utils/whatsappHelper';

export default function PODetailDialog({ open, onClose, purchaseOrder, onRefresh }) {
    const [poDetails, setPODetails] = useState(null);
    const [poItems, setPOItems] = useState([]);
    const [receivingHistory, setReceivingHistory] = useState([]);
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && purchaseOrder) {
            fetchPODetails();
        }
    }, [open, purchaseOrder]);

    const fetchPODetails = async () => {
        if (!purchaseOrder) return;

        try {
            // Fetch PO with all relations
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .select(`
                    *,
                    suppliers(name, phone, supplier_contacts(*))
                `)
                .eq('id', purchaseOrder.id)
                .single();

            if (poError) throw poError;
            setPODetails(po);

            // Fetch PO items
            const { data: items, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('*, products(name)')
                .eq('purchase_order_id', purchaseOrder.id);

            if (itemsError) throw itemsError;
            setPOItems(items || []);

            // Fetch receiving history
            const { data: history, error: historyError } = await supabase
                .from('po_receiving_history')
                .select('*')
                .eq('purchase_order_id', purchaseOrder.id)
                .order('created_at', { ascending: false });

            if (historyError) throw historyError;
            setReceivingHistory(history || []);
        } catch (error) {
            console.error('Error fetching PO details:', error);
            toast.error('Failed to load PO details');
        }
    };

    const handleSendToSupplier = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data: settingsData } = await supabase
                .from('settings')
                .select('*')
                .eq('organization_id', session.user.id)
                .single();

            // Generate and Download PDF
            try {
                const pdfBlob = await generatePOPDF(poDetails, poItems, settingsData);
                const url = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${poDetails.po_number}.pdf`;
                link.click();
                URL.revokeObjectURL(url);
                toast.info('PDF downloaded! Please attach it to the WhatsApp chat.');
            } catch (pdfError) {
                console.error('PDF Error:', pdfError);
                toast.warning('Could not generate PDF, but opening WhatsApp...');
            }

            // Update status to sent
            const { error } = await supabase
                .from('purchase_orders')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                })
                .eq('id', purchaseOrder.id);

            if (error) throw error;

            // Get primary contact
            const primaryContact = poDetails.suppliers?.supplier_contacts?.find(c => c.is_primary);
            const phone = primaryContact?.phone || poDetails.suppliers?.phone;

            if (phone) {
                const message = `Hello! Please find the Purchase Order ${poDetails.po_number}. We need these items as soon as possible. Thank you!`;
                setTimeout(() => openWhatsApp(phone, message), 1000);
            } else {
                toast.warning('No phone number found for supplier');
            }

            toast.success('PO marked as sent!');
            onRefresh();
            fetchPODetails();
        } catch (error) {
            console.error('Error sending PO:', error);
            toast.error('Failed to send PO');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data: settingsData } = await supabase
                .from('settings')
                .select('*')
                .eq('organization_id', session.user.id)
                .single();

            const pdfBlob = await generatePOPDF(poDetails, poItems, settingsData);
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${poDetails.po_number}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('PDF downloaded!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF');
        }
    };

    const handleReceiveStock = () => {
        setReceiveDialogOpen(true);
    };

    const handleReceiveDialogClose = () => {
        setReceiveDialogOpen(false);
        fetchPODetails();
        onRefresh();
    };

    if (!poDetails) return null;

    const getStatusColor = (status) => {
        const colors = {
            draft: 'default',
            sent: 'primary',
            partially_received: 'secondary',
            received: 'success',
        };
        return colors[status] || 'default';
    };

    const getStatusLabel = (status) => {
        const labels = {
            draft: 'Draft',
            sent: 'Sent',
            partially_received: 'Receiving',
            received: 'Completed',
        };
        return labels[status] || status;
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Purchase Order: {poDetails.po_number}</Typography>
                        <IconButton onClick={onClose}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        {/* Status and Dates */}
                        <Grid item xs={12}>
                            <Box display="flex" gap={1} flexWrap="wrap">
                                <Chip
                                    label={getStatusLabel(poDetails.status)}
                                    color={getStatusColor(poDetails.status)}
                                />
                                <Chip label={`Order: ${new Date(poDetails.order_date).toLocaleDateString()}`} variant="outlined" />
                                {poDetails.expected_delivery_date && (
                                    <Chip label={`Expected: ${new Date(poDetails.expected_delivery_date).toLocaleDateString()}`} variant="outlined" />
                                )}
                            </Box>
                        </Grid>

                        {/* Supplier Info */}
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">Supplier</Typography>
                            <Typography variant="h6">{poDetails.suppliers?.name}</Typography>
                            {poDetails.suppliers?.phone && (
                                <Typography variant="body2" color="text.secondary">Phone: {poDetails.suppliers.phone}</Typography>
                            )}
                        </Grid>

                        {/* Items */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="h6" gutterBottom>Items</Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell align="center">Ordered</TableCell>
                                            <TableCell align="center">Received</TableCell>
                                            {poDetails.status !== 'draft' && (
                                                <>
                                                    <TableCell align="right">Unit Price</TableCell>
                                                    <TableCell align="right">Total</TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {poItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.products?.name}</TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={item.boxes_ordered
                                                            ? `${item.boxes_ordered} Boxes (${item.quantity_ordered})`
                                                            : item.quantity_ordered
                                                        }
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={item.quantity_received}
                                                        size="small"
                                                        color={item.quantity_received >= item.quantity_ordered ? 'success' : 'default'}
                                                    />
                                                </TableCell>
                                                {poDetails.status !== 'draft' && (
                                                    <>
                                                        <TableCell align="right">
                                                            {item.unit_price > 0 ? `Rs ${formatCurrency(item.unit_price, '')}` : '—'}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            {item.unit_price > 0 ? `Rs ${formatCurrency(item.quantity_ordered * item.unit_price, '')}` : '—'}
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>

                        {/* Receiving History */}
                        {receivingHistory.length > 0 && (
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="h6" gutterBottom>Receiving History</Typography>
                                {receivingHistory.map((history) => (
                                    <Box key={history.id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                        <Typography variant="body2">
                                            <strong>{new Date(history.received_date).toLocaleDateString()}:</strong>
                                            {' '}Received {history.quantity_received} units
                                            {history.notes && ` - ${history.notes}`}
                                        </Typography>
                                    </Box>
                                ))}
                            </Grid>
                        )}

                        {/* Notes */}
                        {poDetails.notes && (
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                                <Typography variant="body2">{poDetails.notes}</Typography>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ flexWrap: 'wrap', gap: 1, p: 2 }}>
                    <Box flex={1} display="flex" gap={1}>
                        <Tooltip title="Download PDF">
                            <IconButton color="primary" onClick={handleDownloadPDF}>
                                <Download />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Box display="flex" gap={1} flexWrap="wrap">
                        {poDetails.status === 'draft' && (
                            <Button
                                startIcon={<Send />}
                                variant="contained"
                                onClick={handleSendToSupplier}
                                disabled={loading}
                            >
                                Send to Supplier
                            </Button>
                        )}
                        {(poDetails.status === 'sent' || poDetails.status === 'partially_received') && (
                            <Button
                                startIcon={<LocalShipping />}
                                variant="contained"
                                color="primary"
                                onClick={handleReceiveStock}
                            >
                                Receive Stock
                            </Button>
                        )}
                        <Button onClick={onClose}>Close</Button>
                    </Box>
                </DialogActions>
            </Dialog>

            <ReceiveStockDialog
                open={receiveDialogOpen}
                onClose={handleReceiveDialogClose}
                purchaseOrder={poDetails}
                poItems={poItems}
            />
        </>
    );
}
