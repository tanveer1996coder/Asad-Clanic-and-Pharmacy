import React from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Grid,
    Card,
    CardContent
} from '@mui/material';
import {
    ShoppingCart,
    Inventory,
    People,
    Assessment,
    Keyboard,
    CheckCircle
} from '@mui/icons-material';

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function GuidePage() {
    const [value, setValue] = React.useState(0);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return (
        <Container maxWidth="xl">
            <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
                User Guide & Documentation
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                Welcome to the Medical Store Audit application. This guide will help you understand the core features and how to use them effectively.
            </Typography>

            <Paper sx={{ width: '100%', mb: 4 }}>
                <Tabs value={value} onChange={handleChange} indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto">
                    <Tab label="Getting Started" />
                    <Tab label="Sales Terminal" />
                    <Tab label="Inventory Management" />
                    <Tab label="Shortcuts" />
                </Tabs>
                <Divider />

                {/* Getting Started */}
                <TabPanel value={value} index={0}>
                    <Typography variant="h5" gutterBottom>Overview</Typography>
                    <Typography paragraph>
                        This application is designed to manage your medical store's inventory, sales, and customers efficiently.
                        The Dashboard gives you a quick snapshot of your daily performance and critical stock alerts.
                    </Typography>

                    <Grid container spacing={3} mt={2}>
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" gutterBottom><Inventory color="primary" /> Stock Alerts</Typography>
                                    <Typography variant="body2">
                                        Keep an eye on the Dashboard for "Low Stock" and "Near Expiry" alerts to prevent running out of medicines or selling expired goods.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" gutterBottom><Assessment color="secondary" /> Reports</Typography>
                                    <Typography variant="body2">
                                        Use the Reports section to generate daily sales reports and detailed inventory audits to keep your accounts in check.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Sales Terminal */}
                <TabPanel value={value} index={1}>
                    <Typography variant="h5" gutterBottom>Processing Sales</Typography>
                    <List>
                        <ListItem>
                            <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                            <ListItemText primary="Search Products" secondary="Use the search bar to find products by name or scan a barcode. Press F2 to quickly focus the search bar." />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                            <ListItemText primary="Add to Cart" secondary="Select a product to add it to the cart. You can toggle between 'Box' and 'Item' units if configured." />
                        </ListItem>
                        <ListItem>
                            <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                            <ListItemText primary="Checkout" secondary="Review the total, add a discount if needed (F9), and click 'Complete Sale' (F4) to generate an invoice." />
                        </ListItem>
                    </List>
                </TabPanel>

                {/* Inventory */}
                <TabPanel value={value} index={2}>
                    <Typography variant="h5" gutterBottom>Managing Stock</Typography>
                    <Typography paragraph>
                        Go to the <strong>Products</strong> page to add new medicines or update existing details.
                        Use the <strong>Stock</strong> page to receive new shipments from suppliers.
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold">Key Concepts:</Typography>
                    <List dense>
                        <ListItem>
                            <ListItemText primary="Min Stock Level" secondary="Set this for each product to get alerts when you are running low." />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Expiry Date" secondary="Always record expiry dates when receiving stock to ensure safety compliance." />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Box vs Item" secondary="You can define how many items are in a box (e.g., 10 tablets per strip) and sell by either unit." />
                        </ListItem>
                    </List>
                </TabPanel>

                {/* Shortcuts */}
                <TabPanel value={value} index={3}>
                    <Typography variant="h5" gutterBottom>Keyboard Shortcuts</Typography>
                    <Typography paragraph>
                        Power users can navigate and operate the app significantly faster using keyboard shortcuts.
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <List dense sx={{ bgcolor: 'background.default', borderRadius: 2 }}>
                                <ListItem>
                                    <ListItemIcon><Keyboard /></ListItemIcon>
                                    <ListItemText primary="F2" secondary="Focus Search Bar (Sales)" />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><Keyboard /></ListItemIcon>
                                    <ListItemText primary="F4" secondary="Complete Sale" />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><Keyboard /></ListItemIcon>
                                    <ListItemText primary="F9" secondary="Focus Discount" />
                                </ListItem>
                            </List>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <List dense sx={{ bgcolor: 'background.default', borderRadius: 2 }}>
                                <ListItem>
                                    <ListItemIcon><Keyboard /></ListItemIcon>
                                    <ListItemText primary="Alt + 1" secondary="Go to Dashboard" />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><Keyboard /></ListItemIcon>
                                    <ListItemText primary="Alt + 2" secondary="Go to Sales" />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon><Keyboard /></ListItemIcon>
                                    <ListItemText primary="Shift + ?" secondary="Show All Shortcuts" />
                                </ListItem>
                            </List>
                        </Grid>
                    </Grid>
                </TabPanel>
            </Paper>
        </Container>
    );
}
