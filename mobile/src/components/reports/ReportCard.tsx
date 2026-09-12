import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChallengeItem } from '../../types';
import { Badge } from '../common/Badge';
import { formatRelativeTime } from '../../utils/formatters';
import { theme } from '../../constants/theme';

interface ReportCardProps {
  report: ChallengeItem;
  onPress: () => void;
}

export function ReportCard({ report, onPress }: ReportCardProps) {
  const isClustered =
    !!report.cluster_id ||
    report.clustering_status === 'CLUSTERED' ||
    report.clustering_status === 'POTENTIAL_MATCH';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <Badge status={report.status} size="sm" />
        <Text style={styles.timeText}>{formatRelativeTime(report.created_at)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {report.title}
      </Text>

      <Text style={styles.description} numberOfLines={2}>
        {report.description}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {report.village_locality
              ? `${report.village_locality}, ${report.districtName || 'Jharkhand'}`
              : report.districtName || 'Jharkhand'}
          </Text>
        </View>

        <View style={styles.metaContainer}>
          {report.evidenceCount && report.evidenceCount > 0 ? (
            <View style={styles.metaItem}>
              <Ionicons name="image-outline" size={13} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{report.evidenceCount}</Text>
            </View>
          ) : null}

          {report.confirmationsCount && report.confirmationsCount > 0 ? (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={13} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{report.confirmationsCount}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {isClustered && (
        <View style={styles.clusterNoticeRow}>
          <Ionicons name="layers-outline" size={13} color={theme.colors.blue} />
          <Text style={styles.clusterNoticeText}>
            Consolidated with nearby community reports
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  timeText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
  },
  title: {
    fontSize: theme.typography.size.base,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  description: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: theme.spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  locationText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weight.medium,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
  },
  clusterNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.blue50,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
    marginTop: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.blueLight,
  },
  clusterNoticeText: {
    fontSize: 11,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.blue,
  },
});
