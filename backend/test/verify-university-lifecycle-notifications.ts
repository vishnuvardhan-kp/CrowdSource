import { config } from 'dotenv';
config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001/api';

async function runUniversityLifecycleTests() {
  console.log('\n======================================================================');
  console.log('🧪 SamadhanSetu: University Experience & Full Lifecycle Notifications');
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
    // -----------------------------------------------------------------
    // Step 1: Authenticate all Stakeholders
    // -----------------------------------------------------------------
    console.log('🔑 Step 1: Authenticating multi-stakeholder actors...');

    // 1a. Citizen Reporter
    const citizenLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen@dev.local', password: 'CitizenDev123!' }),
    });
    assert(citizenLogin.status === 200, 'Citizen login succeeded');
    const citizenToken = (await citizenLogin.json()).accessToken;

    // 1b. University Dean (BIT Mesra)
    const deanLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dean@bitmesra.ac.in', password: 'BitMesra123!' }),
    });
    assert(deanLogin.status === 200, 'University Dean login succeeded');
    const deanData = await deanLogin.json();
    const deanToken = deanData.accessToken;

    const deanMe = await (
      await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${deanToken}` },
      })
    ).json();
    assert(deanMe.role === 'UNIVERSITY_ADMIN', 'Dean role is UNIVERSITY_ADMIN');
    assert(!!deanMe.primaryOrganization?.id, 'Dean is linked to primary academic institution');
    const bitMesraId = deanMe.primaryOrganization.id;

    // 1c. Government Review Officer (Ranchi)
    const officerLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@jharkhand.gov.in', password: 'Officer123!' }),
    });
    assert(officerLogin.status === 200, 'Government Officer login succeeded');
    const officerToken = (await officerLogin.json()).accessToken;

    // 1d. Platform Admin
    const adminLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dev.local', password: 'AdminDev123!' }),
    });
    assert(adminLogin.status === 200, 'Platform Admin login succeeded');
    const adminToken = (await adminLogin.json()).accessToken;

    // -----------------------------------------------------------------
    // Step 2: Capability Passport & Completeness Verification
    // -----------------------------------------------------------------
    console.log('\n🏛️ Step 2: Verifying University Capability Passport data...');

    const passportRes = await fetch(`${API_BASE}/organizations/${bitMesraId}/passport`);
    assert(passportRes.status === 200, 'GET /organizations/:id/passport returned 200');
    const passportData = await passportRes.json();

    assert(passportData.passport_type === 'HEI_PASSPORT', 'Passport type is HEI_PASSPORT');
    assert(Array.isArray(passportData.departments), 'Passport contains departments array');
    assert(Array.isArray(passportData.laboratories), 'Passport contains laboratories array');
    assert(Array.isArray(passportData.capabilities), 'Passport contains capabilities array');
    assert(!!passportData.profile_completeness, 'Passport contains profile_completeness object');
    assert(
      typeof passportData.profile_completeness.score === 'number' ||
        typeof passportData.profile_completeness.percentage === 'number',
      'Completeness score is a number',
    );
    assert(
      Array.isArray(passportData.profile_completeness.checklist) ||
        Array.isArray(passportData.profile_completeness.items),
      'Completeness checklist is an array',
    );

    // -----------------------------------------------------------------
    // Step 3: Availability & Capacity Freshness Confirmation
    // -----------------------------------------------------------------
    console.log('\n⏱️ Step 3: Testing University Availability Confirmation flow...');

    const renewRes = await fetch(`${API_BASE}/organizations/${bitMesraId}/availability/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deanToken}`,
      },
      body: JSON.stringify({ capacity: 18, ttlDays: 30 }),
    });
    assert(renewRes.status === 200 || renewRes.status === 201, 'Availability confirmation endpoint responded 200/201');
    const renewData = await renewRes.json();
    assert(renewData.available_capacity === 18, 'Available capacity updated to 18 slots');
    assert(renewData.availability_status === 'FRESH', 'Availability status is FRESH');

    // -----------------------------------------------------------------
    // Step 4: Citizen Submits Civic Problem & Notification Check
    // -----------------------------------------------------------------
    console.log('\n📢 Step 4: Citizen creates draft and submits challenge...');

    const districts = await (await fetch(`${API_BASE}/locations/districts`)).json();
    const ranchiDistrict = districts.find((d: any) => d.name?.toLowerCase().includes('ranchi')) || districts[0];
    const blocks = await (await fetch(`${API_BASE}/locations/districts/${ranchiDistrict.id}/blocks`)).json();
    const ranchiBlock = blocks[0];

    const timestamp = Date.now();
    const runId = Math.random().toString(36).substring(2, 8);
    // 4a. Create Draft
    const draftRes = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${citizenToken}`,
      },
      body: JSON.stringify({
        title: `Novel Environmental Sensing Initiative ${runId} in Ranchi - ${timestamp}`,
        description:
          `Ecological water testing and remote environmental telemetry sensing deployment in Ranchi block sector ${runId}. Need university laboratory verification and graduate engineering research support - ${timestamp}.`,
        category: 'WATER_SANITATION',
        district_id: ranchiDistrict.id,
        block_id: ranchiBlock.id,
        village_locality: `Sector-${runId} Mesra`,
        citizen_severity: 'SERIOUS',
        affected_population: 'Over 3,500 villagers',
      }),
    });
    assert(draftRes.status === 201 || draftRes.status === 200, 'Challenge draft created');
    const challengeData = await draftRes.json();
    const challengeId = challengeData.id;

    // 4b. Submit Challenge (DRAFT -> SUBMITTED)
    const submitRes = await fetch(`${API_BASE}/challenges/${challengeId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(submitRes.status === 200, 'Challenge submitted (DRAFT -> SUBMITTED)');

    await sleep(400);

    // 4c. Verify Citizen Notification
    const citizenNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    assert(citizenNotifsRes.status === 200, 'Citizen notifications fetched');
    const citizenNotifsData = await citizenNotifsRes.json();
    assert(Array.isArray(citizenNotifsData.notifications), 'Notifications response has notifications array');
    assert(typeof citizenNotifsData.unreadCount === 'number', 'Notifications response has unreadCount number');

    const submitNotif = citizenNotifsData.notifications.find(
      (n: any) => n.reference_id === challengeId || n.action_url?.includes(challengeId),
    );
    assert(!!submitNotif, 'Citizen received submission confirmation notification with deep-link');

    // -----------------------------------------------------------------
    // Step 5: Government Review & Citizen Status Notification
    // -----------------------------------------------------------------
    console.log('\n🏛️ Step 5: Government officer validates challenge...');

    const reviewRes = await fetch(`${API_BASE}/challenges/${challengeId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        status: 'VALIDATED',
        reason: 'Verified field report by Ranchi District Water Sanitation Division.',
      }),
    });
    assert(reviewRes.status === 200, 'Government officer validated challenge');

    await sleep(400);

    // Verify citizen received status update notification
    const citizenNotifsAfterVerify = await (
      await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      })
    ).json();
    const verifiedNotif = citizenNotifsAfterVerify.notifications.find(
      (n: any) => n.action_url?.includes(challengeId),
    );
    assert(!!verifiedNotif, 'Citizen received government verification notification');

    // -----------------------------------------------------------------
    // Step 6: University EOI Submission
    // -----------------------------------------------------------------
    console.log('\n📝 Step 6: University submits Expression of Interest (EOI)...');

    // 6a. Create Draft EOI
    const createEoiRes = await fetch(`${API_BASE}/challenges/${challengeId}/eois`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deanToken}`,
      },
      body: JSON.stringify({
        motivation:
          'BIT Mesra Department of Environmental Engineering has published research on indigenous arsenic adsorbents and IoT water nodes.',
        proposed_approach:
          'Deploy low-cost IoT turbidity/arsenic monitoring units with telemetry to district dashboard and pilot a gravity-fed sand/laterite filtration unit.',
        proposed_contribution: 'Sensor hardware, lab testing, faculty mentorship and graduate research team.',
        timeline: 'THREE_TO_SIX_MONTHS',
        collaboration_lead_name: 'Dr. Anand Prasad',
        collaboration_lead_designation: 'Dean of R&D, BIT Mesra',
        collaboration_lead_email: 'dean@bitmesra.ac.in',
        contributions: [
          {
            contribution_type: 'EXPERTISE',
            description: 'Faculty supervision by Dept of Civil and Environmental Engineering.',
          },
          {
            contribution_type: 'TESTING',
            description: 'Water quality testing and atomic absorption spectrometry.',
          },
          {
            contribution_type: 'STUDENT_TEAM',
            description: '4 M.Tech Environmental Science graduate researchers.',
          },
        ],
      }),
    });
    if (createEoiRes.status !== 201 && createEoiRes.status !== 200) {
      const errText = await createEoiRes.text();
      console.error(`  ⚠️ Create EOI failed (${createEoiRes.status}): ${errText}`);
    }
    assert(createEoiRes.status === 201 || createEoiRes.status === 200, 'Draft EOI created for University');
    const eoiData = await createEoiRes.json();
    const eoiId = eoiData.id;

    // 6b. Submit EOI (DRAFT -> UNDER_REVIEW)
    const submitEoiRes = await fetch(`${API_BASE}/eois/${eoiId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    if (submitEoiRes.status !== 200) {
      const errText = await submitEoiRes.text();
      console.error(`  ⚠️ Submit EOI failed (${submitEoiRes.status}): ${errText}`);
    }
    assert(submitEoiRes.status === 200, 'EOI submitted successfully');
    const submittedEoi = await submitEoiRes.json();

    await sleep(400);

    // 6c. Verify Dean received submission notification
    const deanNotifsRes = await fetch(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    const deanNotifs = await deanNotifsRes.json();
    const eoiNotif = deanNotifs.notifications.find(
      (n: any) => n.action_url?.includes('/my-eois') || n.title?.includes('EOI'),
    );
    assert(!!eoiNotif, 'University Dean received EOI submission confirmation notification');

    // -----------------------------------------------------------------
    // Step 7: Government Accepts EOI & Forms Collaborative Project
    // -----------------------------------------------------------------
    console.log('\n🤝 Step 7: Government accepts EOI and forms collaborative consortium project...');

    // 7a. Reviewer accepts EOI into consortium candidate pool (if not auto-qualified)
    if (submittedEoi.status === 'UNDER_REVIEW') {
      const acceptEoiRes = await fetch(`${API_BASE}/admin/eois/${eoiId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      if (acceptEoiRes.status !== 200) {
        const errText = await acceptEoiRes.text();
        console.error(`  ⚠️ Accept EOI failed (${acceptEoiRes.status}): ${errText}`);
      }
      assert(acceptEoiRes.status === 200, 'Government officer accepted EOI into consortium candidate pool');
    } else {
      assert(submittedEoi.status === 'ACCEPTED', 'EOI in accepted consortium candidate pool');
    }

    // 7b. Form collaborative project
    const formProjectRes = await fetch(`${API_BASE}/admin/challenges/${challengeId}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        eoi_ids: [eoiId],
        title: `Mesra Arsenic Filtration & IoT Monitoring Pilot Project - ${timestamp}`,
        description: 'Collaborative initiative between BIT Mesra and District Water Board.',
      }),
    });
    if (formProjectRes.status !== 201 && formProjectRes.status !== 200) {
      const errText = await formProjectRes.text();
      console.error(`  ⚠️ Form project failed (${formProjectRes.status}): ${errText}`);
    }
    assert(formProjectRes.status === 201 || formProjectRes.status === 200, 'Collaborative project formed');
    const projectData = await formProjectRes.json();
    const projectId = projectData.id;
    assert(!!projectId, 'Project ID generated');

    await sleep(400);

    // 7c. Check multi-stakeholder notifications
    const deanNotifsPostProject = await (
      await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${deanToken}` } })
    ).json();
    const projectNotifDean = deanNotifsPostProject.notifications.find(
      (n: any) => n.action_url?.includes(`/projects/${projectId}`) || n.title?.includes('Project Formed') || n.title?.includes('Project'),
    );
    assert(!!projectNotifDean, 'University received Project Formed notification with project deep-link');

    // -----------------------------------------------------------------
    // Step 8: Kickoff Plan & Milestone Progression
    // -----------------------------------------------------------------
    console.log('\n🚀 Step 8: Submitting kickoff plan & milestone progress...');

    // 8a. Lead submits Kickoff Plan
    const kickoffRes = await fetch(`${API_BASE}/projects/${projectId}/kickoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deanToken}`,
      },
      body: JSON.stringify({
        objectives: 'Design and deploy arsenic telemetry sensors and filtration modules in Mesra.',
        expected_outcomes: 'Clean drinking water for 3,500+ residents and real-time dashboard data.',
        initial_milestones: [
          {
            title: 'Milestone 1: Baseline Water Quality Mapping & IoT Setup',
            description: 'Map 15 groundwater sources and deploy 5 prototype IoT water monitoring stations.',
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            order_index: 1,
          },
        ],
      }),
    });
    assert(kickoffRes.status === 200 || kickoffRes.status === 201, 'Kickoff plan submitted');

    // 8b. Government approves Kickoff Plan (activating project and milestone)
    const approveKickoffRes = await fetch(`${API_BASE}/admin/projects/${projectId}/kickoff-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        decision: 'APPROVE',
        comments: 'Kickoff plan approved for district pilot deployment.',
      }),
    });
    assert(approveKickoffRes.status === 200 || approveKickoffRes.status === 201, 'Kickoff plan approved by government reviewer');

    // 8c. Fetch project details
    const projDetail = await (
      await fetch(`${API_BASE}/projects/${projectId}`, { headers: { Authorization: `Bearer ${deanToken}` } })
    ).json();
    assert(projDetail.milestones?.length >= 1, 'Project has active milestones defined');
    const firstMilestoneId = projDetail.milestones[0].id;

    // 8d. Lead requests milestone review
    const reqMilestoneRes = await fetch(`${API_BASE}/projects/${projectId}/milestones/${firstMilestoneId}/request-review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    assert(reqMilestoneRes.status === 200, 'Milestone review requested by university lead');

    // 8e. Reviewer approves milestone
    const reviewMilestoneRes = await fetch(`${API_BASE}/admin/projects/${projectId}/milestones/${firstMilestoneId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        decision: 'APPROVE',
        comments: 'Milestone 1 water baseline targets met and verified by district water testing lab.',
      }),
    });
    assert(reviewMilestoneRes.status === 200 || reviewMilestoneRes.status === 201, 'Milestone review succeeded');

    // -----------------------------------------------------------------
    // Step 9: Notification Mark-Read & Mark-All-Read API tests
    // -----------------------------------------------------------------
    console.log('\n📬 Step 9: Testing Notification Read and Mark-All-Read APIs...');

    const unreadBefore = deanNotifsPostProject.unreadCount;
    assert(unreadBefore > 0, `Dean has ${unreadBefore} unread notifications`);

    // Mark single notification read
    if (deanNotifsPostProject.notifications.length > 0) {
      const firstNotifId = deanNotifsPostProject.notifications[0].id;
      const readOneRes = await fetch(`${API_BASE}/notifications/${firstNotifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${deanToken}` },
      });
      assert(readOneRes.status === 200, 'PATCH /notifications/:id/read returned 200');
    }

    // Mark all notifications read
    const markAllRes = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${deanToken}` },
    });
    assert(markAllRes.status === 200, 'PATCH /notifications/mark-all-read returned 200');

    // Verify unread count is now 0
    const deanNotifsAfterMarkAll = await (
      await fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${deanToken}` } })
    ).json();
    assert(deanNotifsAfterMarkAll.unreadCount === 0, 'Unread count reset to 0 after mark-all-read');

    // -----------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------
    console.log('\n======================================================================');
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('💥 Unexpected test runner error:', err);
    process.exit(1);
  }
}

runUniversityLifecycleTests();
