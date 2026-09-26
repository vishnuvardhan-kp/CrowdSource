import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

async function runHttpApiVerification() {
  console.log('🌐 Starting Phase 3 End-to-End HTTP API Verification Suite (using native fetch)...\n');
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
    })
  );

  await app.listen(0);
  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'string' ? 3001 : address.port;
  const baseUrl = `http://localhost:${port}/api`;

  const uniqueSuffix = Date.now();
  const testCitizenEmail = `http-citizen-${uniqueSuffix}@test.local`;
  const testPassword = 'Password123!';

  let citizenToken = '';
  let adminToken = '';
  let citizenUserId = '';
  let testOrgId = '';

  try {
    // 1. POST /api/auth/register - Valid Citizen Registration
    console.log('📝 1. Testing Registration Endpoint: POST /api/auth/register');
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aakash Verma',
        email: testCitizenEmail,
        password: testPassword,
        phone: `+91-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        role: 'PLATFORM_ADMIN', // Privilege escalation attempt
      }),
    });
    const regData = await regRes.json();

    assert(regRes.status === 201, 'POST /api/auth/register returns 201 Created');
    assert(regData.email === testCitizenEmail, 'Response contains normalized email');
    assert(regData.role === 'CITIZEN', 'Injected role ignored; user strictly registered as CITIZEN');
    assert(regData.password_hash === undefined, 'password_hash is strictly absent from response');
    citizenUserId = regData.id;

    // 2. Duplicate Registration Rejection (409 Conflict)
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Aakash',
        email: testCitizenEmail,
        password: testPassword,
      }),
    });
    assert(dupRes.status === 409, 'Duplicate email registration rejected with 409 Conflict');

    // 3. Invalid DTO Rejection (400 Bad Request)
    const invalidDtoRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A',
        email: 'invalid-email-address',
        password: '123',
      }),
    });
    assert(invalidDtoRes.status === 400, 'Invalid fields rejected with 400 Bad Request');

    // 4. POST /api/auth/login - Citizen Login
    console.log('\n🔑 2. Testing Login Endpoint: POST /api/auth/login');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCitizenEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();

    assert(loginRes.status === 200, 'POST /api/auth/login returns 200 OK for valid credentials');
    assert(typeof loginData.accessToken === 'string', 'Login returns valid JWT accessToken');
    assert(loginData.user.role === 'CITIZEN', 'Login user payload reports CITIZEN role');
    citizenToken = loginData.accessToken;

    // 5. Invalid Credentials Rejection (401 Unauthorized)
    const invalidLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCitizenEmail,
        password: 'WrongPassword!',
      }),
    });
    assert(invalidLoginRes.status === 401, 'Invalid password rejected with 401 Unauthorized');

    // 6. Login as Platform Admin (seeded dev admin)
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@dev.local',
        password: 'AdminDev123!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Login as dev platform admin returns 200 OK');
    assert(adminLoginData.user.role === 'PLATFORM_ADMIN', 'Dev admin has PLATFORM_ADMIN role');
    adminToken = adminLoginData.accessToken;

    // 7. GET /api/auth/me - Protected Profile Endpoint
    console.log('\n🛡️ 3. Testing Protected Profile Endpoint: GET /api/auth/me');
    const unauthMeRes = await fetch(`${baseUrl}/auth/me`);
    assert(unauthMeRes.status === 401, 'GET /api/auth/me without token returns 401 Unauthorized');

    const authMeRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const authMeData = await authMeRes.json();
    assert(authMeRes.status === 200, 'GET /api/auth/me with valid Bearer token returns 200 OK');
    assert(authMeData.id === citizenUserId, 'Profile returns correct authenticated user ID');
    assert(authMeData.password_hash === undefined, 'Profile response strictly excludes password_hash');
    assert(Array.isArray(authMeData.memberships), 'Profile response includes memberships array');

    // 8. Role-Based Access Control on GET /api/auth/admin-test
    console.log('\n🔒 4. Testing RBAC Role Guard: GET /api/auth/admin-test');
    const citizenRbacRes = await fetch(`${baseUrl}/auth/admin-test`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(citizenRbacRes.status === 403, 'Citizen request to @Roles(PLATFORM_ADMIN) returns 403 Forbidden');

    const adminRbacRes = await fetch(`${baseUrl}/auth/admin-test`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminRbacRes.status === 200, 'Platform admin request to @Roles(PLATFORM_ADMIN) returns 200 OK');

    // 9. Public Organization Directory: GET /api/organizations
    console.log('\n🏛️ 5. Testing Organizations & Claims Endpoints');
    const orgsRes = await fetch(`${baseUrl}/organizations`);
    const orgsData = await orgsRes.json();
    assert(orgsRes.status === 200, 'GET /api/organizations returns 200 OK');
    assert(Array.isArray(orgsData) && orgsData.length > 0, 'Public organizations list is accessible');
    testOrgId = orgsData[0].id;

    // 10. Submit Organization Claim: POST /api/organization-claims
    const claimRes = await fetch(`${baseUrl}/organization-claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        organization_id: testOrgId,
        reason: 'Authorized department representative submitting verification credentials.',
      }),
    });
    const claimData = await claimRes.json();
    assert(claimRes.status === 201, 'POST /api/organization-claims returns 201 Created');
    assert(claimData.claim.status === 'PENDING', 'Claim status initialized as PENDING');

    // 11. Verify Citizen Still Has No Admin Privileges After Submitting Claim
    const postClaimRbacRes = await fetch(`${baseUrl}/auth/admin-test`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(
      postClaimRbacRes.status === 403,
      'Pending claim does NOT grant platform administrative authority (still 403 Forbidden)'
    );

    // 12. Query Claims: GET /api/organization-claims
    const claimsRes = await fetch(`${baseUrl}/organization-claims`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const claimsData = await claimsRes.json();
    assert(claimsRes.status === 200, 'GET /api/organization-claims returns 200 OK');
    assert(Array.isArray(claimsData) && claimsData.length >= 1, 'Claim request is present in user claims list');

    // 13. Query Organization Members: GET /api/organizations/:id/members
    const membersRes = await fetch(`${baseUrl}/organizations/${testOrgId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(membersRes.status === 200, 'GET /api/organizations/:id/members returns 200 OK with valid JWT');
  } finally {
    await app.close();
  }

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All Phase 3 End-to-End HTTP API checks PASSED!\n');
  }
}

runHttpApiVerification().catch((err) => {
  console.error('Fatal error in HTTP API verification:', err);
  process.exit(1);
});
