import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
} from 'expo-audio';
import { AudioRecordingState } from './voice-types';

/**
 * VoiceRecorder manages audio recording and playback using expo-audio.
 * Strictly outputs real M4A audio files ready for multipart upload.
 */
export class VoiceRecorder {
  private recorder: InstanceType<typeof AudioModule.AudioRecorder> | null = null;
  private soundPlayer: any = null;
  private stateChangeCallback: ((state: AudioRecordingState) => void) | null = null;
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;

  public async requestPermissions(): Promise<boolean> {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      return permission.granted;
    } catch (e) {
      console.warn('[VoiceRecorder] Failed to request audio permissions:', e);
      return false;
    }
  }

  public async startRecording(
    onStateChange?: (state: AudioRecordingState) => void,
  ): Promise<void> {
    if (onStateChange) {
      this.stateChangeCallback = onStateChange;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.notifyState(false, 0, null, false);
      throw new Error('Microphone permission not granted');
    }

    // Release any previous recorder instance
    if (this.recorder) {
      try {
        await this.recorder.stop();
      } catch (e) {}
      this.recorder = null;
    }

    // Set audio mode for recording
    try {
      await AudioModule.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    } catch (e) {
      console.warn('[VoiceRecorder] Failed to set audio mode:', e);
    }

    this.recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await this.recorder.prepareToRecordAsync();
    this.recorder.record();
    this.startTime = Date.now();

    this.notifyState(true, 0, null, true);

    this.durationInterval = setInterval(() => {
      const duration = Date.now() - this.startTime;
      this.notifyState(true, duration, null, true);
    }, 200);
  }

  public async stopRecording(): Promise<string | null> {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    if (!this.recorder) {
      return null;
    }

    try {
      await this.recorder.stop();
      const uri = this.recorder.uri;
      const duration = Date.now() - this.startTime;
      this.notifyState(false, duration, uri, true);
      this.recorder = null;
      return uri;
    } catch (e) {
      console.error('[VoiceRecorder] Error stopping recording:', e);
      this.recorder = null;
      this.notifyState(false, 0, null, true);
      return null;
    }
  }

  public async cancelRecording(): Promise<void> {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    if (this.recorder) {
      try {
        await this.recorder.stop();
      } catch (e) {}
      this.recorder = null;
    }

    this.notifyState(false, 0, null, true);
  }

  public async playUri(uri: string): Promise<void> {
    await this.stopPlayback();

    try {
      await AudioModule.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
    } catch (e) {}

    try {
      this.soundPlayer = createAudioPlayer(uri);
      this.soundPlayer.play();
    } catch (e) {
      console.error('[VoiceRecorder] Error playing audio:', e);
    }
  }

  public async stopPlayback(): Promise<void> {
    if (this.soundPlayer) {
      try {
        this.soundPlayer.pause();
      } catch (e) {}
      this.soundPlayer = null;
    }
  }

  private notifyState(
    isRecording: boolean,
    durationMillis: number,
    uri: string | null,
    hasPermission: boolean | null,
  ) {
    if (this.stateChangeCallback) {
      this.stateChangeCallback({
        isRecording,
        durationMillis,
        uri,
        hasPermission,
      });
    }
  }
}

export const voiceRecorder = new VoiceRecorder();
