import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    Tab,
    Tabs,
    CircularProgress,
    InputAdornment,
    IconButton,
    LinearProgress,
    Chip,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Refresh,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Password strength checker
const checkPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: 'error' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { score: (score / 6) * 100, label: 'Weak', color: 'error' };
    if (score <= 4) return { score: (score / 6) * 100, label: 'Medium', color: 'warning' };
    return { score: (score / 6) * 100, label: 'Strong', color: 'success' };
};

// Password generator
const generateStrongPassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = lowercase + uppercase + numbers + symbols;

    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 16; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
};

export default function LoginPage() {
    const navigate = useNavigate();
    const { signIn, signUp } = useAuth();

    const [tabValue, setTabValue] = useState(0);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [storeName, setStoreName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const passwordStrength = checkPasswordStrength(password);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setError('');
        setSuccess('');
    };

    const handleGeneratePassword = () => {
        const newPassword = generateStrongPassword();
        setPassword(newPassword);
        setConfirmPassword(newPassword);
        toast.success('Password generated! Click the eye icon to view it.');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to log in');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        if (passwordStrength.label === 'Weak') {
            setError('Please use a stronger password or generate one');
            setLoading(false);
            return;
        }

        try {
            await signUp(email, password, {
                store_name: storeName,
                phone: phone || null,
            });
            setSuccess('Account created! Please check your email to verify, then log in.');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setStoreName('');
            setPhone('');
            setTimeout(() => setTabValue(0), 2000);
        } catch (err) {
            setError(err.message || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" align="center" gutterBottom>
                    Medical Store Audit
                </Typography>
                <Typography variant="body2" align="center" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                    Manage your pharmacy inventory with ease
                </Typography>

                <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 3 }}>
                    <Tab label="Login" />
                    <Tab label="Sign Up" />
                </Tabs>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                {/* Login Tab */}
                {tabValue === 0 && (
                    <Box component="form" onSubmit={handleLogin}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            required
                            autoComplete="email"
                        />

                        <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                            autoComplete="current-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{ mt: 3 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Login'}
                        </Button>
                    </Box>
                )}

                {/* Sign Up Tab */}
                {tabValue === 1 && (
                    <Box component="form" onSubmit={handleSignUp}>
                        <TextField
                            fullWidth
                            label="Store Name"
                            value={storeName}
                            onChange={(e) => setStoreName(e.target.value)}
                            margin="normal"
                            required
                            helperText="Your pharmacy or store name"
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="normal"
                            required
                            autoComplete="email"
                        />
                        <TextField
                            fullWidth
                            label="Phone Number (Optional)"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            margin="normal"
                            placeholder="+1 234 567 8900"
                            helperText="For account recovery"
                        />

                        <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="normal"
                            required
                            autoComplete="new-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {password && (
                            <Box sx={{ mt: 1, mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Password Strength:
                                    </Typography>
                                    <Chip
                                        label={passwordStrength.label}
                                        size="small"
                                        color={passwordStrength.color}
                                    />
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={passwordStrength.score}
                                    color={passwordStrength.color}
                                    sx={{ height: 6, borderRadius: 3 }}
                                />
                            </Box>
                        )}

                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={handleGeneratePassword}
                            sx={{ mb: 2 }}
                        >
                            Generate Strong Password
                        </Button>

                        <TextField
                            fullWidth
                            label="Confirm Password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            margin="normal"
                            required
                            autoComplete="new-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{ mt: 3 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Create Account'}
                        </Button>
                    </Box>
                )}

                <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 3 }}>
                    {tabValue === 0 ? (
                        <>
                            Don't have an account?{' '}
                            <Button size="small" onClick={() => setTabValue(1)}>
                                Sign Up
                            </Button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <Button size="small" onClick={() => setTabValue(0)}>
                                Login
                            </Button>
                        </>
                    )}
                </Typography>
            </Paper>
        </Container>
    );
}
