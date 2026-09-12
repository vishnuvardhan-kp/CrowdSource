import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { challengesApi } from '../../src/api/challenges';
import { notificationsApi } from '../../src/api/notifications';
import { draftStorage } from '../../src/utils/draft-storage';
import { ChallengeItem } from '../../src/types';
import { Header } from '../../src/components/common/Header';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { ReportCard } from '../../src/components/reports/ReportCard';
import { theme } from '../../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [recentReports, setRecentReports] = useState<ChallengeItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    underReview: 0,
    validated: 0,
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDraft, setActiveDraft] = useState<{ id: string; step: number; title: string } | null>(null);

  const loadData = useCallback(async () => {
    // 1. Check for unfinished draft (Patch 2)
    try {
      const draft = await draftStorage.getActiveDraft();
      setActiveDraft(draft);
    } catch {}

    if (!token) {
      setRecentReports([]);
      setStats({ total: 0, underReview: 0, validated: 0 });
      return;
    }

    // 2. Fetch citizen's reports
    try {
      const reports = await challengesApi.getMyChallenges();
      setRecentReports(reports.slice(0, 3));

      let underReviewCount = 0;
      let validatedCount = 0;
      reports.forEach((r) => {
        if (r.status === 'UNDER_REVIEW' || r.status === 'SUBMITTED') {
          underReviewCount++;
        } else if (r.status === 'VALIDATED' || r.status === 'PROJECT_INITIATED') {
          validatedCount++;
        }
      });

      setStats({
        total: reports.length,
        underReview: underReviewCount,
        validated: validatedCount,
      });
    } catch {
      // ignore
    }

    // 3. Fetch notification badge count
    try {
      const notifRes = await notificationsApi.getNotifications(10);
      setUnreadNotifications(notifRes.unreadCount || 0);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDiscardDraft = async () => {
    if (activeDraft) {
      try {
        await challengesApi.deleteDraft(activeDraft.id);
      } catch {}
      await draftStorage.clearActiveDraft();
      setActiveDraft(null);
    }
  };

  const domains = [
    { title: 'Water & Sanitation', icon: 'water-outline', category: 'Water & Sanitation' },
    { title: 'Roads & Infrastructure', icon: 'construct-outline', category: 'Public Infrastructure' },
    { title: 'Agriculture & Soil', icon: 'leaf-outline', category: 'Agriculture & Soil' },
    { title: 'Rural Healthcare', icon: 'medkit-outline', category: 'Healthcare' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        subtitle="Government of Jharkhand · Problem Intelligence"
        rightAction={
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => router.push('/(tabs)/notifications')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
            {unreadNotifications > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Patch 2: Unfinished Draft Recovery Card */}
        {activeDraft && (
          <View style={styles.draftAlertCard}>
            <View style={styles.draftAlertHeader}>
              <Ionicons name="document-text" size={18} color={theme.colors.accentDark} />
              <Text style={styles.draftAlertTitle}>Unfinished Report Draft</Text>
            </View>
            <Text style={styles.draftAlertDesc}>
              You have an incomplete submission from a previous session. Would you like to resume or discard it?
            </Text>
            <View style={styles.draftAlertActions}>
              <TouchableOpacity
                style={styles.discardButton}
                onPress={handleDiscardDraft}
              >
                <Text style={styles.discardButtonText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => router.push('/report/new')}
              >
                <Text style={styles.resumeButtonText}>Resume Draft</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Hero Welcome Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View>
              <Text style={styles.welcomeGreeting}>
                {user ? `Namaste, ${user.name}` : 'Welcome, Citizen'}
              </Text>
              <Text style={styles.heroTagline}>
                Document verified societal problems with photos and location.
              </Text>
            </View>
          </View>

          <Button
            title="Report a Civic Problem"
            icon={<Ionicons name="add-circle" size={20} color={theme.colors.textInverse} />}
            onPress={() => {
              if (!token) {
                router.push('/(auth)/login');
              } else {
                router.push('/report/new');
              }
            }}
            size="lg"
            style={styles.heroCtaButton}
          />
        </View>

        {/* Citizen Impact / Stats Grid */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>My Reports</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: theme.colors.accentDark }]}>
              {stats.underReview}
            </Text>
            <Text style={styles.statLabel}>Under Review</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {stats.validated}
            </Text>
            <Text style={styles.statLabel}>Validated</Text>
          </Card>
        </View>

        {/* Priority Focus Domains */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Key Civic Domains</Text>
        </View>

        <View style={styles.domainGrid}>
          {domains.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.domainCard}
              onPress={() => {
                if (!token) {
                  router.push('/(auth)/login');
                } else {
                  router.push(`/report/new?category=${encodeURIComponent(item.category)}`);
                }
              }}
              activeOpacity={0.75}
            >
              <View style={styles.domainIconCircle}>
                <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.domainTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Submissions */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Recent Reports</Text>
          {recentReports.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/reports')}>
              <Text style={styles.viewAllText}>View All ({stats.total})</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentReports.length === 0 ? (
          <Card style={styles.emptyRecentCard}>
            <Ionicons name="document-text-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyRecentTitle}>No problems reported yet</Text>
            <Text style={styles.emptyRecentSubtitle}>
              Be the first in your village or ward to report broken infrastructure or civic challenges.
            </Text>
            <Button
              title="Report a Problem"
              onPress={() => {
                if (!token) {
                  router.push('/(auth)/login');
                } else {
                  router.push('/report/new');
                }
              }}
              size="sm"
              style={styles.emptyRecentButton}
            />
          </Card>
        ) : (
          recentReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onPress={() => router.push(`/reports/${report.id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  bellButton: {
    position: 'relative',
    padding: theme.spacing.xxs,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.destructive,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: theme.colors.textInverse,
    fontSize: 9,
    fontWeight: theme.typography.weight.bold,
  },
  draftAlertCard: {
    backgroundColor: theme.colors.accent50,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.accentLight,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  draftAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  draftAlertTitle: {
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.accentDark,
  },
  draftAlertDesc: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  draftAlertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  discardButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  discardButtonText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weight.semibold,
  },
  resumeButton: {
    backgroundColor: theme.colors.accentDark,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  resumeButtonText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textInverse,
    fontWeight: theme.typography.weight.semibold,
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  heroHeaderRow: {
    marginBottom: theme.spacing.md,
  },
  welcomeGreeting: {
    fontSize: theme.typography.size.xl,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  heroTagline: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  heroCtaButton: {
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  statNumber: {
    fontSize: theme.typography.size.xxl,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: theme.typography.weight.medium,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.size.base,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
  },
  viewAllText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weight.semibold,
  },
  domainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  domainCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  domainIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainTitle: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  emptyRecentCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyRecentTitle: {
    fontSize: theme.typography.size.base,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  emptyRecentSubtitle: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    marginTop: 4,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  emptyRecentButton: {
    minWidth: 150,
  },
});
