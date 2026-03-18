/**
 * Sanitizes text for jsPDF to prevent character corruption.
 * Removes emojis and characters outside the standard PDF font range (0-255).
 * 
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string
 */
export const sanitizePdfText = (str) => {
    if (!str) return '';
    // Keeps characters in range 0-255 and some common punctuation/symbols
    // \x00-\xFF: Basic Latin and Latin-1 Supplement
    // \u20AC: Euro symbol
    // \u2013-\u2014: En/Em dashes
    // \u2018-\u2019: Smart quotes (single)
    // \u201C-\u201D: Smart quotes (double)
    // \u2022: Bullet point
    return String(str)
        .replace(/[^\x00-\xFF\u20AC\u2013\u2014\u2018\u2019\u201C\u201D\u2022]/g, '')
        .trim();
};
