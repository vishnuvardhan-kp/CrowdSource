import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
const API_BASE = 'http://localhost:3001/api';
const FRONTEND_BASE = 'http://localhost:3000';

async function runE2ETests() {
  console.log('\n======================================================================');
  console.log('🧪 SamadhanSetu: E2E Educational Institution Matching & Notification Flow');
  console.log('======================================================================\n');

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

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    // -------------------------------------------------------------
    // Step 1: Authentication for Citizen, Institution Dean, and Admin
    // -------------------------------------------------------------
    console.log('🔑 Step 1: Authenticating test actors...');
    
    // 1a. Citizen
    const citizenLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen@dev.local', password: 'CitizenDev123!' }),
    });
    assert(citizenLogin.status === 200, 'Citizen login succeeded (citizen@dev.local)');
    const citizenToken = (await citizenLogin.json()).accessToken;

    // 1b. Institution (Dean of BIT Mesra)
    const deanLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dean@bitmesra.ac.in', password: 'BitMesra123!' }),
    });
    assert(deanLogin.status === 200, 'Institution Dean login succeeded (dean@bitmesra.ac.in)');
    const deanData = await deanLogin.json();
    const deanToken = deanData.accessToken;

    // Check Dean's institutional profile
    const deanMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    const deanMe = await deanMeRes.json();
    assert(deanMe.role === 'UNIVERSITY_ADMIN', 'Dean user role is UNIVERSITY_ADMIN');
    assert(
      deanMe.primaryOrganization?.name === 'Birla Institute of Technology, Mesra',
      'Dean is linked to Birla Institute of Technology, Mesra',
    );

    // 1c. Platform Admin
    const adminLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dev.local', password: 'AdminDev123!' }),
    });
    assert(adminLogin.status === 200, 'Platform Admin login succeeded (admin@dev.local)');
    const adminToken = (await adminLogin.json()).accessToken;

    // -------------------------------------------------------------
    // Step 2: Query District & Block in Ranchi
    // -------------------------------------------------------------
    console.log('\n📍 Step 2: Fetching Ranchi District & Block hierarchy...');
    const districtsRes = await fetch(`${API_BASE}/locations/districts`);
    assert(districtsRes.status === 200, 'Districts fetched successfully');
    const districts = await districtsRes.json();
    const ranchiDistrict = districts.find((d: any) => d.name.toLowerCase() === 'ranchi') || districts[0];
    
    const blocksRes = await fetch(`${API_BASE}/locations/districts/${ranchiDistrict.id}/blocks`);
    assert(blocksRes.status === 200, 'Blocks fetched successfully');
    const blocks = await blocksRes.json();
    const ranchiBlock = blocks[0];
    console.log(`     Target District: ${ranchiDistrict.name} (${ranchiDistrict.id}), Block: ${ranchiBlock.name}`);

    // -------------------------------------------------------------
    // Step 3: Citizen Submits a Water Quality & IoT Problem
    // -------------------------------------------------------------
    console.log('\n📝 Step 3: Citizen creates draft and submits societal problem...');
    const draftRes = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: `Groundwater Arsenic Contamination & IoT Monitoring in Mesra - ${Date.now()}`,
        description:
          'Groundwater testing across Mesra village in Ranchi reveals severe arsenic contamination exceeding permissible BIS limits. Urgent requirement for automated IoT water sensor nodes, AI-based contamination prediction, and localized community water purification setups to protect community health.',
        category: 'WATER_SANITATION',
        district_id: ranchiDistrict.id,
        block_id: ranchiBlock.id,
        village_locality: 'Mesra Village',
        citizen_severity: 'SERIOUS',
        affected_population: '5000+ residents',
      }),
    });
    assert(draftRes.status === 201, 'Citizen draft challenge created (201 Created)');
    const challenge = await draftRes.json();
    const challengeId = challenge.id;
    console.log(`     Created Challenge ID: ${challengeId}`);

    // Submit challenge
    const submitRes = await fetch(`${API_BASE}/challenges/${challengeId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(submitRes.status === 200, 'Citizen challenge submitted (200 OK)');
    const submittedChallenge = await submitRes.json();
    assert(submittedChallenge.status === 'SUBMITTED', 'Challenge status transitioned to SUBMITTED');

    // -------------------------------------------------------------
    // Step 4: Wait for AI Analysis & Capability Matching to execute
    // -------------------------------------------------------------
    console.log('\n🤖 Step 4: Waiting for automated AI Problem Intelligence & Matching Engine...');
    let matchingCompleted = false;
    let recsCount = 0;
    for (let attempt = 1; attempt <= 15; attempt++) {
      await sleep(2000);
      const adminRecRes = await fetch(`${API_BASE}/reviews/challenge/${challengeId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (adminRecRes.status === 200) {
        const data = await adminRecRes.json();
        const recs = data.recommendations || [];
        if (recs.length > 0) {
          matchingCompleted = true;
          recsCount = recs.length;
          console.log(`     Matching completed in attempt ${attempt}: Found ${recs.length} ecosystem candidate(s).`);
          break;
        }
      }
    }
    assert(matchingCompleted, `AI Analysis & Matching completed (${recsCount} candidate institutions evaluated)`);

    // -------------------------------------------------------------
    // Step 5: Verify Institution Notification Delivery
    // -------------------------------------------------------------
    console.log('\n🎓 Step 5: Verifying proactive recommendation notification in Institutional Portal...');
    const deanNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    assert(deanNotifsRes.status === 200, 'Dean fetched notifications (200 OK)');
    const deanNotifsData = await deanNotifsRes.json();
    const notifsList = Array.isArray(deanNotifsData) ? deanNotifsData : deanNotifsData.notifications || [];
    
    // Find the recommendation notification for this challenge
    const matchNotif = notifsList.find(
      (n: any) => n.reference_id === challengeId || (n.action_url && n.action_url.includes(challengeId)),
    );
    assert(!!matchNotif, 'Proactive recommendation notification found for BIT Mesra Dean');
    if (matchNotif) {
      assert(
        matchNotif.title.includes('🎓') || matchNotif.title.includes('Recommendation'),
        `Notification title contains recommendation branding: "${matchNotif.title}"`,
      );
      assert(
        matchNotif.action_url === `/challenges/${challengeId}`,
        `Notification action_url routes directly to challenge: "${matchNotif.action_url}"`,
      );
      assert(
        matchNotif.message.includes('Capability Match:'),
        'Notification message contains Capability Match breakdown',
      );
      assert(
        matchNotif.message.includes('Why this was recommended:'),
        'Notification message contains explanation of why institution was recommended',
      );
      console.log('     Notification Message Preview:\n' + matchNotif.message.split('\n').map((l: string) => `       | ${l}`).join('\n'));

      // Test Mark as Read
      const markReadRes = await fetch(`${API_BASE}/notifications/${matchNotif.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${deanToken}` },
      });
      assert(markReadRes.status === 200, 'Notification marked as read successfully');
    }

    // -------------------------------------------------------------
    // Step 6: Verify Strict Role Isolation & Privacy
    // -------------------------------------------------------------
    console.log('\n🔒 Step 6: Verifying strict role isolation & privacy...');

    // 6a. Citizen view of recommendations: MUST BE EMPTY
    const citizenRecRes = await fetch(`${API_BASE}/reviews/challenge/${challengeId}`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const citizenData = await citizenRecRes.json();
    const citizenRecs = citizenData.recommendations || [];
    assert(
      citizenRecs.length === 0,
      'Citizen receives empty recommendations array (NOT displayed under citizen problem view)',
    );

    // 6b. Institutional Dean view of recommendations: MUST ONLY CONTAIN OWN INSTITUTION
    const deanRecRes = await fetch(`${API_BASE}/reviews/challenge/${challengeId}`, {
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    const deanDataRec = await deanRecRes.json();
    const deanRecs = deanDataRec.recommendations || [];
    assert(deanRecs.length === 1, 'Institution Dean receives exactly their own institution match');
    if (deanRecs.length > 0) {
      const myRec = deanRecs[0];
      assert(
        myRec.organization_name === 'Birla Institute of Technology, Mesra',
        `Recommendation is for BIT Mesra (received: "${myRec.organization_name}")`,
      );
      assert(
        myRec.total_score >= 30,
        `Match score is mathematically computed and significant (score: ${Math.round(myRec.total_score)}%)`,
      );
      assert(
        Array.isArray(myRec.reasons) && myRec.reasons.length > 0,
        `Matching reasons provided: ${myRec.reasons.join(', ')}`,
      );
    }

    // 6c. Reviewer / Platform Admin view of recommendations: RECEIVES ALL CANDIDATES
    const adminRecRes = await fetch(`${API_BASE}/reviews/challenge/${challengeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminDataRec = await adminRecRes.json();
    const adminRecs = adminDataRec.recommendations || [];
    assert(
      adminRecs.length >= 1,
      `Platform Admin receives full candidate roster (${adminRecs.length} candidate(s))`,
    );

    // -------------------------------------------------------------
    // Step 7: Government Reviewer Validates Challenge & Institution Submits EOI
    // -------------------------------------------------------------
    console.log('\n🤝 Step 7: Reviewer validates challenge and Institution submits EOI...');
    
    // Withdraw any previous active test EOIs for BIT Mesra to avoid cluster uniqueness collision
    try {
      const existingEoisRes = await fetch(`${API_BASE}/eois/my`, {
        headers: { Authorization: `Bearer ${deanToken}` },
      });
      if (existingEoisRes.status === 200) {
        const existingEois = await existingEoisRes.json();
        for (const e of existingEois) {
          if (e.status === 'DRAFT' || e.status === 'SUBMITTED' || e.status === 'UNDER_REVIEW') {
            await fetch(`${API_BASE}/eois/${e.id}/withdraw`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${deanToken}`,
              },
              body: JSON.stringify({ reason: 'Withdrawing for fresh integration test' }),
            });
          }
        }
      }
    } catch {}

    const reviewRes = await fetch(`${API_BASE}/challenges/${challengeId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'VALIDATED',
      }),
    });
    assert(reviewRes.status === 200, 'Government reviewer validated problem for ecosystem collaboration (200 OK)');

    const eoiRes = await fetch(`${API_BASE}/challenges/${challengeId}/eois`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deanToken}`,
      },
      body: JSON.stringify({
        proposed_approach:
          'Deployment of our LoRaWAN water sensor grid across Mesra with multi-parameter electrochemical sensors and edge AI alerting.',
        proposed_contribution:
          'Faculty advising, water testing laboratory facilities, and IoT sensor network hardware.',
        motivation:
          'Direct societal impact on groundwater safety in Ranchi district.',
        timeline: 'THREE_TO_SIX_MONTHS',
        collaboration_lead_name: 'Dean of Research, BIT Mesra',
        collaboration_lead_email: 'dean.research@bitmesra.ac.in',
        collaboration_lead_phone: '+91-651-2275444',
      }),
    });
    assert(
      eoiRes.status === 201 || eoiRes.status === 200,
      `Dean submitted Expression of Interest (EOI) (status: ${eoiRes.status})`,
    );

    // Verify Dean now sees submitted EOI on the challenge
    const challengeWithEoiRes = await fetch(`${API_BASE}/challenges/${challengeId}`, {
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    const challengeWithEoi = await challengeWithEoiRes.json();
    assert(challengeWithEoi.my_eoi !== null, 'Challenge detail reflects active EOI for BIT Mesra');

    // -------------------------------------------------------------
    // Step 8: Frontend Page Availability Check
    // -------------------------------------------------------------
    console.log('\n🌐 Step 8: Verifying frontend challenge page renders cleanly...');
    const frontendRes = await fetch(`${FRONTEND_BASE}/challenges/${challengeId}`);
    assert(frontendRes.status === 200, `Frontend challenge page rendered successfully (200 OK)`);

    // -------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------
    console.log('\n======================================================================');
    console.log(`🎉 E2E Verification Complete: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('💥 Test suite crashed with error:', error);
    process.exit(1);
  }
}

runE2ETests();
