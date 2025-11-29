import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePOPDF = async (po, poItems, settings) => {
    try {
        const doc = new jsPDF();

        // Default values to prevent crashes
        const storeName = settings?.store_name || 'Medical Store';
        const poNumber = po?.po_number || 'DRAFT';
        const orderDate = po?.order_date ? new Date(po.order_date).toLocaleDateString() : new Date().toLocaleDateString();
        const supplierName = po?.suppliers?.name || 'N/A';
        const supplierPhone = po?.suppliers?.phone || '';
        const items = Array.isArray(poItems) ? poItems : [];

        // Header - Store Name
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text(storeName, 105, 20, { align: 'center' });

        // Store details
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        let yPos = 28;

        if (settings?.address) {
            doc.text(settings.address, 105, yPos, { align: 'center' });
            yPos += 5;
        }
        if (settings?.phone) {
            doc.text(`Phone: ${settings.phone}`, 105, yPos, { align: 'center' });
            yPos += 5;
        }
        if (settings?.owner_name) {
            doc.text(`Owner: ${settings.owner_name}`, 105, yPos, { align: 'center' });
            yPos += 5;
        }

        // Divider line
        doc.setLineWidth(0.5);
        doc.line(14, yPos + 3, 196, yPos + 3);

        // Title
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('PURCHASE ORDER', 105, yPos + 12, { align: 'center' });

        // PO Info Box
        const infoY = yPos + 22;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('PO Details:', 14, infoY);

        doc.setFont(undefined, 'normal');
        doc.text(`PO Number: ${poNumber}`, 14, infoY + 7);
        doc.text(`Order Date: ${orderDate}`, 14, infoY + 14);

        // Supplier Info (right side)
        doc.setFont(undefined, 'bold');
        doc.text('Supplier:', 120, infoY);
        doc.setFont(undefined, 'normal');

        doc.text(supplierName, 120, infoY + 7);

        if (supplierPhone) {
            doc.text(`Phone: ${supplierPhone}`, 120, infoY + 14);
        }

        // Items Table
        const tableColumn = ["#", "Product", "Quantity (Boxes)"];
        const tableRows = items.map((item, index) => {
            // Handle both data formats safely
            let productName = 'N/A';
            if (item.product_name) productName = item.product_name;
            else if (item.products?.name) productName = item.products.name;

            const quantity = item.quantity_ordered || 0;

            return [
                (index + 1).toString(),
                productName,
                quantity.toString()
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: infoY + 25,
            theme: 'striped',
            headStyles: {
                fillColor: [41, 128, 185],
                fontStyle: 'bold',
                fontSize: 11
            },
            styles: {
                fontSize: 10
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 125 },
                2: { cellWidth: 40, halign: 'center' }
            }
        });

        // Notes
        let finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || (infoY + 30) + 10;
        if (po?.notes) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Notes:', 14, finalY);
            doc.setFont(undefined, 'normal');
            const splitText = doc.splitTextToSize(po.notes, 180);
            doc.text(splitText, 14, finalY + 6);
            finalY += 6 + (splitText.length * 5);
        }

        // Digital Signature Area
        finalY += 15;
        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        // Signature boxes
        doc.text('Prepared By:', 14, finalY);
        doc.line(14, finalY + 15, 80, finalY + 15); // Line for signature
        doc.setFontSize(9);
        doc.text('Signature & Date', 30, finalY + 20);

        doc.setFontSize(10);
        doc.text('Approved By:', 120, finalY);
        doc.line(120, finalY + 15, 186, finalY + 15); // Line for signature
        doc.setFontSize(9);
        doc.text('Signature & Date', 135, finalY + 20);

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(100, 100, 100);

        const footerY = pageHeight - 20;
        if (settings?.footer_text) {
            doc.text(settings.footer_text, 105, footerY, { align: 'center' });
        } else {
            doc.text('Thank you for your service!', 105, footerY, { align: 'center' });
        }

        // Branding footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Receipt designed and generated by MedixFlow | +923089020131', 105, footerY + 6, { align: 'center' });

        // Page number
        doc.setFontSize(8);
        doc.text(`Page 1`, 105, footerY + 10, { align: 'center' });

        return doc.output('blob');
    } catch (error) {
        console.error('PDF Generation Error:', error);
        // Fallback: return a simple PDF with error message so app doesn't crash
        const doc = new jsPDF();
        doc.text('Error generating PDF receipt.', 10, 10);
        doc.text(error.message, 10, 20);
        return doc.output('blob');
    }
};
