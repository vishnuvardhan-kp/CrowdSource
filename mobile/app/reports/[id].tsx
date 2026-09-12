import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { challengesApi } from '../../src/api/challenges';
import { ChallengeDetail, EvidenceItem } from '../../src/types';
import { Header } from '../../src/components/common/Header';
import { Badge } from '../../src/components/common/Badge';
import { Card } from '../../src/components/common/Card';
import { ClusterNotice } from '../../src/components/reports/ClusterNotice';
import { LoadingView } from '../../src/components/common/LoadingView';
import { ErrorView } from '../../src/components/common/ErrorView';
import { formatDateSafe, formatSeverityLabel } from '../../src/utils/formatters';
import { theme } from '../../src/constants/theme';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/context/I18nContext';

export default function ReportDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const [report, setReport] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // On-demand translation state
  const [translating, setTranslating] = useState<boolean>(false);
  const [activeTranslation, setActiveTranslation] = useState<{
    target_language: string;
    translated_title: string;
    translated_description: string;
  } | null>(null);
  const [showNormalized, setShowNormalized] = useState<boolean>(false);

  const handleTranslate = async (targetLang: string) => {
    if (!id) return;
    if (activeTranslation && activeTranslation.target_language === targetLang) {
      setActiveTranslation(null);
      return;
    }
    try {
      setTranslating(true);
      const res = await challengesApi.translateChallenge(id, targetLang);
      setActiveTranslation(res);
    } catch (err: any) {
      Alert.alert('Translation Error', err.message || 'Failed to translate challenge.');
    } finally {
      setTranslating(false);
    }
  };

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await challengesApi.getChallengeById(id);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDetail();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Report Details" showBack onBack={() => router.back()} />
        <LoadingView message="Loading report status..." />
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Report Details" showBack onBack={() => router.back()} />
        <ErrorView
          title="Could Not Load Report"
          message={error || 'Report not found.'}
          onRetry={fetchDetail}
        />
      </SafeAreaView>
    );
  }

  const isConsolidated =
    report.clustering_status === 'CLUSTERED' &&
    (report.cluster?.report_count ? report.cluster.report_count > 1 : false);
  const isPotentialMatch = report.clustering_status === 'POTENTIAL_MATCH';
  const shouldShowClusterNotice = isConsolidated || isPotentialMatch;

  const isSubmitted =
    report.status !== 'DRAFT';
  const isValidated =
    report.status === 'VALIDATED' || report.status === 'PROJECT_INITIATED';
  const isRejected =
    report.status === 'REJECTED';

  const aiStatus = report.aiAnalysis?.ai_processing_status;
  const isAiSuccess = aiStatus === 'SUCCESS';
  const isAiFallback = aiStatus === 'FALLBACK';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header title="Report Details" showBack onBack={() => router.back()} />

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
        {/* Status Stepper Banner */}
        <Card style={styles.stepperCard}>
          <View style={styles.statusHeaderRow}>
            <Text style={styles.stepperTitle}>Verification Progress</Text>
            <Badge status={report.status} size="sm" />
          </View>

          <View style={styles.stepperContainer}>
            {/* Step 1 */}
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.stepCircle,
                  isSubmitted && styles.stepCircleActive,
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={isSubmitted ? '#FFF' : theme.colors.textMuted}
                />
              </View>
              <Text style={styles.stepLabel}>Submitted</Text>
            </View>

            <View
              style={[
                styles.stepLine,
                isSubmitted && (isAiSuccess || isAiFallback) && styles.stepLineActive,
              ]}
            />

            {/* Step 2 */}
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.stepCircle,
                  isAiSuccess && styles.stepCircleActive,
                  isAiFallback && styles.stepCircleFallback,
                  !isAiSuccess && !isAiFallback && styles.stepCirclePending,
                ]}
              >
                <Ionicons
                  name={
                    isAiSuccess
                      ? 'sparkles'
                      : isAiFallback
                      ? 'alert-circle-outline'
                      : 'sparkles-outline'
                  }
                  size={12}
                  color={
                    isAiSuccess
                      ? '#FFF'
                      : isAiFallback
                      ? '#D97706'
                      : theme.colors.textMuted
                  }
                />
              </View>
              <Text style={styles.stepLabel}>
                {isAiSuccess ? 'AI Analyzed' : isAiFallback ? 'AI Unavailable' : 'AI Pending'}
              </Text>
            </View>

            <View
              style={[
                styles.stepLine,
                isValidated && styles.stepLineActive,
              ]}
            />

            {/* Step 3 */}
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.stepCircle,
                  isValidated
                    ? styles.stepCircleActive
                    : isRejected
                    ? styles.stepCircleRejected
                    : styles.stepCirclePending,
                ]}
              >
                <Ionicons
                  name={
                    isValidated
                      ? 'shield-checkmark'
                      : isRejected
                      ? 'close'
                      : 'shield-outline'
                  }
                  size={14}
                  color={
                    isValidated || isRejected
                      ? '#FFF'
                      : theme.colors.textMuted
                  }
                />
              </View>
              <Text style={styles.stepLabel}>
                {isValidated ? 'Validated' : isRejected ? 'Rejected' : 'Gov Review'}
              </Text>
            </View>
          </View>

          {/* Stepper info alert if AI fallback */}
          {isAiFallback && (
            <View style={styles.stepperSubNotice}>
              <Ionicons name="information-circle-outline" size={14} color="#B45309" />
              <Text style={styles.stepperSubNoticeText}>
                AI structuring is temporarily unavailable. Your problem was submitted successfully and will proceed through human verification.
              </Text>
            </View>
          )}
        </Card>

        {/* Community Problem Consolidation Notice */}
        {shouldShowClusterNotice && (
          <ClusterNotice
            reportCount={report.cluster?.report_count || 1}
            district={report.districtName || report.district}
            aiProcessingStatus={report.aiAnalysis?.ai_processing_status}
            isPotentialMatch={isPotentialMatch}
          />
        )}

        {/* AI Problem Intelligence Card */}
        {report.aiAnalysis && (
          <Card style={styles.detailCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>AI Problem Intelligence</Text>
            </View>

            {report.aiAnalysis.ai_processing_status === 'FALLBACK' ? (
              <View style={styles.fallbackNotice}>
                <Ionicons name="alert-circle-outline" size={20} color={theme.colors.accent} />
                <Text style={styles.fallbackText}>
                  AI structuring is temporarily unavailable. Your problem has still been submitted successfully and will continue through the verification workflow.
                </Text>
              </View>
            ) : (
              <View style={styles.aiContentContainer}>
                <View style={styles.aiTagRow}>
                  {report.aiAnalysis.domain && (
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagLabel}>Domain: </Text>
                      <Text style={styles.aiTagValue}>{report.aiAnalysis.domain}</Text>
                    </View>
                  )}
                  {report.aiAnalysis.subdomain && (
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagLabel}>Subdomain: </Text>
                      <Text style={styles.aiTagValue}>{report.aiAnalysis.subdomain}</Text>
                    </View>
                  )}
                  {report.aiAnalysis.category && (
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagLabel}>Category: </Text>
                      <Text style={styles.aiTagValue}>{report.aiAnalysis.category}</Text>
                    </View>
                  )}
                </View>

                {report.aiAnalysis.summary ? (
                  <View style={styles.aiSummaryBox}>
                    <Text style={styles.aiSummaryTitle}>Structured Summary</Text>
                    <Text style={styles.aiSummaryText}>{report.aiAnalysis.summary}</Text>
                  </View>
                ) : null}

                {((report.aiAnalysis.required_technologies && report.aiAnalysis.required_technologies.length > 0) ||
                  (report.aiAnalysis.required_capabilities && report.aiAnalysis.required_capabilities.length > 0)) && (
                  <View style={styles.aiSectionBlock}>
                    <Text style={styles.aiSectionHeading}>Required Technologies / Capabilities</Text>
                    <View style={styles.chipContainer}>
                      {(report.aiAnalysis.required_technologies || report.aiAnalysis.required_capabilities || []).map((tech, idx) => (
                        <View key={idx} style={styles.capabilityChip}>
                          <Text style={styles.capabilityChipText}>{tech}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {report.aiAnalysis.keywords && report.aiAnalysis.keywords.length > 0 && (
                  <View style={styles.aiSectionBlock}>
                    <Text style={styles.aiSectionHeading}>Keywords</Text>
                    <View style={styles.chipContainer}>
                      {report.aiAnalysis.keywords.map((kw, idx) => (
                        <View key={idx} style={styles.keywordChip}>
                          <Text style={styles.keywordChipText}>#{kw}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </Card>
        )}

        {/* Rejection Notice if applicable */}
        {isRejected && report.rejection_reason && (
          <View style={styles.rejectionNotice}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.destructive} />
            <View style={styles.rejectionTextContainer}>
              <Text style={styles.rejectionTitle}>Reviewer Feedback</Text>
              <Text style={styles.rejectionText}>{report.rejection_reason}</Text>
            </View>
          </View>
        )}

        {/* Problem Title & Description with Multilingual Controls */}
        <Card style={styles.detailCard}>
          {/* Header row with language indicators and translation actions */}
          <View style={styles.langHeaderRow}>
            <View style={styles.langBadge}>
              <Ionicons name="language" size={13} color={theme.colors.primary} />
              <Text style={styles.langBadgeText}>
                {report.original_language
                  ? (SUPPORTED_LANGUAGES[report.original_language]?.nativeName || report.original_language.toUpperCase())
                  : 'Original'}
              </Text>
            </View>

            {/* On-Demand Translation Buttons */}
            <View style={styles.translateButtonRow}>
              {report.original_language !== 'hi' && (
                <TouchableOpacity
                  style={[
                    styles.quickTranslateBtn,
                    activeTranslation?.target_language === 'hi' && styles.quickTranslateBtnActive,
                  ]}
                  onPress={() => handleTranslate('hi')}
                  disabled={translating}
                >
                  <Text
                    style={[
                      styles.quickTranslateBtnText,
                      activeTranslation?.target_language === 'hi' && styles.quickTranslateBtnTextActive,
                    ]}
                  >
                    {activeTranslation?.target_language === 'hi' ? 'Original' : 'हिन्दी'}
                  </Text>
                </TouchableOpacity>
              )}

              {report.original_language !== 'en' && (
                <TouchableOpacity
                  style={[
                    styles.quickTranslateBtn,
                    activeTranslation?.target_language === 'en' && styles.quickTranslateBtnActive,
                  ]}
                  onPress={() => handleTranslate('en')}
                  disabled={translating}
                >
                  <Text
                    style={[
                      styles.quickTranslateBtnText,
                      activeTranslation?.target_language === 'en' && styles.quickTranslateBtnTextActive,
                    ]}
                  >
                    {activeTranslation?.target_language === 'en' ? 'Original' : 'English'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {translating && (
            <View style={styles.translatingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.translatingText}>Translating...</Text>
            </View>
          )}

          {activeTranslation ? (
            <View style={styles.translationActiveNotice}>
              <Ionicons name="sparkles" size={13} color={theme.colors.primary} />
              <Text style={styles.translationActiveText}>
                Showing {SUPPORTED_LANGUAGES[activeTranslation.target_language]?.name || activeTranslation.target_language} translation
              </Text>
            </View>
          ) : null}

          <Text style={styles.title}>
            {activeTranslation ? activeTranslation.translated_title : report.title}
          </Text>
          <Text style={styles.description}>
            {activeTranslation
              ? activeTranslation.translated_description
              : (report.original_text || report.description)}
          </Text>

          {/* If normalized text exists and differs from original text */}
          {!activeTranslation && report.normalized_text && report.normalized_text !== (report.original_text || report.description) && (
            <View style={styles.normalizedSection}>
              <TouchableOpacity
                style={styles.normalizedToggle}
                onPress={() => setShowNormalized(!showNormalized)}
              >
                <View style={styles.normalizedHeader}>
                  <Ionicons
                    name={showNormalized ? 'chevron-down' : 'chevron-forward'}
                    size={14}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.normalizedToggleText}>
                    English Normalized Translation (AI Derived)
                  </Text>
                </View>
                {report.translation_status === 'REQUIRES_HUMAN_REVIEW' && (
                  <View style={styles.reviewBadge}>
                    <Text style={styles.reviewBadgeText}>Needs Review</Text>
                  </View>
                )}
                {report.translation_status === 'VERIFIED' && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>Verified</Text>
                  </View>
                )}
              </TouchableOpacity>

              {showNormalized && (
                <View style={styles.normalizedContent}>
                  <Text style={styles.normalizedText}>{report.normalized_text}</Text>
                  {report.translation_status === 'REQUIRES_HUMAN_REVIEW' && (
                    <Text style={styles.reviewNotice}>
                      ⚠️ Low-resource dialect detection. Flagged for human review.
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Metadata Grid */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Domain / Category</Text>
              <Text style={styles.metaValue}>{report.category || 'General'}</Text>
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Community Severity</Text>
              <Text style={styles.metaValue}>
                {formatSeverityLabel(report.citizen_severity)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Submitted Date</Text>
              <Text style={styles.metaValue}>
                {formatDateSafe(report.submitted_at || report.created_at)}
              </Text>
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Affected Population</Text>
              <Text style={styles.metaValue}>
                {report.affected_population || 'Not specified'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Location Card */}
        <Card style={styles.detailCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="location" size={18} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Location Telemetry</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>District</Text>
            <Text style={styles.infoValue}>
              {report.districtName || report.district || 'Jharkhand'}
            </Text>
          </View>

          {report.blockName ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Block</Text>
              <Text style={styles.infoValue}>{report.blockName}</Text>
            </View>
          ) : null}

          {report.village_locality ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Locality / Landmark</Text>
              <Text style={styles.infoValue}>{report.village_locality}</Text>
            </View>
          ) : null}

          {report.latitude && report.longitude ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Satellite Coordinates</Text>
              <Text style={styles.infoValue}>
                {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Evidence Photos */}
        <Card style={styles.detailCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="images" size={18} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>
              Attached Evidence ({report.evidence?.length || 0})
            </Text>
          </View>

          {report.evidence && report.evidence.length > 0 ? (
            <View style={styles.evidenceGrid}>
              {report.evidence.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.evidenceItem}
                  onPress={() => setSelectedPhoto(ev.url)}
                >
                  <Image source={{ uri: ev.url }} style={styles.evidenceImage} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noEvidenceText}>
              No photographic evidence was attached to this report.
            </Text>
          )}
        </Card>
      </ScrollView>

      {/* Full Size Image Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSelectedPhoto(null)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {selectedPhoto ? (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.modalFullImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  stepperCard: {
    marginBottom: theme.spacing.md,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  stepperTitle: {
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
  },
  stepCol: {
    alignItems: 'center',
    width: 75,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary,
  },
  stepCirclePending: {
    backgroundColor: theme.colors.accentLight,
  },
  stepCircleRejected: {
    backgroundColor: theme.colors.destructive,
  },
  stepCircleFallback: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  stepperSubNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    marginTop: theme.spacing.sm,
  },
  stepperSubNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: theme.colors.primary,
  },
  rejectionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.destructive50,
    borderWidth: 1,
    borderColor: theme.colors.destructiveLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  rejectionTextContainer: {
    flex: 1,
  },
  rejectionTitle: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.destructiveDark,
  },
  rejectionText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  detailCard: {
    marginBottom: theme.spacing.md,
  },
  langHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  langBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.primary,
  },
  translateButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickTranslateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  quickTranslateBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  quickTranslateBtnText: {
    fontSize: 10,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.text,
  },
  quickTranslateBtnTextActive: {
    color: '#FFFFFF',
  },
  translatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  translatingText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  translationActiveNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary50,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  translationActiveText: {
    fontSize: 11,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.primaryDark,
  },
  normalizedSection: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  normalizedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  normalizedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  normalizedToggleText: {
    fontSize: 11,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.primary,
  },
  reviewBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reviewBadgeText: {
    fontSize: 9,
    fontWeight: theme.typography.weight.bold,
    color: '#92400E',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: theme.typography.weight.bold,
    color: '#065F46',
  },
  normalizedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  normalizedText: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  reviewNotice: {
    fontSize: 10,
    color: '#92400E',
    marginTop: 4,
    lineHeight: 14,
  },
  title: {
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginBottom: 6,
  },
  description: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  metaValue: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.text,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  infoLabel: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.text,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: theme.spacing.xs,
  },
  evidenceItem: {
    width: 90,
    height: 90,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSubtle,
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  noEvidenceText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  modalFullImage: {
    width: '90%',
    height: '75%',
  },
  fallbackNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  fallbackText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  aiContentContainer: {
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  aiTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  aiTagLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  aiTagValue: {
    fontSize: 11,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.text,
  },
  aiSummaryBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  aiSummaryTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weight.bold,
    color: '#166534',
    marginBottom: 4,
  },
  aiSummaryText: {
    fontSize: 12,
    color: '#14532D',
    lineHeight: 18,
  },
  aiSectionBlock: {
    marginTop: 4,
  },
  aiSectionHeading: {
    fontSize: 11,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  capabilityChip: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
  },
  capabilityChipText: {
    fontSize: 11,
    fontWeight: theme.typography.weight.semibold,
    color: '#065F46',
  },
  keywordChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  keywordChipText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
});
