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
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { Add, Edit, Delete, WhatsApp, Star, StarBorder } from '@mui/icons-material';
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
    const [contacts, setContacts] = useState([]);
    const [newContact, setNewContact] = useState({ contact_name: '', phone: '', whatsapp_enabled: true, is_primary: false });
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        portfolio_link: '',
        notes: '',
    });

    // Fetch suppliers with their primary contact
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
                .select(`
                    *,
                    supplier_contacts(id, contact_name, phone, whatsapp_enabled, is_primary)
                `)
                .eq('organization_id', orgId)
                .is('deleted_at', null)
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

    const fetchContactsForSupplier = async (supplierId) => {
        try {
            const { data, error } = await supabase
                .from('supplier_contacts')
                .select('*')
                .eq('supplier_id', supplierId)
                .order('is_primary', { ascending: false });

            if (error) throw error;
            setContacts(data || []);
        } catch (err) {
            console.error('Error fetching contacts:', err);
        }
    };

    const handleOpenDialog = async (supplier = null) => {
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
            });
            await fetchContactsForSupplier(supplier.id);
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
            });
            setContacts([]);
        }
        setNewContact({ contact_name: '', phone: '', whatsapp_enabled: true, is_primary: false });
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingSupplier(null);
        setContacts([]);
        setNewContact({ contact_name: '', phone: '', whatsapp_enabled: true, is_primary: false });
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleAddContact = () => {
        if (!newContact.contact_name || !newContact.phone) {
            toast.error('Please enter contact name and phone');
            return;
        }

        const contactToAdd = {
            ...newContact,
            id: `temp_${Date.now()}`, // Temporary ID for UI
            is_new: true,
        };

        setContacts([...contacts, contactToAdd]);
        setNewContact({ contact_name: '', phone: '', whatsapp_enabled: true, is_primary: false });
    };

    const handleRemoveContact = (contact) => {
        setContacts(contacts.filter(c => c.id !== contact.id));
    };

    const handleTogglePrimary = (contactId) => {
        setContacts(contacts.map(c => ({
            ...c,
            is_primary: c.id === contactId
        })));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error('Please enter supplier name');
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Please log in to save changes');
                return;
            }

            let supplierId;

            if (editingSupplier) {
                // Update existing supplier
                const { error } = await supabase
                    .from('suppliers')
                    .update(formData)
                    .eq('id', editingSupplier.id);
                if (error) throw error;
                supplierId = editingSupplier.id;
            } else {
                // Create new supplier
                const { data, error } = await supabase
                    .from('suppliers')
                    .insert([{ ...formData, organization_id: session.user.id }])
                    .select()
                    .single();
                if (error) throw error;
                supplierId = data.id;
            }

            // Handle contacts
            if (editingSupplier) {
                // Delete removed contacts
                const existingContactIds = contacts.filter(c => !c.is_new).map(c => c.id);
                const { error: deleteError } = await supabase
                    .from('supplier_contacts')
                    .delete()
                    .eq('supplier_id', supplierId)
                    .not('id', 'in', `(${existingContactIds.join(',') || 'null'})`);
                if (deleteError) console.error('Error deleting contacts:', deleteError);

                // Update existing contacts
                for (const contact of contacts.filter(c => !c.is_new)) {
                    const { error: updateError } = await supabase
                        .from('supplier_contacts')
                        .update({
                            contact_name: contact.contact_name,
                            phone: contact.phone,
                            whatsapp_enabled: contact.whatsapp_enabled,
                            is_primary: contact.is_primary,
                        })
                        .eq('id', contact.id);
                    if (updateError) console.error('Error updating contact:', updateError);
                }
            }

            // Insert new contacts
            const newContacts = contacts.filter(c => c.is_new).map(c => ({
                supplier_id: supplierId,
                contact_name: c.contact_name,
                phone: c.phone,
                whatsapp_enabled: c.whatsapp_enabled,
                is_primary: c.is_primary,
                organization_id: session.user.id,
            }));

            if (newContacts.length > 0) {
                const { error: insertError } = await supabase
                    .from('supplier_contacts')
                    .insert(newContacts);
                if (insertError) throw insertError;
            }

            toast.success(editingSupplier ? 'Supplier updated successfully!' : 'Supplier added successfully!');
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
            const { error } = await supabase
                .from('suppliers')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', supplierToDelete);

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

    const openWhatsApp = (phone) => {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const getPrimaryContact = (supplier) => {
        if (!supplier.supplier_contacts || supplier.supplier_contacts.length === 0) {
            return supplier.phone || supplier.contact_person || '—';
        }
        const primary = supplier.supplier_contacts.find(c => c.is_primary);
        return primary ? `${primary.contact_name} (${primary.phone})` : supplier.supplier_contacts[0].contact_name;
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
                <Box>
                    {loading ? (
                        <Typography align="center">Loading...</Typography>
                    ) : suppliers.length === 0 ? (
                        <Typography align="center">No suppliers found</Typography>
                    ) : (
                        suppliers.map((supplier) => {
                            const primaryContact = supplier.supplier_contacts?.find(c => c.is_primary);
                            return (
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

                                        <Box mb={2}>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                <strong>Primary Contact:</strong>
                                            </Typography>
                                            {primaryContact ? (
                                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                    <Typography variant="body1" fontWeight={500}>
                                                        {primaryContact.contact_name}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        ({primaryContact.phone})
                                                    </Typography>
                                                    {primaryContact.whatsapp_enabled && (
                                                        <Button
                                                            variant="contained"
                                                            color="success"
                                                            size="small"
                                                            startIcon={<WhatsApp />}
                                                            onClick={() => openWhatsApp(primaryContact.phone)}
                                                            sx={{ ml: 1 }}
                                                        >
                                                            Chat
                                                        </Button>
                                                    )}
                                                </Box>
                                            ) : (
                                                <Typography variant="body2">{supplier.phone || 'No contact info'}</Typography>
                                            )}
                                        </Box>

                                        {supplier.supplier_contacts && supplier.supplier_contacts.length > 0 && (
                                            <Chip
                                                size="small"
                                                label={`${supplier.supplier_contacts.length} Total Contacts`}
                                                color="primary"
                                                variant="outlined"
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </Box>
            ) : (
                <Card>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Name</strong></TableCell>
                                    <TableCell><strong>Primary Contact</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>Contacts</strong></TableCell>
                                    <TableCell align="right"><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">Loading...</TableCell>
                                    </TableRow>
                                ) : suppliers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">No suppliers found</TableCell>
                                    </TableRow>
                                ) : (
                                    suppliers.map((supplier) => {
                                        const primaryContact = supplier.supplier_contacts?.find(c => c.is_primary);
                                        return (
                                            <TableRow key={supplier.id} hover>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>{supplier.name}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {primaryContact ? (
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Typography variant="body2">
                                                                {primaryContact.contact_name} - {primaryContact.phone}
                                                            </Typography>
                                                            {primaryContact.whatsapp_enabled && (
                                                                <IconButton
                                                                    size="small"
                                                                    color="success"
                                                                    onClick={() => openWhatsApp(primaryContact.phone)}
                                                                >
                                                                    <WhatsApp fontSize="small" />
                                                                </IconButton>
                                                            )}
                                                        </Box>
                                                    ) : (supplier.phone || '—')}
                                                </TableCell>
                                                <TableCell>{supplier.email || '—'}</TableCell>
                                                <TableCell>
                                                    {supplier.supplier_contacts && supplier.supplier_contacts.length > 0 ? (
                                                        <Chip
                                                            size="small"
                                                            label={supplier.supplier_contacts.length}
                                                            color="primary"
                                                        />
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
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <form onSubmit={handleSubmit}>
                    <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField fullWidth required label="Supplier Name" name="name" value={formData.name} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth type="email" label="Email" name="email" value={formData.email} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Portfolio Link" name="portfolio_link" value={formData.portfolio_link} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth multiline rows={2} label="Address" name="address" value={formData.address} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth multiline rows={2} label="Notes" name="notes" value={formData.notes} onChange={handleChange} />
                            </Grid>

                            {/* Contacts Section */}
                            <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="h6" gutterBottom>Contacts</Typography>

                                {/* Existing Contacts */}
                                {contacts.length > 0 && (
                                    <List dense>
                                        {contacts.map((contact) => (
                                            <ListItem key={contact.id}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleTogglePrimary(contact.id)}
                                                    color={contact.is_primary ? "primary" : "default"}
                                                >
                                                    {contact.is_primary ? <Star /> : <StarBorder />}
                                                </IconButton>
                                                <ListItemText
                                                    primary={
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Typography variant="body2">{contact.contact_name}</Typography>
                                                            {contact.is_primary && <Chip size="small" label="Primary" color="primary" />}
                                                        </Box>
                                                    }
                                                    secondary={contact.phone}
                                                />
                                                {contact.whatsapp_enabled && (
                                                    <WhatsApp color="success" fontSize="small" sx={{ mr: 1 }} />
                                                )}
                                                <ListItemSecondaryAction>
                                                    <IconButton edge="end" size="small" onClick={() => handleRemoveContact(contact)}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>
                                )}

                                {/* Add New Contact */}
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" gutterBottom>Add Contact</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={5}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Name"
                                                value={newContact.contact_name}
                                                onChange={(e) => setNewContact({ ...newContact, contact_name: e.target.value })}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={5}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Phone"
                                                value={newContact.phone}
                                                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={2}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                onClick={handleAddContact}
                                                startIcon={<Add />}
                                            >
                                                Add
                                            </Button>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={newContact.whatsapp_enabled}
                                                        onChange={(e) => setNewContact({ ...newContact, whatsapp_enabled: e.target.checked })}
                                                    />
                                                }
                                                label="WhatsApp Enabled"
                                            />
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={newContact.is_primary}
                                                        onChange={(e) => setNewContact({ ...newContact, is_primary: e.target.checked })}
                                                    />
                                                }
                                                label="Set as Primary"
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
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
                content="Are you sure? This will hide the supplier but keep historical records."
            />
        </Container>
    );
}
