import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../src/context/AuthContext';
import { challengesApi } from '../../src/api/challenges';
import { locationsApi } from '../../src/api/locations';
import { institutionsApi, InstitutionMembership } from '../../src/api/institutions';
import { draftStorage } from '../../src/utils/draft-storage';
import {
  DistrictItem,
  BlockItem,
  EvidenceItem,
  CitizenSeverity,
} from '../../src/types';
import { Header } from '../../src/components/common/Header';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { theme } from '../../src/constants/theme';
import { useTranslation } from '../../src/context/I18nContext';

export default function NewReportWizard() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    draftId?: string;
    category?: string;
    membershipId?: string;
    institutionId?: string;
  }>();
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const [step, setStep] = useState<number>(1);
  const [draftId, setDraftId] = useState<string | null>(params.draftId || null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(!!params.draftId);
  const [savingStep, setSavingStep] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State: Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Form State: Step 2
  const [severity, setSeverity] = useState<CitizenSeverity>(CitizenSeverity.MODERATE);

  // Form State: Step 3 (Location)
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [villageLocality, setVillageLocality] = useState<string>('');
  const [affectedPopulation, setAffectedPopulation] = useState<string>('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  // Form State: Step 4 (Evidence)
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);

  // Submission Capacity & Community Group State
  const [verifiedMemberships, setVerifiedMemberships] = useState<InstitutionMembership[]>([]);
  const [submissionMode, setSubmissionMode] = useState<'INDIVIDUAL' | 'COMMUNITY' | 'INSTITUTIONAL'>('INDIVIDUAL');
  const [communityGroupName, setCommunityGroupName] = useState<string>('');
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    institutionsApi
      .getMyMemberships()
      .then((data) => {
        if (Array.isArray(data)) {
          const verified = data.filter((m) => m.authority_status === 'VERIFIED');
          setVerifiedMemberships(verified);
          if (params.membershipId && verified.some((m) => m.id === params.membershipId)) {
            setSubmissionMode('INSTITUTIONAL');
            setSelectedMembershipId(params.membershipId as string);
            const found = verified.find((m) => m.id === params.membershipId);
            if (found?.institution?.district_name) {
              const d = districts.find((x) => x.name.toLowerCase() === found.institution.district_name?.toLowerCase());
              if (d) setSelectedDistrictId(d.id);
            }
          } else if (params.institutionId && verified.some((m) => m.institution_id === params.institutionId)) {
            const found = verified.find((m) => m.institution_id === params.institutionId);
            if (found) {
              setSubmissionMode('INSTITUTIONAL');
              setSelectedMembershipId(found.id);
            }
          }
        }
      })
      .catch((e) => console.log('Error loading memberships in mobile report:', e));
  }, [token, params, districts]);

  // 1. Load Districts on Mount
  useEffect(() => {
    locationsApi
      .getDistricts()
      .then((data) => setDistricts(data))
      .catch(() => {});
  }, []);

  // 2. Load Blocks when District changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setBlocks([]);
      setSelectedBlockId('');
      return;
    }
    locationsApi
      .getBlocks(selectedDistrictId)
      .then((data) => setBlocks(data))
      .catch(() => {});
  }, [selectedDistrictId]);

  // 3. Resume Draft if ID provided or in storage
  useEffect(() => {
    const checkDraft = async () => {
      let targetId = params.draftId;
      if (!targetId) {
        const stored = await draftStorage.getActiveDraft();
        if (stored) {
          targetId = stored.id;
          if (stored.step) setStep(stored.step);
        }
      }

      if (!targetId || !token) {
        setLoadingInitial(false);
        return;
      }

      try {
        setLoadingInitial(true);
        const data = await challengesApi.getChallengeById(targetId);
        if (data && data.status === 'DRAFT') {
          setDraftId(data.id);
          setTitle(data.title || '');
          setDescription(data.description || '');
          if (data.citizen_severity) {
            setSeverity(data.citizen_severity as CitizenSeverity);
          }
          if (data.district_id) setSelectedDistrictId(data.district_id);
          if (data.block_id) setSelectedBlockId(data.block_id);
          if (data.village_locality) setVillageLocality(data.village_locality);
          if (data.affected_population) setAffectedPopulation(data.affected_population);
          if (data.latitude) setLatitude(data.latitude);
          if (data.longitude) setLongitude(data.longitude);
          if (data.evidence) setEvidenceList(data.evidence);
        } else {
          // Already submitted
          await draftStorage.clearActiveDraft();
        }
      } catch {
        await draftStorage.clearActiveDraft();
      } finally {
        setLoadingInitial(false);
      }
    };

    checkDraft();
  }, [params.draftId, token]);

  // Patch 5: Location Permission & Graceful Handling
  const handleCaptureGps = async () => {
    setLocating(true);
    setGpsStatus('Requesting GPS permission...');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus(
          'Location access was not granted. Please select your District and Block manually below.',
        );
        setLocating(false);
        return;
      }

      setGpsStatus('Acquiring precise satellite coordinates...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = parseFloat(location.coords.latitude.toFixed(6));
      const lng = parseFloat(location.coords.longitude.toFixed(6));
      setLatitude(lat);
      setLongitude(lng);
      setGpsStatus(`GPS coordinates captured (${lat}, ${lng})`);
    } catch {
      setGpsStatus(
        'Unable to detect location. Please select your District and Block manually below.',
      );
    } finally {
      setLocating(false);
    }
  };

  // Step 1 -> Step 2
  const handleProceedFromStep1 = async () => {
    setErrorMessage(null);
    if (!title.trim() || title.trim().length < 5) {
      setErrorMessage('Problem title must be at least 5 characters long.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage('Problem description must be at least 10 characters long.');
      return;
    }

    if (submissionMode === 'COMMUNITY' && !communityGroupName.trim()) {
      setErrorMessage('Please enter the name of your community group, SHG, or collective.');
      return;
    }

    const selectedMem = verifiedMemberships.find((m) => m.id === selectedMembershipId);
    const draftPayload: any = {
      title: title.trim(),
      description: description.trim(),
      citizen_severity: severity,
    };
    if (submissionMode === 'COMMUNITY') {
      draftPayload.reporter_type = 'COMMUNITY';
      draftPayload.community_group_name = communityGroupName.trim();
    } else if (submissionMode === 'INSTITUTIONAL' && selectedMem) {
      draftPayload.reporter_type = selectedMem.institution?.type || 'PRI';
      draftPayload.institution_id = selectedMem.institution_id;
      draftPayload.institution_membership_id = selectedMem.id;
    } else {
      draftPayload.reporter_type = 'INDIVIDUAL';
    }

    setSavingStep(true);
    try {
      if (!draftId) {
        const created = await challengesApi.createDraft(draftPayload);
        setDraftId(created.id);
        await draftStorage.saveActiveDraft(created.id, 2, title.trim());
      } else {
        await challengesApi.updateDraft(draftId, draftPayload);
        await draftStorage.saveActiveDraft(draftId, 2, title.trim());
      }
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save draft details.');
    } finally {
      setSavingStep(false);
    }
  };

  // Step 2 -> Step 3
  const handleProceedFromStep2 = async () => {
    if (!draftId) return;
    setSavingStep(true);
    try {
      await challengesApi.updateDraft(draftId, {
        citizen_severity: severity,
      });
      await draftStorage.saveActiveDraft(draftId, 3, title.trim());
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update community severity assessment.');
    } finally {
      setSavingStep(false);
    }
  };

  // Step 3 -> Step 4
  const handleProceedFromStep3 = async () => {
    setErrorMessage(null);
    if (!selectedDistrictId) {
      setErrorMessage('Please select a District from the list.');
      return;
    }
    if (!selectedBlockId) {
      setErrorMessage('Please select a Block from the list.');
      return;
    }

    if (!draftId) return;
    setSavingStep(true);
    try {
      await challengesApi.updateDraft(draftId, {
        district_id: selectedDistrictId,
        block_id: selectedBlockId,
        village_locality: villageLocality.trim() || undefined,
        affected_population: affectedPopulation.trim() || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      });
      await draftStorage.saveActiveDraft(draftId, 4, title.trim());
      setStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save location details.');
    } finally {
      setSavingStep(false);
    }
  };

  // Step 4: Camera / Gallery Upload (Images & Videos)
  const handlePickMedia = async (useCamera: boolean) => {
    if (!draftId) return;
    setErrorMessage(null);

    try {
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access to capture evidence of the civic problem.',
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Photo & Video Permission Required',
            'Please allow photo and video access to attach evidence files.',
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingEvidence(true);

        const isVideo = asset.type === 'video' || asset.mimeType?.startsWith('video/');
        const defaultExt = isVideo ? 'mp4' : 'jpg';
        const defaultMime = isVideo ? 'video/mp4' : 'image/jpeg';

        const uploaded = await challengesApi.uploadEvidence(
          draftId,
          asset.uri,
          asset.fileName || `evidence_${Date.now()}.${defaultExt}`,
          asset.mimeType || defaultMime,
          isVideo ? 'Video Evidence' : 'Photo Evidence',
        );

        setEvidenceList((prev) => [...prev, uploaded]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload multimedia evidence.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  // Step 4: Supporting Document Upload (PDF / Docs)
  const handlePickDocument = async () => {
    if (!draftId) return;
    setErrorMessage(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const doc = result.assets[0];
        setUploadingEvidence(true);

        const uploaded = await challengesApi.uploadEvidence(
          draftId,
          doc.uri,
          doc.name || `document_${Date.now()}.pdf`,
          doc.mimeType || 'application/pdf',
          doc.name || 'Supporting Document',
        );

        setEvidenceList((prev) => [...prev, uploaded]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload document.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!draftId) return;
    try {
      await challengesApi.deleteEvidence(draftId, evidenceId);
      setEvidenceList((prev) => prev.filter((e) => e.id !== evidenceId));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove photo.');
    }
  };

  // Step 5: Final Submission
  const handleFinalSubmit = async () => {
    if (!draftId) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await challengesApi.submitChallenge(draftId);
      await draftStorage.clearActiveDraft();
      setSubmittedSuccessfully(true);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to submit problem report. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentDistrictName =
    districts.find((d) => d.id === selectedDistrictId)?.name || 'Not Selected';
  const currentBlockName =
    blocks.find((b) => b.id === selectedBlockId)?.name || 'Not Selected';

  if (!user && !loadingInitial) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Report a Problem" />
        <View style={styles.authGateContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.authGateTitle}>Sign In to Report a Problem</Text>
          <Text style={styles.authGateDesc}>
            To ensure civic accountability and allow you to track your report, you must be signed in as a citizen.
          </Text>
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            style={styles.authGateButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loadingInitial) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Loading Draft..." />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (submittedSuccessfully) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Submission Confirmed" />
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={54} color={theme.colors.primary} />
          </View>
          <Text style={styles.successTitle}>Report Submitted Successfully!</Text>
          <Text style={styles.successSubtitle}>
            Your civic report has been received and is entering AI-assisted analysis and community clustering to open for university and research solutions.
          </Text>

          <Card style={styles.successCard}>
            <Text style={styles.successCardTitle}>{title}</Text>
            <View style={styles.successMetaRow}>
              <Badge status="SUBMITTED" size="sm" />
              <Text style={styles.successLocation}>
                {villageLocality ? `${villageLocality}, ` : ''}
                {currentDistrictName}
              </Text>
            </View>
            <Text style={styles.successNextSteps}>
              Next Steps: Our automated system checks for nearby similar incidents and alerts district administration officers.
            </Text>
          </Card>

          <Button
            title="Track Report Status"
            onPress={() => {
              if (draftId) {
                router.replace(`/reports/${draftId}`);
              } else {
                router.replace('/(tabs)/reports');
              }
            }}
            size="lg"
            style={styles.successButton}
          />

          <Button
            title="Return to Home"
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
            style={styles.homeButton}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title={`Report Problem (${step}/5)`}
        showBack
        onBack={() => {
          if (step > 1) {
            setStep(step - 1);
          } else {
            router.back();
          }
        }}
      />

      {/* Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${(step / 5) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.destructive} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* STEP 1: Problem Description */}
          {step === 1 && (
            <View>
              <Text style={styles.stepHeading}>{t('wizard.step1_title')}</Text>
              <Text style={styles.stepSubheading}>
                Provide a clear title and details about the issue you are observing in your community.
              </Text>

              {/* Voice Reporting Entrypoint Banner */}
              <TouchableOpacity
                style={styles.voiceShortcutBanner}
                onPress={() => router.replace('/report/voice')}
                activeOpacity={0.85}
              >
                <View style={styles.voiceShortcutIcon}>
                  <Ionicons name="mic" size={18} color={theme.colors.textInverse} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.voiceShortcutTitle}>
                    {t('voice.speakPrompt', 'Speak to Report in Your Mother Tongue')}
                  </Text>
                  <Text style={styles.voiceShortcutSubtitle}>
                    {t('voice.preferVoiceHint', 'Tap to report by speaking naturally in Hindi, English, Santhali, or your dialect.')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
              </TouchableOpacity>

              {/* Multilingual Submission Assurance Banner */}
              <View style={styles.multilingualBanner}>
                <Ionicons name="language" size={18} color={theme.colors.primary} />
                <Text style={styles.multilingualBannerText}>
                  {t('wizard.input_language_hint')}
                </Text>
              </View>

              {/* Submission Capacity Selector */}
              <View style={{ marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.text, textTransform: 'uppercase', marginBottom: 8 }}>
                  Submission Capacity
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSubmissionMode('INDIVIDUAL')}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: submissionMode === 'INDIVIDUAL' ? theme.colors.primary : '#CBD5E1',
                      backgroundColor: submissionMode === 'INDIVIDUAL' ? '#EFF6FF' : '#FFFFFF',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.text }}>Individual</Text>
                    <Text style={{ fontSize: 9, color: theme.colors.textMuted }}>Citizen</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSubmissionMode('COMMUNITY')}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: submissionMode === 'COMMUNITY' ? theme.colors.primary : '#CBD5E1',
                      backgroundColor: submissionMode === 'COMMUNITY' ? '#EFF6FF' : '#FFFFFF',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.text }}>Community</Text>
                    <Text style={{ fontSize: 9, color: theme.colors.textMuted }}>SHG / Collective</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSubmissionMode('INSTITUTIONAL');
                      if (!selectedMembershipId && verifiedMemberships[0]) {
                        setSelectedMembershipId(verifiedMemberships[0].id);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: 8,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: submissionMode === 'INSTITUTIONAL' ? theme.colors.primary : '#CBD5E1',
                      backgroundColor: submissionMode === 'INSTITUTIONAL' ? '#EFF6FF' : '#FFFFFF',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.text }}>PRI / ULB</Text>
                    <Text style={{ fontSize: 9, color: theme.colors.textMuted }}>Official Body</Text>
                  </TouchableOpacity>
                </View>

                {submissionMode === 'COMMUNITY' && (
                  <View style={{ marginTop: 6 }}>
                    <Input
                      label="Community Group / Organization Name"
                      placeholder="e.g. Mahila Mandal, Farmers Collective, Youth Club"
                      value={communityGroupName}
                      onChangeText={setCommunityGroupName}
                      helperText="Specify the collective or community entity you represent."
                    />
                  </View>
                )}

                {submissionMode === 'INSTITUTIONAL' && (
                  verifiedMemberships.length > 0 ? (
                    <View style={{ marginTop: 4, padding: 8, borderRadius: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#065F46' }}>
                        ✓ Verified Local Body Representative
                      </Text>
                      <Text style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                        Submitting as {verifiedMemberships.find((m) => m.id === selectedMembershipId)?.designation || verifiedMemberships[0]?.designation} for {verifiedMemberships.find((m) => m.id === selectedMembershipId)?.institution?.name || verifiedMemberships[0]?.institution?.name} (LGD: {verifiedMemberships.find((m) => m.id === selectedMembershipId)?.institution?.lgd_code || verifiedMemberships[0]?.institution?.lgd_code})
                      </Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 4, padding: 8, borderRadius: 8, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#92400E' }}>
                        Institutional Verification Required
                      </Text>
                      <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                        To submit with verified PRI/ULB authority, please complete institutional onboarding in Profile, or submit as Individual / Community Group.
                      </Text>
                    </View>
                  )
                )}
              </View>

              <Input
                label={t('wizard.problem_title_label')}
                placeholder={t('wizard.problem_title_placeholder')}
                value={title}
                onChangeText={setTitle}
                maxLength={300}
                helperText="At least 5 characters. Be concise and specific."
              />

              <Input
                label={t('wizard.problem_desc_label')}
                placeholder={t('wizard.problem_desc_placeholder')}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                maxLength={5000}
                helperText="At least 10 characters."
              />

              <Button
                title={t('common.next')}
                onPress={handleProceedFromStep1}
                loading={savingStep}
                size="lg"
                style={styles.stepButton}
              />
            </View>
          )}

          {/* STEP 2: Community Impact & Severity */}
          {step === 2 && (
            <View>
              <Text style={styles.stepHeading}>Community Impact & Severity</Text>
              <Text style={styles.stepSubheading}>
                Assess how significantly this issue disrupts daily life, health, or local livelihood.
              </Text>

              {/* AI Classification Assurance Notice */}
              <View style={styles.aiNoticeBanner}>
                <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
                <View style={styles.aiNoticeContent}>
                  <Text style={styles.aiNoticeTitle}>
                    Automated Civic Intelligence
                  </Text>
                  <Text style={styles.aiNoticeText}>
                    Civic domain, technical categorization, and required institutional capabilities will be automatically structured by SamadhanSetu AI from your problem description upon submission.
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>
                Community Severity Assessment *
              </Text>
              <View style={styles.severityContainer}>
                {[
                  {
                    value: CitizenSeverity.NOT_SURE,
                    title: 'Standard',
                    desc: 'Noticeable issue, routine maintenance needed.',
                  },
                  {
                    value: CitizenSeverity.MODERATE,
                    title: 'Moderate',
                    desc: 'Disrupts daily livelihood or safe transit.',
                  },
                  {
                    value: CitizenSeverity.SERIOUS,
                    title: 'Urgent / Serious',
                    desc: 'Direct risk to public health, drinking water, or safety.',
                  },
                ].map((item) => {
                  const isSelected = severity === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.severityCard,
                        isSelected && styles.severityCardActive,
                      ]}
                      onPress={() => setSeverity(item.value)}
                    >
                      <View style={styles.severityRadio}>
                        {isSelected && <View style={styles.severityRadioInner} />}
                      </View>
                      <View style={styles.severityTextContainer}>
                        <Text style={styles.severityTitle}>{item.title}</Text>
                        <Text style={styles.severityDesc}>{item.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                title="Proceed to Location"
                onPress={handleProceedFromStep2}
                loading={savingStep}
                size="lg"
                style={styles.stepButton}
              />
            </View>
          )}

          {/* STEP 3: Location (Patch 5: Location Rationale & GPS) */}
          {step === 3 && (
            <View>
              <Text style={styles.stepHeading}>Location Information</Text>
              <Text style={styles.stepSubheading}>
                Your location helps SamadhanSetu identify the affected area and consolidate similar reports.
              </Text>

              {/* GPS Capture Button */}
              <View style={styles.gpsContainer}>
                <TouchableOpacity
                  style={styles.gpsButton}
                  onPress={handleCaptureGps}
                  disabled={locating}
                >
                  {locating ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Ionicons name="navigate" size={18} color={theme.colors.primary} />
                  )}
                  <Text style={styles.gpsButtonText}>
                    {latitude && longitude
                      ? 'Re-Capture Current GPS Coordinates'
                      : 'Capture Current GPS Coordinates'}
                  </Text>
                </TouchableOpacity>

                {gpsStatus ? (
                  <Text style={styles.gpsStatusText}>{gpsStatus}</Text>
                ) : null}
              </View>

              {/* District Dropdown Selector */}
              <Text style={styles.fieldLabel}>District *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalPills}
              >
                {districts.map((d) => {
                  const isSelected = selectedDistrictId === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.districtPill, isSelected && styles.districtPillActive]}
                      onPress={() => setSelectedDistrictId(d.id)}
                    >
                      <Text
                        style={[
                          styles.districtPillText,
                          isSelected && styles.districtPillTextActive,
                        ]}
                      >
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Block Dropdown Selector */}
              <Text style={[styles.fieldLabel, { marginTop: theme.spacing.md }]}>
                Block *
              </Text>
              {selectedDistrictId ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalPills}
                >
                  {blocks.map((b) => {
                    const isSelected = selectedBlockId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.districtPill, isSelected && styles.districtPillActive]}
                        onPress={() => setSelectedBlockId(b.id)}
                      >
                        <Text
                          style={[
                            styles.districtPillText,
                            isSelected && styles.districtPillTextActive,
                          ]}
                        >
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={styles.helperNotice}>
                  Select a district first to view its administrative blocks.
                </Text>
              )}

              <Input
                label="Village / Locality / Landmark"
                placeholder="e.g. Near Panchayat Bhawan, Ward 4"
                value={villageLocality}
                onChangeText={setVillageLocality}
                containerStyle={{ marginTop: theme.spacing.md }}
              />

              <Input
                label="Estimated Affected Population (Optional)"
                placeholder="e.g. ~350 households"
                value={affectedPopulation}
                onChangeText={setAffectedPopulation}
              />

              <Button
                title="Proceed to Evidence"
                onPress={handleProceedFromStep3}
                loading={savingStep}
                size="lg"
                style={styles.stepButton}
              />
            </View>
          )}

          {/* STEP 4: Photo / Video / Document Evidence */}
          {step === 4 && (
            <View>
              <Text style={styles.stepHeading}>Attach Supporting Evidence</Text>
              <Text style={styles.stepSubheading}>
                Photos, videos, and documents validate ground reality and accelerate university capability matching.
              </Text>

              <View style={styles.mediaButtonsRow}>
                <TouchableOpacity
                  style={styles.mediaOptionButton}
                  onPress={() => handlePickMedia(true)}
                  disabled={uploadingEvidence}
                >
                  <Ionicons name="camera" size={24} color={theme.colors.primary} />
                  <Text style={styles.mediaOptionText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mediaOptionButton}
                  onPress={() => handlePickMedia(false)}
                  disabled={uploadingEvidence}
                >
                  <Ionicons name="images" size={24} color={theme.colors.primary} />
                  <Text style={styles.mediaOptionText}>Media Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mediaOptionButton}
                  onPress={handlePickDocument}
                  disabled={uploadingEvidence}
                >
                  <Ionicons name="document-text" size={24} color={theme.colors.primary} />
                  <Text style={styles.mediaOptionText}>Document</Text>
                </TouchableOpacity>
              </View>

              {uploadingEvidence && (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.uploadingText}>Uploading evidence file...</Text>
                </View>
              )}

              {/* Uploaded Evidence Gallery */}
              <View style={styles.evidenceGrid}>
                {evidenceList.map((ev) => {
                  const isImage = !ev.mime_type || ev.mime_type.startsWith('image/') || ev.evidence_type === 'IMAGE';
                  const isVideo = ev.mime_type?.startsWith('video/') || ev.evidence_type === 'VIDEO';
                  const isAudio = ev.mime_type?.startsWith('audio/') || ev.evidence_type === 'AUDIO';
                  return (
                    <View key={ev.id} style={styles.evidenceThumbnailContainer}>
                      {isImage ? (
                        <Image
                          source={{ uri: ev.url }}
                          style={styles.evidenceThumbnail}
                        />
                      ) : (
                        <View style={[styles.evidenceThumbnail, { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', padding: 4 }]}>
                          <Ionicons
                            name={isVideo ? 'videocam' : isAudio ? 'musical-notes' : 'document-text'}
                            size={28}
                            color={theme.colors.primary}
                          />
                          <Text numberOfLines={1} style={{ fontSize: 9, color: theme.colors.textMuted, marginTop: 4 }}>
                            {ev.title || (isVideo ? 'Video' : isAudio ? 'Audio' : 'Document')}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.deleteThumbnailButton}
                        onPress={() => handleDeleteEvidence(ev.id)}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              {evidenceList.length === 0 && !uploadingEvidence && (
                <View style={styles.noEvidenceNotice}>
                  <Ionicons name="attach-outline" size={24} color={theme.colors.textMuted} />
                  <Text style={styles.noEvidenceText}>
                    No evidence attached yet. Photos, videos, or documents are optional but strongly recommended.
                  </Text>
                </View>
              )}

              <Button
                title={evidenceList.length > 0 ? 'Review & Submit' : 'Continue Without Evidence'}
                onPress={() => setStep(5)}
                size="lg"
                style={styles.stepButton}
              />
            </View>
          )}

          {/* STEP 5: Review & Submit */}
          {step === 5 && (
            <View>
              <Text style={styles.stepHeading}>Review Your Report</Text>
              <Text style={styles.stepSubheading}>
                Please confirm the details below before submitting to the SamadhanSetu Research & Problem Intelligence Platform.
              </Text>

              <Card style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>{title}</Text>
                <Text style={styles.reviewDesc}>{description}</Text>

                <View style={styles.reviewDivider} />

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Submission Capacity</Text>
                  <Text style={styles.reviewValue}>
                    {submissionMode === 'COMMUNITY'
                      ? `Community: ${communityGroupName}`
                      : submissionMode === 'INSTITUTIONAL'
                      ? `PRI/ULB: ${verifiedMemberships.find((m) => m.id === selectedMembershipId)?.institution?.name || 'Local Body'}`
                      : 'Individual Citizen'}
                  </Text>
                </View>

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Civic Classification</Text>
                  <View style={styles.aiReviewBadge}>
                    <Ionicons name="sparkles" size={12} color={theme.colors.primary} />
                    <Text style={styles.aiReviewBadgeText}>
                      AI-Derived upon submission
                    </Text>
                  </View>
                </View>

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Community Severity</Text>
                  <Text style={styles.reviewValue}>{severity}</Text>
                </View>

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>District & Block</Text>
                  <Text style={styles.reviewValue}>
                    {currentDistrictName} · {currentBlockName}
                  </Text>
                </View>

                {villageLocality ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Locality</Text>
                    <Text style={styles.reviewValue}>{villageLocality}</Text>
                  </View>
                ) : null}

                {latitude && longitude ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>GPS Coordinates</Text>
                    <Text style={styles.reviewValue}>
                      {latitude}, {longitude}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Attached Evidence</Text>
                  <Text style={styles.reviewValue}>{evidenceList.length} file(s)</Text>
                </View>
              </Card>

              <Button
                title="Submit Problem Report"
                icon={<Ionicons name="send" size={16} color={theme.colors.textInverse} />}
                onPress={handleFinalSubmit}
                loading={submitting}
                size="lg"
                style={styles.stepButton}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex1: {
    flex: 1,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: theme.colors.border,
    width: '100%',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  stepHeading: {
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  stepSubheading: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  stepButton: {
    marginTop: theme.spacing.lg,
  },
  multilingualBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  multilingualBannerText: {
    flex: 1,
    fontSize: theme.typography.size.xs,
    color: theme.colors.primaryDark,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.destructive50,
    borderWidth: 1,
    borderColor: theme.colors.destructiveLight,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: theme.typography.size.xs,
    color: theme.colors.destructiveDark,
    lineHeight: 16,
  },
  aiNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  aiNoticeContent: {
    flex: 1,
  },
  aiNoticeTitle: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.primaryDark,
    marginBottom: 2,
  },
  aiNoticeText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.primaryDark,
    lineHeight: 17,
  },
  aiReviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  aiReviewBadgeText: {
    fontSize: 11,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.primaryDark,
  },
  severityContainer: {
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  severityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  severityCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary50,
  },
  severityRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  severityRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  severityTextContainer: {
    flex: 1,
  },
  severityTitle: {
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
  },
  severityDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  gpsContainer: {
    marginBottom: theme.spacing.md,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  gpsButtonText: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.primary,
  },
  gpsStatusText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  horizontalPills: {
    gap: 8,
    paddingVertical: 4,
  },
  districtPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  districtPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  districtPillText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textSecondary,
  },
  districtPillTextActive: {
    color: theme.colors.textInverse,
    fontWeight: theme.typography.weight.bold,
  },
  helperNotice: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  mediaOptionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  mediaOptionText: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.text,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing.sm,
  },
  uploadingText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.primary,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  evidenceThumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  evidenceThumbnail: {
    width: '100%',
    height: '100%',
  },
  deleteThumbnailButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEvidenceNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  noEvidenceText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
  reviewCard: {
    marginBottom: theme.spacing.md,
  },
  reviewTitle: {
    fontSize: theme.typography.size.base,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  reviewDesc: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  reviewLabel: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
  },
  reviewValue: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.text,
  },
  successContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  successIconCircle: {
    marginBottom: theme.spacing.md,
  },
  successTitle: {
    fontSize: theme.typography.size.xl,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  successCard: {
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  successCardTitle: {
    fontSize: theme.typography.size.base,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  successMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  successLocation: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
  },
  successNextSteps: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  successButton: {
    width: '100%',
    marginBottom: theme.spacing.sm,
  },
  homeButton: {
    width: '100%',
  },
  authGateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  authGateTitle: {
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: 6,
  },
  authGateDesc: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: theme.spacing.lg,
  },
  authGateButton: {
    minWidth: 150,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceShortcutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  voiceShortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceShortcutTitle: {
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  voiceShortcutSubtitle: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
});
