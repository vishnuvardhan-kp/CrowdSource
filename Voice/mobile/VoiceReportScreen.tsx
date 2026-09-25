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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ConversationUiState,
  VoiceAnalysisResult,
  DistrictItem,
  BlockItem,
  CitizenSeverity,
  ChallengeItem,
  VoiceChallengeAdapter,
  VoiceLocationProvider,
} from './voice-types';
import { voiceRecorder } from './voice-recording';
import { voiceApi } from './voice-api';
import { DEFAULT_VOICE_THEME, VoiceTheme } from './voice-theme';

export interface VoiceReportScreenProps {
  adapter?: VoiceChallengeAdapter;
  locationProvider?: VoiceLocationProvider;
  onConfirmed?: (report: ChallengeItem) => void;
  onCancel?: () => void;
  t?: (key: string, fallback?: string) => string;
  theme?: Partial<VoiceTheme>;
}

export function VoiceReportScreen({
  adapter,
  locationProvider,
  onConfirmed,
  onCancel,
  t: customT,
  theme: customTheme,
}: VoiceReportScreenProps) {
  // Theme & Translation helpers
  const activeTheme = { ...DEFAULT_VOICE_THEME, ...customTheme };
  const t = customT || ((_key: string, fallback?: string) => fallback || _key);

  const [state, setState] = useState<ConversationUiState>('idle');
  const [durationSec, setDurationSec] = useState<number>(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Locations data
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [villageLocality, setVillageLocality] = useState<string>('');

  // Voice Analysis & Structured Problem Details (Dual transcript + entities)
  const [analysis, setAnalysis] = useState<VoiceAnalysisResult | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedDescription, setEditedDescription] = useState<string>('');
  const [createdReportId, setCreatedReportId] = useState<string | null>(null);

  // Answering Turn state
  const [answerInputText, setAnswerInputText] = useState<string>('');

  // Animation for pulse effect while recording
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (locationProvider) {
      locationProvider
        .getDistricts()
        .then((data) => setDistricts(data))
        .catch((e) => console.warn('[VoiceReportScreen] Failed to load districts:', e));
    }
  }, [locationProvider]);

  useEffect(() => {
    if (!selectedDistrictId) {
      setBlocks([]);
      setSelectedBlockId('');
      return;
    }
    if (locationProvider) {
      locationProvider
        .getBlocks(selectedDistrictId)
        .then((data) => setBlocks(data))
        .catch((e) => console.warn('[VoiceReportScreen] Failed to load blocks:', e));
    }
  }, [selectedDistrictId, locationProvider]);

  useEffect(() => {
    voiceRecorder.requestPermissions().catch(() => {});
    return () => {
      voiceRecorder.stopPlayback().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Pulse animation control
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
      if (err.message && err.message.includes('permission')) {
        setState('permission_denied');
      } else {
        setErrorMessage(err.message || 'Could not start microphone');
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
          throw new Error('No audio was captured. Please check microphone permissions and try again.');
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

      if (result.districtId) {
        setSelectedDistrictId(result.districtId);
      }
      if (result.blockId) {
        setSelectedBlockId(result.blockId);
      }
      if (result.villageLocality) {
        setVillageLocality(result.villageLocality);
      }

      // If both District and Block/Constituency are present, ready for confirmation
      if (!result.isDistrictMissing && !result.isConstituencyMissing) {
        setState('ready_for_confirmation');
      } else {
        setState('asking');
      }
    } catch (err: any) {
      console.error('[VoiceReportScreen] handleStopRecording error:', err);
      setErrorMessage(err.message || 'Failed to analyze voice recording');
      setState('error');
    }
  };

  // Follow-up Answering Turn (multi-turn state accumulation)
  const handleStartRecordingAnswer = async () => {
    try {
      setErrorMessage(null);
      setDurationSec(0);
      await voiceRecorder.startRecording((recordingState) => {
        setDurationSec(Math.floor(recordingState.durationMillis / 1000));
      });
      setState('recording_answer');
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not start microphone for answer');
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
          throw new Error('No audio was captured for your answer. Please try again.');
        }
      }

      // Accumulate / merge state
      const updated = await voiceApi.processFollowUpAnswer(
        analysis,
        newUri || '',
        districts,
        customAnswerHint || answerInputText.trim() || undefined,
      );

      setAnalysis(updated);
      setAnswerInputText('');

      if (updated.districtId) {
        setSelectedDistrictId(updated.districtId);
      }
      if (updated.blockId) {
        setSelectedBlockId(updated.blockId);
      }
      if (updated.villageLocality) {
        setVillageLocality(updated.villageLocality);
      }

      if (updated.isDistrictMissing || updated.isConstituencyMissing) {
        setState('asking');
      } else {
        setState('ready_for_confirmation');
      }
    } catch (err: any) {
      console.error('[VoiceReportScreen] handleStopRecordingAnswer error:', err);
      setErrorMessage(err.message || 'Failed to process answer turn');
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

      const challenge = await voiceApi.submitVoiceReport(
        {
          title: editedTitle.trim() || analysis.title,
          description: editedDescription.trim() || analysis.description,
          districtId: selectedDistrictId,
          blockId: selectedBlockId,
          villageLocality: villageLocality.trim() || analysis.villageLocality || undefined,
          citizenSeverity: analysis.citizen_severity,
          category: analysis.category || undefined,
          originalLanguage: analysis.detectedLanguage,
          originalTranscript: analysis.originalTranscript,
          englishTranslation: analysis.englishTranslation,
        },
        adapter,
      );

      setCreatedReportId(challenge.id);
      setState('success');

      if (onConfirmed) {
        onConfirmed(challenge);
      }
    } catch (err: any) {
      console.error('[VoiceReportScreen] Submission error:', err);
      setErrorMessage(err.message || 'Failed to submit voice report');
      setState('ready_for_confirmation');
    }
  };

  const handleReset = () => {
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: activeTheme.colors.card, borderColor: activeTheme.colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onCancel || (() => {})}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={activeTheme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: activeTheme.colors.text }]}>
          {t('voice.screenTitle', 'Citizen Voice Report')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* State: IDLE */}
        {state === 'idle' && (
          <View style={styles.centerContainer}>
            <View style={[styles.micCircle, { backgroundColor: activeTheme.colors.primary50, borderColor: activeTheme.colors.primaryLight }]}>
              <Ionicons name="mic" size={54} color={activeTheme.colors.primary} />
            </View>
            <Text style={[styles.mainHeading, { color: activeTheme.colors.text }]}>
              {t('voice.speakPrompt', 'Speak Your Problem in Your Mother Tongue')}
            </Text>
            <Text style={[styles.mainSubtext, { color: activeTheme.colors.textSecondary }]}>
              {t(
                'voice.instructions',
                'Speak clearly in Hindi, Tamil, Santhali, Ho, Mundari, Khortha, or English. Our AI will transcribe, translate, and format your civic report accurately.',
              )}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: activeTheme.colors.primary }]}
              onPress={handleStartRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="mic-circle" size={28} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>
                {t('voice.startRecording', 'Tap to Speak')}
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
                  backgroundColor: activeTheme.colors.error50,
                  borderColor: activeTheme.colors.error,
                },
              ]}
            >
              <Ionicons name="mic" size={58} color={activeTheme.colors.error} />
            </Animated.View>

            <Text style={[styles.recordingTimer, { color: activeTheme.colors.error }]}>
              {formatTimer(durationSec)}
            </Text>
            <Text style={[styles.mainHeading, { color: activeTheme.colors.text }]}>
              {t('voice.listening', 'Listening to you...')}
            </Text>
            <Text style={[styles.mainSubtext, { color: activeTheme.colors.textSecondary }]}>
              {t(
                'voice.speakingTip',
                'Describe what happened, where it happened, and how many people are affected.',
              )}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: activeTheme.colors.error }]}
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
            <ActivityIndicator size="large" color={activeTheme.colors.primary} />
            <Text style={[styles.processingHeading, { color: activeTheme.colors.text }]}>
              {t('voice.processingHeading', 'Transcribing & Analyzing...')}
            </Text>
            <Text style={[styles.mainSubtext, { color: activeTheme.colors.textSecondary }]}>
              {t(
                'voice.processingSteps',
                'Running Sarvam AI Speech-to-Text, translating to English, and structuring civic facts with Llama 3.2 NIM.',
              )}
            </Text>
          </View>
        )}

        {/* State: ASKING (Multi-turn follow-up) */}
        {state === 'asking' && analysis && (
          <View style={styles.flowContainer}>
            <View style={[styles.card, { backgroundColor: activeTheme.colors.card, borderColor: activeTheme.colors.border }]}>
              <View style={styles.tagRow}>
                <Ionicons name="help-circle" size={18} color={activeTheme.colors.primary} />
                <Text style={[styles.tagText, { color: activeTheme.colors.primary }]}>
                  {t('voice.clarificationNeeded', 'Clarification Needed')}
                </Text>
              </View>

              <Text style={[styles.questionText, { color: activeTheme.colors.text }]}>
                {analysis.followUpQuestion ||
                  t('voice.defaultQuestion', 'Could you please specify which District and Block this issue is located in?')}
              </Text>

              <View style={styles.missingBadgeRow}>
                {analysis.isDistrictMissing && (
                  <View style={[styles.missingBadge, { backgroundColor: activeTheme.colors.warning50 }]}>
                    <Text style={[styles.missingBadgeText, { color: activeTheme.colors.warning }]}>
                      {t('voice.missingDistrict', 'Missing: District')}
                    </Text>
                  </View>
                )}
                {analysis.isConstituencyMissing && (
                  <View style={[styles.missingBadge, { backgroundColor: activeTheme.colors.warning50 }]}>
                    <Text style={[styles.missingBadgeText, { color: activeTheme.colors.warning }]}>
                      {t('voice.missingBlock', 'Missing: Block / Constituency')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: activeTheme.colors.primary }]}
              onPress={handleStartRecordingAnswer}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={24} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>
                {t('voice.answerByVoice', 'Speak Answer')}
              </Text>
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={[styles.dividerLine, { backgroundColor: activeTheme.colors.border }]} />
              <Text style={[styles.orText, { color: activeTheme.colors.textMuted }]}>{t('common.or', 'OR')}</Text>
              <View style={[styles.dividerLine, { backgroundColor: activeTheme.colors.border }]} />
            </View>

            <TextInput
              style={[styles.textInput, { backgroundColor: activeTheme.colors.card, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }]}
              placeholder={t('voice.typeAnswerPlaceholder', 'Type your answer here...')}
              placeholderTextColor={activeTheme.colors.textMuted}
              value={answerInputText}
              onChangeText={setAnswerInputText}
            />

            {answerInputText.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: activeTheme.colors.primary }]}
                onPress={() => handleStopRecordingAnswer(answerInputText.trim())}
              >
                <Text style={[styles.secondaryButtonText, { color: activeTheme.colors.primary }]}>
                  {t('voice.submitTypedAnswer', 'Submit Text Answer')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.skipButton} onPress={handleSkipQuestion}>
              <Text style={[styles.skipButtonText, { color: activeTheme.colors.textSecondary }]}>
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
                  backgroundColor: activeTheme.colors.error50,
                  borderColor: activeTheme.colors.error,
                },
              ]}
            >
              <Ionicons name="mic" size={54} color={activeTheme.colors.error} />
            </Animated.View>

            <Text style={[styles.recordingTimer, { color: activeTheme.colors.error }]}>
              {formatTimer(durationSec)}
            </Text>
            <Text style={[styles.mainHeading, { color: activeTheme.colors.text }]}>
              {t('voice.recordingAnswer', 'Listening to your answer...')}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: activeTheme.colors.error }]}
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
            {/* Dual Transcript Card */}
            <View style={[styles.card, { backgroundColor: activeTheme.colors.card, borderColor: activeTheme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="chatbox-ellipses" size={18} color={activeTheme.colors.primary} />
                  <Text style={[styles.cardHeaderTitle, { color: activeTheme.colors.text }]}>
                    {t('voice.transcriptionTitle', 'Spoken Voice Transcripts')}
                  </Text>
                </View>
                {audioUri && (
                  <TouchableOpacity
                    style={[styles.audioPlayButton, { backgroundColor: activeTheme.colors.primary50 }]}
                    onPress={handleTogglePlayAudio}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={16}
                      color={activeTheme.colors.primary}
                    />
                    <Text style={[styles.audioPlayText, { color: activeTheme.colors.primary }]}>
                      {isPlaying ? t('common.pause', 'Pause') : t('voice.listenAudio', 'Listen')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Native Language Transcript */}
              <View style={[styles.transcriptBox, { backgroundColor: activeTheme.colors.background }]}>
                <View style={styles.transcriptMetaRow}>
                  <Text style={[styles.transcriptMetaLabel, { color: activeTheme.colors.textSecondary }]}>
                    {t('voice.originalTranscript', 'Original Spoken')} ({analysis.languageName || analysis.detectedLanguage})
                  </Text>
                </View>
                <Text style={[styles.transcriptText, { color: activeTheme.colors.text }]}>
                  "{analysis.originalTranscript}"
                </Text>
              </View>

              {/* English Translation */}
              <View style={[styles.transcriptBox, { backgroundColor: activeTheme.colors.background, marginTop: 8 }]}>
                <View style={styles.transcriptMetaRow}>
                  <Text style={[styles.transcriptMetaLabel, { color: activeTheme.colors.textSecondary }]}>
                    {t('voice.englishTranslation', 'English Translation')}
                  </Text>
                </View>
                <Text style={[styles.transcriptText, { color: activeTheme.colors.text }]}>
                  "{analysis.englishTranslation}"
                </Text>
              </View>
            </View>

            {/* AI Problem Intelligence Card */}
            <View style={[styles.card, { backgroundColor: activeTheme.colors.card, borderColor: activeTheme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="sparkles" size={18} color={activeTheme.colors.primary} />
                  <Text style={[styles.cardHeaderTitle, { color: activeTheme.colors.text }]}>
                    {t('voice.structuredProblem', 'Problem Intelligence')}
                  </Text>
                </View>
                {analysis.domain && (
                  <View style={[styles.domainBadge, { backgroundColor: activeTheme.colors.primary50 }]}>
                    <Text style={[styles.domainBadgeText, { color: activeTheme.colors.primary }]}>
                      {analysis.domain} {analysis.subDomain ? `• ${analysis.subDomain}` : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Title & Description Fields */}
              <Text style={[styles.fieldLabel, { color: activeTheme.colors.textSecondary }]}>
                {t('voice.fieldTitle', 'Report Title')}
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }]}
                value={editedTitle}
                onChangeText={setEditedTitle}
              />

              <Text style={[styles.fieldLabel, { color: activeTheme.colors.textSecondary, marginTop: 12 }]}>
                {t('voice.fieldDescription', 'Problem Description')}
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }]}
                value={editedDescription}
                onChangeText={setEditedDescription}
                multiline
                numberOfLines={4}
              />

              {/* Extracted Facts */}
              {analysis.facts && (
                <View style={styles.factsContainer}>
                  <Text style={[styles.fieldLabel, { color: activeTheme.colors.textSecondary, marginTop: 12 }]}>
                    {t('voice.extractedFacts', 'Verified Problem Facts')}
                  </Text>
                  <View style={styles.factsGrid}>
                    {analysis.facts.what_is_happening && (
                      <View style={[styles.factBadge, { backgroundColor: activeTheme.colors.primary50 }]}>
                        <Text style={[styles.factLabel, { color: activeTheme.colors.primary }]}>Issue:</Text>
                        <Text style={[styles.factVal, { color: activeTheme.colors.text }]}>{analysis.facts.what_is_happening}</Text>
                      </View>
                    )}
                    {analysis.facts.affected_population && (
                      <View style={[styles.factBadge, { backgroundColor: activeTheme.colors.warning50 }]}>
                        <Text style={[styles.factLabel, { color: activeTheme.colors.warning }]}>Affected:</Text>
                        <Text style={[styles.factVal, { color: activeTheme.colors.text }]}>{analysis.facts.affected_population} people</Text>
                      </View>
                    )}
                    {analysis.facts.duration && (
                      <View style={[styles.factBadge, { backgroundColor: activeTheme.colors.background }]}>
                        <Text style={[styles.factLabel, { color: activeTheme.colors.textSecondary }]}>Duration:</Text>
                        <Text style={[styles.factVal, { color: activeTheme.colors.text }]}>{analysis.facts.duration}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Location Resolution Card */}
            <View style={[styles.card, { backgroundColor: activeTheme.colors.card, borderColor: activeTheme.colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="location" size={18} color={activeTheme.colors.primary} />
                  <Text style={[styles.cardHeaderTitle, { color: activeTheme.colors.text }]}>
                    {t('voice.locationDetails', 'Administrative Location')}
                  </Text>
                </View>
              </View>

              {/* District Picker */}
              <Text style={[styles.fieldLabel, { color: activeTheme.colors.textSecondary }]}>
                {t('voice.district', 'District')} *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {districts.map((d: DistrictItem) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.chip,
                      { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.card },
                      selectedDistrictId === d.id && { backgroundColor: activeTheme.colors.primary, borderColor: activeTheme.colors.primary },
                    ]}
                    onPress={() => setSelectedDistrictId(d.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: activeTheme.colors.text },
                        selectedDistrictId === d.id && { color: '#FFFFFF', fontWeight: 'bold' },
                      ]}
                    >
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Block Picker */}
              <Text style={[styles.fieldLabel, { color: activeTheme.colors.textSecondary, marginTop: 12 }]}>
                {t('voice.block', 'Block / Constituency')} *
              </Text>
              {blocks.length === 0 ? (
                <Text style={[styles.hintText, { color: activeTheme.colors.textMuted }]}>
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
                        { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.card },
                        selectedBlockId === b.id && { backgroundColor: activeTheme.colors.primary, borderColor: activeTheme.colors.primary },
                      ]}
                      onPress={() => setSelectedBlockId(b.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: activeTheme.colors.text },
                          selectedBlockId === b.id && { color: '#FFFFFF', fontWeight: 'bold' },
                        ]}
                      >
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Village / Locality */}
              <Text style={[styles.fieldLabel, { color: activeTheme.colors.textSecondary, marginTop: 12 }]}>
                {t('voice.villageLocality', 'Village / Locality')}
              </Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: activeTheme.colors.background, borderColor: activeTheme.colors.border, color: activeTheme.colors.text }]}
                placeholder={t('voice.villagePlaceholder', 'e.g. Rampur, Main Chowk')}
                placeholderTextColor={activeTheme.colors.textMuted}
                value={villageLocality}
                onChangeText={setVillageLocality}
              />
            </View>

            {/* Severity Selection */}
            <View style={[styles.card, { backgroundColor: activeTheme.colors.card, borderColor: activeTheme.colors.border }]}>
              <Text style={[styles.fieldLabel, { color: activeTheme.colors.textSecondary }]}>
                {t('voice.severity', 'Citizen Severity Rating')}
              </Text>
              <View style={styles.severityRow}>
                {[
                  { level: CitizenSeverity.LOW, label: 'Low', color: '#10B981' },
                  { level: CitizenSeverity.MODERATE, label: 'Moderate', color: '#F59E0B' },
                  { level: CitizenSeverity.HIGH, label: 'High', color: '#F97316' },
                  { level: CitizenSeverity.CRITICAL, label: 'Critical', color: '#EF4444' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.level}
                    style={[
                      styles.severityChip,
                      { borderColor: activeTheme.colors.border, backgroundColor: activeTheme.colors.card },
                      analysis.citizen_severity === s.level && {
                        borderColor: s.color,
                        backgroundColor: s.color + '15',
                      },
                    ]}
                    onPress={() =>
                      setAnalysis({
                        ...analysis,
                        citizen_severity: s.level,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.severityChipText,
                        { color: activeTheme.colors.textSecondary },
                        analysis.citizen_severity === s.level && {
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

            {/* Submission Actions */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: activeTheme.colors.primary }]}
              onPress={handleConfirmAndSubmit}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {t('voice.confirmAndSubmit', 'Confirm & Register Report')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.restartButton} onPress={handleReset}>
              <Text style={[styles.restartButtonText, { color: activeTheme.colors.error }]}>
                {t('voice.startOver', 'Start Over / Re-record')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: SUBMITTING */}
        {state === 'submitting' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={activeTheme.colors.primary} />
            <Text style={[styles.processingHeading, { color: activeTheme.colors.text }]}>
              {t('voice.registeringChallenge', 'Registering Problem Statement...')}
            </Text>
            <Text style={[styles.mainSubtext, { color: activeTheme.colors.textSecondary }]}>
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
            <View style={[styles.successCircle, { backgroundColor: activeTheme.colors.success50, borderColor: activeTheme.colors.success }]}>
              <Ionicons name="checkmark" size={60} color={activeTheme.colors.success} />
            </View>
            <Text style={[styles.mainHeading, { color: activeTheme.colors.text }]}>
              {t('voice.successHeading', 'Problem Report Registered!')}
            </Text>
            <Text style={[styles.mainSubtext, { color: activeTheme.colors.textSecondary }]}>
              {t(
                'voice.successMsg',
                'Your voice complaint has been structured, translated, and registered in the SamadhanSetu portal.',
              )}
            </Text>

            {createdReportId && (
              <View style={[styles.reportIdBadge, { backgroundColor: activeTheme.colors.primary50 }]}>
                <Text style={[styles.reportIdLabel, { color: activeTheme.colors.primary }]}>
                  {t('voice.reportId', 'Tracking ID:')}
                </Text>
                <Text style={[styles.reportIdValue, { color: activeTheme.colors.text }]}>{createdReportId}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: activeTheme.colors.primary }]}
              onPress={onCancel || handleReset}
              activeOpacity={0.8}
            >
              <Text style={styles.recordButtonText}>
                {t('voice.returnHome', 'Return to Dashboard')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State: ERROR */}
        {state === 'error' && (
          <View style={styles.centerContainer}>
            <View style={[styles.errorCircle, { backgroundColor: activeTheme.colors.error50, borderColor: activeTheme.colors.error }]}>
              <Ionicons name="alert-circle" size={54} color={activeTheme.colors.error} />
            </View>
            <Text style={[styles.mainHeading, { color: activeTheme.colors.text }]}>
              {t('voice.errorHeading', 'Could Not Complete Request')}
            </Text>
            <Text style={[styles.errorSubtext, { color: activeTheme.colors.error }]}>
              {errorMessage || t('voice.genericError', 'An unexpected error occurred.')}
            </Text>

            <TouchableOpacity
              style={[styles.recordButton, { backgroundColor: activeTheme.colors.primary }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={22} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>
                {t('voice.tryAgain', 'Try Again')}
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
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
    marginBottom: 30,
    paddingHorizontal: 12,
  },
  processingHeading: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
  transcriptMetaRow: {
    marginBottom: 4,
  },
  transcriptMetaLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
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
