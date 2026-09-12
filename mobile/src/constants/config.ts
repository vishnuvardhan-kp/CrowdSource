import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = 3001;

function getApiBaseUrl(): string {
  // 1. Explicit environment variable if provided
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Auto-detect host machine IP when running via Expo Go / Metro on physical devices
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:${DEFAULT_PORT}/api`;
    }
  }

  // 3. Platform-specific local loopback detection
  if (Platform.OS === 'android') {
    // Android emulator routes 10.0.2.2 to host machine localhost
    return `http://10.0.2.2:${DEFAULT_PORT}/api`;
  }

  // iOS simulator, macOS, and Web use standard localhost
  return `http://localhost:${DEFAULT_PORT}/api`;
}

export const config = {
  appName: 'SamadhanSetu',
  appTagline: 'Civic Problem Intelligence & Citizen Redressal',
  stateName: 'Government of Jharkhand',
  apiBaseUrl: getApiBaseUrl(),
  requestTimeoutMs: 15000,
  maxEvidenceUploadSizeBytes: 15 * 1024 * 1024, // 15 MB matching backend
  storageKeys: {
    authToken: 'samadhan_auth_token',
    userProfile: 'samadhan_user_profile',
    activeDraftId: 'samadhan_active_draft_id',
    offlineReports: 'samadhan_offline_reports',
  },
};
