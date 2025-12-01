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
    Divider,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Refresh,
    Google as GoogleIcon,
    Email as EmailIcon,
    VpnKey as PasswordIcon
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
    const { signIn, signInWithGoogle, signInWithOtp } = useAuth();

    const [isOtpLogin, setIsOtpLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isOtpLogin) {
                await signInWithOtp(email);
                toast.success('Login link sent to your email!');
            } else {
                await signIn(email, password);
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Failed to log in');
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

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

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

                    {!isOtpLogin && (
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
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button
                            size="small"
                            onClick={() => navigate('/forgot-password')}
                            sx={{ textTransform: 'none' }}
                        >
                            Forgot Password?
                        </Button>
                    </Box>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{ mt: 3 }}
                    >
                        {loading ? <CircularProgress size={24} /> : (isOtpLogin ? 'Send Login Link' : 'Login')}
                    </Button>

                    <Button
                        fullWidth
                        variant="text"
                        size="medium"
                        onClick={() => setIsOtpLogin(!isOtpLogin)}
                        startIcon={isOtpLogin ? <PasswordIcon /> : <EmailIcon />}
                        sx={{ mt: 2 }}
                    >
                        {isOtpLogin ? 'Login with Password' : 'Login with Email OTP'}
                    </Button>

                    <Divider sx={{ my: 2 }}>OR</Divider>

                    <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        onClick={async () => {
                            try {
                                await signInWithGoogle();
                            } catch (error) {
                                setError(error.message);
                            }
                        }}
                        startIcon={<GoogleIcon />}
                    >
                        Sign in with Google
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
