import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    Divider,
    useTheme,
    useMediaQuery,
    Paper,
    Table,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
    TableContainer,
} from '@mui/material';
import {
    Close,
    Download,
    Print,
    WhatsApp,
    Share,
    CheckCircle,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { generatePOPDF } from '../../utils/poPdfGenerator';
import { openWhatsApp } from '../../utils/whatsappHelper';
import { printPO } from '../../utils/printPO';
import html2canvas from 'html2canvas';

export default function POReceiptModal({ open, onClose, purchaseOrder, poItems, supplier, settings }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Return null if no data
    if (!purchaseOrder || !poItems || !supplier) {
        return null;
    }

    const handleDownloadPDF = async () => {
        try {
            const pdfBlob = await generatePOPDF(purchaseOrder, poItems, settings);
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${purchaseOrder.po_number}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('PDF downloaded!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF: ' + error.message);
        }
    };

    const handlePrint = () => {
        const success = printPO(purchaseOrder, poItems, settings);
        if (!success) {
            toast.error('Failed to open print window. Please allow popups.');
        }
    };

    const handleShare = async () => {
        try {
            const message = `Purchase Order: ${purchaseOrder.po_number}\n\nSupplier: ${supplier?.name}\nDate: ${new Date(purchaseOrder.order_date).toLocaleDateString()}\n\nItems:\n${poItems.map(item => `- ${item.product_name} x${item.quantity_ordered}`).join('\n')}`;

            if (navigator.share) {
                await navigator.share({
                    title: `PO ${purchaseOrder.po_number}`,
                    text: message,
                });
            } else {
                // Fallback to copy
                await navigator.clipboard.writeText(message);
                toast.success('Order details copied to clipboard!');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleGenerateImage = async () => {
        try {
            const element = document.getElementById('po-receipt-content');
            if (!element) return null;

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
            });

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            });
        } catch (error) {
            console.error('Error generating image:', error);
            return null;
        }
    };

    const handleWhatsApp = async () => {
        const phone = supplier?.phone || supplier?.supplier_contacts?.find(c => c.is_primary)?.phone;
        if (!phone) {
            toast.error('No phone number found for supplier');
            return;
        }

        const loadingToast = toast.loading('Generating receipt image...');

        try {
            const imageBlob = await handleGenerateImage();
            if (!imageBlob) {
                throw new Error('Failed to generate image');
            }

            const imageFile = new File(
                [imageBlob],
                `PO-${purchaseOrder.po_number}.png`,
                { type: 'image/png' }
            );

            // Mobile: Use Web Share API for seamless sharing
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                toast.update(loadingToast, {
                    render: 'Opening share menu...',
                    type: 'info',
                    isLoading: false,
                    autoClose: 2000
                });

                await navigator.share({
                    title: `PO ${purchaseOrder.po_number}`,
                    text: `Purchase Order: ${purchaseOrder.po_number}\n\nPlease find the order details in the attached image.\n\nThank you!`,
                    files: [imageFile]
                });

                toast.success('Shared successfully!');
            } else {
                // Desktop: Download and open WhatsApp Web
                const url = URL.createObjectURL(imageBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `PO-${purchaseOrder.po_number}.png`;
                link.click();
                URL.revokeObjectURL(url);

                toast.update(loadingToast, {
                    render: 'Image downloaded! Opening WhatsApp - please attach it.',
                    type: 'success',
                    isLoading: false,
                    autoClose: 5000
                });

                const message = `Purchase Order: ${purchaseOrder.po_number}\n\nPlease find the order details in the downloaded image file.\n\nThank you!`;

                setTimeout(() => {
                    openWhatsApp(phone, message);
                }, 1000);
            }
        } catch (e) {
            console.error('Error handling WhatsApp share:', e);

            if (e.name === 'AbortError') {
                toast.dismiss(loadingToast);
                return;
            }

            toast.update(loadingToast, {
                render: 'Failed to share. Opening WhatsApp with text only.',
                type: 'warning',
                isLoading: false,
                autoClose: 3000
            });

            const message = `Purchase Order: ${purchaseOrder.po_number}\n\nItems:\n${poItems.map(item => `- ${item.product_name} x${item.quantity_ordered}`).join('\n')}\n\nPlease confirm availability.`;
            openWhatsApp(phone, message);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircle color="success" />
                        <Typography variant="h6">Purchase Order Created!</Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* Professional Receipt Card */}
                <Paper
                    id="po-receipt-content"
                    elevation={3}
                    sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.300' }}
                >
                    {/* Header */}
                    <Box textAlign="center" mb={2}>
                        <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
                            {settings?.store_name || 'Medical Store'}
                        </Typography>
                        {settings?.address && (
                            <Typography variant="body2" color="text.secondary">
                                {settings.address}
                            </Typography>
                        )}
                        {settings?.phone && (
                            <Typography variant="body2" color="text.secondary">
                                Phone: {settings.phone}
                            </Typography>
                        )}
                        {settings?.owner_name && (
                            <Typography variant="body2" color="text.secondary">
                                Owner: {settings.owner_name}
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'primary.main', borderWidth: 1 }} />

                    {/* PO Title */}
                    <Box textAlign="center" my={2}>
                        <Typography variant="h6" fontWeight={700} color="text.primary">
                            PURCHASE ORDER
                        </Typography>
                        <Typography variant="h4" fontWeight={700} color="primary" mt={1}>
                            {purchaseOrder.po_number}
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Details Table */}
                    <Table size="small">
                        <TableBody>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, border: 'none', py: 0.5 }}>Date:</TableCell>
                                <TableCell sx={{ border: 'none', py: 0.5 }}>
                                    {new Date(purchaseOrder.order_date).toLocaleDateString()}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, border: 'none', py: 0.5 }}>Supplier:</TableCell>
                                <TableCell sx={{ border: 'none', py: 0.5 }}>{supplier?.name}</TableCell>
                            </TableRow>
                            {supplier?.phone && (
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600, border: 'none', py: 0.5 }}>Supplier Phone:</TableCell>
                                    <TableCell sx={{ border: 'none', py: 0.5 }}>{supplier.phone}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <Divider sx={{ my: 2 }} />

                    {/* Items with Headers */}
                    <Box mb={2}>
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                            Items Ordered:
                        </Typography>
                        <TableContainer sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                                        <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Quantity (Boxes)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {poItems.map((item, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell>{item.product_name}</TableCell>
                                            <TableCell align="right">
                                                <strong>{item.quantity_ordered}</strong>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>

                    {/* Notes */}
                    {purchaseOrder.notes && (
                        <Box mb={2}>
                            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                                Notes:
                            </Typography>
                            <Box sx={{ bgcolor: 'info.lighter', p: 1.5, borderRadius: 1, border: '1px dashed', borderColor: 'info.main' }}>
                                <Typography variant="body2">{purchaseOrder.notes}</Typography>
                            </Box>
                        </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Signature Area */}
                    <Box mt={3}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            Digital Signature:
                        </Typography>
                        <Box
                            sx={{
                                border: '2px dashed',
                                borderColor: 'grey.400',
                                borderRadius: 1,
                                p: 2,
                                textAlign: 'center',
                                bgcolor: 'grey.100'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                Authorized by: {settings?.owner_name || 'Store Owner'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date().toLocaleString()}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Footer */}
                    {settings?.footer_text && (
                        <Box mt={2} textAlign="center">
                            <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                {settings.footer_text}
                            </Typography>
                        </Box>
                    )}

                    {/* Branding */}
                    <Box mt={2} textAlign="center" pt={2} borderTop="1px dashed #ccc">
                        <Typography variant="caption" color="text.secondary" fontStyle="italic">
                            Receipt designed and generated by <strong>MedixFlow</strong>
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                            Contact: +923089020131
                        </Typography>
                    </Box>
                </Paper>
            </DialogContent>

            <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1, bgcolor: 'grey.50' }}>
                <Box display="flex" gap={1} width="100%" flexWrap="wrap" justifyContent="center">
                    <Button
                        variant="contained"
                        startIcon={<WhatsApp />}
                        onClick={handleWhatsApp}
                        fullWidth={isMobile}
                        sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1fb855' } }}
                    >
                        Send via WhatsApp
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleDownloadPDF}
                        fullWidth={isMobile}
                    >
                        Download PDF
                    </Button>
                </Box>
                <Box display="flex" gap={1} width="100%" flexWrap="wrap" justifyContent="center">
                    <Button
                        variant="outlined"
                        startIcon={<Print />}
                        onClick={handlePrint}
                        fullWidth={isMobile}
                    >
                        Print
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Share />}
                        onClick={handleShare}
                        fullWidth={isMobile}
                    >
                        Share
                    </Button>
                </Box>
                <Button onClick={onClose} fullWidth variant="text" sx={{ mt: 1 }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
