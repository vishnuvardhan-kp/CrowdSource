import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { notificationsApi } from '../../src/api/notifications';
import { NotificationItem } from '../../src/types';
import { Header } from '../../src/components/common/Header';
import { EmptyState } from '../../src/components/common/EmptyState';
import { LoadingView } from '../../src/components/common/LoadingView';
import { formatRelativeTime } from '../../src/utils/formatters';
import { theme } from '../../src/constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await notificationsApi.getNotifications(50);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await notificationsApi.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }

    if (item.reference_type === 'CHALLENGE' && item.reference_id) {
      router.push(`/reports/${item.reference_id}`);
    }
  };

  if (!user && !loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header title="Notifications" />
        <View style={styles.centerContainer}>
          <EmptyState
            title="Sign In Required"
            description="Sign in to receive updates when your reports are verified or addressed by the government."
            iconName="lock-closed-outline"
            actionTitle="Sign In"
            onAction={() => router.push('/(auth)/login')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Notifications"
        subtitle={
          unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'
        }
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllRead}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {loading ? (
        <LoadingView message="Loading notifications..." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => {
            return (
              <TouchableOpacity
                style={[
                  styles.notificationCard,
                  !item.is_read && styles.notificationUnread,
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.75}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={
                      item.type === 'CHALLENGE_STATUS'
                        ? 'flag'
                        : item.type === 'PROJECT_GOVERNANCE'
                        ? 'shield-checkmark'
                        : 'notifications'
                    }
                    size={20}
                    color={!item.is_read ? theme.colors.primary : theme.colors.textMuted}
                  />
                </View>

                <View style={styles.textContainer}>
                  <View style={styles.cardHeaderRow}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        !item.is_read && styles.notificationTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.timeText}>
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </View>

                  <Text style={styles.messageText}>{item.message}</Text>
                </View>

                {!item.is_read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No Notifications Yet"
              description="You will be notified here when your submitted civic problems are analyzed, clustered, or reviewed by government officers."
              iconName="notifications-off-outline"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weight.semibold,
  },
  listContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  notificationUnread: {
    backgroundColor: '#F0FDF4',
    borderColor: theme.colors.primaryLight,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notificationTitle: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weight.medium,
    flex: 1,
    marginRight: 6,
  },
  notificationTitleUnread: {
    color: theme.colors.text,
    fontWeight: theme.typography.weight.bold,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  messageText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: 6,
    marginTop: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
