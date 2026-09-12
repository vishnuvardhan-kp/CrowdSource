import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../context/I18nContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({
  title = 'SamadhanSetu',
  subtitle = 'Civic Problem Intelligence',
  showBack = false,
  onBack,
  rightAction,
}: HeaderProps) {
  const { language, setLanguage } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.en;

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        )}

        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>SS</Text>
        </View>

        <View style={styles.titleContainer}>
          <View style={styles.brandRow}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>Jharkhand</Text>
            </View>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}

        <TouchableOpacity
          style={styles.langButton}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={15} color={theme.colors.primary} />
          <Text style={styles.langButtonText}>{currentLang.code.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Language Picker Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLangModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="globe-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.modalTitle}>Choose UI Language</Text>
              </View>
              <TouchableOpacity
                onPress={() => setLangModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Select your interface language (Jharkhand Regional & National)
            </Text>

            <FlatList
              data={Object.values(SUPPORTED_LANGUAGES)}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.langList}
              renderItem={({ item }) => {
                const isSelected = item.code === language;
                return (
                  <TouchableOpacity
                    style={[
                      styles.langOption,
                      isSelected && styles.langOptionSelected,
                    ]}
                    onPress={() => {
                      setLanguage(item.code);
                      setLangModalVisible(false);
                    }}
                  >
                    <View>
                      <Text
                        style={[
                          styles.langOptionNative,
                          isSelected && styles.langOptionNativeSelected,
                        ]}
                      >
                        {item.nativeName}
                      </Text>
                      <Text style={styles.langOptionName}>
                        {item.name} ({item.script})
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: theme.spacing.sm,
    padding: theme.spacing.xxs,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  logoText: {
    color: theme.colors.textInverse,
    fontWeight: theme.typography.weight.bold,
    fontSize: theme.typography.size.base,
    letterSpacing: -0.5,
  },
  titleContainer: {
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: theme.typography.size.base,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
  },
  tagBadge: {
    backgroundColor: theme.colors.primary50,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  tagText: {
    fontSize: 9,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.md,
  },
  langButtonText: {
    fontSize: 11,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 14,
    marginTop: 2,
  },
  langList: {
    gap: 8,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  langOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary50,
  },
  langOptionNative: {
    fontSize: 14,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
  },
  langOptionNativeSelected: {
    color: theme.colors.primary,
  },
  langOptionName: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
