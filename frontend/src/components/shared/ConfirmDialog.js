import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Typography,
    Box
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = "Confirm Delete",
    content = "Are you sure you want to delete this item? This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel"
}) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
        >
            <DialogTitle id="confirm-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="error" />
                {title}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="confirm-dialog-description">
                    {content}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    {cancelText}
                </Button>
                <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
