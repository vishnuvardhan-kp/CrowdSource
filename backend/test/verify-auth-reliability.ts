import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { normalizePhoneNumber } from '../src/common/utils/phone.utils';

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

async function runAuthReliabilityVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu Reliability Suite 4: Authentication, Phone & Session Resilience');
  console.log('========================================================================\n');

  // Test 1: Phone Normalization Utility Unit Verification
  console.log('▶ STEP 1: Verifying Phone Normalization Utility Edge Cases...');
  assert(normalizePhoneNumber('9876543210') === '9876543210', '10-digit number preserved');
  assert(normalizePhoneNumber('+919876543210') === '9876543210', '+91 prefix stripped');
  assert(normalizePhoneNumber('09876543210') === '9876543210', 'Leading 0 prefix stripped');
  assert(normalizePhoneNumber('+91 98765-43210') === '9876543210', 'Spaces and hyphens stripped');
  assert(normalizePhoneNumber('+91 (987) 654-3210') === '9876543210', 'Parentheses and formatting stripped');
  assert(normalizePhoneNumber('12345') === null, 'Short number returns null');
  assert(normalizePhoneNumber('') === null, 'Empty string returns null');
  assert(normalizePhoneNumber(undefined) === null, 'Undefined returns null');

  // Start Nest Test Application
  console.log('\n▶ STEP 2: Booting NestJS Application for E2E Auth Flow...');
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  await app.listen(0);
  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'string' ? 3001 : address.port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const dataSource = app.get(DataSource);
  const userRepo = dataSource.getRepository(User);

  const suffix = Date.now().toString().slice(-6);
  const testPhone = `98${suffix}1234`;
  const testEmail = `auth-test-${suffix}@test.local`;
  const testPassword = 'SecurePassword123!';

  try {
    // -------------------------------------------------------------------------
    // Step 3: Register User with Phone Number
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 3: Registering Citizen with Mobile Number...');
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Citizen Auth Tester',
        phone: `+91 ${testPhone.slice(0, 5)}-${testPhone.slice(5)}`,
      }),
    });

    const regData = await regRes.json();
    assert(regRes.status === 201, 'Registration returns HTTP 201 Created');
    assert(regData.phone === testPhone, 'Phone number stored in canonical normalized 10-digit format');
    assert(!regData.password_hash, 'User response never exposes password_hash');

    // -------------------------------------------------------------------------
    // Step 4: Duplicate Phone Registration Conflict Detection
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 4: Verifying Duplicate Phone Registration Conflict (HTTP 409)...');
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `different-${suffix}@test.local`,
        password: testPassword,
        name: 'Duplicate Phone User',
        phone: testPhone, // exact same canonical phone
      }),
    });
    assert(dupRes.status === 409, 'Duplicate phone registration rejected with HTTP 409 Conflict');

    // -------------------------------------------------------------------------
    // Step 5: Login via Email
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 5: Verifying Login via Email...');
    const loginEmailRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginEmailData = await loginEmailRes.json();
    assert(loginEmailRes.status === 200 || loginEmailRes.status === 201, 'Login via email successful');
    assert(typeof loginEmailData.accessToken === 'string', 'JWT access token issued on email login');

    // -------------------------------------------------------------------------
    // Step 6: Login via Canonical Phone Number
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 6: Verifying Login via Canonical Phone Number...');
    const loginPhoneRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        password: testPassword,
      }),
    });
    const loginPhoneData = await loginPhoneRes.json();
    assert(loginPhoneRes.status === 200 || loginPhoneRes.status === 201, 'Login via canonical phone successful');
    assert(typeof loginPhoneData.accessToken === 'string', 'JWT access token issued on phone login');

    // -------------------------------------------------------------------------
    // Step 7: Login via Formatted Phone (+91 with spaces)
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 7: Verifying Login via Formatted Phone (+91 with spaces)...');
    const loginFormattedRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: `+91 ${testPhone.slice(0, 5)} ${testPhone.slice(5)}`,
        password: testPassword,
      }),
    });
    const loginFormattedData = await loginFormattedRes.json();
    assert(loginFormattedRes.status === 200 || loginFormattedRes.status === 201, 'Login via formatted +91 phone string successful');
    assert(typeof loginFormattedData.accessToken === 'string', 'JWT access token issued for formatted identifier');

    // -------------------------------------------------------------------------
    // Step 8: Invalid Credentials & Deactivated Accounts
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 8: Verifying Invalid Credentials & Deactivation Rejections...');
    const badPassRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword123!',
      }),
    });
    assert(badPassRes.status === 401, 'Invalid password rejected with HTTP 401');

    const nonExistentRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'does-not-exist@test.local',
        password: 'SomePassword123!',
      }),
    });
    assert(nonExistentRes.status === 401, 'Non-existent user rejected with HTTP 401');

    // Deactivate user in DB and test login rejection
    await userRepo.update({ email: testEmail }, { is_active: false });
    const deactivatedRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    assert(deactivatedRes.status === 401, 'Deactivated account rejected with HTTP 401');
    // Reactivate
    await userRepo.update({ email: testEmail }, { is_active: true });

    // -------------------------------------------------------------------------
    // Step 9: Token Verification & Protected Profile Route
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 9: Verifying Token Validation & Profile Route...');
    const profileRes = await fetch(`${baseUrl}/auth/profile`, {
      headers: { Authorization: `Bearer ${loginEmailData.accessToken}` },
    });
    const profileData = await profileRes.json();
    assert(profileRes.status === 200, 'Profile accessible with valid JWT');
    assert(profileData.email === testEmail, 'Profile matches logged-in user');
    assert(profileData.phone === testPhone, 'Profile includes normalized phone number');

    const invalidTokenRes = await fetch(`${baseUrl}/auth/profile`, {
      headers: { Authorization: 'Bearer invalid.token.value' },
    });
    assert(invalidTokenRes.status === 401, 'Invalid token rejected with HTTP 401');

    // -------------------------------------------------------------------------
    // Step 10: Concurrent Logins
    // -------------------------------------------------------------------------
    console.log('\n▶ STEP 10: Verifying Concurrent Logins for Same User...');
    const [c1, c2, c3] = await Promise.all([
      fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      }),
      fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, password: testPassword }),
      }),
      fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: testEmail, password: testPassword }),
      }),
    ]);
    assert(c1.ok && c2.ok && c3.ok, 'All 3 concurrent logins succeeded simultaneously');
  } finally {
    // Cleanup test user
    await userRepo.delete({ email: testEmail });
    await app.close();
  }

  console.log('\n========================================================================');
  console.log(`📊 Suite 4 Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthReliabilityVerification().catch((err) => {
  console.error('Fatal error in verify-auth-reliability:', err);
  process.exit(1);
});
