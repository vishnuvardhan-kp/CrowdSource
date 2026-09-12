import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { challengesApi } from '../../src/api/challenges';
import { ChallengeItem } from '../../src/types';
import { Header } from '../../src/components/common/Header';
import { ReportCard } from '../../src/components/reports/ReportCard';
import { EmptyState } from '../../src/components/common/EmptyState';
import { LoadingView } from '../../src/components/common/LoadingView';
import { Button } from '../../src/components/common/Button';
import { theme } from '../../src/constants/theme';

export default function ReportsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [reports, setReports] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'UNDER_REVIEW' | 'VALIDATED' | 'DRAFT'>('ALL');

  const fetchReports = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await challengesApi.getMyChallenges();
      setReports(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const filteredReports = reports.filter((r) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'UNDER_REVIEW') {
      return r.status === 'UNDER_REVIEW' || r.status === 'SUBMITTED';
    }
    if (selectedFilter === 'VALIDATED') {
      return r.status === 'VALIDATED' || r.status === 'PROJECT_INITIATED';
    }
    if (selectedFilter === 'DRAFT') {
      return r.status === 'DRAFT';
    }
    return true;
  });

  const filterTabs = [
    { key: 'ALL', label: 'All' },
    { key: 'UNDER_REVIEW', label: 'In Review' },
    { key: 'VALIDATED', label: 'Validated' },
    { key: 'DRAFT', label: 'Drafts' },
  ];

  if (!user && !loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header title="My Reports" />
        <View style={styles.centerContainer}>
          <EmptyState
            title="Sign In Required"
            description="Sign in with your citizen account to track your submitted reports and their government review progress."
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
        title="My Reports"
        subtitle="Tracking & Verification Feed"
        rightAction={
          <Button
            title="+ Report"
            onPress={() => router.push('/report/new')}
            size="sm"
            style={styles.newReportButton}
          />
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setSelectedFilter(tab.key as any)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isActive && styles.filterPillTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <LoadingView message="Loading your reports..." />
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              onPress={() => {
                if (item.status === 'DRAFT') {
                  router.push(`/report/new?draftId=${item.id}`);
                } else {
                  router.push(`/reports/${item.id}`);
                }
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={
                selectedFilter === 'ALL'
                  ? 'No Reports Found'
                  : `No ${selectedFilter.replace('_', ' ')} Reports`
              }
              description={
                selectedFilter === 'ALL'
                  ? 'You have not submitted any civic problem reports yet. Document an issue in your area to get started.'
                  : 'There are no reports matching this filter.'
              }
              iconName="folder-open-outline"
              actionTitle={selectedFilter === 'ALL' ? 'Report a Problem' : undefined}
              onAction={
                selectedFilter === 'ALL'
                  ? () => router.push('/report/new')
                  : undefined
              }
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
  newReportButton: {
    paddingHorizontal: 12,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  filterPillText: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: theme.colors.textInverse,
    fontWeight: theme.typography.weight.bold,
  },
  listContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
