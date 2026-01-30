import { showMessage } from 'react-native-flash-message';

/**
 * Parse backend validation errors from various error formats
 * @param {Object|string} error - Error object from API or Redux thunk
 * @returns {Object} { message: string, fieldErrors: Object, allErrors: Array }
 */
export const parseBackendErrors = (error) => {
    let message = 'An error occurred. Please try again.';
    let fieldErrors = {};
    let allErrors = [];

    try {
        // Handle string errors
        if (typeof error === 'string') {
            return { message: error, fieldErrors: {}, allErrors: [error] };
        }

        // Handle Redux thunk rejection with nested error object
        if (error?.message) {
            message = error.message;

            // Extract field-specific errors from errors array
            if (Array.isArray(error.errors) && error.errors.length > 0) {
                allErrors = error.errors;

                // Parse Joi-style validation errors
                error.errors.forEach(err => {
                    // Format: "fieldName: error message" or just "error message"
                    // Allow keys with dots (e.g. address.street)
                    const match = err.match(/^([\w.]+):\s*(.+)$/);
                    if (match) {
                        const [, fieldName, errorMsg] = match;
                        // For nested keys like 'address.street', map to just 'street' if that's what frontend uses
                        // or keep as is. Here we'll map leaf node for simple forms
                        const simpleKey = fieldName.includes('.') ? fieldName.split('.').pop() : fieldName;

                        fieldErrors[simpleKey] = errorMsg.replace(/^".*?"\s*/, ''); // Remove quotes from message
                        // Also store full key just in case
                        fieldErrors[fieldName] = fieldErrors[simpleKey];
                    } else {
                        // Generic error without field
                        allErrors.push(err);
                    }
                });
            }
        }

        // Handle axios-style error response
        if (error?.response?.data) {
            const data = error.response.data;
            message = data.message || message;

            if (Array.isArray(data.errors)) {
                allErrors = data.errors;
                data.errors.forEach(err => {
                    const match = err.match(/^([\w.]+):\s*(.+)$/);
                    if (match) {
                        const [, fieldName, errorMsg] = match;
                        const simpleKey = fieldName.includes('.') ? fieldName.split('.').pop() : fieldName;
                        fieldErrors[simpleKey] = errorMsg.replace(/^".*?"\s*/, '');
                        fieldErrors[fieldName] = fieldErrors[simpleKey];
                    }
                });
            }
        }

        // Handle network errors
        if (error?.message === 'Network Error' || error?.code === 'ECONNABORTED') {
            message = 'Network connection failed. Please check your internet and try again.';
        }

    } catch (e) {
        console.error('Error parsing backend errors:', e);
    }

    return { message, fieldErrors, allErrors };
};

/**
 * Show error message using react-native-flash-message
 * @param {Object|string} error - Error object or string
 * @param {Object} options - Additional options for flash message
 */
export const showErrorMessage = (error, options = {}) => {
    const { message, allErrors } = parseBackendErrors(error);

    // Combine main message with specific errors
    let description = '';
    if (allErrors.length > 0 && allErrors.length <= 3) {
        description = allErrors.join('\n');
    } else if (allErrors.length > 3) {
        description = `${allErrors.slice(0, 2).join('\n')}\n+${allErrors.length - 2} more issues`;
    }

    showMessage({
        message: options.title || 'Error',
        description: description || message,
        type: 'danger',
        icon: 'danger',
        duration: options.duration || 4000,
        floating: true,
        ...options,
    });
};

/**
 * Show success message
 */
export const showSuccessMessage = (message, description = '', options = {}) => {
    showMessage({
        message: message || 'Success',
        description,
        type: 'success',
        icon: 'success',
        duration: options.duration || 3000,
        floating: true,
        ...options,
    });
};

/**
 * Show warning message
 */
export const showWarningMessage = (message, description = '', options = {}) => {
    showMessage({
        message: message || 'Warning',
        description,
        type: 'warning',
        icon: 'warning',
        duration: options.duration || 3500,
        floating: true,
        ...options,
    });
};

/**
 * Show info message
 */
export const showInfoMessage = (message, description = '', options = {}) => {
    showMessage({
        message: message || 'Info',
        description,
        type: 'info',
        icon: 'info',
        duration: options.duration || 3000,
        floating: true,
        ...options,
    });
};

export default {
    parseBackendErrors,
    showErrorMessage,
    showSuccessMessage,
    showWarningMessage,
    showInfoMessage,
};
