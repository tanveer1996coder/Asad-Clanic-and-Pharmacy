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
    Box,
    useTheme,
    useMediaQuery,
    Tabs,
    Tab,
    Chip,
} from '@mui/material';
import { Add, Edit, Delete, History, Print, ShoppingCart, Repeat } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import useSettings from '../../hooks/useSettings';
import ConfirmDialog from '../shared/ConfirmDialog';
import ReceiptModal from '../shared/ReceiptModal';

export default function CustomersPage() {
    const { settings } = useSettings();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const orgId = session.user.id;

            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('organization_id', orgId)
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;
            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (customer = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                notes: customer.notes || '',
            });
        } else {
            setEditingCustomer(null);
            setFormData({
                name: '',
                phone: '',
                email: '',
                address: '',
                notes: '',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingCustomer(null);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error('Name is required');
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            if (editingCustomer) {
                const { error } = await supabase
                    .from('customers')
                    .update(formData)
                    .eq('id', editingCustomer.id);
                if (error) throw error;
                toast.success('Customer updated');
            } else {
                const { error } = await supabase
                    .from('customers')
                    .insert([{ ...formData, organization_id: session.user.id }]);
                if (error) throw error;
                toast.success('Customer added');
            }
            handleCloseDialog();
            fetchCustomers();
        } catch (error) {
            console.error('Error saving customer:', error);
            toast.error('Failed to save customer');
        }
    };

    const handleDeleteClick = (id) => {
        setCustomerToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            const { error } = await supabase
                .from('customers')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', customerToDelete);

            if (error) throw error;
            toast.success('Customer deleted');
            fetchCustomers();
        } catch (error) {
            toast.error('Failed to delete customer');
        } finally {
            setDeleteDialogOpen(false);
            setCustomerToDelete(null);
        }
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Container maxWidth="lg">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight={700} color="primary">
                    Customers
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
                    Add Customer
                </Button>
            </Box>

            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Name</strong></TableCell>
                                <TableCell><strong>Phone</strong></TableCell>
                                <TableCell><strong>Email</strong></TableCell>
                                <TableCell><strong>Address</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">Loading...</TableCell>
                                </TableRow>
                            ) : customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">No customers found</TableCell>
                                </TableRow>
                            ) : (
                                customers.map((customer) => (
                                    <TableRow key={customer.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>{customer.name}</Typography>
                                        </TableCell>
                                        <TableCell>{customer.phone || '—'}</TableCell>
                                        <TableCell>{customer.email || '—'}</TableCell>
                                        <TableCell>{customer.address || '—'}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" color="info" onClick={() => {
                                                setSelectedCustomerForHistory(customer);
                                                setHistoryOpen(true);
                                            }}>
                                                <History />
                                            </IconButton>
                                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(customer)}>
                                                <Edit />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDeleteClick(customer.id)}>
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField fullWidth required label="Name" name="name" value={formData.name} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth type="email" label="Email" name="email" value={formData.email} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth multiline rows={2} label="Address" name="address" value={formData.address} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth multiline rows={2} label="Notes" name="notes" value={formData.notes} onChange={handleChange} />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button type="submit" variant="contained">{editingCustomer ? 'Update' : 'Add'} Customer</Button>
                    </DialogActions>
                </form>
            </Dialog>

            <CustomerHistoryDialog
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                customer={selectedCustomerForHistory}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Customer"
                content="Are you sure? This will hide the customer but keep sales history."
            />
        </Container>
    );
}



function CustomerHistoryDialog({ open, onClose, customer }) {
    const [tabValue, setTabValue] = useState(0);
    const [invoices, setInvoices] = useState([]);
    const [frequentItems, setFrequentItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const { settings } = useSettings();
    const navigate = useNavigate();
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState({ invoice: null, items: [] });

    useEffect(() => {
        if (open && customer) {
            fetchHistory();
            fetchFrequentItems();
        }
    }, [open, customer]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('customer_id', customer.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const fetchFrequentItems = async () => {
        try {
            const { data, error } = await supabase
                .from('customer_frequent_items')
                .select('*, products(*)')
                .eq('customer_id', customer.id)
                .order('purchase_count', { ascending: false });

            if (error) throw error;
            setFrequentItems(data || []);
        } catch (error) {
            console.error('Error fetching frequent items:', error);
        }
    };

    const handlePrintReceipt = async (invoice) => {
        try {
            const { data: items, error } = await supabase
                .from('sales')
                .select('*, products(name, price)')
                .eq('invoice_id', invoice.id);

            if (error) throw error;

            if (!items || items.length === 0) {
                toast.error('No items found for this invoice');
                return;
            }

            setReceiptData({ invoice, items });
            setReceiptModalOpen(true);
        } catch (error) {
            console.error('Error loading receipt:', error);
            toast.error('Failed to load invoice details');
        }
    };

    const handleQuickReorder = (itemsToReorder) => {
        // Prepare data for Sales page
        const reorderData = {
            customer: customer,
            items: itemsToReorder.map(item => ({
                product: item.products,
                quantity: item.typical_quantity,
                price: item.products.price // Use current price
            }))
        };

        // Save to local storage to pass to Sales page
        localStorage.setItem('quick_reorder', JSON.stringify(reorderData));

        // Navigate to sales page
        navigate('/sales');
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{customer?.name}</Typography>
                    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} textColor="primary" indicatorColor="primary">
                        <Tab label="History" />
                        <Tab label="Frequent Items" />
                    </Tabs>
                </Box>
            </DialogTitle>
            <DialogContent>
                {tabValue === 0 ? (
                    // History Tab
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table sx={{ minWidth: 700 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Invoice #</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Payment</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {invoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>#{inv.id.slice(0, 8)}</TableCell>
                                        <TableCell>{settings?.currency_symbol} {inv.total_amount}</TableCell>
                                        <TableCell sx={{ textTransform: 'capitalize' }}>{inv.payment_method}</TableCell>
                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<Print />}
                                                onClick={() => handlePrintReceipt(inv)}
                                            >
                                                Receipt
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table >
                    </TableContainer >
                ) : (
                    // Frequent Items Tab
                    <Box>
                        <Box display="flex" justifyContent="flex-end" mb={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<ShoppingCart />}
                                onClick={() => handleQuickReorder(frequentItems)}
                                disabled={frequentItems.length === 0}
                            >
                                Reorder All Frequent Items
                            </Button>
                        </Box>

                        {frequentItems.length === 0 ? (
                            <Typography color="text.secondary">No frequent items found yet.</Typography>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell>Typical Qty</TableCell>
                                            <TableCell>Times Bought</TableCell>
                                            <TableCell>Last Bought</TableCell>
                                            <TableCell align="right">Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {frequentItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.products?.name}</TableCell>
                                                <TableCell>{item.typical_quantity}</TableCell>
                                                <TableCell>
                                                    <Chip label={item.purchase_count} size="small" color="primary" variant="outlined" />
                                                </TableCell>
                                                <TableCell>{new Date(item.last_purchased_at).toLocaleDateString()}</TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        size="small"
                                                        startIcon={<Repeat />}
                                                        onClick={() => handleQuickReorder([item])}
                                                    >
                                                        Reorder
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )
                }
            </DialogContent >
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>

            <ReceiptModal
                open={receiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                invoice={receiptData.invoice}
                items={receiptData.items}
                settings={settings}
            />
        </Dialog >
    );
}
