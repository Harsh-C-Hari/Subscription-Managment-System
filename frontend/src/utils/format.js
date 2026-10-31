/**
 * Format helpers for Brightloop subscription management
 * Ensures financial strings are formatted safely without JS floating-point inaccuracies
 */

/**
 * Format string money value (e.g. "999.00" -> "$999.00")
 * @param {string|number} value - The 2-decimal money string from API
 * @param {string} currencySymbol - Optional currency symbol, default '$'
 * @returns {string} Formatted money display
 */
export function formatMoney(value, currencySymbol = '$') {
  if (value === null || value === undefined || value === '') {
    return `${currencySymbol}0.00`;
  }

  const str = String(value).trim();
  // Split on decimal point if present
  const parts = str.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = (parts[1] || '00').padEnd(2, '0').slice(0, 2);

  // Add commas to thousands in integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currencySymbol}${formattedInteger}.${decimalPart}`;
}

/**
 * Format date string into human readable industrial format (e.g. "2026-10-31" -> "31 OCT 2026")
 * @param {string} dateStr - ISO or YYYY-MM-DD date string
 * @returns {string} Formatted date
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  } catch {
    return String(dateStr);
  }
}

/**
 * Format timestamp (e.g. "2026-10-31T09:30:00Z" -> "31 OCT 2026 09:30 UTC")
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return `${formatDate(dateStr)} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
