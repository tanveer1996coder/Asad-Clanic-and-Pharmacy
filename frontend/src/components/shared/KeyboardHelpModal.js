import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Grid,
    Typography,
    Box,
    Chip,
    IconButton,
    useTheme,
    Divider
} from '@mui/material';
import { Close, Keyboard } from '@mui/icons-material';
import { useKeyboard } from '../../contexts/KeyboardContext';

export default function KeyboardHelpModal() {
    const { isHelpOpen, setIsHelpOpen, shortcuts } = useKeyboard();
    const theme = useTheme();

    // Group shortcuts by section
    const groupedShortcuts = Object.values(shortcuts).reduce((acc, shortcut) => {
        if (!acc[shortcut.section]) {
            acc[shortcut.section] = [];
        }
        acc[shortcut.section].push(shortcut);
        return acc;
    }, {});

    return (
        <Dialog
            open={isHelpOpen}
            onClose={() => setIsHelpOpen(false)}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 2 }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <Keyboard color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Keyboard Shortcuts
                    </Typography>
                </Box>
                <IconButton onClick={() => setIsHelpOpen(false)} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 3 }}>
                <Grid container spacing={4}>
                    {Object.entries(groupedShortcuts).map(([section, items]) => (
                        <Grid item xs={12} md={6} key={section}>
                            <Typography variant="subtitle1" color="primary" fontWeight="bold" gutterBottom>
                                {section}
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={1.5}>
                                {items.map((item, index) => (
                                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" color="text.secondary">
                                            {item.description}
                                        </Typography>
                                        <Box display="flex" gap={0.5}>
                                            {item.keys.split('+').map((key, i) => (
                                                <Chip
                                                    key={i}
                                                    label={key}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        minWidth: 30,
                                                        fontWeight: 'bold',
                                                        bgcolor: theme.palette.action.hover,
                                                        borderColor: theme.palette.divider
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Grid>
                    ))}

                    {Object.keys(groupedShortcuts).length === 0 && (
                        <Grid item xs={12}>
                            <Typography align="center" color="text.secondary">
                                No shortcuts active on this page.
                            </Typography>
                        </Grid>
                    )}
                </Grid>

                <Box mt={4} p={2} bgcolor={theme.palette.action.hover} borderRadius={1}>
                    <Typography variant="caption" color="text.secondary" align="center" display="block">
                        Pro Tip: Press <strong>Shift + ?</strong> or <strong>F1</strong> to open this menu anytime.
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
