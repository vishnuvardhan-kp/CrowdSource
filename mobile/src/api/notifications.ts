import { apiClient } from './client';
import { NotificationItem } from '../types';

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export const notificationsApi = {
  async getNotifications(limit = 50): Promise<NotificationsResponse> {
    return apiClient<NotificationsResponse>(`/notifications?limit=${limit}`);
  },

  async markAsRead(id: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>('/notifications/mark-all-read', {
      method: 'PATCH',
    });
  },
};
