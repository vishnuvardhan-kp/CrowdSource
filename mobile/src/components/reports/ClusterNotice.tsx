import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface ClusterNoticeProps {
  reportCount?: number;
  district?: string;
  aiProcessingStatus?: 'SUCCESS' | 'FALLBACK' | string;
  isPotentialMatch?: boolean;
}

export function ClusterNotice({
  reportCount = 1,
  district,
  aiProcessingStatus,
  isPotentialMatch = false,
}: ClusterNoticeProps) {
  const isAiSuccess = aiProcessingStatus === 'SUCCESS';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={isPotentialMatch ? 'help-circle-outline' : 'layers'}
            size={16}
            color={theme.colors.blue}
          />
        </View>
        <Text style={styles.headerTitle}>
          {isPotentialMatch ? 'Potential Community Match' : 'Community Problem Consolidation'}
        </Text>
      </View>

      <Text style={styles.bodyText}>
        {isPotentialMatch
          ? `A potential match with existing community reports${district ? ` in ${district}` : ' in your area'} has been identified and is queued for Government reviewer verification.`
          : `Your report has been consolidated with ${reportCount} community reports${district ? ` in ${district}` : ' in your area'} to amplify civic attention.`}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.statusPill}>
          <Ionicons
            name={isAiSuccess ? 'sparkles' : 'git-merge-outline'}
            size={12}
            color={theme.colors.primary}
          />
          <Text style={styles.statusText}>
            {isAiSuccess ? 'AI-assisted consolidation' : 'Location & text consolidation'}
          </Text>
        </View>
        <View style={styles.statusPillGov}>
          <Ionicons name="shield-outline" size={12} color={theme.colors.accentDark} />
          <Text style={styles.statusTextGov}>Awaiting Government verification</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.blue50,
    borderWidth: 1,
    borderColor: theme.colors.blueLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.blueDark,
  },
  bodyText: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  footerRow: {
    flexDirection: 'column',
    gap: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.primaryDark,
  },
  statusPillGov: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accent50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.accentLight,
  },
  statusTextGov: {
    fontSize: 11,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.accentDark,
  },
});
