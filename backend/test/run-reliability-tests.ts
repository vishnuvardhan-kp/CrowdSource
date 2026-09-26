import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import { spawn } from 'child_process';
import * as path from 'path';

interface SuiteResult {
  name: string;
  file: string;
  durationMs: number;
  status: 'PASSED' | 'FAILED';
  error?: string;
}

const suites = [
  { name: 'Suite 1: Startup & Liveness/Readiness Semantics', file: 'test/verify-startup-reliability.ts' },
  { name: 'Suite 2: AI Resilience & Fault Tolerance', file: 'test/verify-ai-resilience.ts' },
  { name: 'Suite 3: Clustering Concurrency & Transaction Safety', file: 'test/verify-clustering-concurrency.ts' },
  { name: 'Suite 4: Authentication, Phone & Session Resilience', file: 'test/verify-auth-reliability.ts' },
  { name: 'Suite 5: Mobile API Contract & Token Resilience', file: 'test/verify-mobile-api-contract.ts' },
  { name: 'Suite 6: Service Health, Readiness & Observability', file: 'test/verify-service-health.ts' },
  { name: 'Suite 7: Idempotency & Duplicate Request Safety', file: 'test/verify-idempotency.ts' },
  { name: 'Suite 8: State Transitions & Text Immutability', file: 'test/verify-state-transitions.ts' },
];

async function runSuite(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test exited with non-zero code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('========================================================================');
  console.log('🛡️  SAMADHANSETU COMPLETE RELIABILITY & RESILIENCE VERIFICATION HARNESS');
  console.log('========================================================================\n');

  const backendDir = path.resolve(__dirname, '..');
  const results: SuiteResult[] = [];
  const overallStart = Date.now();

  for (const suite of suites) {
    console.log(`\n▶ Starting: ${suite.name} (${suite.file})`);
    const start = Date.now();
    try {
      await runSuite('npx', ['ts-node', '-r', 'tsconfig-paths/register', suite.file], backendDir);
      const durationMs = Date.now() - start;
      results.push({ name: suite.name, file: suite.file, durationMs, status: 'PASSED' });
    } catch (err: any) {
      const durationMs = Date.now() - start;
      results.push({ name: suite.name, file: suite.file, durationMs, status: 'FAILED', error: err.message });
      console.error(`\n❌ ${suite.name} FAILED: ${err.message}`);
    }
  }

  const totalTime = ((Date.now() - overallStart) / 1000).toFixed(2);
  console.log('\n========================================================================');
  console.log('📊 SAMADHANSETU RELIABILITY TEST MATRIX SUMMARY');
  console.log('========================================================================');
  console.table(
    results.map((r) => ({
      Suite: r.name,
      Status: r.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED',
      'Duration (ms)': r.durationMs,
    })),
  );

  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;

  console.log(`Total Duration: ${totalTime}s`);
  console.log(`Suites Passed: ${passedCount} / ${suites.length}`);

  if (failedCount > 0) {
    console.error(`\n❌ ${failedCount} suite(s) failed reliability verification.`);
    process.exit(1);
  } else {
    console.log('\n🏆 ALL 8 RELIABILITY TEST SUITES PASSED DETERMINISTICALLY (100%)!');
    process.exit(0);
  }
}

main();
