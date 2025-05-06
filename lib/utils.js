/* global Intl */
// lib/utils.js
/**
 * Formats a number (assumed to be in the smallest currency unit, e.g., cents) into a currency string.
 * @param {number | null | undefined} value - The amount in the smallest currency unit (e.g., cents).
 * @param {string} currencyCode - The 3-letter ISO currency code (default: 'USD').
 * @returns {string} - The formatted currency string (e.g., "$10.50") or 'N/A'.
 */
export function formatCurrency(value, currencyCode = 'USD') {
    // Handle null, undefined, or non-numeric input gracefully
    if (value == null || typeof value !== 'number' || isNaN(value)) {
        // console.warn("formatCurrency received invalid value:", value);
        return 'N/A';
    }

    // Assume value is in cents/smallest unit. Convert to dollars/main unit.
    const amountInMainUnit = value / 100;

    try {
        return new Intl.NumberFormat(undefined, { // Use browser's default locale
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amountInMainUnit);
    } catch (e) {
        // Fallback for invalid currency codes or other Intl errors
        console.error(`Currency formatting error for ${currencyCode}:`, e);
        // Basic fallback (might not be ideal for all currencies)
        const symbol = currencyCode === 'USD' ? '$' : (currencyCode === 'EUR' ? '€' : ''); // Add more symbols as needed
        return `${symbol}${amountInMainUnit.toFixed(2)}`;
    }
}

// Add any other utility functions you need here