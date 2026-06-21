import { businessApi } from '../context/BusinessAuthContext';

// All API calls used by the business portal
const biz = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (credentials) => businessApi.post('/auth/login', credentials),
  getMe:  () => businessApi.get('/auth/me'),

  // ── Business info ─────────────────────────────────────────────────────────
  getMyBusiness: () => businessApi.get('/business/my/businesses'),
  getBusinessById: (id) => businessApi.get(`/business/${id}`),
  updateBusiness: (id, data) => businessApi.put(`/business/${id}`, data),
  updateBusinessImages: (id, formData) => businessApi.put(`/business/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // ── Orders ────────────────────────────────────────────────────────────────
  getBusinessOrders: (businessId, params) =>
    businessApi.get(`/orders/business/${businessId}`, { params }),
  getOrder: (orderId) => businessApi.get(`/orders/${orderId}`),
  updateOrderStatus: (orderId, status) =>
    businessApi.patch(`/orders/${orderId}/status`, { status }),
  cancelOrder: (orderId, cancelReason) =>
    businessApi.post(`/orders/${orderId}/cancel`, { cancelReason }),
  getOrderAnalytics: (businessId, timeframe) =>
    businessApi.get(`/orders/business/${businessId}/analytics`, { params: { timeframe } }),

  // ── Menu ──────────────────────────────────────────────────────────────────
  getMenuItems: (businessId) =>
    businessApi.get(`/menu-items/business/${businessId}/flat?status=all`),
  createMenuItem: (data) => 
    businessApi.post(`/menu-items`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    }),
  updateMenuItem: (id, data) => 
    businessApi.put(`/menu-items/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    }),
  deleteMenuItem: (id) => businessApi.delete(`/menu-items/${id}`),
  toggleMenuItemAvailability: (id) => businessApi.patch(`/menu-items/${id}/toggle`),

  // ── Customizations ────────────────────────────────────────────────────────
  getCustomizationGroups: (menuItemId) => businessApi.get(`/customizations/groups/menu-item/${menuItemId}`),
  createCustomizationGroup: (data) => businessApi.post('/customizations/groups', data),
  updateCustomizationGroup: (id, data) => businessApi.put(`/customizations/groups/${id}`, data),
  deleteCustomizationGroup: (id) => businessApi.delete(`/customizations/groups/${id}`),
  reorderCustomizationGroups: (data) => businessApi.put('/customizations/groups/reorder', data),
  cloneCustomizationGroup: (id, data) => businessApi.post(`/customizations/groups/${id}/clone`, data),
  
  getCustomizationOptions: (groupId) => businessApi.get(`/customizations/options/${groupId}`),
  createCustomizationOption: (data) => businessApi.post('/customizations/options', data),
  updateCustomizationOption: (id, data) => businessApi.put(`/customizations/options/${id}`, data),
  deleteCustomizationOption: (id) => businessApi.delete(`/customizations/options/${id}`),
  reorderCustomizationOptions: (data) => businessApi.put('/customizations/options/reorder', data),

  // ── Reviews ───────────────────────────────────────────────────────────────
  getBusinessReviews: (businessId, params) =>
    businessApi.get(`/reviews/business/${businessId}`, { params }),

  // ── Coupons ───────────────────────────────────────────────────────────────
  getBusinessCoupons: (businessId) =>
    businessApi.get(`/business/${businessId}/coupons`),
  createCoupon: (businessId, data) =>
    businessApi.post(`/business/${businessId}/coupons`, data),
  toggleCouponStatus: (couponId, isActive) =>
    businessApi.put(`/coupons/${couponId}/toggle`, { isActive }),
  deleteCoupon: (couponId) =>
    businessApi.delete(`/coupons/${couponId}`),

  // ── Tax Rules ─────────────────────────────────────────────────────────────
  getTaxRules: (businessId) =>
    businessApi.get(`/billing-rules/tax/business/${businessId}`),
  createTaxRule: (businessId, data) =>
    businessApi.post(`/billing-rules/tax`, { ...data, businessId }),
  updateTaxRule: (businessId, ruleId, data) =>
    businessApi.put(`/billing-rules/tax/${ruleId}`, data),
  deleteTaxRule: (businessId, ruleId) =>
    businessApi.delete(`/billing-rules/tax/${ruleId}`),

  // ── Charge Rules ──────────────────────────────────────────────────────────
  getChargeRules: (businessId) =>
    businessApi.get(`/billing-rules/charge/business/${businessId}`),
  createChargeRule: (businessId, data) =>
    businessApi.post(`/billing-rules/charge`, { ...data, businessId }),
  updateChargeRule: (businessId, ruleId, data) =>
    businessApi.put(`/billing-rules/charge/${ruleId}`, data),
  deleteChargeRule: (businessId, ruleId) =>
    businessApi.delete(`/billing-rules/charge/${ruleId}`),

  // ── Updates / Posts ───────────────────────────────────────────────────────
  getBusinessUpdates: (businessId) =>
    businessApi.get(`/business/${businessId}/updates`),
  createUpdate: (businessId, data) =>
    businessApi.post(`/business/${businessId}/updates`, data),
  deleteUpdate: (businessId, updateId) =>
    businessApi.delete(`/business/${businessId}/updates/${updateId}`),
};

export default biz;
