import { spawn } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n============================================================`);
    console.log(`▶ Executing: ${cmd} ${args.join(' ')}`);
    console.log(`============================================================\n`);

    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd: path.resolve(__dirname, '..'),
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('🚀 Running Complete SamadhanSetu Test Suite (Phase 2 & Phase 3)...');

  try {
    // 1. Run Phase 2 DB & Backend Foundation tests
    await runCommand('npx', ['ts-node', 'test/verify-database.ts']);

    // 2. Run Phase 3 Authentication, Roles & Organization Membership tests
    await runCommand('npx', ['ts-node', 'test/verify-auth.ts']);

    // 3. Run Phase 3 End-to-End HTTP API tests
    await runCommand('npx', ['ts-node', 'test/verify-http-api.ts']);

    // 4. Run Phase 4 Challenge & Crowdsourcing Foundation tests
    await runCommand('npx', ['ts-node', 'test/verify-phase4.ts']);

    // 5. Run Phase 5 AI Intelligence & Ecosystem Matching tests
    await runCommand('npx', ['ts-node', 'test/verify-phase5.ts']);

    // 6. Run Phase 5.5A Real Ecosystem Data Onboarding tests
    await runCommand('npx', ['ts-node', 'test/verify-phase5-5a.ts']);

    // 7. Run Phase 5.5B Real Ecosystem Data Onboarding & Capability Passport tests
    await runCommand('npx', ['ts-node', 'test/verify-phase5-5b.ts']);

    // 8. Run Phase 6 EOI & Collaborative Project Formation tests
    await runCommand('npx', ['ts-node', 'test/verify-phase6.ts']);

    // 9. Run Phase 7 Project Execution, Monitoring & Governance tests
    await runCommand('npx', ['ts-node', 'test/verify-phase7.ts']);

    // 10. Run Phase 8 Impact Verification & Real-World Outcomes tests
    await runCommand('npx', ['ts-node', 'test/verify-phase8.ts']);

    // 11. Run Phase 9 Ecosystem Intelligence, Academic Collaboration, Contributions & Analytics tests
    await runCommand('npx', ['ts-node', 'test/verify-phase9.ts']);

    // 12. Run Phase 9.1 Video Evidence, Stakeholder Notifications, Innovation Outcomes & Analytics tests
    await runCommand('npx', ['ts-node', 'test/verify-phase9-1.ts']);

    // 13. Run Phase 9 Problem Intelligence, Clustering & Refactored Workflow tests
    await runCommand('npx', ['ts-node', 'test/verify-problem-intelligence.ts']);

    // 14. Run Mobile Citizen End-to-End Verification tests (Patch 9)
    await runCommand('npx', ['ts-node', 'test/verify-mobile-citizen-e2e.ts']);

    // 15. Run Post-Phase-9 Multilingual Database & Unicode Integrity tests
    await runCommand('npx', ['ts-node', 'test/verify-multilingual-database.ts']);

    // 16. Run Post-Phase-9 Multilingual End-to-End Suite
    await runCommand('npx', ['ts-node', 'test/verify-multilingual-e2e.ts']);

    // 17. Run University Experience & Full Lifecycle Notifications Suite
    await runCommand('npx', ['ts-node', '-r', 'tsconfig-paths/register', 'test/verify-university-lifecycle-notifications.ts']);

    // 18. Run Research Intelligence Recommendation Subsystem tests
    await runCommand('npx', ['ts-node', '-r', 'tsconfig-paths/register', 'test/test-research-intelligence.ts']);

    // 19. Run Voice Module Integration tests
    await runCommand('npx', ['ts-node', '-r', 'tsconfig-paths/register', 'test/test-voice-module.ts']);

    console.log('\n============================================================');
    console.log('🏆 ALL TEST SUITES PASSED! Voice Module & Research Intelligence 100% VERIFIED!');
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test execution encountered an error:', err.message);
    process.exit(1);
  }
}

main();
