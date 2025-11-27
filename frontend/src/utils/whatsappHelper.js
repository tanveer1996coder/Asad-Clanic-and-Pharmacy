/**
 * Generates a WhatsApp URL for ordering a product
 * @param {string} phone - Supplier's phone number
 * @param {string} productName - Name of the product
 * @param {number} currentStock - Current stock level
 * @param {string} storeName - Name of the medical store (optional)
 * @returns {string|null} - WhatsApp URL or null if no phone provided
 */
export const generateWhatsAppLink = (phone, productName, currentStock, storeName = 'Medical Store') => {
    if (!phone) return null;

    // Remove non-numeric characters from phone
    const cleanPhone = phone.replace(/\D/g, '');

    const message = `Hi, this is ${storeName}. We need to order "${productName}". Current stock is ${currentStock}. Please let us know availability and price.`;

    const encodedMessage = encodeURIComponent(message);

    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

/**
 * Opens WhatsApp in a new tab
 * @param {string} phone - Supplier's phone number
 * @param {string} productName - Name of the product
 * @param {number} currentStock - Current stock level
 * @param {string} storeName - Name of the medical store
 */
export const openWhatsAppOrder = (phone, productName, currentStock, storeName) => {
    const url = generateWhatsAppLink(phone, productName, currentStock, storeName);
    if (url) {
        window.open(url, '_blank');
    } else {
        alert('Supplier phone number is missing!');
    }
};
