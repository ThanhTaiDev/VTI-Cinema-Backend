/**
 * CSV Export Utilities
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} columns - Column definitions [{key, label}]
 * @returns {string} - CSV string with UTF-8 BOM
 */
function toCSV(data, columns) {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  
  // Header row
  const headers = columns.map(col => col.label || col.key).join(',');
  
  // Data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      if (value === null || value === undefined) return '';
      
      // Escape commas and quotes
      const stringValue = String(value).replace(/"/g, '""');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  return BOM + [headers, ...rows].join('\n');
}

/**
 * Generate filename with date
 * @param {string} prefix - Filename prefix
 * @param {Date} date - Date (default: now)
 * @returns {string} - Filename (e.g., payments_20250107.csv)
 */
function generateFilename(prefix = 'export', date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${prefix}_${year}${month}${day}.csv`;
}

module.exports = {
  toCSV,
  generateFilename,
};

