import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Box,
    Typography,
    Select,
    MenuItem,
    FormControl,
    Tooltip,
    Stack,
} from '@mui/material';
import {
    Close as CloseIcon,
    WhatsApp as WhatsAppIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    Print as PrintIcon,
    Sms as SmsIcon,
    Email as EmailIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';
import ReceiptTemplate from './ReceiptTemplate';

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 200];

export default function ReceiptModal({ open, onClose, invoice, items, settings }) {
    const [zoom, setZoom] = useState(100);
    const receiptRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleZoomIn = () => {
        const currentIndex = ZOOM_LEVELS.indexOf(zoom);
        if (currentIndex < ZOOM_LEVELS.length - 1) {
            setZoom(ZOOM_LEVELS[currentIndex + 1]);
        }
    };

    const handleZoomOut = () => {
        const currentIndex = ZOOM_LEVELS.indexOf(zoom);
        if (currentIndex > 0) {
            setZoom(ZOOM_LEVELS[currentIndex - 1]);
        }
    };

    const generateImage = async () => {
        if (!receiptRef.current) return null;

        try {
            setIsGenerating(true);
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
            });
            return canvas;
        } catch (error) {
            console.error('Error generating image:', error);
            toast.error('Failed to generate receipt image');
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const handleWhatsAppShare = async () => {
        const canvas = await generateImage();
        if (!canvas) return;

        const imageDataUrl = canvas.toDataURL('image/png');
        const message = `Invoice #${invoice.id.slice(0, 8)}%0ATotal: ${settings?.currency_symbol || 'Rs.'} ${invoice.total_amount}%0ADate: ${new Date(invoice.created_at).toLocaleDateString()}%0A%0AThank you for your business!`;

        // Try native share first (mobile)
        if (navigator.share && navigator.canShare) {
            try {
                const blob = await (await fetch(imageDataUrl)).blob();
                const file = new File([blob], 'receipt.png', { type: 'image/png' });

                await navigator.share({
                    title: 'Invoice Receipt',
                    text: message.replace(/%0A/g, '\n'),
                    files: [file],
                });
                toast.success('Receipt shared successfully!');
                return;
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.log('Native share not available, falling back to WhatsApp Web');
                }
            }
        }

        // Fallback: Open WhatsApp Web
        window.open(`https://wa.me/?text=${message}`, '_blank');
        toast.info('WhatsApp opened. Please attach the downloaded receipt image manually.');

        // Auto-download the image for manual attachment
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = `receipt_${invoice.id.slice(0, 8)}.png`;
        link.click();
    };

    const handleDownloadPDF = async () => {
        const canvas = await generateImage();
        if (!canvas) return;

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const imgWidth = 190;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(`receipt_${invoice.id.slice(0, 8)}.pdf`);
        toast.success('PDF downloaded successfully!');
    };

    const handleDownloadImage = async () => {
        const canvas = await generateImage();
        if (!canvas) return;

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `receipt_${invoice.id.slice(0, 8)}.png`;
        link.click();
        toast.success('Image downloaded successfully!');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSMS = () => {
        const message = `Invoice #${invoice.id.slice(0, 8)}\nTotal: ${settings?.currency_symbol || 'Rs.'} ${invoice.total_amount}\nDate: ${new Date(invoice.created_at).toLocaleDateString()}\n\nThank you!`;
        window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
    };

    const handleEmail = async () => {
        const canvas = await generateImage();
        if (!canvas) return;

        const imageDataUrl = canvas.toDataURL('image/png');
        const subject = `Invoice Receipt - ${invoice.id.slice(0, 8)}`;
        const body = `Please find attached the receipt for Invoice #${invoice.id.slice(0, 8)}\n\nTotal Amount: ${settings?.currency_symbol || 'Rs.'} ${invoice.total_amount}\nDate: ${new Date(invoice.created_at).toLocaleDateString()}\n\nThank you for your business!`;

        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');

        // Auto-download for manual attachment
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = `receipt_${invoice.id.slice(0, 8)}.png`;
        link.click();

        toast.info('Email client opened. Please attach the downloaded image.');
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    minHeight: '80vh',
                    maxHeight: '90vh',
                },
            }}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(5px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
            }}
        >
            <DialogContent sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={600}>
                        Invoice Receipt
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Receipt Preview */}
                <Box
                    sx={{
                        overflow: 'auto',
                        maxHeight: 'calc(80vh - 200px)',
                        bgcolor: '#fff',
                        p: 2,
                        borderRadius: 1,
                        boxShadow: 2,
                    }}
                >
                    <Box
                        ref={receiptRef}
                        sx={{
                            transform: `scale(${zoom / 100})`,
                            transformOrigin: 'top center',
                            transition: 'transform 0.2s ease',
                        }}
                    >
                        <ReceiptTemplate
                            invoice={invoice}
                            items={items}
                            settings={settings}
                        />
                    </Box>
                </Box>

                {/* Zoom Controls */}
                <Box display="flex" justifyContent="center" alignItems="center" gap={2} mt={2}>
                    <Tooltip title="Zoom Out">
                        <span>
                            <IconButton
                                onClick={handleZoomOut}
                                disabled={zoom === ZOOM_LEVELS[0]}
                                size="small"
                            >
                                <ZoomOutIcon />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                            value={zoom}
                            onChange={(e) => setZoom(e.target.value)}
                        >
                            {ZOOM_LEVELS.map((level) => (
                                <MenuItem key={level} value={level}>
                                    {level}%
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Tooltip title="Zoom In">
                        <span>
                            <IconButton
                                onClick={handleZoomIn}
                                disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                                size="small"
                            >
                                <ZoomInIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5', flexWrap: 'wrap', gap: 1 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                        variant="contained"
                        startIcon={<WhatsAppIcon />}
                        onClick={handleWhatsAppShare}
                        disabled={isGenerating}
                        sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' } }}
                    >
                        WhatsApp
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<PdfIcon />}
                        onClick={handleDownloadPDF}
                        disabled={isGenerating}
                    >
                        PDF
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<ImageIcon />}
                        onClick={handleDownloadImage}
                        disabled={isGenerating}
                    >
                        Image
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                    >
                        Print
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<SmsIcon />}
                        onClick={handleSMS}
                    >
                        SMS
                    </Button>

                    <Button
                        variant="outlined"
                        startIcon={<EmailIcon />}
                        onClick={handleEmail}
                        disabled={isGenerating}
                    >
                        Email
                    </Button>
                </Stack>

                <Box flexGrow={1} />

                <Button onClick={onClose} variant="outlined">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
