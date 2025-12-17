import { formatCurrency } from './formatters';

export const printPO = (po, items, settings) => {
    try {
        const storeName = settings?.store_name || 'Medical Store';
        const currency = settings?.currency_symbol || 'Rs';
        const poNumber = po?.po_number || 'DRAFT';
        const orderDate = po?.order_date ? new Date(po.order_date).toLocaleDateString() : new Date().toLocaleDateString();
        const supplierName = po?.suppliers?.name || 'N/A';
        const supplierPhone = po?.suppliers?.phone || '';

        // Create receipt HTML
        const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PO #${poNumber}</title>
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
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 2px;
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
            vertical-align: top;
        }
        
        .item-name {
            max-width: 40mm;
            word-wrap: break-word;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px dashed #000;
            font-size: 10px;
            color: #555;
        }
        
        .branding {
            margin-top: 10px;
            font-size: 9px;
            color: #888;
            font-style: italic;
        }

        .notes {
            margin-top: 10px;
            border-top: 1px dashed #000;
            padding-top: 5px;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="store-name">${storeName}</div>
        ${settings?.address ? `<div style="font-size: 10px;">${settings.address}</div>` : ''}
        ${settings?.phone ? `<div style="font-size: 10px;">Phone: ${settings.phone}</div>` : ''}
        <div class="receipt-title" style="margin-top: 10px;">PURCHASE ORDER</div>
    </div>

    <div class="info-row">
        <span>PO #:</span>
        <span>${poNumber}</span>
    </div>
    <div class="info-row">
        <span>Date:</span>
        <span>${orderDate}</span>
    </div>
    <div class="info-row">
        <span>Supplier:</span>
        <span>${supplierName}</span>
    </div>
    ${supplierPhone ? `
    <div class="info-row">
        <span>Supplier Ph:</span>
        <span>${supplierPhone}</span>
    </div>` : ''}
    
    <table class="items-table">
        <thead>
            <tr>
                <th>Item</th>
                <th class="text-right">Qty (Boxes)</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => {
            // Handle both data formats safely
            let productName = 'N/A';
            if (item.product_name) productName = item.product_name;
            else if (item.products?.name) productName = item.products.name;

            const quantity = item.quantity_ordered || 0;

            return `
                <tr>
                    <td class="item-name">${productName}</td>
                    <td class="text-right">${quantity}</td>
                </tr>
                `;
        }).join('')}
        </tbody>
    </table>
    
    ${po.notes ? `
    <div class="notes">
        <strong>Notes:</strong><br/>
        ${po.notes}
    </div>
    ` : ''}
    
    <div class="footer">
        ${settings?.footer_text || 'Thank you for your service!'}
        <div class="branding">
            
        </div>
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
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(receiptHTML);
            printWindow.document.close();
            return true;
        } else {
            console.error('Could not open print window. Popup blocked?');
            return false;
        }
    } catch (error) {
        console.error('PO printing failed:', error);
        return false;
    }
};
