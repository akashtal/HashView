// ─── Notification Types ──────────────────────────────────────────────────────
// Mirrors: backend/models/Notification.model.js

export type NotificationType =
  | 'general'
  | 'coupon'
  | 'review'
  | 'business_verification'
  | 'kyc'
  | 'system'
  | 'admin_broadcast'
  | 'promotion'
  | 'announcement'
  | 'business_update';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
  _id: string;
  title: string;
  message: string;
  sentTo: string;
  sentToModel?: 'User' | 'BusinessOwner';
  sentBy?: string | null;
  type: NotificationType;
  recipientType?: 'all_users' | 'all_businesses' | 'specific_user' | 'specific_business' | 'individual';
  data?: Record<string, unknown>;
  status: NotificationStatus;
  readAt?: string;
  priority?: NotificationPriority;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}
