import { format, formatDistance, parseISO } from 'date-fns';

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {string} formatStr - Format string (default: 'MMM dd, yyyy')
 * @returns {string} Formatted date
 */
export function formatDate(date, formatStr = 'MMM dd, yyyy') {
    if (!date) return '—';
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return format(dateObj, formatStr);
    } catch (error) {
        console.error('Error formatting date:', error);
        return String(date);
    }
}

/**
 * Format date to time string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
export function formatTime(date) {
    if (!date) return '—';
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return format(dateObj, 'h:mm a');
    } catch (error) {
        console.error('Error formatting time:', error);
        return String(date);
    }
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
    if (!date) return '—';
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return formatDistance(dateObj, new Date(), { addSuffix: true });
    } catch (error) {
        console.error('Error formatting relative time:', error);
        return String(date);
    }
}

/**
 * Calculate days until expiry
 * @param {string|Date} expiryDate - Expiry date
 * @returns {number} Days until expiry (negative if expired)
 */
export function daysUntilExpiry(expiryDate) {
    if (!expiryDate) return null;
    try {
        const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    } catch (error) {
        console.error('Error calculating days until expiry:', error);
        return null;
    }
}

/**
 * Get expiry status (expired, urgent, warning, ok)
 * @param {string|Date} expiryDate - Expiry date
 * @param {number} urgentThreshold - Days threshold for urgent (default: 7)
 * @param {number} warningThreshold - Days threshold for warning (default: 15)
 * @returns {object} Status object with type and color
 */
export function getExpiryStatus(expiryDate, urgentThreshold = 7, warningThreshold = 15) {
    const days = daysUntilExpiry(expiryDate);

    if (days === null) {
        return { type: 'unknown', color: 'default', label: 'No expiry date' };
    }

    if (days < 0) {
        return { type: 'expired', color: 'error', label: 'Expired', days };
    }

    if (days <= urgentThreshold) {
        return { type: 'urgent', color: 'error', label: `${days} days left`, days };
    }

    if (days <= warningThreshold) {
        return { type: 'warning', color: 'warning', label: `${days} days left`, days };
    }

    return { type: 'ok', color: 'success', label: 'Good', days };
}

/**
 * Get stock status (out, low, ok)
 * @param {number} stock - Current stock
 * @param {number} minLevel - Minimum stock level
 * @returns {object} Status object with type and color
 */
export function getStockStatus(stock, minLevel = 10) {
    if (stock === 0) {
        return { type: 'out', color: 'error', label: 'Out of stock' };
    }

    if (stock <= minLevel) {
        return { type: 'low', color: 'warning', label: 'Low stock' };
    }

    return { type: 'ok', color: 'success', label: 'In stock' };
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
export function getTodayDate() {
    return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get date N days ago in YYYY-MM-DD format
 * @param {number} days - Number of days ago
 * @returns {string} Date string
 */
export function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return format(date, 'yyyy-MM-dd');
}
