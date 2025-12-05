import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    IconButton,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    useMediaQuery,
    useTheme,
    Avatar,
    Menu,
    MenuItem,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Inventory as InventoryIcon,
    ShoppingCart as ShoppingCartIcon,
    LocalShipping as LocalShippingIcon,
    People as PeopleIcon,
    Assessment as AssessmentIcon,
    Settings as SettingsIcon,
    Store as StoreIcon,
    Logout as LogoutIcon,
    LocalPharmacy as LocalPharmacyIcon,
    Keyboard as KeyboardIcon,
} from '@mui/icons-material';
import useSettings from '../../hooks/useSettings';
import { useAuth } from '../../contexts/AuthContext';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { useKeyboard } from '../../contexts/KeyboardContext';

const drawerWidth = 260;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Sales', icon: <ShoppingCartIcon />, path: '/sales' },
    { text: 'Products', icon: <InventoryIcon />, path: '/products' },
    { text: 'Stock', icon: <LocalShippingIcon />, path: '/stock' },
    { text: 'Customers', icon: <PeopleIcon />, path: '/customers' },
    { text: 'Sales History', icon: <AssessmentIcon />, path: '/sales-history' },
    { text: 'Purchase Orders', icon: <ShoppingCartIcon />, path: '/purchase-orders' },
    { text: 'Suppliers', icon: <PeopleIcon />, path: '/suppliers' },
    { text: 'Medicine Reference', icon: <LocalPharmacyIcon />, path: '/medicine-reference' },
    { text: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'User Guide', icon: <StoreIcon />, path: '/guide' },
];

export default function Layout({ children }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { settings } = useSettings();
    const { signOut, user } = useAuth();
    const { toggleHelp } = useKeyboard();

    // Global Navigation Shortcuts
    useKeyboardShortcuts({
        'Alt+1': { action: () => navigate('/dashboard'), description: 'Go to Dashboard' },
        'Alt+2': { action: () => navigate('/sales'), description: 'Go to Sales' },
        'Alt+3': { action: () => navigate('/products'), description: 'Go to Products' },
        'Alt+4': { action: () => navigate('/stock'), description: 'Go to Stock' },
        'Alt+5': { action: () => navigate('/customers'), description: 'Go to Customers' },
        'Shift+?': { action: toggleHelp, description: 'Show Keyboard Shortcuts' }
    }, 'Global Navigation');

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleMenuClick = (path) => {
        navigate(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    };

    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const drawer = (
        <Box>
            <Toolbar
                sx={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 2,
                }}
            >
                <StoreIcon sx={{ fontSize: 32 }} />
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
                    {settings.store_name || 'Medical Store'}
                </Typography>
            </Toolbar>
            <Divider />
            <List sx={{ px: 1, py: 2 }}>
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                onClick={() => handleMenuClick(item.path)}
                                sx={{
                                    borderRadius: 2,
                                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                                    color: isActive ? 'white' : 'text.primary',
                                    '&:hover': {
                                        backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                                    },
                                    transition: 'all 0.2s ease-in-out',
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: isActive ? 'white' : 'primary.main',
                                        minWidth: 40,
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: isActive ? 600 : 500,
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0px 2px 12px rgba(99, 102, 241, 0.2)',
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        {menuItems.find((item) => item.path === location.pathname)?.text || 'Medical Store'}
                    </Typography>
                    <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0 }}>
                        <Avatar
                            sx={{
                                bgcolor: 'secondary.main',
                                width: 40,
                                height: 40,
                                fontWeight: 700,
                            }}
                        >
                            {settings.store_name?.charAt(0) || 'M'}
                        </Avatar>
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleProfileMenuClose}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
                            <SettingsIcon sx={{ mr: 1 }} fontSize="small" />
                            Settings
                        </MenuItem>
                        <MenuItem onClick={() => { handleProfileMenuClose(); toggleHelp(); }}>
                            <KeyboardIcon sx={{ mr: 1 }} fontSize="small" />
                            Keyboard Shortcuts
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={() => { handleProfileMenuClose(); handleLogout(); }}>
                            <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                            Logout
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    mt: 8,
                    backgroundColor: 'background.default',
                    minHeight: '100vh',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
