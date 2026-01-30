/**
 * Validation rules and constraints matching backend validation
 * These should be kept in sync with backend Joi schemas
 */

export const VALIDATION_RULES = {
    // User fields
    name: {
        min: 2,
        max: 50,
        label: 'Name',
        required: true,
    },
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        label: 'Email',
        required: true,
        hint: 'Enter a valid email address',
    },
    password: {
        min: 6,
        max: 128,
        label: 'Password',
        required: true,
        hint: 'At least 6 characters',
    },
    phone: {
        label: 'Phone Number',
        required: false,
        hint: 'Optional - for account recovery',
    },

    // Business fields
    businessName: {
        min: 2,
        max: 100,
        label: 'Business Name',
        required: true,
    },
    ownerName: {
        min: 2,
        max: 50,
        label: 'Owner Name',
        required: true,
    },
    description: {
        max: 500,
        label: 'Description',
        required: false,
        hint: 'Describe your business, services, and amenities',
    },
    website: {
        max: 200,
        label: 'Website',
        required: false,
        pattern: /^https?:\/\/.+/,
        hint: 'Must start with http:// or https://',
    },

    // Address fields
    buildingNumber: {
        max: 20,
        label: 'Building Number',
        required: false,
    },
    street: {
        max: 100,
        label: 'Street',
        required: false,
    },
    city: {
        max: 100,
        label: 'City',
        required: false,
    },
    county: {
        max: 100,
        label: 'County',
        required: false,
    },
    postcode: {
        max: 20,
        label: 'Postcode',
        required: false,
        pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
        hint: 'UK postcode format (e.g., SW1A 1AA)',
    },
    landmark: {
        max: 100,
        label: 'Landmark',
        required: false,
    },

    // Review fields
    reviewText: {
        min: 10,
        max: 1000,
        label: 'Review',
        required: true,
        hint: 'Share your experience (10-1000 characters)',
    },
    rating: {
        min: 1,
        max: 5,
        label: 'Rating',
        required: true,
    },

    // Coupon fields
    couponCode: {
        max: 50,
        label: 'Coupon Code',
        required: true,
    },
    couponDescription: {
        max: 500,
        label: 'Description',
        required: true,
    },
    discountValue: {
        min: 1,
        max: 100,
        label: 'Discount',
        required: true,
    },
};

/**
 * Get validation rule for a field
 */
export const getValidationRule = (fieldName) => {
    return VALIDATION_RULES[fieldName] || null;
};

/**
 * Validate a field value against its rule
 */
export const validateField = (fieldName, value) => {
    const rule = VALIDATION_RULES[fieldName];
    if (!rule) return null;

    // Required check
    if (rule.required && (!value || value.toString().trim() === '')) {
        return `${rule.label} is required`;
    }

    // Skip other validations if not required and empty
    if (!value || value.toString().trim() === '') {
        return null;
    }

    const strValue = value.toString().trim();

    // Min length
    if (rule.min && strValue.length < rule.min) {
        return `${rule.label} must be at least ${rule.min} characters`;
    }

    // Max length
    if (rule.max && strValue.length > rule.max) {
        return `${rule.label} must not exceed ${rule.max} characters`;
    }

    // Pattern match
    if (rule.pattern && !rule.pattern.test(strValue)) {
        return rule.hint || `${rule.label} format is invalid`;
    }

    // Range for numbers
    if (typeof value === 'number') {
        if (rule.min && value < rule.min) {
            return `${rule.label} must be at least ${rule.min}`;
        }
        if (rule.max && value > rule.max) {
            return `${rule.label} must not exceed ${rule.max}`;
        }
    }

    return null;
};

/**
 * Get character count display
 */
export const getCharacterCount = (value, maxLength) => {
    const length = value ? value.length : 0;
    return `${length}/${maxLength}`;
};

/**
 * Check if approaching character limit (90% threshold)
 */
export const isApproachingLimit = (value, maxLength) => {
    const length = value ? value.length : 0;
    return length >= maxLength * 0.9;
};

export default VALIDATION_RULES;
