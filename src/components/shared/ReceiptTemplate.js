import React from 'react';
import { Box, Typography, Divider, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

export default function ReceiptTemplate({ invoice, items, settings }) {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const currencySymbol = settings?.currency_symbol || 'Rs.';

    return (
        <Box
            sx={{
                width: '210mm',
                minHeight: '297mm',
                bgcolor: 'white',
                p: 4,
                fontFamily: 'Arial, sans-serif',
                fontSize: '12pt',
                '@media print': {
                    boxShadow: 'none',
                    margin: 0,
                    padding: '20mm',
                },
            }}
        >
            {/* Header */}
            <Box textAlign="center" mb={3}>
                <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
                    {settings?.store_name || 'Medical Store'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {settings?.address || 'Store Address'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Phone: {settings?.phone || 'Contact Number'}
                </Typography>
            </Box>

            <Divider sx={{ mb: 2, borderWidth: 2 }} />

            {/* Invoice Details */}
            <Box mb={3}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    INVOICE
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">
                        <strong>Invoice #:</strong> {invoice.id.slice(0, 8).toUpperCase()}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Date:</strong> {formatDate(invoice.created_at)}
                    </Typography>
                </Box>
                {invoice.customer_id && (
                    <Typography variant="body2">
                        <strong>Customer:</strong> {invoice.customer?.name || 'Walk-in Customer'}
                    </Typography>
                )}
                <Typography variant="body2">
                    <strong>Payment:</strong> {invoice.payment_method?.toUpperCase() || 'CASH'}
                </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Items Table */}
            <Table size="small" sx={{ mb: 3 }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 700, borderBottom: 2 }}>Item</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, borderBottom: 2 }}>Qty</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, borderBottom: 2 }}>Unit</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, borderBottom: 2 }}>Price</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, borderBottom: 2 }}>Total</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((item, index) => {
                        const unitPrice = item.price_at_sale || item.products?.price || 0;
                        const lineTotal = item.quantity * unitPrice;

                        return (
                            <TableRow key={index}>
                                <TableCell>{item.products?.name || item.product?.name || 'Product'}</TableCell>
                                <TableCell align="center">{item.quantity}</TableCell>
                                <TableCell align="center">
                                    {item.selling_unit === 'box' ? 'Box' : 'Item'}
                                </TableCell>
                                <TableCell align="right">{currencySymbol} {unitPrice.toFixed(2)}</TableCell>
                                <TableCell align="right">{currencySymbol} {lineTotal.toFixed(2)}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            <Divider sx={{ mb: 2 }} />

            {/* Totals */}
            <Box display="flex" justifyContent="flex-end" mb={4}>
                <Box minWidth="250px">
                    <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body1">Subtotal:</Typography>
                        <Typography variant="body1" fontWeight={600}>
                            {currencySymbol} {(invoice.total_amount + (invoice.discount || 0)).toFixed(2)}
                        </Typography>
                    </Box>

                    {invoice.discount > 0 && (
                        <Box display="flex" justifyContent="space-between" mb={1} color="error.main">
                            <Typography variant="body1">Discount:</Typography>
                            <Typography variant="body1" fontWeight={600}>
                                - {currencySymbol} {invoice.discount.toFixed(2)}
                            </Typography>
                        </Box>
                    )}

                    <Divider sx={{ my: 1 }} />

                    <Box display="flex" justifyContent="space-between" bgcolor="primary.main" color="white" p={1} borderRadius={1}>
                        <Typography variant="h6" fontWeight={700}>TOTAL:</Typography>
                        <Typography variant="h6" fontWeight={700}>
                            {currencySymbol} {invoice.total_amount.toFixed(2)}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Footer */}
            <Divider sx={{ mb: 2 }} />

            <Box textAlign="center" mt={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Thank you for your business!
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {settings?.footer_text || 'Please keep this receipt for your records'}
                </Typography>
            </Box>

            {/* Signature Area */}
            <Box mt={6} display="flex" justifyContent="space-between">
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        _____________________
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                        Customer Signature
                    </Typography>
                </Box>
                <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">
                        _____________________
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                        Authorized Signatory
                    </Typography>
                </Box>
            </Box>

            {/* Barcode/QR Code Area (Optional) */}
            <Box mt={4} textAlign="center">
                <Typography variant="caption" color="text.secondary">
                    Invoice ID: {invoice.id}
                </Typography>
            </Box>
        </Box>
    );
}
