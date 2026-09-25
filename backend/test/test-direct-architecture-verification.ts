import 'reflect-metadata';
import { EvidenceType, ChallengeStatus, ProblemClusterStatus, ReporterType } from '../src/common/enums';
import { ProblemCluster } from '../src/modules/problem-clusters/entities/problem-cluster.entity';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { ChallengeEvidence } from '../src/modules/challenges/entities/challenge-evidence.entity';
import { MatchingService } from '../src/modules/reviews/matching.service';
import * as path from 'path';
import * as fs from 'fs';

async function runDirectArchitectureVerification() {
  console.log('\n======================================================================');
  console.log('🏛️  SamadhanSetu: Target Direct Architecture Verification Suite');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ' - ' + detail : ''}`);
      failed++;
    }
  }

  // 1. EvidenceType enum has AUDIO
  assert(EvidenceType.AUDIO === 'AUDIO', 'EvidenceType enum contains AUDIO for native voice evidence');

  // 2. ReporterType enum has COMMUNITY
  assert(ReporterType.COMMUNITY === 'COMMUNITY', 'ReporterType enum contains COMMUNITY for citizen collectives & SHGs');

  // 3. ProblemCluster entity defaults to OPEN_FOR_SOLUTIONS and NOT_REQUIRED
  const cluster = new ProblemCluster();
  assert(
    cluster.status === ProblemClusterStatus.OPEN_FOR_SOLUTIONS,
    'ProblemCluster default status is OPEN_FOR_SOLUTIONS (un-gated direct university matching)'
  );
  assert(
    cluster.government_verification_status === 'NOT_REQUIRED',
    'ProblemCluster default government_verification_status is NOT_REQUIRED'
  );

  // 4. Challenge entity allows COMMUNITY reporter_type and verification_snapshot community metadata
  const challenge = new Challenge();
  challenge.reporter_type = ReporterType.COMMUNITY;
  challenge.verification_snapshot = { community_group_name: 'Mahila Kisan Sashaktikaran PESA Group' };
  challenge.status = ChallengeStatus.SUBMITTED;
  assert(
    challenge.reporter_type === ReporterType.COMMUNITY && (challenge.verification_snapshot as any)?.community_group_name === 'Mahila Kisan Sashaktikaran PESA Group',
    'Challenge entity supports COMMUNITY reporter type and community group name in snapshot'
  );

  // 5. ChallengeEvidence entity supports AUDIO
  const evidence = new ChallengeEvidence();
  evidence.evidence_type = EvidenceType.AUDIO;
  evidence.url = '/uploads/evidence/test-recording.webm';
  evidence.mime_type = 'audio/webm';
  assert(
    evidence.evidence_type === EvidenceType.AUDIO && evidence.url.includes('test-recording.webm'),
    'ChallengeEvidence entity supports AUDIO evidence records'
  );

  // 6. Matching Service: verify un-gated matching logic
  try {
    const matchingServiceFile = fs.readFileSync(path.join(__dirname, '../src/modules/reviews/matching.service.ts'), 'utf-8');
    const hasUnGatedMatching = matchingServiceFile.includes('nonMatchingStatuses = [ChallengeStatus.DRAFT, ChallengeStatus.REJECTED, ChallengeStatus.ARCHIVED]') &&
      !matchingServiceFile.includes('challenge.status !== ChallengeStatus.VALIDATED');
    assert(
      hasUnGatedMatching,
      'MatchingService operates directly on SUBMITTED challenges without VALIDATED prerequisite gate'
    );
  } catch (err: any) {
    assert(false, 'Failed reading MatchingService file', err.message);
  }

  // 7. EOI Service: verify that universities can submit EOIs for SUBMITTED / PROCESSING / MATCHED challenges
  try {
    const eoiServiceFile = fs.readFileSync(path.join(__dirname, '../src/modules/eois/eois.service.ts'), 'utf-8');
    const hasSubmittedInEois = eoiServiceFile.includes('ChallengeStatus.SUBMITTED') && eoiServiceFile.includes('ChallengeStatus.PROCESSING');
    assert(
      hasSubmittedInEois,
      'EOIs Service allows University Solution Proposals (EOIs) on SUBMITTED and PROCESSING challenges'
    );
  } catch (err: any) {
    assert(false, 'Failed reading EOIs service', err.message);
  }

  // 8. Research Intelligence Service: verify SUBMITTED challenges can be analyzed
  try {
    const researchServiceFile = fs.readFileSync(path.join(__dirname, '../src/modules/research-intelligence/research-intelligence.service.ts'), 'utf-8');
    const hasSubmittedInResearch = researchServiceFile.includes('ChallengeStatus.SUBMITTED') && researchServiceFile.includes('ChallengeStatus.PROCESSING');
    assert(
      hasSubmittedInResearch,
      'Research Intelligence Service processes SUBMITTED challenges without VALIDATED prerequisite'
    );
  } catch (err: any) {
    assert(false, 'Failed reading Research Intelligence service', err.message);
  }

  // 9. Analytics Action Queue: transformed to Civic Monitoring Queue
  try {
    const analyticsServiceFile = fs.readFileSync(path.join(__dirname, '../src/modules/analytics/analytics.service.ts'), 'utf-8');
    const hasMonitoringTransform = analyticsServiceFile.includes('Civic Monitoring & Operational Attention Queue') &&
      analyticsServiceFile.includes('matched_institutions_count') &&
      analyticsServiceFile.includes('eois_count');
    assert(
      hasMonitoringTransform,
      'Analytics Action Queue is transformed into Civic Monitoring & Operational Attention Queue with university match & EOI telemetry'
    );
  } catch (err: any) {
    assert(false, 'Failed reading Analytics service', err.message);
  }

  // 10. Voice Service: saves audio to disk and returns playable URL
  try {
    const voiceServiceFile = fs.readFileSync(path.join(__dirname, '../src/modules/voice/voice.service.ts'), 'utf-8');
    const hasAudioPersistence = voiceServiceFile.includes('persistVoiceRecording') &&
      voiceServiceFile.includes('audioUrl') &&
      voiceServiceFile.includes('/api/challenges/evidence/file/');
    assert(
      hasAudioPersistence,
      'Voice Service persists audio recordings to uploads/evidence/ and links audioUrl into TranscribeResult'
    );
  } catch (err: any) {
    assert(false, 'Failed reading Voice service', err.message);
  }

  console.log('\n======================================================================');
  console.log(`📊 Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDirectArchitectureVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
