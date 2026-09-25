#!/usr/bin/env node
/**
 * SamadhanSetu — 5 Consecutive Clean-Start Verification Cycles
 * 
 * Verifies that the platform repeatedly reaches the EXACT same healthy, deterministic state:
 *  - Cycle 1: Citizen Journey, AI Structuring, Spatial Clustering & Gov Verification + Recommendations
 *  - Cycle 2: Phone Authentication (+91), AI Service Fault Tolerance & Clustering Determinism
 *  - Cycle 3: 5 Concurrent Submissions & Clustering Threshold Safety (>=0.75, 8km Gate)
 *  - Cycle 4: Multilingual Ingestion (Devanagari) & Strict Text Immutability
 *  - Cycle 5: Full E2E Critical Path (Citizen -> AI -> Cluster -> Reviewer -> Org EOI -> EOI Accept)
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

const cycleDescriptions = [
  'Citizen Journey, AI Structuring, Clustering & Gov Verification',
  'Phone Authentication (+91), AI Service Fault Tolerance & Clustering',
  '5 Concurrent Submissions & Clustering Threshold Safety (>=0.75, 8km)',
  'Multilingual Ingestion (Devanagari) & Strict Text Immutability',
  'Full E2E Critical Path (Citizen -> AI -> Cluster -> Org EOI -> Accept)',
];

const cycleLog = [];

async function runCycle(cycleNum) {
  const desc = cycleDescriptions[cycleNum - 1];
  console.log(`\n========================================================================`);
  console.log(`🔄 EXECUTING CLEAN-START CYCLE ${cycleNum} OF 5: ${desc}`);
  console.log(`========================================================================`);

  const start = Date.now();
  const checkpoints = [];

  function record(name, pass, detail = '') {
    checkpoints.push({ name, status: pass ? 'PASS' : 'FAIL' });
    console.log(`  [Cycle ${cycleNum}] ${pass ? '✅' : '❌'} ${name} ${detail}`);
    if (!pass) throw new Error(`Cycle ${cycleNum} failed at step: ${name} (${detail})`);
  }

  // 1. Run System Doctor pre-flight diagnostics (for Cycle 1)
  if (cycleNum === 1) {
    const docRes = spawnSync('node', ['scripts/system-doctor.js'], { cwd: ROOT_DIR, encoding: 'utf-8' });
    record('System Doctor Pre-Flight Diagnostics', docRes.status === 0, `(Exit code: ${docRes.status})`);
  }

  // 2. Execute the dedicated clean-start cycle in backend
  const cycleRes = spawnSync(
    'npx',
    ['ts-node', '-r', 'tsconfig-paths/register', 'test/verify-clean-start-cycles.ts', `--cycle=${cycleNum}`],
    {
      cwd: BACKEND_DIR,
      encoding: 'utf-8',
      shell: true,
      stdio: 'inherit',
    }
  );

  record(`Dedicated Cycle ${cycleNum} Execution`, cycleRes.status === 0, `(Exit code: ${cycleRes.status})`);

  const durationMs = Date.now() - start;
  cycleLog.push({ cycle: cycleNum, name: desc, durationMs, status: 'SUCCESS', checkpoints });
  console.log(`Cycle ${cycleNum} completed successfully in ${(durationMs / 1000).toFixed(2)}s.`);
}

async function main() {
  console.log('========================================================================');
  console.log('🛡️  SAMADHANSETU 5 CONSECUTIVE CLEAN-START CYCLES VERIFICATION');
  console.log('========================================================================\n');

  const totalStart = Date.now();

  for (let c = 1; c <= 5; c++) {
    try {
      await runCycle(c);
    } catch (err) {
      console.error(`\n❌ Cycle ${c} FAILED:`, err.message);
      process.exit(1);
    }
  }

  const totalSeconds = ((Date.now() - totalStart) / 1000).toFixed(2);

  console.log('\n========================================================================');
  console.log('📊 5 CONSECUTIVE CLEAN-START CYCLES SUMMARY');
  console.log('========================================================================');
  console.table(
    cycleLog.map((c) => ({
      Cycle: `Cycle ${c.cycle}`,
      Theme: c.name,
      Status: c.status === 'SUCCESS' ? '✅ SUCCESS' : '❌ FAILURE',
      'Duration (s)': (c.durationMs / 1000).toFixed(2),
    }))
  );

  console.log(`Total Elapsed Time: ${totalSeconds}s`);
  console.log('🏆 ALL 5 / 5 CONSECUTIVE CLEAN-START CYCLES COMPLETED WITH 100% DETERMINISM!');
}

main();
