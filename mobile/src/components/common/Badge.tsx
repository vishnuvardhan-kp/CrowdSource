import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { formatStatusLabel, getStatusTheme } from '../../utils/formatters';
import { theme } from '../../constants/theme';

interface BadgeProps {
  status?: string | null;
  label?: string;
  variant?: 'status' | 'emerald' | 'amber' | 'blue' | 'gray';
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  status,
  label,
  variant = 'status',
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  const displayLabel = label || formatStatusLabel(status);
  const statusTheme = getStatusTheme(status);

  let bg = statusTheme.bg;
  let textCol = statusTheme.text;
  let borderCol = statusTheme.border;

  if (variant === 'emerald') {
    bg = theme.colors.status.validated.bg;
    textCol = theme.colors.status.validated.text;
    borderCol = theme.colors.status.validated.border;
  } else if (variant === 'amber') {
    bg = theme.colors.status.underReview.bg;
    textCol = theme.colors.status.underReview.text;
    borderCol = theme.colors.status.underReview.border;
  } else if (variant === 'blue') {
    bg = theme.colors.status.submitted.bg;
    textCol = theme.colors.status.submitted.text;
    borderCol = theme.colors.status.submitted.border;
  } else if (variant === 'gray') {
    bg = theme.colors.status.draft.bg;
    textCol = theme.colors.status.draft.text;
    borderCol = theme.colors.status.draft.border;
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: borderCol },
        size === 'sm' ? styles.size_sm : styles.size_md,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textCol },
          size === 'sm' ? styles.text_sm : styles.text_md,
          textStyle,
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.pill,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  size_sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontWeight: theme.typography.weight.semibold,
  },
  text_sm: {
    fontSize: 10,
  },
  text_md: {
    fontSize: 12,
  },
});
