import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '../../src/constants/theme';

export default function ReportLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="new" />
    </Stack>
  );
}
