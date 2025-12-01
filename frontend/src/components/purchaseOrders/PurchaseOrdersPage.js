import React, { useState, useEffect } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Chip,
    TextField,
    InputAdornment,
    MenuItem,
    IconButton,
    Tooltip,
    useTheme,
    useMediaQuery,
    TablePagination,
} from '@mui/material';
import {
    Add,
    Search,
    Visibility,
    Edit,
    Send,
    CheckCircle,
    Cancel,
    LocalShipping,
    PendingActions,
    Delete,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import { formatCurrency } from '../../utils/formatters';
import CreateEditPODialog from './CreateEditPODialog';
import PODetailDialog from './PODetailDialog';
import POReceiptModal from './POReceiptModal';
import useSettings from '../../hooks/useSettings';

export default function PurchaseOrdersPage() {
    const { settings } = useSettings();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [supplierFilter, setSupplierFilter] = useState('all');

    // Pagination states
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState({ po: null, items: [], supplier: null });

    useEffect(() => {
        fetchPurchaseOrders();
        fetchSuppliers();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPurchaseOrders();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, statusFilter, supplierFilter, page, rowsPerPage]);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchPurchaseOrders = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            let query = supabase
                .from('purchase_orders')
                .select(`
                    *,
                    suppliers(name, phone, supplier_contacts(*))
                `, { count: 'exact' })
                .eq('organization_id', session.user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            // Apply filters
            if (searchQuery) {
                query = query.ilike('po_number', `%${searchQuery}%`);
            }

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (supplierFilter !== 'all') {
                query = query.eq('supplier_id', supplierFilter);
            }

            const from = page * rowsPerPage;
            const to = from + rowsPerPage - 1;

            const { data, count, error } = await query.range(from, to);

            if (error) throw error;
            setPurchaseOrders(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching POs:', error);
            toast.error('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
            .from('suppliers')
            .select('*, supplier_contacts(*)')
            .eq('organization_id', session.user.id)
            .is('deleted_at', null)
            .order('name');

        if (error) {
            console.error('Error fetching suppliers:', error);
        } else {
            setSuppliers(data || []);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: 'default',
            sent: 'primary',
            partially_received: 'secondary',
            received: 'success',
        };
        return colors[status] || 'default';
    };

    const getStatusIcon = (status) => {
        const icons = {
            draft: <Edit fontSize="small" />,
            sent: <Send fontSize="small" />,
            partially_received: <LocalShipping fontSize="small" />,
            received: <CheckCircle fontSize="small" />,
        };
        return icons[status];
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

    const handleViewDetails = (po) => {
        setSelectedPO(po);
        setDetailDialogOpen(true);
    };

    const handleEdit = (po) => {
        setSelectedPO(po);
        setCreateDialogOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedPO(null);
        setCreateDialogOpen(true);
    };

    const handleDialogClose = (newPO, items, supplier) => {
        setCreateDialogOpen(false);

        // If PO was created (not edited), show receipt modal
        if (newPO && items && supplier) {
            setReceiptData({ po: newPO, items, supplier });
            setReceiptModalOpen(true);
        }

        setSelectedPO(null);
        fetchPurchaseOrders();
    };

    const handleDelete = async (po) => {
        if (!window.confirm(`Are you sure you want to delete PO ${po.po_number}?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('purchase_orders')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', po.id);

            if (error) throw error;

            toast.success('Purchase order deleted!');
            fetchPurchaseOrders();
        } catch (error) {
            console.error('Error deleting PO:', error);
            toast.error('Failed to delete purchase order');
        }
    };

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
                    Purchase Orders
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreateNew}
                    fullWidth={isMobile}
                >
                    New Purchase Order
                </Button>
            </Box>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <TextField
                            label="Search PO"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="small"
                            sx={{ minWidth: 250 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            select
                            label="Status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            size="small"
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="sent">Sent</MenuItem>
                            <MenuItem value="partially_received">Receiving</MenuItem>
                            <MenuItem value="received">Completed</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Supplier"
                            value={supplierFilter}
                            onChange={(e) => setSupplierFilter(e.target.value)}
                            size="small"
                            sx={{ minWidth: 200 }}
                        >
                            <MenuItem value="all">All Suppliers</MenuItem>
                            {suppliers.map((supplier) => (
                                <MenuItem key={supplier.id} value={supplier.id}>
                                    {supplier.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </CardContent>
            </Card>

            {/* Purchase Orders Table */}
            <Card>
                <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                    <Table sx={{ minWidth: 900 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>PO Number</strong></TableCell>
                                <TableCell><strong>Supplier</strong></TableCell>
                                <TableCell><strong>Order Date</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell align="right"><strong>Total Amount</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">Loading...</TableCell>
                                </TableRow>
                            ) : purchaseOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        No purchase orders found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                purchaseOrders.map((po) => (
                                    <TableRow key={po.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {po.po_number}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{po.suppliers?.name || '—'}</TableCell>
                                        <TableCell>
                                            {new Date(po.order_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getStatusIcon(po.status)}
                                                label={getStatusLabel(po.status)}
                                                color={getStatusColor(po.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight={600}>
                                                {settings?.currency_symbol || 'Rs'}
                                                {formatCurrency(po.final_amount || po.total_amount, '')}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box display="flex" gap={1} justifyContent="flex-end">
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleViewDetails(po)}
                                                    >
                                                        <Visibility fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {po.status === 'draft' && (
                                                    <>
                                                        <Tooltip title="Edit">
                                                            <IconButton
                                                                size="small"
                                                                color="secondary"
                                                                onClick={() => handleEdit(po)}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDelete(po)}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />

            {/* Dialogs */}
            <CreateEditPODialog
                open={createDialogOpen}
                onClose={handleDialogClose}
                purchaseOrder={selectedPO}
                suppliers={suppliers}
            />

            <PODetailDialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                purchaseOrder={selectedPO}
                onRefresh={fetchPurchaseOrders}
            />

            <POReceiptModal
                open={receiptModalOpen}
                onClose={() => setReceiptModalOpen(false)}
                purchaseOrder={receiptData.po}
                poItems={receiptData.items}
                supplier={receiptData.supplier}
                settings={settings}
            />
        </Container>
    );
}
