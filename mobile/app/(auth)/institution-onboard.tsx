import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/common/Header';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Badge } from '../../src/components/common/Badge';
import { theme } from '../../src/constants/theme';
import { institutionsApi, Institution } from '../../src/api/institutions';
import { locationsApi } from '../../src/api/locations';
import { DistrictItem, BlockItem } from '../../src/types';

export default function InstitutionOnboardScreen() {
  const router = useRouter();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Category
  const [instType, setInstType] = useState<'PRI' | 'ULB'>('PRI');
  const [subtype, setSubtype] = useState<string>('GRAM_PANCHAYAT');

  // Step 2: LGD & Institution
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [lgdCodeInput, setLgdCodeInput] = useState<string>('');
  const [verifyingLgd, setVerifyingLgd] = useState<boolean>(false);

  // Step 3: Designation
  const [relationship, setRelationship] = useState<string>('AUTHORIZED_OFFICER');
  const [designation, setDesignation] = useState<string>('');
  const [officialEmail, setOfficialEmail] = useState<string>('');
  const [officialPhone, setOfficialPhone] = useState<string>('');

  // Step 4: Evidence
  const [evidenceType, setEvidenceType] = useState<string>('APPOINTMENT_LETTER');
  const [documentName, setDocumentName] = useState<string>('Appointment_Order.pdf');
  const [attached, setAttached] = useState<boolean>(false);
  const [createdMembershipId, setCreatedMembershipId] = useState<string | null>(null);

  // Load districts on mount
  useEffect(() => {
    locationsApi
      .getDistricts()
      .then((data) => setDistricts(data || []))
      .catch((e) => console.log('Districts load error:', e));
  }, []);

  // Load blocks on district change
  useEffect(() => {
    if (!selectedDistrictId) {
      setBlocks([]);
      setSelectedBlockId('');
      return;
    }
    locationsApi
      .getBlocks(selectedDistrictId)
      .then((data) => setBlocks(data || []))
      .catch((e) => console.log('Blocks load error:', e));
  }, [selectedDistrictId]);

  // Load institutions list
  useEffect(() => {
    institutionsApi
      .search({
        type: instType,
        subtype,
        district_id: selectedDistrictId || undefined,
        block_id: selectedBlockId || undefined,
      })
      .then((res) => setInstitutions(res.items || []))
      .catch((e) => console.log('Institutions load error:', e));
  }, [instType, subtype, selectedDistrictId, selectedBlockId]);

  // Verify LGD directly
  const handleVerifyLgd = async () => {
    if (!lgdCodeInput.trim()) return;
    setVerifyingLgd(true);
    setErrorMsg(null);
    try {
      const res = await institutionsApi.verifyLgd(lgdCodeInput.trim());
      if (res.valid && res.institution) {
        setSelectedInstitution(res.institution);
        setInstType(res.institution.type);
        setSubtype(res.institution.subtype);
      } else {
        setErrorMsg(`LGD Code "${lgdCodeInput}" not found in local registry.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'LGD verification failed.');
    } finally {
      setVerifyingLgd(false);
    }
  };

  // Submit Step 3 Application
  const handleSubmitApplication = async () => {
    if (!selectedInstitution) {
      setErrorMsg('Please select an institution.');
      return;
    }
    if (!designation.trim()) {
      setErrorMsg('Official designation is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await institutionsApi.createMembership({
        institution_id: selectedInstitution.id,
        relationship,
        designation: designation.trim(),
        official_email: officialEmail.trim() || undefined,
        official_phone: officialPhone.trim() || undefined,
      });

      setCreatedMembershipId(res.id);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Step 4 Evidence
  const handleUploadEvidence = async () => {
    if (!createdMembershipId) {
      setErrorMsg('No application found.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await institutionsApi.uploadEvidence(createdMembershipId, {
        evidence_type: evidenceType,
        document_name: documentName,
        document_url: `https://storage.samadhansetu.gov.in/evidence/${encodeURIComponent(documentName)}`,
      });

      setStep(5);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload document.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Institutional Verification"
        showBack={true}
        onBack={() => {
          if (step > 1 && step < 5) setStep(step - 1);
          else router.back();
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                step === s && styles.stepDotActive,
                step > s && styles.stepDotCompleted,
              ]}
            >
              <Text
                style={[
                  styles.stepText,
                  (step === s || step > s) && styles.stepTextActive,
                ]}
              >
                {s}
              </Text>
            </View>
          ))}
        </View>

        {/* Error Alert */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={theme.colors.destructive} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* STEP 1: CATEGORY */}
        {step === 1 && (
          <Card style={styles.card}>
            <Text style={styles.stepTitle}>Step 1: Select Local Body Category</Text>
            <Text style={styles.stepSubtitle}>
              Choose the category of institution you officially represent.
            </Text>

            <View style={styles.categoryGrid}>
              <TouchableOpacity
                style={[styles.categoryBox, instType === 'PRI' && styles.categoryBoxSelected]}
                onPress={() => {
                  setInstType('PRI');
                  setSubtype('GRAM_PANCHAYAT');
                }}
              >
                <Ionicons name="home-outline" size={28} color={instType === 'PRI' ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={styles.categoryTitle}>Panchayati Raj (PRI)</Text>
                <Text style={styles.categoryDesc}>Gram Panchayat, Panchayat Samiti, Zilla Parishad</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.categoryBox, instType === 'ULB' && styles.categoryBoxSelected]}
                onPress={() => {
                  setInstType('ULB');
                  setSubtype('MUNICIPAL_CORPORATION');
                }}
              >
                <Ionicons name="business-outline" size={28} color={instType === 'ULB' ? theme.colors.primary : theme.colors.textMuted} />
                <Text style={styles.categoryTitle}>Urban Local Body (ULB)</Text>
                <Text style={styles.categoryDesc}>Municipal Corporation, Council, Nagar Panchayat</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Specific Administrative Tier</Text>
            {instType === 'PRI' ? (
              <View style={styles.tierContainer}>
                {[
                  { id: 'GRAM_PANCHAYAT', label: 'Gram Panchayat (Village)' },
                  { id: 'PANCHAYAT_SAMITI', label: 'Panchayat Samiti (Block)' },
                  { id: 'ZILLA_PARISHAD', label: 'Zilla Parishad (District)' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tierRow, subtype === t.id && styles.tierRowSelected]}
                    onPress={() => setSubtype(t.id)}
                  >
                    <Ionicons
                      name={subtype === t.id ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={subtype === t.id ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={[styles.tierText, subtype === t.id && styles.tierTextSelected]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.tierContainer}>
                {[
                  { id: 'MUNICIPAL_CORPORATION', label: 'Municipal Corporation (Nagar Nigam)' },
                  { id: 'MUNICIPAL_COUNCIL', label: 'Municipal Council (Nagar Parishad)' },
                  { id: 'NAGAR_PANCHAYAT', label: 'Nagar Panchayat' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.tierRow, subtype === t.id && styles.tierRowSelected]}
                    onPress={() => setSubtype(t.id)}
                  >
                    <Ionicons
                      name={subtype === t.id ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={subtype === t.id ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={[styles.tierText, subtype === t.id && styles.tierTextSelected]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Button
              title="Next: Locate via LGD"
              onPress={() => setStep(2)}
              style={styles.actionBtn}
            />
          </Card>
        )}

        {/* STEP 2: LGD LOCATOR */}
        {step === 2 && (
          <Card style={styles.card}>
            <View style={styles.layerBadge}>
              <Text style={styles.layerBadgeText}>Layer 1: Institution Existence Verification</Text>
            </View>
            <Text style={styles.stepTitle}>Locate Authoritative Local Body</Text>
            <Text style={styles.stepSubtitle}>
              Cross-verified with official Local Government Directory (LGD) registry.
            </Text>

            {/* Direct LGD Input */}
            <View style={styles.searchBar}>
              <TextInput
                placeholder="Enter Canonical LGD Code (e.g. 108742)"
                value={lgdCodeInput}
                onChangeText={setLgdCodeInput}
                keyboardType="numeric"
                style={styles.searchInput}
              />
              <TouchableOpacity
                onPress={handleVerifyLgd}
                disabled={verifyingLgd || !lgdCodeInput.trim()}
                style={styles.searchBtn}
              >
                {verifyingLgd ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.searchBtnText}>Verify LGD</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Institution List */}
            <Text style={styles.fieldLabel}>Available Local Bodies ({institutions.length})</Text>
            <View style={styles.listContainer}>
              {institutions.slice(0, 8).map((inst) => {
                const isSelected = selectedInstitution?.id === inst.id;
                return (
                  <TouchableOpacity
                    key={inst.id}
                    style={[styles.instItem, isSelected && styles.instItemSelected]}
                    onPress={() => setSelectedInstitution(inst)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.instName}>{inst.name}</Text>
                      <Text style={styles.instMeta}>
                        LGD: {inst.lgd_code} • {inst.district_name || inst.state}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedInstitution && (
              <View style={styles.verifiedBox}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.verifiedTitle}>LGD Directory Validated</Text>
                  <Text style={styles.verifiedDesc}>
                    {selectedInstitution.name} (LGD: {selectedInstitution.lgd_code}) exists in official state directory.
                  </Text>
                </View>
              </View>
            )}

            <Button
              title="Next: Representative Details"
              disabled={!selectedInstitution}
              onPress={() => setStep(3)}
              style={styles.actionBtn}
            />
          </Card>
        )}

        {/* STEP 3: REPRESENTATIVE DETAILS */}
        {step === 3 && (
          <Card style={styles.card}>
            <View style={[styles.layerBadge, { backgroundColor: '#EDE9FE' }]}>
              <Text style={[styles.layerBadgeText, { color: '#6D28D9' }]}>Layer 2: Representative Authority Details</Text>
            </View>
            <Text style={styles.stepTitle}>Your Official Designation</Text>
            <Text style={styles.stepSubtitle}>
              Representing: <Text style={{ fontWeight: 'bold' }}>{selectedInstitution?.name}</Text>
            </Text>

            <Text style={styles.fieldLabel}>Relationship to Local Body *</Text>
            <View style={styles.tierContainer}>
              {[
                { id: 'ELECTED_REPRESENTATIVE', label: 'Elected Representative (Mukhiya, Councillor, Mayor)' },
                { id: 'AUTHORIZED_OFFICER', label: 'Authorized Officer (Panchayat Secretary, BDO)' },
                { id: 'EMPLOYEE', label: 'Government / Local Body Staff' },
              ].map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.tierRow, relationship === r.id && styles.tierRowSelected]}
                  onPress={() => setRelationship(r.id)}
                >
                  <Ionicons
                    name={relationship === r.id ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={relationship === r.id ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text style={[styles.tierText, relationship === r.id && styles.tierTextSelected]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Official Designation *</Text>
            <TextInput
              placeholder="e.g. Mukhiya / Panchayat Secretary / Councillor"
              value={designation}
              onChangeText={setDesignation}
              style={styles.textInput}
            />

            <Text style={styles.fieldLabel}>Official Email (Optional)</Text>
            <TextInput
              placeholder="e.g. secretary.kanke@gov.in"
              value={officialEmail}
              onChangeText={setOfficialEmail}
              keyboardType="email-address"
              style={styles.textInput}
            />

            <Button
              title="Next: Upload Evidence"
              disabled={!designation.trim() || submitting}
              onPress={handleSubmitApplication}
              style={styles.actionBtn}
            />
          </Card>
        )}

        {/* STEP 4: DOCUMENTARY EVIDENCE */}
        {step === 4 && (
          <Card style={styles.card}>
            <Text style={styles.stepTitle}>Upload Documentary Proof</Text>
            <Text style={styles.stepSubtitle}>
              Provide official appointment letter, government ID, or resolution.
            </Text>

            <Text style={styles.fieldLabel}>Document Type *</Text>
            <View style={styles.tierContainer}>
              {[
                { id: 'APPOINTMENT_LETTER', label: 'Official Appointment Order' },
                { id: 'OFFICIAL_ID_CARD', label: 'Local Body / Government ID Card' },
                { id: 'AUTHORIZATION_RESOLUTION', label: 'Panchayat / Municipal Resolution' },
              ].map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.tierRow, evidenceType === e.id && styles.tierRowSelected]}
                  onPress={() => setEvidenceType(e.id)}
                >
                  <Ionicons
                    name={evidenceType === e.id ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={evidenceType === e.id ? theme.colors.primary : theme.colors.textMuted}
                  />
                  <Text style={[styles.tierText, evidenceType === e.id && styles.tierTextSelected]}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Document Upload Simulator */}
            <View style={styles.uploadBox}>
              <Ionicons name="cloud-upload-outline" size={32} color={theme.colors.primary} />
              <Text style={styles.uploadTitle}>Official Credentials Document</Text>
              <Text style={styles.uploadSubtitle}>PDF, PNG, JPG (Max 10MB)</Text>

              <TouchableOpacity
                style={styles.selectFileBtn}
                onPress={() => {
                  setAttached(true);
                  setDocumentName(`${evidenceType}_Order_${Date.now().toString().slice(-4)}.pdf`);
                }}
              >
                <Ionicons name="document-attach-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.selectFileText}>
                  {attached ? `Attached: ${documentName}` : 'Attach Document'}
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title="Submit for Verification"
              disabled={submitting}
              onPress={handleUploadEvidence}
              style={styles.actionBtn}
            />
          </Card>
        )}

        {/* STEP 5: STATUS */}
        {step === 5 && (
          <Card style={{ ...styles.card, alignItems: 'center' }}>
            <View style={styles.successIconCircle}>
              <Ionicons name="time-outline" size={40} color={theme.colors.accent} />
            </View>
            <Text style={[styles.stepTitle, { textAlign: 'center' }]}>Application Submitted</Text>
            <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>
              Your authority application to represent {selectedInstitution?.name} is under review by District/State administrators.
            </Text>

            <View style={styles.statusBox}>
              <Text style={styles.statusLabel}>Authority Status:</Text>
              <Badge label="UNDER_REVIEW" variant="amber" size="md" />
            </View>

            <View style={styles.auditInfoBox}>
              <Text style={styles.auditInfoTitle}>Two-Tier Verification Safeguards:</Text>
              <Text style={styles.auditInfoText}>
                1. Institution: Validated via LGD Code {selectedInstitution?.lgd_code}
              </Text>
              <Text style={styles.auditInfoText}>
                2. Representative: Pending official administrator document approval
              </Text>
            </View>

            <Button
              title="Return to Profile"
              onPress={() => router.replace('/(tabs)/profile')}
              style={{ ...styles.actionBtn, width: '100%' }}
            />
          </Card>
        )}
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: theme.colors.primary,
  },
  stepText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  stepTextActive: {
    color: '#fff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.sm,
    backgroundColor: '#FEE2E2',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.destructive,
    flex: 1,
  },
  card: {
    padding: theme.spacing.lg,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  categoryBox: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
  },
  categoryBoxSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 6,
    textAlign: 'center',
  },
  categoryDesc: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  tierContainer: {
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tierRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  tierText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  tierTextSelected: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  actionBtn: {
    marginTop: theme.spacing.md,
  },
  layerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    marginBottom: 8,
  },
  layerBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    fontSize: 12,
    backgroundColor: theme.colors.card,
  },
  searchBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  instItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  instItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  instName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  instMeta: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  verifiedTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#065F46',
  },
  verifiedDesc: {
    fontSize: 10,
    color: '#047857',
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    backgroundColor: theme.colors.card,
    marginBottom: theme.spacing.sm,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.card,
  },
  uploadTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
  },
  uploadSubtitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginBottom: 10,
  },
  selectFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  selectFileText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: theme.spacing.md,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  auditInfoBox: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  auditInfoTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  auditInfoText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});
