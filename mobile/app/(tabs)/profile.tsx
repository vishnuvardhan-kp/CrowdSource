import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/common/Header';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Badge } from '../../src/components/common/Badge';
import { theme } from '../../src/constants/theme';
import { institutionsApi, InstitutionMembership } from '../../src/api/institutions';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [memberships, setMemberships] = useState<InstitutionMembership[]>([]);

  useEffect(() => {
    if (!user) return;
    institutionsApi
      .getMyMemberships()
      .then((data) => setMemberships(Array.isArray(data) ? data : []))
      .catch((e) => console.log('Error loading memberships:', e));
  }, [user]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of ResolvIN?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header title="Citizen Profile" />
        <View style={styles.emptyContainer}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={48} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to your account</Text>
          <Text style={styles.emptySubtitle}>
            Track your submitted civic issues, view government verifications, and get real-time status updates.
          </Text>
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            style={styles.authButton}
          />
          <TouchableOpacity
            style={styles.registerLinkContainer}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerLinkText}>New citizen? Register here</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'SS';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header title="Citizen Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.roleBadgeContainer}>
            <Badge label={user.role || 'CITIZEN'} variant="emerald" size="sm" />
          </View>
        </Card>

        {/* Account Details */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionHeading}>Account Details</Text>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>

          {user.phone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={theme.colors.textMuted} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={18} color={theme.colors.textMuted} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Account Role</Text>
              <Text style={styles.infoValue}>{user.role || 'Citizen'}</Text>
            </View>
          </View>
        </Card>

        {/* Institutional Representation */}
        <Card style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={styles.sectionHeading}>Institutional Representation (PRI / ULB)</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/institution-onboard')}>
              <Text style={{ fontSize: 11, color: theme.colors.primary, fontWeight: 'bold' }}>+ Apply</Text>
            </TouchableOpacity>
          </View>

          {memberships.length > 0 ? (
            memberships.map((m) => {
              const isVerified = m.authority_status === 'VERIFIED';
              return (
                <View
                  key={m.id}
                  style={{
                    padding: 10,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: isVerified ? '#ECFDF5' : '#FEF3C7',
                    borderWidth: 1,
                    borderColor: isVerified ? '#A7F3D0' : '#FDE68A',
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.text }}>
                      {m.institution?.name}
                    </Text>
                    <Badge
                      label={isVerified ? 'VERIFIED' : m.authority_status}
                      variant={isVerified ? 'emerald' : 'amber'}
                      size="sm"
                    />
                  </View>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }}>
                    Designation: {m.designation} • LGD: {m.institution?.lgd_code}
                  </Text>
                  {isVerified && (
                    <Text style={{ fontSize: 10, color: '#047857', fontWeight: 'bold', marginTop: 4 }}>
                      ✓ ResolvIN Verified Institutional Representative
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <View style={{ paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 8 }}>
                Are you an elected Mukhiya, Panchayat Secretary, or Municipal Councillor? Apply to represent your local body.
              </Text>
              <Button
                title="Get Verified for Panchayat / ULB"
                variant="outline"
                onPress={() => router.push('/(auth)/institution-onboard')}
                style={{ paddingVertical: 8 }}
              />
            </View>
          )}
        </Card>

        {/* Civic Information */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionHeading}>About ResolvIN</Text>
          <Text style={styles.aboutText}>
            ResolvIN is the official problem intelligence and civic engagement platform developed for the Smart India Hackathon (SIH'26) in collaboration with the Government of Jharkhand.
          </Text>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Platform Version</Text>
            <Text style={styles.versionValue}>Phase 9.1 (Mobile Client v1.0)</Text>
          </View>
        </Card>

        {/* Logout Button */}
        <Button
          title="Sign Out"
          variant="outline"
          onPress={handleLogout}
          icon={<Ionicons name="log-out-outline" size={18} color={theme.colors.destructive} />}
          style={styles.logoutButton}
          textStyle={{ color: theme.colors.destructive }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  avatarText: {
    fontSize: theme.typography.size.xxl,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.textInverse,
  },
  userName: {
    fontSize: theme.typography.size.xl,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
  },
  userEmail: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  roleBadgeContainer: {
    marginTop: theme.spacing.sm,
  },
  infoCard: {
    marginBottom: theme.spacing.md,
  },
  sectionHeading: {
    fontSize: theme.typography.size.base,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  infoTextContainer: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.text,
    fontWeight: theme.typography.weight.medium,
    marginTop: 1,
  },
  aboutText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  versionLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  versionValue: {
    fontSize: 11,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.primary,
  },
  logoutButton: {
    borderColor: theme.colors.destructiveLight,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.bold,
    color: theme.colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: theme.typography.size.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: theme.spacing.lg,
  },
  authButton: {
    minWidth: 160,
  },
  registerLinkContainer: {
    marginTop: theme.spacing.md,
  },
  registerLinkText: {
    fontSize: theme.typography.size.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weight.semibold,
  },
});
