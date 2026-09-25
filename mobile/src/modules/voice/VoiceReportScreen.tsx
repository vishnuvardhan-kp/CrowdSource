import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ConversationUiState,
  VoiceAnalysisResult,
  DistrictItem,
  BlockItem,
  SamadhanSeverity,
  ChallengeItem,
  VoiceChallengeAdapter,
  VoiceLocationProvider,
} from './voice-types';
import { voiceRecorder } from './voice-recording';
import { voiceApi } from './voice-api';
import { samadhanVoiceChallengeAdapter } from './voice-challenge-adapter';
import { locationsApi } from '../../api/locations';
import { theme } from '../../constants/theme';
import { useTranslation } from '../../context/I18nContext';

export interface VoiceReportScreenProps {
  adapter?: VoiceChallengeAdapter;
  locationProvider?: VoiceLocationProvider;
  onConfirmed?: (report: ChallengeItem) => void;
  onCancel?: () => void;
}

export function VoiceReportScreen({
  adapter = samadhanVoiceChallengeAdapter,
  locationProvider,
  onConfirmed,
  onCancel,
}: VoiceReportScreenProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [state, setState] = useState<ConversationUiState>('idle');
  const [durationSec, setDurationSec] = useState<number>(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Administrative boundary data
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [villageLocality, setVillageLocality] = useState<string>('');

  // Pending block ID from voice analysis — applied once blocks load for the district
  const pendingBlockId = useRef<string | null>(null);

  // Structured problem interpretation
  const [analysis, setAnalysis] = useState<VoiceAnalysisResult | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedDescription, setEditedDescription] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<SamadhanSeverity>(SamadhanSeverity.MODERATE);
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);

  // Answering turn state
  const [answerInputText, setAnswerInputText] = useState<string>('');

  // Recording pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<any>(null);

  // 1. Fetch Districts
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const data = locationProvider
          ? await locationProvider.getDistricts()
          : await locationsApi.getDistricts();
        setDistricts(data || []);
      } catch (e) {
        console.warn('[VoiceReportScreen] Failed to load districts:', e);
      }
    };
    fetchDistricts();
  }, [locationProvider]);

  // 2. Fetch Blocks when District changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setBlocks([]);
      setSelectedBlockId('');
      return;
    }
    const fetchBlocks = async () => {
      try {
        const data = locationProvider
          ? await locationProvider.getBlocks(selectedDistrictId)
          : await locationsApi.getBlocks(selectedDistrictId);
        setBlocks(data || []);
        // Apply pending block ID from voice analysis result (race condition: block was set before blocks loaded)
        if (pendingBlockId.current) {
          const matched = (data || []).find((b: BlockItem) => b.id === pendingBlockId.current);
          if (matched) {
            setSelectedBlockId(matched.id);
          }
          pendingBlockId.current = null;
        }
      } catch (e) {
        console.warn('[VoiceReportScreen] Failed to load blocks:', e);
      }
    };
    fetchBlocks();
  }, [selectedDistrictId, locationProvider]);

  // 3. Audio Cleanup & Permission on unmount
  useEffect(() => {
    voiceRecorder.requestPermissions().catch(() => {});
    return () => {
      voiceRecorder.stopPlayback().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 4. Pulse animation during recording
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (state === 'recording' || state === 'recording_answer') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (pulseLoop) pulseLoop.stop();
    };
  }, [state, pulseAnim]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      setErrorMessage(null);
      setDurationSec(0);

      await voiceRecorder.startRecording((recordingState) => {
        setDurationSec(Math.floor(recordingState.durationMillis / 1000));
      });

      setState('recording');
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('permission')) {
        setState('permission_denied');
      } else {
        setErrorMessage(err.message || t('voice.couldNotStartMic', 'Could not start microphone'));
        setState('error');
      }
    }
  };

  const handleStopRecording = async (customSpeechHint?: string) => {
    try {
      setState('processing');
      let uri = audioUri;
      let totalSeconds = durationSec;

      if (!customSpeechHint) {
        uri = await voiceRecorder.stopRecording();
        setAudioUri(uri);
        setDurationSec(totalSeconds);

        if (!uri) {
          throw new Error(t('voice.noAudioCaptured', 'No audio was captured. Please check microphone permissions and try again.'));
        }
      }

      // Process voice recording with entity extraction
      const result = await voiceApi.processVoiceRecording(
        uri || '',
        totalSeconds || 5,
        districts,
        customSpeechHint,
      );

      setAnalysis(result);
      setEditedTitle(result.title);
      setEditedDescription(result.description);
      setSelectedSeverity(result.citizen_severity || SamadhanSeverity.MODERATE);

      if (result.districtId) {
        // Store block ID BEFORE setting district so the blocks useEffect can apply it once loaded
        if (result.blockId) {
          pendingBlockId.current = result.blockId;
        }
        setSelectedDistrictId(result.districtId);
      }
      if (result.blockId && !result.districtId) {
        // District already selected — block list is already loaded, set directly
        setSelectedBlockId(result.blockId);
      }
      if (result.villageLocality) {
        setVillageLocality(result.villageLocality);
      }

      // If both District and Block/Constituency are present, ready for confirmation
      const hasBothLocation = Boolean(
        result.districtId && (result.blockId || pendingBlockId.current)
      );
      if (hasBothLocation || (!result.isDistrictMissing && !result.isConstituencyMissing)) {
        setState('ready_for_confirmation');
      } else {
        setState('asking');
      }
    } catch (err: any) {
      console.warn('[VoiceReportScreen] handleStopRecording error:', err?.message || err);
      setErrorMessage(err.message || t('voice.genericError', 'Failed to analyze voice recording'));
      setState('error');
    }
  };

  const handleStartRecordingAnswer = async () => {
    try {
      setErrorMessage(null);
      setDurationSec(0);
      await voiceRecorder.startRecording((recordingState) => {
        setDurationSec(Math.floor(recordingState.durationMillis / 1000));
      });
      setState('recording_answer');
    } catch (err: any) {
      setErrorMessage(err.message || t('voice.couldNotStartMic', 'Could not start microphone for answer'));
    }
  };

  const handleStopRecordingAnswer = async (customAnswerHint?: string) => {
    if (!analysis) return;
    try {
      setState('processing');
      let newUri = audioUri;
      if (!customAnswerHint) {
        newUri = await voiceRecorder.stopRecording();
        if (!newUri && !answerInputText.trim()) {
          throw new Error(t('voice.noAnswerAudio', 'No audio was captured for your answer. Please try again.'));
        }
      }

      const updated = await voiceApi.processFollowUpAnswer(
        analysis,
        newUri || '',
        districts,
        customAnswerHint || answerInputText.trim() || undefined,
      );

      setAnalysis(updated);
      setAnswerInputText('');

      if (!audioUri && newUri) {
        setAudioUri(newUri);
      }

      if (updated.title && (!editedTitle || editedTitle.trim().length === 0)) {
        setEditedTitle(updated.title);
      }
      if (updated.description && (!editedDescription || editedDescription.trim().length === 0)) {
        setEditedDescription(updated.description);
      }

      if (updated.districtId && updated.districtId !== selectedDistrictId) {
        // District changed — store block ID first so blocks useEffect can apply it after loading
        if (updated.blockId) {
          pendingBlockId.current = updated.blockId;
        }
        setSelectedDistrictId(updated.districtId);
      } else if (updated.blockId) {
        // Same district — blocks already loaded, set directly
        setSelectedBlockId(updated.blockId);
      }
      if (updated.villageLocality) {
        setVillageLocality(updated.villageLocality);
      }

      const hasResolvedLocation = Boolean(
        (updated.districtId || selectedDistrictId) &&
        (updated.blockId || selectedBlockId || pendingBlockId.current)
      );

      if (hasResolvedLocation || (!updated.isDistrictMissing && !updated.isConstituencyMissing)) {
        setState('ready_for_confirmation');
      } else {
        setState('asking');
      }
    } catch (err: any) {
      console.error('[VoiceReportScreen] handleStopRecordingAnswer error:', err);
      setErrorMessage(err.message || t('voice.genericError', 'Failed to process answer turn'));
      setState('asking');
    }
  };

  const handleSkipQuestion = () => {
    setState('ready_for_confirmation');
  };

  const handleTogglePlayAudio = async () => {
    if (!audioUri) return;
    if (isPlaying) {
      await voiceRecorder.stopPlayback();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      await voiceRecorder.playUri(audioUri);
      setIsPlaying(false);
    }
  };

  const handleConfirmAndSubmit = async () => {
    if (!analysis) return;

    if (!selectedDistrictId) {
      Alert.alert(
        t('voice.districtRequiredTitle', 'District Required'),
        t('voice.districtRequiredMsg', 'Please select a District so local officials can act.'),
      );
      return;
    }

    if (!selectedBlockId) {
      Alert.alert(
        t('voice.blockRequiredTitle', 'Block Required'),
        t('voice.blockRequiredMsg', 'Please select a Block / Constituency for this report.'),
      );
      return;
    }

    try {
      setState('submitting');

      // Build a full description: English problem statement + original transcript for non-English languages
      const englishDesc = (editedDescription.trim() || analysis.description || '').trim();
      let fullDescription = englishDesc;
      if (
        analysis.detectedLanguage &&
        analysis.detectedLanguage !== 'en' &&
        analysis.originalTranscript &&
        !englishDesc.includes(analysis.originalTranscript.slice(0, 30))
      ) {
        fullDescription = `${englishDesc}\n\n[Citizen's Voice Input (${analysis.languageName || analysis.detectedLanguage})]: ${analysis.originalTranscript}`;
      }

      const draft = await adapter.createDraft({
        title: editedTitle.trim() || analysis.title,
        description: fullDescription,
        district_id: selectedDistrictId,
        block_id: selectedBlockId,
        village_locality: villageLocality.trim() || analysis.villageLocality || undefined,
        citizen_severity: selectedSeverity,
        category: analysis.category || analysis.domain || undefined,
        domain: analysis.domain || undefined,
        sub_domain: analysis.subDomain || undefined,
        original_language: analysis.detectedLanguage,
        original_text: analysis.originalTranscript,
      });

      const submitted = await adapter.submitChallenge(draft.id);

      // Clean up temporary audio file from cache for privacy protection
      await voiceRecorder.cleanupAudio(audioUri);

      setCreatedReportId(submitted.id);
      setState('success');

      if (onConfirmed) {
        onConfirmed(submitted);
      }
    } catch (err: any) {
      console.error('[VoiceReportScreen] Submission error:', err);
      let userFriendlyTitle = t('common.error', 'Submission Error');
      const rawMsg = err.message || '';
      let msg = rawMsg || t('voice.genericError', 'Failed to submit voice report');

      const isRateLimit =
        err.status === 429 ||
        (typeof rawMsg === 'string' &&
          (rawMsg.toLowerCase().includes('daily challenge submission limit') ||
            rawMsg.toLowerCase().includes('maximum 5 submissions') ||
            rawMsg.toLowerCase().includes('too many requests')));

      if (isRateLimit) {
        userFriendlyTitle = t('voice.dailyLimitReachedTitle', 'Daily Submission Limit Reached');
        msg = t(
          'voice.dailyLimitReachedMsg',
          'You have reached the maximum limit of 5 challenge submissions per 24 hours. Please try again tomorrow.',
        );
      }

      setErrorMessage(msg);
      setState('ready_for_confirmation');
      Alert.alert(userFriendlyTitle, msg);
    }
  };

  const handleReset = async () => {
    await voiceRecorder.cleanupAudio(audioUri);
    setState('idle');
    setDurationSec(0);
    setAudioUri(null);
    setAnalysis(null);
    setEditedTitle('');
    setEditedDescription('');
    setErrorMessage(null);
    setCreatedReportId(null);
    setSelectedDistrictId('');
    setSelectedBlockId('');
    setVillageLocality('');
    setAnswerInputText('');
  };

  const handleCancelAndBack = async () => {
    await voiceRecorder.cleanupAudio(audioUri);
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancelAndBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('voice.screenTitle', 'Citizen Voice Report')}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/report/new')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.switchModeText, { color: theme.colors.primary }]}>
            {t('voice.switchToText', 'Use Form')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* State: IDLE */}
        {state === 'idle' && (
          <View style={styles.centerContainer}>
            <View style={[styles.micCircle, { backgroundColor: theme.colors.primaryLight + '20', borderColor: theme.colors.primary }]}>
              <Ionicons name="mic" size={54} color={theme.colors.primary} />
            </View>
            <Text style={[styles.mainHeading, { color: theme.colors.text }]}>
              {t('voice.speakPrompt', 'Speak Your Problem in Your Mother Tongue')}
            </Text>
            <Text style={[styles.mainSubtext, { color: theme.colors.textSecondary }]}>
              {t(
                'voice.instructions',
                'Speak naturally in Hindi, English, Santhali, Nagpuri, or your local language. Our AI will transcribe, translate, and format your civic report accurately.',
              )}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleStartRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="mic-circle" size={28} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>
                {t('voice.startRecording', 'Tap to Speak')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textAlternativeLink}
              onPress={() => router.replace('/report/new')}
            >
              <Text style={[styles.textAlternativeText, { color: theme.colors.textSecondary }]}>
                {t('voice.preferForm', 'Prefer typing? Tap to use the step-by-step form')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: RECORDING */}
        {state === 'recording' && (
          <View style={styles.centerContainer}>
            <Animated.View
              style={[
                styles.micCircleActive,
                {
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: theme.colors.destructive + '20',
                  borderColor: theme.colors.destructive,
                },
              ]}
            >
              <Ionicons name="mic" size={58} color={theme.colors.destructive} />
            </Animated.View>

            <Text style={[styles.recordingTimer, { color: theme.colors.destructive }]}>
              {formatTimer(durationSec)}
            </Text>
            <Text style={[styles.mainHeading, { color: theme.colors.text }]}>
              {t('voice.listening', 'Listening to you...')}
            </Text>
            <Text style={[styles.mainSubtext, { color: theme.colors.textSecondary }]}>
              {t(
                'voice.speakingTip',
                'Describe what happened, where it happened, and how many people are affected.',
              )}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: theme.colors.destructive }]}
              onPress={() => handleStopRecording()}
              activeOpacity={0.8}
            >
              <Ionicons name="stop-circle" size={26} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>
                {t('voice.stopAndProcess', 'Done Speaking')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: PROCESSING */}
        {state === 'processing' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.processingHeading, { color: theme.colors.text }]}>
              {t('voice.processingHeading', 'Transcribing & Analyzing...')}
            </Text>
            <Text style={[styles.mainSubtext, { color: theme.colors.textSecondary }]}>
              {t(
                'voice.processingSteps',
                'Running Speech-to-Text, translating to English, and structuring civic facts with Problem Intelligence.',
              )}
            </Text>
          </View>
        )}

        {/* State: ASKING (Clarification turn) */}
        {state === 'asking' && analysis && (
          <View style={styles.flowContainer}>
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.tagRow}>
                <Ionicons name="help-circle" size={18} color={theme.colors.primary} />
                <Text style={[styles.tagText, { color: theme.colors.primary }]}>
                  {t('voice.clarificationNeeded', 'Clarification Needed')}
                </Text>
              </View>

              <Text style={[styles.questionText, { color: theme.colors.text }]}>
                {analysis.followUpQuestion ||
                  t('voice.defaultQuestion', 'Could you please specify which District and Block this issue is located in?')}
              </Text>

              <View style={styles.missingBadgeRow}>
                {analysis.isDistrictMissing && (
                  <View style={[styles.missingBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Text style={[styles.missingBadgeText, { color: theme.colors.accent }]}>
                      {t('voice.missingDistrict', 'Missing: District')}
                    </Text>
                  </View>
                )}
                {analysis.isConstituencyMissing && (
                  <View style={[styles.missingBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Text style={[styles.missingBadgeText, { color: theme.colors.accent }]}>
                      {t('voice.missingBlock', 'Missing: Block / Constituency')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleStartRecordingAnswer}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={24} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>
                {t('voice.answerByVoice', 'Speak Answer')}
              </Text>
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.orText, { color: theme.colors.textSecondary }]}>{t('common.or', 'OR')}</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
              placeholder={t('voice.typeAnswerPlaceholder', 'Type your answer here...')}
              placeholderTextColor={theme.colors.textSecondary}
              value={answerInputText}
              onChangeText={setAnswerInputText}
            />

            {answerInputText.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
                onPress={() => handleStopRecordingAnswer(answerInputText.trim())}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                  {t('voice.submitTypedAnswer', 'Submit Text Answer')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.skipButton} onPress={handleSkipQuestion}>
              <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
                {t('voice.skipAndPickManually', 'Skip and select location manually')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: RECORDING ANSWER */}
        {state === 'recording_answer' && (
          <View style={styles.centerContainer}>
            <Animated.View
              style={[
                styles.micCircleActive,
                {
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: theme.colors.destructive + '20',
                  borderColor: theme.colors.destructive,
                },
              ]}
            >
              <Ionicons name="mic" size={54} color={theme.colors.destructive} />
            </Animated.View>

            <Text style={[styles.recordingTimer, { color: theme.colors.destructive }]}>
              {formatTimer(durationSec)}
            </Text>
            <Text style={[styles.mainHeading, { color: theme.colors.text }]}>
              {t('voice.recordingAnswer', 'Listening to your answer...')}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: theme.colors.destructive }]}
              onPress={() => handleStopRecordingAnswer()}
              activeOpacity={0.8}
            >
              <Ionicons name="stop-circle" size={26} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>
                {t('voice.doneSpeaking', 'Done Speaking')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: READY FOR CONFIRMATION */}
        {state === 'ready_for_confirmation' && analysis && (
          <View style={styles.flowContainer}>
            {errorMessage && (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.destructive + '15',
                    borderColor: theme.colors.destructive,
                    marginBottom: 12,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons
                    name="alert-circle"
                    size={22}
                    color={theme.colors.destructive}
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: theme.colors.destructive,
                        fontWeight: '700',
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      {errorMessage.toLowerCase().includes('limit') ||
                      errorMessage.toLowerCase().includes('வரம்பு')
                        ? t('voice.dailyLimitReachedTitle', 'Daily Submission Limit Reached')
                        : t('common.error', 'Submission Error')}
                    </Text>
                    <Text style={{ color: theme.colors.text, fontSize: 13, lineHeight: 18 }}>
                      {errorMessage}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Dual Transcript Card */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="chatbox-ellipses" size={18} color={theme.colors.primary} />
                  <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>
                    {t('voice.transcriptionTitle', 'Spoken Voice Transcripts')}
                  </Text>
                </View>
                {audioUri && (
                  <TouchableOpacity
                    style={[styles.audioPlayButton, { backgroundColor: theme.colors.primaryLight + '20' }]}
                    onPress={handleTogglePlayAudio}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={[styles.audioPlayText, { color: theme.colors.primary }]}>
                      {isPlaying ? t('common.pause', 'Pause') : t('voice.listenAudio', 'Listen')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Native Language Transcript */}
              <View style={[styles.transcriptBox, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.transcriptMetaLabel, { color: theme.colors.textSecondary }]}>
                  {t('voice.originalTranscript', 'Original Spoken')} ({analysis.languageName || analysis.detectedLanguage})
                </Text>
                <Text style={[styles.transcriptText, { color: theme.colors.text }]}>
                  "{analysis.originalTranscript}"
                </Text>
              </View>

              {/* English Translation */}
              <View style={[styles.transcriptBox, { backgroundColor: theme.colors.background, marginTop: 8 }]}>
                <Text style={[styles.transcriptMetaLabel, { color: theme.colors.textSecondary }]}>
                  {t('voice.englishTranslation', 'English Translation')}
                </Text>
                <Text style={[styles.transcriptText, { color: theme.colors.text }]}>
                  "{analysis.englishTranslation}"
                </Text>
              </View>
            </View>

            {/* AI Problem Intelligence Card */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
                  <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>
                    {t('voice.structuredProblem', 'Interpreted Problem Report')}
                  </Text>
                </View>
                {analysis.domain && (
                  <View style={[styles.domainBadge, { backgroundColor: theme.colors.primaryLight + '20' }]}>
                    <Text style={[styles.domainBadgeText, { color: theme.colors.primary }]}>
                      {analysis.domain} {analysis.subDomain ? `• ${analysis.subDomain}` : ''}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                {t('voice.fieldTitle', 'Report Title')} *
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={editedTitle}
                onChangeText={setEditedTitle}
                multiline={true}
                numberOfLines={2}
              />

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                {t('voice.fieldDescription', 'Problem Description')} *
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={editedDescription}
                onChangeText={setEditedDescription}
                multiline
                numberOfLines={4}
              />

              {/* Verified Facts */}
              {analysis.facts && (
                <View style={styles.factsContainer}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                    {t('voice.extractedFacts', 'Verified Problem Facts')}
                  </Text>
                  <View style={styles.factsGrid}>
                    {analysis.facts.what_is_happening && (
                      <View style={[styles.factBadge, { backgroundColor: theme.colors.primaryLight + '20' }]}>
                        <Text style={[styles.factLabel, { color: theme.colors.primary }]}>Issue:</Text>
                        <Text style={[styles.factVal, { color: theme.colors.text }]}>{analysis.facts.what_is_happening}</Text>
                      </View>
                    )}
                    {analysis.facts.affected_population && (
                      <View style={[styles.factBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                        <Text style={[styles.factLabel, { color: theme.colors.accent }]}>Affected:</Text>
                        <Text style={[styles.factVal, { color: theme.colors.text }]}>{analysis.facts.affected_population} people</Text>
                      </View>
                    )}
                    {analysis.facts.duration && (
                      <View style={[styles.factBadge, { backgroundColor: theme.colors.background }]}>
                        <Text style={[styles.factLabel, { color: theme.colors.textSecondary }]}>Duration:</Text>
                        <Text style={[styles.factVal, { color: theme.colors.text }]}>{analysis.facts.duration}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Location Selection */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="location" size={18} color={theme.colors.primary} />
                  <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>
                    {t('voice.locationDetails', 'Administrative Location')}
                  </Text>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                {t('voice.district', 'District')} *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {districts.map((d: DistrictItem) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.chip,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
                      selectedDistrictId === d.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                    ]}
                    onPress={() => setSelectedDistrictId(d.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.colors.text },
                        selectedDistrictId === d.id && { color: '#FFFFFF', fontWeight: 'bold' },
                      ]}
                    >
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                {t('voice.block', 'Block / Constituency')} *
              </Text>
              {blocks.length === 0 ? (
                <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                  {selectedDistrictId
                    ? t('voice.loadingBlocks', 'Loading blocks...')
                    : t('voice.selectDistrictFirst', 'Select a district first to view blocks.')}
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {blocks.map((b: BlockItem) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[
                        styles.chip,
                        { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
                        selectedBlockId === b.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                      ]}
                      onPress={() => setSelectedBlockId(b.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: theme.colors.text },
                          selectedBlockId === b.id && { color: '#FFFFFF', fontWeight: 'bold' },
                        ]}
                      >
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                {t('voice.villageLocality', 'Village / Locality')}
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder={t('voice.villagePlaceholder', 'e.g. Rampur, Main Chowk')}
                placeholderTextColor={theme.colors.textSecondary}
                value={villageLocality}
                onChangeText={setVillageLocality}
              />
            </View>

            {/* Severity Rating (Mapped directly to SamadhanSetu's CitizenSeverity) */}
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                {t('voice.severity', 'Citizen Severity Rating')}
              </Text>
              <View style={styles.severityRow}>
                {[
                  { level: SamadhanSeverity.NOT_SURE, label: t('wizard.severity_not_sure', 'Noticeable / Unsure'), color: '#3B82F6' },
                  { level: SamadhanSeverity.MODERATE, label: t('wizard.severity_moderate', 'Moderate Impact'), color: '#F59E0B' },
                  { level: SamadhanSeverity.SERIOUS, label: t('wizard.severity_serious', 'Urgent / Serious'), color: '#EF4444' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.level}
                    style={[
                      styles.severityChip,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
                      selectedSeverity === s.level && {
                        borderColor: s.color,
                        backgroundColor: s.color + '15',
                      },
                    ]}
                    onPress={() => setSelectedSeverity(s.level)}
                  >
                    <Text
                      style={[
                        styles.severityChipText,
                        { color: theme.colors.textSecondary },
                        selectedSeverity === s.level && {
                          color: s.color,
                          fontWeight: 'bold',
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Confirmation Actions */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleConfirmAndSubmit}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {t('voice.confirmAndSubmit', 'Confirm & Register Report')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.restartButton} onPress={handleReset}>
              <Text style={[styles.restartButtonText, { color: theme.colors.destructive }]}>
                {t('voice.startOver', 'Start Over / Re-record')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: SUBMITTING */}
        {state === 'submitting' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.processingHeading, { color: theme.colors.text }]}>
              {t('voice.registeringChallenge', 'Registering Problem Statement...')}
            </Text>
            <Text style={[styles.mainSubtext, { color: theme.colors.textSecondary }]}>
              {t(
                'voice.registeringSteps',
                'Creating civic challenge draft and publishing to public administrative dashboard.',
              )}
            </Text>
          </View>
        )}

        {/* State: SUCCESS */}
        {state === 'success' && (
          <View style={styles.centerContainer}>
            <View style={[styles.successCircle, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
              <Ionicons name="checkmark" size={60} color={theme.colors.primary} />
            </View>
            <Text style={[styles.mainHeading, { color: theme.colors.text }]}>
              {t('voice.successHeading', 'Problem Report Registered!')}
            </Text>
            <Text style={[styles.mainSubtext, { color: theme.colors.textSecondary }]}>
              {t(
                'voice.successMsg',
                'Your voice complaint has been structured, translated, and registered in the ResolvIN portal.',
              )}
            </Text>

            {createdReportId && (
              <View style={[styles.reportIdBadge, { backgroundColor: theme.colors.primaryLight + '20' }]}>
                <Text style={[styles.reportIdLabel, { color: theme.colors.primary }]}>
                  {t('voice.reportId', 'Tracking ID:')}
                </Text>
                <Text style={[styles.reportIdValue, { color: theme.colors.text }]}>{createdReportId}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.replace('/(tabs)/reports')}
              activeOpacity={0.8}
            >
              <Text style={styles.recordButtonText}>
                {t('voice.returnHome', 'View My Submissions')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: ERROR */}
        {state === 'error' && (
          <View style={styles.centerContainer}>
            <View style={[styles.errorCircle, { backgroundColor: theme.colors.destructive + '20', borderColor: theme.colors.destructive }]}>
              <Ionicons name="alert-circle" size={54} color={theme.colors.destructive} />
            </View>
            <Text style={[styles.mainHeading, { color: theme.colors.text }]}>
              {t('voice.errorHeading', 'Could Not Complete Request')}
            </Text>
            <Text style={[styles.errorSubtext, { color: theme.colors.destructive }]}>
              {errorMessage || t('voice.genericError', 'An unexpected error occurred.')}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={22} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>
                {t('voice.tryAgain', 'Try Again')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: theme.colors.primary, marginTop: 12 }]}
              onPress={() => {
                if (onCancel) {
                  onCancel();
                } else {
                  router.back();
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
                {t('voice.manualEntry', 'Enter Problem Manually')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: PERMISSION DENIED */}
        {state === 'permission_denied' && (
          <View style={styles.centerContainer}>
            <View style={[styles.errorCircle, { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }]}>
              <Ionicons name="mic-off" size={54} color={theme.colors.accent} />
            </View>
            <Text style={[styles.mainHeading, { color: theme.colors.text }]}>
              {t('voice.permissionDeniedHeading', 'Microphone Permission Needed')}
            </Text>
            <Text style={[styles.errorSubtext, { color: theme.colors.textSecondary }]}>
              {t('voice.permissionDeniedMsg', 'Please grant microphone access in your device settings to use voice problem reporting.')}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleStartRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={22} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>
                {t('voice.tryAgain', 'Grant Permission')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textAlternativeLink}
              onPress={() => router.replace('/report/new')}
            >
              <Text style={[styles.textAlternativeText, { color: theme.colors.primary }]}>
                {t('voice.switchToText', 'Switch to standard text report')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  switchModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  flowContainer: {
    gap: 16,
    paddingBottom: 40,
  },
  micCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  micCircleActive: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  recordingTimer: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  mainHeading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  mainSubtext: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 26,
    paddingHorizontal: 12,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    elevation: 3,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  textAlternativeLink: {
    marginTop: 20,
    paddingVertical: 8,
  },
  textAlternativeText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  processingHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  domainBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  domainBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  audioPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  audioPlayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transcriptBox: {
    borderRadius: 8,
    padding: 12,
  },
  transcriptMetaLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  factsContainer: {
    marginTop: 4,
  },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  factBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  factVal: {
    fontSize: 12,
  },
  chipScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
  },
  hintText: {
    fontSize: 12,
    marginVertical: 6,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  severityChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  restartButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  restartButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 12,
  },
  missingBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  missingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  missingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 13,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  reportIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 24,
  },
  reportIdLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  reportIdValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
