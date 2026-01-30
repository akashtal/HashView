import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import COLORS from '../../config/colors';
import { getValidationRule, getCharacterCount, isApproachingLimit } from '../../constants/validationRules';

/**
 * Validated text input with character counter and error display
 */
const ValidatedTextInput = ({
    label,
    fieldName,
    value,
    onChangeText,
    error,
    hint,
    maxLength,
    showCounter = false,
    required = false,
    icon,
    multiline = false,
    numberOfLines = 1,
    ...textInputProps
}) => {
    // Get validation rule if fieldName provided
    const rule = fieldName ? getValidationRule(fieldName) : null;
    const displayLabel = label || rule?.label || fieldName;
    const displayHint = hint || rule?.hint;
    const displayMaxLength = maxLength || rule?.max;
    const isRequired = required || rule?.required;

    // Character count styling
    const approaching = displayMaxLength && isApproachingLimit(value, displayMaxLength);
    const atLimit = value && displayMaxLength && value.length >= displayMaxLength;

    return (
        <View style={styles.container}>
            {/* Label */}
            {displayLabel && (
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>
                        {displayLabel}
                        {isRequired && <Text style={styles.required}> *</Text>}
                    </Text>
                    {showCounter && displayMaxLength && (
                        <Text style={[
                            styles.counter,
                            approaching && styles.counterWarning,
                            atLimit && styles.counterDanger
                        ]}>
                            {getCharacterCount(value, displayMaxLength)}
                        </Text>
                    )}
                </View>
            )}

            {/* Hint */}
            {displayHint && !error && (
                <Text style={styles.hint}>{displayHint}</Text>
            )}

            {/* Input Container */}
            <View style={[
                styles.inputContainer,
                error && styles.inputContainerError,
                multiline && styles.inputContainerMultiline
            ]}>
                {icon && (
                    <Icon
                        name={icon}
                        size={20}
                        color={error ? COLORS.error : COLORS.gray500}
                        style={styles.icon}
                    />
                )}
                <TextInput
                    style={[
                        styles.input,
                        multiline && styles.inputMultiline,
                        !icon && styles.inputNoIcon
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={textInputProps.placeholder || `Enter ${displayLabel?.toLowerCase() || 'value'}`}
                    placeholderTextColor={COLORS.gray400}
                    maxLength={displayMaxLength}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    {...textInputProps}
                />
            </View>

            {/* Error Message */}
            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={14} color={COLORS.error} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.gray900,
    },
    required: {
        color: COLORS.error,
    },
    counter: {
        fontSize: 12,
        color: COLORS.gray500,
        fontWeight: '500',
    },
    counterWarning: {
        color: COLORS.warning,
    },
    counterDanger: {
        color: COLORS.error,
    },
    hint: {
        fontSize: 12,
        color: COLORS.gray600,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.gray200,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputContainerError: {
        borderColor: COLORS.error,
        backgroundColor: '#FEF2F2',
    },
    inputContainerMultiline: {
        alignItems: 'flex-start',
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.gray900,
    },
    inputNoIcon: {
        marginLeft: 0,
    },
    inputMultiline: {
        minHeight: 80,
        paddingTop: 4,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingHorizontal: 4,
    },
    errorText: {
        fontSize: 12,
        color: COLORS.error,
        marginLeft: 6,
        flex: 1,
    },
});

export default ValidatedTextInput;
