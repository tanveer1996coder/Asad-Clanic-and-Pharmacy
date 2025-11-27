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
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import useSettings from '../../hooks/useSettings';
import ConfirmDialog from '../shared/ConfirmDialog';

export default function SuppliersPage() {
    const { settings } = useSettings();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        portfolio_link: '',
        notes: '',
        organization_id: '',
    });

    // Fetch suppliers for the current user's organization
    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Please log in to view suppliers');
                setLoading(false);
                return;
            }
            const orgId = session.user.id;

            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('organization_id', orgId)
                .order('name');
            if (error) throw error;
            setSuppliers(data || []);
        } catch (err) {
            console.error('Error fetching suppliers:', err);
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleOpenDialog = (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                name: supplier.name || '',
                contact_person: supplier.contact_person || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address || '',
                portfolio_link: supplier.portfolio_link || '',
                notes: supplier.notes || '',
                organization_id: supplier.organization_id || '',
            });
        } else {
            setEditingSupplier(null);
            setFormData({
                name: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                portfolio_link: '',
                notes: '',
                organization_id: '',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingSupplier(null);
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
            toast.error('Please enter supplier name');
            return;
        }
        try {
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Please log in to save changes');
                return;
            }

            // Remove organization_id from formData for INSERT operations
            const { organization_id, ...dataToSave } = formData;

            if (editingSupplier) {
                const { error } = await supabase
                    .from('suppliers')
                    .update(dataToSave)
                    .eq('id', editingSupplier.id);
                if (error) throw error;
                toast.success('Supplier updated successfully!');
            } else {
                // Explicitly set organization_id for new supplier
                const { error } = await supabase
                    .from('suppliers')
                    .insert([{ ...dataToSave, organization_id: session.user.id }]);
                if (error) throw error;
                toast.success('Supplier added successfully!');
            }
            handleCloseDialog();
            fetchSuppliers();
        } catch (err) {
            console.error('Error saving supplier:', err);
            toast.error('Failed to save supplier: ' + (err.message || 'Unknown error'));
        }
    };

    const handleDeleteClick = (id) => {
        setSupplierToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!supplierToDelete) return;

        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', supplierToDelete);
            if (error) throw error;
            toast.success('Supplier deleted successfully!');
            fetchSuppliers();
        } catch (err) {
            console.error('Error deleting supplier:', err);
            toast.error('Failed to delete supplier: ' + (err.message || 'Please try again'));
        } finally {
            setDeleteDialogOpen(false);
            setSupplierToDelete(null);
        }
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Container maxWidth="lg">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight={700} color="primary">
                    Suppliers
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
                    Add Supplier
                </Button>
            </Box>

            {isMobile ? (
                // Mobile Card View
                <Box>
                    {loading ? (
                        <Typography align="center">Loading...</Typography>
                    ) : suppliers.length === 0 ? (
                        <Typography align="center">No suppliers found</Typography>
                    ) : (
                        suppliers.map((supplier) => (
                            <Card key={supplier.id} variant="outlined" sx={{ mb: 2 }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                        <Typography variant="h6" fontWeight={600}>
                                            {supplier.name}
                                        </Typography>
                                        <Box>
                                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(supplier)}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDeleteClick(supplier.id)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>Contact:</strong> {supplier.contact_person || '—'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>Phone:</strong> {supplier.phone || '—'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>Email:</strong> {supplier.email || '—'}
                                    </Typography>
                                    {supplier.portfolio_link && (
                                        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                                            <a href={supplier.portfolio_link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                                View Portfolio
                                            </a>
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </Box>
            ) : (
                // Desktop Table View
                <Card>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Contact Person</strong></TableCell>
                                    <TableCell><strong>Phone</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>Portfolio</strong></TableCell>
                                    <TableCell align="right"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">Loading...</TableCell>
                                    </TableRow>
                                ) : suppliers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">No suppliers found</TableCell>
                                    </TableRow>
                                ) : (
                                    suppliers.map((supplier) => (
                                        <TableRow key={supplier.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600}>{supplier.name}</Typography>
                                            </TableCell>
                                            <TableCell>{supplier.contact_person || '—'}</TableCell>
                                            <TableCell>{supplier.phone || '—'}</TableCell>
                                            <TableCell>{supplier.email || '—'}</TableCell>
                                            <TableCell>
                                                {supplier.portfolio_link ? (
                                                    <a href={supplier.portfolio_link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#6366f1' }}>View</a>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" color="primary" onClick={() => handleOpenDialog(supplier)}>
                                                    <Edit />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => handleDeleteClick(supplier.id)}>
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
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField fullWidth required label="Supplier Name" name="name" value={formData.name} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} />
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
                                <TextField fullWidth label="Portfolio Link (Website/Drive)" name="portfolio_link" value={formData.portfolio_link} onChange={handleChange} placeholder="https://..." />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth multiline rows={2} label="Notes" name="notes" value={formData.notes} onChange={handleChange} />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button type="submit" variant="contained">{editingSupplier ? 'Update' : 'Add'} Supplier</Button>
                    </DialogActions>
                </form>
            </Dialog>

            <ConfirmDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Supplier"
                content="Are you sure you want to delete this supplier? This action cannot be undone."
            />
        </Container>
    );
}
