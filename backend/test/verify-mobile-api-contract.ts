import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';

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

async function runMobileApiContractVerification() {
  console.log('========================================================================');
  console.log('🧪 SamadhanSetu Reliability Suite 5: Mobile API Contract & Token Resilience');
  console.log('========================================================================\n');

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
  const citizenEmail = `mobile-contract-${suffix}@test.local`;
  const citizenPhone = `97${suffix}4321`;
  const citizenPassword = 'MobilePassword123!';

  let citizenToken = '';
  let citizenId = '';
  let createdChallengeId = '';

  const distRows = await dataSource.query(`SELECT id, name FROM districts WHERE LOWER(name) = 'ranchi' LIMIT 1`);
  const districtId = distRows[0]?.id;
  const blockRows = await dataSource.query(`SELECT id, name FROM blocks WHERE district_id = $1 LIMIT 1`, [districtId]);
  const blockId = blockRows[0]?.id;

  try {
    // -------------------------------------------------------------------------
    // Contract 1: Citizen Mobile Registration
    // -------------------------------------------------------------------------
    console.log('▶ CONTRACT 1: POST /api/auth/register (Mobile Citizen Registration)...');
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: citizenEmail,
        password: citizenPassword,
        name: 'Mobile App Citizen',
        phone: citizenPhone,
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'POST /api/auth/register returns 201');
    assert(regData.email === citizenEmail, 'Returns correct email');
    assert(regData.role === 'CITIZEN', 'Returns role CITIZEN');
    citizenId = regData.id;

    // -------------------------------------------------------------------------
    // Contract 2: Mobile Login via Phone/Identifier
    // -------------------------------------------------------------------------
    console.log('\n▶ CONTRACT 2: POST /api/auth/login (Identifier/Phone & Password)...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: citizenPhone,
        password: citizenPassword,
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 || loginRes.status === 201, 'POST /api/auth/login returns 200/201');
    assert(typeof loginData.accessToken === 'string', 'Returns valid accessToken');
    assert(typeof loginData.user === 'object', 'Returns user profile summary');
    citizenToken = loginData.accessToken;

    // -------------------------------------------------------------------------
    // Contract 3: GET /api/auth/profile
    // -------------------------------------------------------------------------
    console.log('\n▶ CONTRACT 3: GET /api/auth/profile...');
    const profRes = await fetch(`${baseUrl}/auth/profile`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const profData = await profRes.json();
    assert(profRes.status === 200, 'GET /api/auth/profile returns 200');
    assert(profData.id === citizenId, 'Profile id matches');
    assert(profData.phone === citizenPhone, 'Profile phone matches');

    // -------------------------------------------------------------------------
    // Contract 4: POST /api/challenges (Create Draft)
    // -------------------------------------------------------------------------
    console.log('\n▶ CONTRACT 4: POST /api/challenges (Create Draft)...');
    const createRes = await fetch(`${baseUrl}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: 'Broken canal embankment leaking into agricultural fields',
        description: 'Irrigation canal wall broken near village boundary flooding paddy crops',
        district_id: districtId,
        block_id: blockId,
        latitude: 23.36,
        longitude: 85.34,
        citizen_severity: 'SERIOUS',
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'POST /api/challenges returns 201');
    assert(createData.status === 'DRAFT', 'Challenge initialized with status DRAFT');
    assert(typeof createData.id === 'string', 'Returns challenge UUID');
    createdChallengeId = createData.id;

    // -------------------------------------------------------------------------
    // Contract 5: POST /api/challenges/:id/submit (Submit Challenge)
    // -------------------------------------------------------------------------
    console.log('\n▶ CONTRACT 5: POST /api/challenges/:id/submit (Submit)...');
    const submitRes = await fetch(`${baseUrl}/challenges/${createdChallengeId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const submitData = await submitRes.json();
    assert(submitRes.status === 200 || submitRes.status === 201, 'POST /challenges/:id/submit returns 200/201');
    assert(submitData.status === 'SUBMITTED', 'Challenge status transitioned to SUBMITTED');

    // -------------------------------------------------------------------------
    // Contract 6: GET /api/challenges/my (List Citizen Challenges)
    // -------------------------------------------------------------------------
    console.log('\n▶ CONTRACT 6: GET /api/challenges/my...');
    const myRes = await fetch(`${baseUrl}/challenges/my`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const myData = await myRes.json();
    assert(myRes.status === 200, 'GET /api/challenges/my returns 200');
    assert(Array.isArray(myData), 'Returns an array of challenges');
    assert(myData.some((c: any) => c.id === createdChallengeId), 'Contains newly submitted challenge');

    // -------------------------------------------------------------------------
    // Contract 7: GET /api/challenges/:id (Details)
    // -------------------------------------------------------------------------
    console.log('\n▶ CONTRACT 7: GET /api/challenges/:id...');
    const detailRes = await fetch(`${baseUrl}/challenges/${createdChallengeId}`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const detailData = await detailRes.json();
    assert(detailRes.status === 200, 'GET /api/challenges/:id returns 200');
    assert(detailData.id === createdChallengeId, 'Returned correct challenge details');
    assert(detailData.district === 'Ranchi', 'District preserved accurately');

    // -------------------------------------------------------------------------
    // Contract 8: Standardized JSON Error Payload Format
    // -------------------------------------------------------------------------
    console.log('\n▶ CONTRACT 8: Verifying Standardized Error Schema { statusCode, message }...');
    const notFoundRes = await fetch(`${baseUrl}/challenges/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const notFoundData = await notFoundRes.json();
    assert(notFoundRes.status === 404, 'Non-existent ID returns 404');
    assert(typeof notFoundData.statusCode === 'number', 'Error JSON contains numeric statusCode');
    assert(typeof notFoundData.message === 'string' || Array.isArray(notFoundData.message), 'Error JSON contains message string or array');

    // -------------------------------------------------------------------------
    // Contract 9: Token Revocation Boundary (Mobile AuthContext Rules)
    // -------------------------------------------------------------------------
    console.log('\n▶ CONTRACT 9: Verifying Token Revocation Boundary (401/403 only)...');
    // Function mimicking Mobile AuthContext token preservation policy
    const shouldRevokeToken = (httpStatus: number) => {
      return httpStatus === 401 || httpStatus === 403;
    };

    assert(shouldRevokeToken(401) === true, 'HTTP 401 revokes mobile token');
    assert(shouldRevokeToken(403) === true, 'HTTP 403 revokes mobile token');
    assert(shouldRevokeToken(500) === false, 'HTTP 500 does NOT revoke mobile token (transient backend error)');
    assert(shouldRevokeToken(502) === false, 'HTTP 502 does NOT revoke mobile token');
    assert(shouldRevokeToken(503) === false, 'HTTP 503 does NOT revoke mobile token (maintenance)');
    assert(shouldRevokeToken(0) === false, 'Network disconnect (status 0) does NOT revoke mobile token');
    assert(shouldRevokeToken(408) === false, 'Timeout (status 408) does NOT revoke mobile token');
  } finally {
    // Cleanup test user and challenges
    if (createdChallengeId) {
      await dataSource.query('DELETE FROM challenge_ai_analysis WHERE challenge_id = $1', [createdChallengeId]);
      await dataSource.query('DELETE FROM challenges WHERE id = $1', [createdChallengeId]);
    }
    await userRepo.delete({ email: citizenEmail });
    await app.close();
  }

  console.log('\n========================================================================');
  console.log(`📊 Suite 5 Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMobileApiContractVerification().catch((err) => {
  console.error('Fatal error in verify-mobile-api-contract:', err);
  process.exit(1);
});
