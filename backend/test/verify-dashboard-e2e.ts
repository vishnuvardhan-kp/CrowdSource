import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
/**
 * End-to-End Verification Script: Government Intelligence Dashboard
 * Tests live APIs, aggregations, filters, and district isolation.
 */
const API_URL = 'http://localhost:3001/api';

async function verify() {
  console.log('=== Government Intelligence Dashboard E2E Verification ===\n');

  // 1. State Admin
  console.log('1. Testing State Admin login & statewide metrics...');
  const stateLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin.state@jharkhand.gov.in', password: 'GovAdmin123!' }),
  });
  if (!stateLogin.ok) throw new Error('State admin login failed');
  const { accessToken: stateToken } = await stateLogin.json();

  const stateOverviewRes = await fetch(`${API_URL}/admin/analytics/overview`, {
    headers: { Authorization: `Bearer ${stateToken}` },
  });
  const stateOverview = await stateOverviewRes.json();
  console.log('Statewide KPIs:', stateOverview.executive_kpis);
  console.log('Statewide Clusters:', stateOverview.problemClusters);
  console.log('Statewide Projects:', stateOverview.projects);

  if (stateOverview.executive_kpis.totalChallenges <= 0) {
    throw new Error('Expected totalChallenges > 0');
  }

  // 2. Trend with 30d timeRange (Daily grouping)
  console.log('\n2. Testing 30d Trend Line Daily Grouping...');
  const trendRes = await fetch(`${API_URL}/admin/analytics/challenges?timeRange=30d`, {
    headers: { Authorization: `Bearer ${stateToken}` },
  });
  const trendData = await trendRes.json();
  console.log('30d Daily Trend Points:', trendData.overTime);
  if (!trendData.overTime || trendData.overTime.length === 0) {
    throw new Error('Expected 30d trend points');
  }
  const samplePeriod = trendData.overTime[0].period || trendData.overTime[0].date;
  if (!samplePeriod || samplePeriod.length !== 10) {
    throw new Error(`Expected daily format YYYY-MM-DD, got: ${samplePeriod}`);
  }
  console.log(`  ✓ Daily format verified: ${samplePeriod}`);

  // 3. Domain filter
  console.log('\n3. Testing Domain filter: WATER_AND_SANITATION...');
  const domainRes = await fetch(`${API_URL}/admin/analytics/overview?domain=WATER_AND_SANITATION`, {
    headers: { Authorization: `Bearer ${stateToken}` },
  });
  const domainOverview = await domainRes.json();
  console.log('Filtered Total Challenges:', domainOverview.executive_kpis.totalChallenges);
  if (domainOverview.executive_kpis.totalChallenges >= stateOverview.executive_kpis.totalChallenges) {
    throw new Error('Domain filter should narrow down challenge count');
  }
  console.log('  ✓ Domain filter successfully narrowed scope');

  // 4. District Officer (Ranchi)
  console.log('\n4. Testing District Officer (Ranchi) strict isolation...');
  const ranchiLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer.ranchi@jharkhand.gov.in', password: 'GovOfficer123!' }),
  });
  const { accessToken: ranchiToken } = await ranchiLogin.json();

  const ranchiOverviewRes = await fetch(`${API_URL}/admin/analytics/overview`, {
    headers: { Authorization: `Bearer ${ranchiToken}` },
  });
  const ranchiOverview = await ranchiOverviewRes.json();
  console.log('Ranchi Officer Scope:', ranchiOverview.metadata.jurisdiction.scope);
  console.log('Ranchi Total Challenges:', ranchiOverview.executive_kpis.totalChallenges);
  if (ranchiOverview.metadata.jurisdiction.scope !== 'DISTRICT') {
    throw new Error('Expected scope to be DISTRICT');
  }
  if (ranchiOverview.executive_kpis.totalChallenges >= stateOverview.executive_kpis.totalChallenges) {
    throw new Error('Ranchi count should be less than statewide total');
  }

  // 5. Query Tampering Defense
  console.log('\n5. Testing Query Tampering Defense (Ranchi officer passing foreign district_id)...');
  const tamperedRes = await fetch(`${API_URL}/admin/analytics/overview?district_id=e77a5ef3-a204-46b8-9b95-53427af99747`, {
    headers: { Authorization: `Bearer ${ranchiToken}` },
  });
  const tamperedOverview = await tamperedRes.json();
  if (tamperedOverview.metadata.jurisdiction.scope !== 'DISTRICT') {
    throw new Error('Tampered scope must remain DISTRICT');
  }
  if (tamperedOverview.executive_kpis.totalChallenges !== ranchiOverview.executive_kpis.totalChallenges) {
    throw new Error('Tampered request returned foreign district data! Isolation failed.');
  }
  console.log('  ✓ Query tampering defeated: Server locked query to user.district_id (Ranchi)');

  // 6. Action Queue
  console.log('\n6. Testing Action Queue...');
  const queueRes = await fetch(`${API_URL}/admin/analytics/action-queue`, {
    headers: { Authorization: `Bearer ${ranchiToken}` },
  });
  const queueData = await queueRes.json();
  console.log(`Action Queue Items in Ranchi: ${queueData.items?.length || 0}`);
  if (queueData.items && queueData.items.length > 0) {
    const item = queueData.items[0];
    console.log(`  Sample Queue Item: [${item.priority}] ${item.title} (${item.confirmations_count} confirmations)`);
  }

  console.log('\n=== ALL E2E DASHBOARD CHECKS PASSED SUCCESSFULLY ===');
}

verify().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
