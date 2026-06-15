import Toast from 'react-native-toast-message';

/**
 * ToastService - A central utility for displaying toast notifications.
 * Provides consistent styling and configuration for success, error, and info messages.
 */
const ToastService = {
  /**
   * Show a success toast
   * @param {string} message - The main message to display
   * @param {string} [subMessage] - Optional secondary message
   */
  showSuccess: (message, subMessage = '') => {
    Toast.show({
      type: 'success',
      text1: message,
      text2: subMessage,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  },

  /**
   * Show an error toast
   * @param {string} message - The main error message
   * @param {string} [subMessage] - Optional secondary message
   */
  showError: (message, subMessage = '') => {
    Toast.show({
      type: 'error',
      text1: message,
      text2: subMessage,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  },

  /**
   * Show an info toast
   * @param {string} message - The main info message
   * @param {string} [subMessage] - Optional secondary message
   */
  showInfo: (message, subMessage = '') => {
    Toast.show({
      type: 'info',
      text1: message,
      text2: subMessage,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  },
};

export default ToastService;
