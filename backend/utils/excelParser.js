const xlsx = require('xlsx');

class ExcelParser {
    /**
     * Parse Excel buffer to JSON
     * @param {Buffer} buffer - Excel file buffer
     * @returns {Array} - Array of objects representing rows
     */
    static parseBuffer(buffer) {
        try {
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0]; // Read first sheet
            const worksheet = workbook.Sheets[sheetName];
            return xlsx.utils.sheet_to_json(worksheet);
        } catch (error) {
            throw new Error('Failed to parse Excel file: ' + error.message);
        }
    }

    /**
     * Validate required fields in parsed data
     * @param {Array} data - Parsed Excel data
     * @param {Array} requiredFields - List of required field names
     * @returns {Object} - { validRows, invalidRows }
     */
    static validateRows(data, requiredFields) {
        const validRows = [];
        const invalidRows = [];

        data.forEach((row, index) => {
            const missingFields = requiredFields.filter(field => !row[field]);

            if (missingFields.length > 0) {
                invalidRows.push({
                    row: index + 2, // Excel rows are 1-based, +1 for header
                    data: row,
                    errors: [`Missing required fields: ${missingFields.join(', ')}`]
                });
            } else {
                validRows.push({
                    row: index + 2,
                    data: row
                });
            }
        });

        return { validRows, invalidRows };
    }
}

module.exports = ExcelParser;
