import { formatCurrency } from './formatters';
import { formatDate, formatTime } from './dateHelpers';

export const printReceipt = (invoice, items, settings) => {
    try {
        const storeName = settings?.store_name || 'Medical Store';
        const currency = settings?.currency_symbol || 'Rs';

        // Calculate subtotal
        // Calculate subtotal
        const subtotal = items.reduce((sum, item) => {
            const price = parseFloat(item.price_at_sale || item.products?.price || 0);
            const quantity = parseInt(item.quantity || 0);
            return sum + (quantity * price);
        }, 0);

        // Create receipt HTML
        const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt #${invoice.id.slice(0, 8)}</title>
    <style>
        @media print {
            @page {
                size: 80mm auto;
                margin: 5mm;
            }
            body {
                margin: 0;
                padding: 0;
            }
        }
        
        body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
            font-size: 12px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
        }
       
        
        .store-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .receipt-title {
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .date-time, .invoice-id {
            font-size: 11px;
            color: #333;
        }
        
        .items-table {
            width: 100%;
            margin: 10px 0;
            border-collapse: collapse;
        }
        
        .items-table th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 5px 2px;
            font-size: 10px;
        }
        
        .items-table td {
            padding: 5px 2px;
            font-size: 10px;
        }
        
        .item-name {
            max-width: 25mm;
            word-wrap: break-word;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .totals {
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 10px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 12px;
        }
        
        .total-row.final {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
        }
        
        .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px dashed #000;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="store-name">${storeName}</div>
        <div class="receipt-title">SALES RECEIPT</div>
        <div class="date-time">${formatDate(invoice.created_at)} ${formatTime(invoice.created_at)}</div>
        <div class="invoice-id">Invoice #${invoice.id.slice(0, 8)}</div>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>Item</th>
                <th class="text-right">Price</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => {
            const unitPrice = parseFloat(item.price_at_sale || item.products?.price || 0);
            const quantity = parseInt(item.quantity || 0);
            const lineTotal = unitPrice * quantity;

            return `
                <tr>
                    <td class="item-name">${item.products?.name || 'Item'}</td>
                    <td class="text-right">${currency} ${unitPrice.toFixed(2)}</td>
                    <td class="text-center">${quantity}</td>
                    <td class="text-right">${currency} ${lineTotal.toFixed(2)}</td>
                </tr>
                `;
        }).join('')}
        </tbody>
    </table>
    
    <div class="totals">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal, currency)}</span>
        </div>
        ${invoice.discount > 0 ? `
        <div class="total-row">
            <span>Discount:</span>
            <span>-${formatCurrency(invoice.discount, currency)}</span>
        </div>
        ` : ''}
        <div class="total-row final">
            <span>Grand Total:</span>
            <span>${formatCurrency(invoice.total_amount, currency)}</span>
        </div>
    </div>
    
    <div class="footer">
        Thank you for your business!
    </div>
    
    <script>
        // Auto-close window after printing or canceling
        window.onafterprint = function() {
            window.close();
        };
        
        // Trigger print dialog immediately
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
        `;

        // Open in new window and print
        const printWindow = window.open('', '_blank', 'width=300,height=600');
        if (printWindow) {
            printWindow.document.write(receiptHTML);
            printWindow.document.close();
            return true;
        } else {
            console.error('Could not open print window. Popup blocked?');
            return false;
        }
    } catch (error) {
        console.error('Receipt printing failed:', error);
        return false;
    }
};
