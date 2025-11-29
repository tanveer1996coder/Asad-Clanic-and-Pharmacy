import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './formatters';
import { formatDate, formatTime } from './dateHelpers';

export const generateReceipt = (invoice, items, settings) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 200] // Thermal printer width (80mm)
        });

        const storeName = settings?.store_name || 'Medical Store';
        const currency = settings?.currency_symbol || 'Rs';
        const pageWidth = doc.internal.pageSize.getWidth();

        // Helper to center text
        const centerText = (text, y, size = 10, bold = false) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            const textWidth = doc.getStringUnitWidth(text) * size / 2.83465;
            const x = (pageWidth - textWidth) / 2;
            doc.text(text, x, y);
        };

        let y = 10;

        // Header
        centerText(storeName, y, 14, true);
        y += 6;
        centerText('Sales Receipt', y, 10);
        y += 6;
        centerText(formatDate(invoice.created_at) + ' ' + formatTime(invoice.created_at), y, 8);
        y += 5;
        centerText(`Invoice #${invoice.id.slice(0, 8)}`, y, 8);
        y += 8;

        // Items Table
        const tableBody = items.map(item => [
            item.products?.name || 'Item',
            item.quantity.toString(),
            formatCurrency(item.price_at_sale * item.quantity, '')
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Item', 'Qty', 'Amt']],
            body: tableBody,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 35 }, // Item name
                1: { cellWidth: 10, halign: 'center' }, // Qty
                2: { cellWidth: 20, halign: 'right' }, // Amount
            },
            margin: { left: 5, right: 5 },
        });

        y = doc.lastAutoTable.finalY + 5;

        // Totals
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        const rightAlign = (text, y) => {
            const textWidth = doc.getStringUnitWidth(text) * 9 / 2.83465;
            doc.text(text, pageWidth - 5 - textWidth, y);
        };

        // Subtotal (calculated from items)
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price_at_sale), 0);

        doc.text('Subtotal:', 5, y);
        rightAlign(formatCurrency(subtotal, currency), y);
        y += 5;

        if (invoice.discount > 0) {
            doc.text('Discount:', 5, y);
            rightAlign(`-${formatCurrency(invoice.discount, currency)}`, y);
            y += 5;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Total:', 5, y);
        rightAlign(formatCurrency(invoice.total_amount, currency), y);
        y += 8;

        // Footer
        centerText('Thank you for your business!', y, 8);

        // Save
        doc.save(`Receipt-${invoice.id.slice(0, 8)}.pdf`);
        return true;
    } catch (error) {
        console.error('Receipt generation failed:', error);
        return false;
    }
};
