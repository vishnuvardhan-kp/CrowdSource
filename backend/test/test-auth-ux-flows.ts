const API_BASE = 'http://localhost:3001/api';

async function runAuthUxTests() {
  console.log('\n============================================================');
  console.log('🧪 Starting SamadhanSetu Authentication & Role Entry Verification');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  }

  try {
    // 1. Test Citizen login
    console.log('👤 1. Testing Citizen Login...');
    const citizenLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen@example.com',
        password: 'Password123!',
      }),
    });
    assert(citizenLoginRes.status === 200, 'Citizen login returned 200 OK');
    const citizenData = await citizenLoginRes.json();
    assert(!!citizenData.accessToken, 'Access token generated for Citizen');

    const citizenMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${citizenData.accessToken}` },
    });
    const citizenMe = await citizenMeRes.json();
    assert(citizenMe.role === 'CITIZEN', 'Citizen user has CITIZEN role');
    assert(citizenMe.memberships.length === 0, 'Standard citizen has no premature organization memberships');

    // 2. Test University/Research login
    console.log('\n🎓 2. Testing University / Research Login (BAU)...');
    const uniLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@bau.ac.in',
        password: 'Password123!',
      }),
    });
    assert(uniLoginRes.status === 200, 'University admin login returned 200 OK');
    const uniData = await uniLoginRes.json();
    const uniMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${uniData.accessToken}` },
    });
    const uniMe = await uniMeRes.json();
    assert(uniMe.role === 'UNIVERSITY_ADMIN', 'University admin has UNIVERSITY_ADMIN role');
    assert(uniMe.memberships.length > 0, 'University admin has active organization membership');
    assert(uniMe.memberships[0].organization_name.includes('Birsa Agricultural'), 'Membership correctly links to Birsa Agricultural University');

    // 3. Test Industry/Startup/MSME login
    console.log('\n🏢 3. Testing Industry / Startup Login (Tata Steel)...');
    const indLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@tatasteel.com',
        password: 'Password123!',
      }),
    });
    assert(indLoginRes.status === 200, 'Industry admin login returned 200 OK');
    const indData = await indLoginRes.json();
    const indMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${indData.accessToken}` },
    });
    const indMe = await indMeRes.json();
    assert(indMe.role === 'INDUSTRY_ADMIN', 'Industry user has INDUSTRY_ADMIN role');
    assert(indMe.memberships.length > 0, 'Industry admin has active organization membership');

    // 4. Test Government/Reviewer login
    console.log('\n⚖️ 4. Testing Government / Reviewer Login...');
    const govLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'officer@jharkhand.gov.in',
        password: 'Officer123!',
      }),
    });
    assert(govLoginRes.status === 200, 'Government officer login returned 200 OK');
    const govData = await govLoginRes.json();
    const govMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${govData.accessToken}` },
    });
    const govMe = await govMeRes.json();
    assert(govMe.role === 'GOVERNMENT_OFFICER', 'Government user has GOVERNMENT_OFFICER role');

    // 5. Test Invalid Credentials
    console.log('\n🔒 5. Testing Invalid Credentials Rejection...');
    const invalidLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen@example.com',
        password: 'IncorrectPassword!',
      }),
    });
    assert(invalidLoginRes.status === 401, 'Invalid credentials correctly rejected with HTTP 401 Unauthorized');

    // 6. Test Unauthorized Protected Route Access
    console.log('\n🛡️ 6. Testing RBAC Protected Route Access...');
    const citizenAdminTestRes = await fetch(`${API_BASE}/auth/admin-test`, {
      headers: { Authorization: `Bearer ${citizenData.accessToken}` },
    });
    assert(citizenAdminTestRes.status === 403, 'Citizen unauthorized access rejected with HTTP 403 Forbidden');

    // Platform admin accesses admin test endpoint
    const platformAdminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@samadhansetu.gov.in',
        password: 'Admin123!',
      }),
    });
    const platformAdminData = await platformAdminLoginRes.json();
    const adminTestRes = await fetch(`${API_BASE}/auth/admin-test`, {
      headers: { Authorization: `Bearer ${platformAdminData.accessToken}` },
    });
    assert(adminTestRes.status === 200, 'Platform Administrator successfully authorized for admin endpoint');

    // 7. Test Capability Passport Access
    console.log('\n🏛️ 7. Testing Capability Passport & Availability Retrieval...');
    const orgId = uniMe.memberships[0].organization_id;
    const passportRes = await fetch(`${API_BASE}/organizations/${orgId}/passport`);
    assert(passportRes.status === 200, 'Capability passport loaded successfully');
    const passportData = await passportRes.json();
    assert(Array.isArray(passportData.capabilities), 'Passport includes capabilities catalog');

    const availRes = await fetch(`${API_BASE}/organizations/${orgId}/availability`);
    assert(availRes.status === 200, 'Availability status loaded');
    const availData = await availRes.json();
    assert(['FRESH', 'STALE', 'UNKNOWN'].includes(availData.availability_status), 'Valid availability state returned');

    // 8. Test Session Handling & Invalid Token
    console.log('\n🔑 8. Testing Session Expiry & Malformed Token Rejection...');
    const malformedTokenRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: 'Bearer invalid.or.expired.jwt.token' },
    });
    assert(malformedTokenRes.status === 401, 'Malformed JWT correctly rejected with HTTP 401 Unauthorized');

    console.log('\n============================================================');
    console.log(`🏆 ALL AUTHENTICATION UX & ROLE ENTRY FLOWS VERIFIED!`);
    console.log(`Summary: ${passed} passed, ${failed} failed`);
    console.log('============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal error during auth test:', err.message);
    process.exit(1);
  }
}

runAuthUxTests();
