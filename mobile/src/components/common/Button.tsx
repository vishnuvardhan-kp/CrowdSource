import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { theme } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const isInteractive = !loading && !disabled;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'danger'
              ? theme.colors.textInverse
              : theme.colors.primary
          }
        />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text
            style={[
              styles.textBase,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: theme.spacing.xs,
  },
  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
    ...theme.shadows.card,
  },
  secondary: {
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: theme.colors.destructive,
    borderWidth: 1,
    borderColor: theme.colors.destructiveDark,
  },
  disabled: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
    opacity: 0.6,
  },
  // Sizes
  size_sm: {
    height: 36,
    paddingHorizontal: theme.spacing.sm,
  },
  size_md: {
    height: 48,
    paddingHorizontal: theme.spacing.md,
  },
  size_lg: {
    height: 54,
    paddingHorizontal: theme.spacing.lg,
  },
  // Text Styles
  textBase: {
    fontWeight: theme.typography.weight.semibold,
    textAlign: 'center',
  },
  text_primary: {
    color: theme.colors.textInverse,
  },
  text_secondary: {
    color: theme.colors.primaryDark,
  },
  text_outline: {
    color: theme.colors.text,
  },
  text_ghost: {
    color: theme.colors.primary,
  },
  text_danger: {
    color: theme.colors.textInverse,
  },
  textDisabled: {
    color: theme.colors.textMuted,
  },
  textSize_sm: {
    fontSize: theme.typography.size.sm,
  },
  textSize_md: {
    fontSize: theme.typography.size.base,
  },
  textSize_lg: {
    fontSize: theme.typography.size.lg,
  },
});
