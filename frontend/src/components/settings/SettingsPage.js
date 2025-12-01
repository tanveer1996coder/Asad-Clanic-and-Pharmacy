import React, { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Card,
    CardContent,
    Grid,
    TextField,
    Button,
    Divider,
    Alert,
    CircularProgress,
    Avatar,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper
} from '@mui/material';
import {
    Save,
    CloudUpload,
    Delete as DeleteIcon,
    Store,
    SupportAgent,
    Email,
    Phone,
    WhatsApp
} from '@mui/icons-material';
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
        logo_url: '',
    });
    const [saving, setSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

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
                logo_url: settings.logo_url || '',
            });
            setLogoPreview(settings.logo_url || null);
        }
    }, [settings]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 500KB)
        if (file.size > 500 * 1024) {
            toast.error('Logo file size must be less than 500KB');
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result;
            setFormData({ ...formData, logo_url: base64String });
            setLogoPreview(base64String);
            toast.success('Logo uploaded successfully');
        };
        reader.onerror = () => {
            toast.error('Failed to read file');
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setFormData({ ...formData, logo_url: '' });
        setLogoPreview(null);
        toast.info('Logo removed');
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
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
                Settings
            </Typography>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
                    <Tab icon={<Store />} label="General" />
                    <Tab icon={<SupportAgent />} label="Support" />
                </Tabs>
            </Paper>

            {/* General Settings Tab */}
            <div role="tabpanel" hidden={activeTab !== 0}>
                {activeTab === 0 && (
                    <Card>
                        <CardContent>
                            <form onSubmit={handleSubmit}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <Typography variant="h6" gutterBottom>
                                            Store Information
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Store Name"
                                            name="store_name"
                                            value={formData.store_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Owner Name"
                                            name="owner_name"
                                            value={formData.owner_name}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            multiline
                                            rows={1}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Currency Symbol"
                                            name="currency_symbol"
                                            value={formData.currency_symbol}
                                            onChange={handleChange}
                                            helperText="e.g. $, Rs, €"
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="h6" gutterBottom>
                                            Inventory Alerts
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Low Stock Threshold"
                                            name="low_stock_threshold"
                                            type="number"
                                            value={formData.low_stock_threshold}
                                            onChange={handleChange}
                                            helperText="Alert when stock falls below this"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Expiry Alert Days"
                                            name="expiry_alert_days"
                                            type="number"
                                            value={formData.expiry_alert_days}
                                            onChange={handleChange}
                                            helperText="Alert days before expiry"
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="h6" gutterBottom>
                                            Receipt Settings
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Receipt Footer Text"
                                            name="footer_text"
                                            value={formData.footer_text}
                                            onChange={handleChange}
                                            helperText="Message to appear at bottom of receipts"
                                        />
                                    </Grid>

                                    {/* Logo Upload Section */}
                                    <Grid item xs={12}>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="subtitle1" fontWeight={600} mb={2}>
                                            Store Logo
                                        </Typography>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            {logoPreview && (
                                                <Avatar
                                                    src={logoPreview}
                                                    alt="Store Logo"
                                                    sx={{ width: 100, height: 100 }}
                                                    variant="rounded"
                                                />
                                            )}
                                            <Box flexGrow={1}>
                                                <Button
                                                    variant="outlined"
                                                    component="label"
                                                    startIcon={<CloudUpload />}
                                                    fullWidth
                                                >
                                                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                                    <input
                                                        type="file"
                                                        hidden
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                    />
                                                </Button>
                                                {logoPreview && (
                                                    <Button
                                                        variant="outlined"
                                                        color="error"
                                                        startIcon={<DeleteIcon />}
                                                        onClick={handleRemoveLogo}
                                                        fullWidth
                                                        sx={{ mt: 1 }}
                                                    >
                                                        Remove Logo
                                                    </Button>
                                                )}
                                                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                                    Recommended: 200x200px, PNG or JPG, max 500KB
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            size="large"
                                            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                                            disabled={saving}
                                            fullWidth
                                        >
                                            {saving ? 'Saving...' : 'Save Settings'}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Support Tab */}
            <div role="tabpanel" hidden={activeTab !== 1}>
                {activeTab === 1 && (
                    <Card>
                        <CardContent>
                            <Box textAlign="center" py={4}>
                                <SupportAgent sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                                <Typography variant="h5" gutterBottom>
                                    Need Help?
                                </Typography>
                                <Typography color="text.secondary" paragraph>
                                    Our support team is available to assist you with any issues or questions.
                                </Typography>

                                <Grid container spacing={3} justifyContent="center" mt={2}>
                                    <Grid item xs={12} md={6}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <List>
                                                    <ListItem>
                                                        <ListItemIcon>
                                                            <Phone color="primary" />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary="Customer Support"
                                                            secondary="+92 300 1234567"
                                                        />
                                                    </ListItem>
                                                    <ListItem>
                                                        <ListItemIcon>
                                                            <Email color="primary" />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary="Email Support"
                                                            secondary="support@medicalstoreaudit.com"
                                                        />
                                                    </ListItem>
                                                    <ListItem>
                                                        <ListItemIcon>
                                                            <WhatsApp color="success" />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary="WhatsApp"
                                                            secondary="+92 300 1234567"
                                                        />
                                                    </ListItem>
                                                </List>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>

                                <Box mt={4}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<WhatsApp />}
                                        href="https://wa.me/923001234567"
                                        target="_blank"
                                        size="large"
                                    >
                                        Chat on WhatsApp
                                    </Button>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Container>
    );
}
