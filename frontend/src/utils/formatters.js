/**
 * Format currency value
 * @param {number} value - Value to format
 * @param {string} symbol - Currency symbol (default: 'PKR')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, symbol = 'PKR') {
    if (value === null || value === undefined || isNaN(value)) {
        return `${symbol} 0.00`;
    }

    const num = Number(value);
    return `${symbol} ${num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Format number with thousand separators
 * @param {number} value - Value to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }

    return Number(value).toLocaleString('en-US');
}

/**
 * Format percentage
 * @param {number} value - Value to format (0-100)
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0%';
    }

    return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export function capitalizeWords(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
    if (!phone) return '';
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Format as: 0300-1234567
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
        return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }

    return phone;
}

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 letters)
 */
export function getInitials(name) {
    if (!name) return '?';

    const parts = name.trim().split(' ');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Calculate profit margin percentage
 * @param {number} revenue - Total revenue
 * @param {number} cost - Total cost
 * @returns {number} Profit margin percentage
 */
export function calculateProfitMargin(revenue, cost) {
    if (!revenue || revenue === 0) return 0;
    const profit = revenue - (cost || 0);
    return (profit / revenue) * 100;
}

/**
 * Generate random color for charts
 * @param {number} index - Index for consistent colors
 * @returns {string} Hex color code
 */
export function getChartColor(index) {
    const colors = [
        '#6366f1', // Indigo
        '#ec4899', // Pink
        '#10b981', // Green
        '#f59e0b', // Amber
        '#3b82f6', // Blue
        '#8b5cf6', // Purple
        '#ef4444', // Red
        '#14b8a6', // Teal
        '#f97316', // Orange
        '#06b6d4', // Cyan
    ];

    return colors[index % colors.length];
}
