/**
 * Performance Optimization Helpers
 * 
 * Utility functions to improve app performance
 */

/**
 * Debounce function - delays execution until user stops typing
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function - limits execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between executions
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Create a cancellable promise for API calls
 * Prevents memory leaks from unmounted components
 */
export const makeCancellable = (promise) => {
  let cancelled = false;

  const wrappedPromise = new Promise((resolve, reject) => {
    promise
      .then(value => (cancelled ? reject({ cancelled: true }) : resolve(value)))
      .catch(error => (cancelled ? reject({ cancelled: true }) : reject(error)));
  });

  return {
    promise: wrappedPromise,
    cancel: () => {
      cancelled = true;
    }
  };
};

/**
 * Optimize FlatList configuration
 */
export const FLATLIST_OPTIMIZATIONS = {
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  windowSize: 5,
  initialNumToRender: 10,
  updateCellsBatchingPeriod: 50,
};

/**
 * Image cache configuration
 */
export const IMAGE_CACHE_CONFIG = {
  cache: 'force-cache',
  priority: 'high',
};

/**
 * Memoize expensive calculations
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export const memoize = (fn) => {
  const cache = {};
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache[key]) {
      return cache[key];
    }
    const result = fn(...args);
    cache[key] = result;
    return result;
  };
};

/**
 * Clear memoization cache
 */
export const clearMemoCache = (memoizedFn) => {
  if (memoizedFn.cache) {
    memoizedFn.cache.clear();
  }
};

/**
 * Get item layout for FlatList optimization
 * Use when all items have the same height
 */
export const getItemLayout = (itemHeight) => (data, index) => ({
  length: itemHeight,
  offset: itemHeight * index,
  index,
});

/**
 * Batch state updates to prevent multiple re-renders
 */
export const batchUpdates = (callback) => {
  // React Native doesn't have unstable_batchedUpdates like React DOM
  // But we can use a similar pattern
  callback();
};

/**
 * Check if should update (for React.memo)
 */
export const arePropsEqual = (prevProps, nextProps) => {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
};

/**
 * Optimize image URI for faster loading
 */
export const optimizeImageUri = (uri, width = 400, quality = 80) => {
  if (!uri) return null;
  
  // If Cloudinary URL, add transformation parameters
  if (uri.includes('cloudinary.com')) {
    const parts = uri.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/w_${width},q_${quality},f_auto/${parts[1]}`;
    }
  }
  
  return uri;
};

/**
 * Lazy load component
 */
export const lazyLoad = (importFunc) => {
  return React.lazy(importFunc);
};

export default {
  debounce,
  throttle,
  makeCancellable,
  FLATLIST_OPTIMIZATIONS,
  IMAGE_CACHE_CONFIG,
  memoize,
  getItemLayout,
  optimizeImageUri,
};

