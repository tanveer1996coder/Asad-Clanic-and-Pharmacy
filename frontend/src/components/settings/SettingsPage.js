import React, { useState } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Box,
    Divider,
    Alert,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { toast } from 'react-toastify';
import useSettings from '../../hooks/useSettings';

export default function SettingsPage() {
    const { settings, loading, updateSettings } = useSettings();
    const [formData, setFormData] = useState({
        store_name: '',
        owner_name: '',
        phone: '',
        address: '',
        currency_symbol: '',
        expiry_alert_days: '',
        low_stock_threshold: '',
        footer_text: '',
    });
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (settings) {
            setFormData({
                store_name: settings.store_name || '',
                owner_name: settings.owner_name || '',
                phone: settings.phone || '',
                address: settings.address || '',
                currency_symbol: settings.currency_symbol || 'PKR',
                expiry_alert_days: settings.expiry_alert_days || '15',
                low_stock_threshold: settings.low_stock_threshold || '10',
                footer_text: settings.footer_text || '',
            });
        }
    }, [settings]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const result = await updateSettings(formData);

        if (result.success) {
            toast.success('Settings saved successfully!');
        } else {
            toast.error('Failed to save settings: ' + result.error);
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <Container maxWidth="md">
                <Typography>Loading settings...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md">
            <Typography variant="h4" fontWeight={700} color="primary" mb={3}>
                Settings
            </Typography>

            <Card>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <Typography variant="h6" fontWeight={600} mb={2}>
                            Store Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Store Name"
                                    name="store_name"
                                    value={formData.store_name}
                                    onChange={handleChange}
                                    placeholder="My Medical Store"
                                    helperText="This name will appear on receipts and reports"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Owner Name"
                                    name="owner_name"
                                    value={formData.owner_name}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    helperText="Owner/Manager name for receipts"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+92 300 1234567"
                                    helperText="Contact number for receipts"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Complete Address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="123 Main Street, City, Country"
                                    helperText="Full address to appear on receipts"
                                    multiline
                                    rows={2}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Currency Symbol"
                                    name="currency_symbol"
                                    value={formData.currency_symbol}
                                    onChange={handleChange}
                                    placeholder="PKR"
                                    helperText="e.g., PKR, Rs., $"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Footer Text"
                                    name="footer_text"
                                    value={formData.footer_text}
                                    onChange={handleChange}
                                    placeholder="Thank you for your business!"
                                    helperText="Text at bottom of receipts"
                                />
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="h6" fontWeight={600} mb={2}>
                            Alert Settings
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Expiry Alert (Days)"
                                    name="expiry_alert_days"
                                    value={formData.expiry_alert_days}
                                    onChange={handleChange}
                                    helperText="Alert when products expire within X days"
                                    inputProps={{ min: 1, max: 365 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Low Stock Threshold"
                                    name="low_stock_threshold"
                                    value={formData.low_stock_threshold}
                                    onChange={handleChange}
                                    helperText="Alert when stock falls below this number"
                                    inputProps={{ min: 0, max: 1000 }}
                                />
                            </Grid>
                        </Grid>

                        <Box mt={4}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Changes will take effect immediately after saving.
                            </Alert>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                startIcon={<Save />}
                                disabled={saving}
                                fullWidth
                            >
                                {saving ? 'Saving...' : 'Save Settings'}
                            </Button>
                        </Box>
                    </form>
                </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
                <CardContent>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                        About
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Medical Store Management System v2.0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Built with React, Material-UI, and Supabase
                    </Typography>
                </CardContent>
            </Card>
        </Container>
    );
}
