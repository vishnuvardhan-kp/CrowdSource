import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { VoiceReportScreen } from '../../src/modules/voice';
import { useAuth } from '../../src/context/AuthContext';
import { theme } from '../../src/constants/theme';

export default function VoiceReportRoute() {
  const router = useRouter();
  const { user, token, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token) {
      router.replace('/(auth)/login');
    }
  }, [token, loading]);

  if (loading || !token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <VoiceReportScreen
      onConfirmed={(report) => {
        router.replace('/(tabs)/reports');
      }}
      onCancel={() => {
        router.back();
      }}
    />
  );
}
