import React, { useState } from 'react';
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
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';

export default function AddCustomerDialog({ open, onClose, onCustomerAdded, initialName = '' }) {
    const [formData, setFormData] = useState({
        name: initialName,
        phone: '',
        address: '',
    });
    const [saving, setSaving] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Customer name is required');
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const { data: newCustomer, error } = await supabase
                .from('customers')
                .insert([{
                    name: formData.name.trim(),
                    phone: formData.phone.trim() || null,
                    address: formData.address.trim() || null,
                    organization_id: session.user.id,
                }])
                .select()
                .single();

            if (error) throw error;

            toast.success('Customer added successfully!');
            onCustomerAdded(newCustomer);
            onClose();
        } catch (error) {
            console.error('Error adding customer:', error);
            toast.error('Failed to add customer: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const form = e.target.form;
            const index = Array.prototype.indexOf.call(form, e.target);
            const nextElement = form.elements[index + 1];
            if (nextElement && nextElement.type !== 'submit') {
                nextElement.focus();
            } else {
                handleSubmit(e);
            }
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <PersonAdd color="primary" />
                        Add New Customer
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Quickly add a new customer to complete your sale.
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                required
                                autoFocus
                                label="Customer Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter customer name"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Optional"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Optional"
                                multiline
                                rows={2}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Add Customer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
