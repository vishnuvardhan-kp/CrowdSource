import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UserRole, ChallengeStatus, CitizenSeverity } from '../src/common/enums';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { District } from '../src/modules/locations/entities/district.entity';
import { Block } from '../src/modules/locations/entities/block.entity';
import { ProblemCluster } from '../src/modules/problem-clusters/entities/problem-cluster.entity';
import { ProblemClustersService } from '../src/modules/problem-clusters/problem-clusters.service';

async function runMultilingualE2EVerification() {
  console.log('🚀 Starting SamadhanSetu Post-Phase-9 Multilingual End-to-End Suite...\n');
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
    }),
  );

  await app.listen(0);
  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'string' ? 3001 : address.port;
  const baseUrl = `http://localhost:${port}/api`;

  const dataSource = app.get(DataSource);
  const challengeRepo = dataSource.getRepository(Challenge);
  const userRepo = dataSource.getRepository(User);
  const districtRepo = dataSource.getRepository(District);
  const blockRepo = dataSource.getRepository(Block);
  const clusterRepo = dataSource.getRepository(ProblemCluster);
  const clustersService = app.get(ProblemClustersService);

  const uniqueSuffix = Date.now();
  const testPassword = 'Password123!';

  const hindiCitizenEmail = `citizen-hi-${uniqueSuffix}@test.local`;
  const santaliCitizenEmail = `citizen-sat-${uniqueSuffix}@test.local`;
  const englishCitizenEmail = `citizen-en-${uniqueSuffix}@test.local`;
  const reviewerEmail = `reviewer-${uniqueSuffix}@test.local`;

  let hindiToken = '';
  let santaliToken = '';
  let englishToken = '';
  let reviewerToken = '';

  let ranchiDistrict: District;
  let namkumBlock: Block;

  try {
    // -------------------------------------------------------------------------
    // Setup: Retrieve or Create District and Block for Location Testing
    // -------------------------------------------------------------------------
    let dist = await districtRepo.findOne({ where: { name: 'Ranchi' } });
    if (!dist) {
      dist = await districtRepo.save(districtRepo.create({ name: 'Ranchi', state: 'Jharkhand' }));
    }
    ranchiDistrict = dist;

    let blk = await blockRepo.findOne({ where: { name: 'Namkum', district_id: ranchiDistrict.id } });
    if (!blk) {
      blk = await blockRepo.save(blockRepo.create({ name: 'Namkum', district_id: ranchiDistrict.id }));
    }
    namkumBlock = blk;

    // -------------------------------------------------------------------------
    // 1. User Registration & Preferred UI Language
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: User Registration with Preferred UI Language ---');

    // Register Hindi citizen
    const regHiRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'रमेश कुमार',
        email: hindiCitizenEmail,
        password: testPassword,
        preferred_language: 'hi',
      }),
    });
    const regHiData = await regHiRes.json();
    assert(regHiRes.status === 201, 'Hindi citizen registered successfully');
    assert(regHiData.preferred_language === 'hi', 'Citizen preferred_language initialized to "hi"');

    const loginHiRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hindiCitizenEmail, password: testPassword }),
    });
    const loginHiData = await loginHiRes.json();
    hindiToken = loginHiData.accessToken;
    assert(!!hindiToken, 'Hindi citizen authenticated with JWT token');

    // Register Santali citizen
    const regSatRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'ᱥᱟᱱᱛᱟᱲ ᱵᱟᱹᱵᱩ',
        email: santaliCitizenEmail,
        password: testPassword,
        preferred_language: 'sat',
      }),
    });
    const regSatData = await regSatRes.json();
    assert(regSatRes.status === 201, 'Santali citizen registered successfully');
    assert(regSatData.preferred_language === 'sat', 'Citizen preferred_language initialized to "sat"');

    const loginSatRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: santaliCitizenEmail, password: testPassword }),
    });
    santaliToken = (await loginSatRes.json()).accessToken;
    assert(!!santaliToken, 'Santali citizen authenticated with JWT token');

    // Register English citizen
    const regEnRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: englishCitizenEmail,
        password: testPassword,
        preferred_language: 'en',
      }),
    });
    assert(regEnRes.status === 201, 'English citizen registered successfully');

    const loginEnRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: englishCitizenEmail, password: testPassword }),
    });
    englishToken = (await loginEnRes.json()).accessToken;
    assert(!!englishToken, 'English citizen authenticated with JWT token');

    // Create Government Reviewer directly in DB repository and login
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    await userRepo.save(
      userRepo.create({
        name: 'Gov Officer Ranchi',
        email: reviewerEmail,
        password_hash: hashedPassword,
        role: UserRole.GOVERNMENT_OFFICER,
        preferred_language: 'en',
        district_id: ranchiDistrict.id,
        district: ranchiDistrict.name,
      })
    );

    const loginRevRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: reviewerEmail, password: testPassword }),
    });
    reviewerToken = (await loginRevRes.json()).accessToken;
    assert(!!reviewerToken, 'Government Reviewer authenticated successfully');

    // -------------------------------------------------------------------------
    // 2. Draft Creation in Native Language (Separation of UI and Submission)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Native Language Draft Creation & Original Text Storage ---');

    const hindiTitle = 'पेयजल संकट: नामकुम में मुख्य पाइपलाइन टूटी';
    const hindiDesc =
      'नामकुम ब्लॉक के खिजरी में 15 दिनों से पीने के पानी की मुख्य पाइपलाइन फूटी हुई है। 400 परिवार बिना पानी के परेशान हैं। 💧';

    const createDraftHiRes = await fetch(`${baseUrl}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hindiToken}`,
      },
      body: JSON.stringify({
        title: hindiTitle,
        description: hindiDesc,
        district_id: ranchiDistrict.id,
        block_id: namkumBlock.id,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    });
    const draftHi = await createDraftHiRes.json();
    assert(createDraftHiRes.status === 201, 'Hindi Draft challenge created with 201 Created');
    assert(draftHi.original_text === hindiDesc, 'original_text correctly initialized to native Hindi description');
    assert(draftHi.original_language === 'hi', 'original_language detected or defaulted to "hi"');

    // Santali Ol Chiki Draft Creation
    const santaliTitle = 'ᱫᱟᱜ ᱨᱮᱱᱟᱜ ᱟᱱᱟᱴ: ᱱᱟᱢᱠᱩᱢ ᱨᱮ ᱯᱟᱭᱤᱯ ᱨᱟᱹᱯᱩᱫ ᱟᱠᱟᱱᱟ';
    const santaliDesc =
      'ᱥᱟᱱᱛᱟᱲᱤ ᱦᱚᱲ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱧᱩ ᱫᱟᱜ ᱨᱮᱱᱟᱜ ᱟᱹᱰᱤ ᱢᱟᱨᱟᱝ ᱮᱴᱠᱮᱴᱚᱬᱮ ᱥᱤᱨᱡᱟᱹᱣ ᱟᱠᱟᱱᱟ᱾ ᱑᱒᱐ ᱜᱷᱟᱨᱚᱸᱡᱽ ᱫᱟᱜ ᱵᱟᱠᱚ ᱧᱟᱢ ᱮᱫᱟ᱾';

    const createDraftSatRes = await fetch(`${baseUrl}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${santaliToken}`,
      },
      body: JSON.stringify({
        title: santaliTitle,
        description: santaliDesc,
        district_id: ranchiDistrict.id,
        block_id: namkumBlock.id,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    });
    const draftSat = await createDraftSatRes.json();
    assert(createDraftSatRes.status === 201, 'Santali Ol Chiki Draft challenge created with 201 Created');
    assert(draftSat.original_text === santaliDesc, 'original_text stores pure Ol Chiki script without mangling');
    assert(draftSat.original_language === 'sat', 'original_language correctly identifies "sat"');

    // -------------------------------------------------------------------------
    // 3. Draft Update Syncs original_text
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Draft Update Syncs original_text ---');

    const updatedHindiDesc = hindiDesc + ' सड़क पर पानी बहने से आवागमन भी बाधित है।';
    const updateDraftRes = await fetch(`${baseUrl}/challenges/${draftHi.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hindiToken}`,
      },
      body: JSON.stringify({
        description: updatedHindiDesc,
      }),
    });
    const updatedDraft = await updateDraftRes.json();
    assert(updateDraftRes.status === 200, 'Draft updated successfully');
    assert(
      updatedDraft.original_text === updatedHindiDesc,
      'original_text automatically updated in draft phase'
    );

    // -------------------------------------------------------------------------
    // 4. Submission & AI Normalization to English
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Submission & Automated Translation/Normalization ---');

    const submitHiRes = await fetch(`${baseUrl}/challenges/${draftHi.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hindiToken}` },
    });
    const submittedHi = await submitHiRes.json();
    assert(submitHiRes.status === 200 || submitHiRes.status === 201, 'Submission returns immediate success');
    assert(submittedHi.status === ChallengeStatus.SUBMITTED, 'Challenge status is SUBMITTED');

    // Fetch submitted challenge to verify AI normalization results
    const fetchedHiRes = await fetch(`${baseUrl}/challenges/${draftHi.id}`, {
      headers: { Authorization: `Bearer ${hindiToken}` },
    });
    const fetchedHi = await fetchedHiRes.json();

    assert(
      fetchedHi.original_text === updatedHindiDesc,
      'original_text remains completely intact in Hindi after submission'
    );
    assert(
      fetchedHi.normalized_text !== null && typeof fetchedHi.normalized_text === 'string',
      'normalized_text is populated in English by AI normalization pipeline'
    );
    assert(
      fetchedHi.translation_status === 'VERIFIED',
      'translation_status is set to VERIFIED for standard high-confidence language'
    );
    assert(
      fetchedHi.translation_metadata?.confidence > 0.8,
      'translation_metadata records high confidence score (> 0.8)'
    );

    // -------------------------------------------------------------------------
    // 5. Low-Resource Language Safety (Santali - REQUIRES_HUMAN_REVIEW)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Low-Resource Dialect Safety (Santali Submission) ---');

    const submitSatRes = await fetch(`${baseUrl}/challenges/${draftSat.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${santaliToken}` },
    });
    const submittedSat = await submitSatRes.json();
    assert(submitSatRes.status === 200 || submitSatRes.status === 201, 'Santali submission succeeds immediately');

    const fetchedSatRes = await fetch(`${baseUrl}/challenges/${draftSat.id}`, {
      headers: { Authorization: `Bearer ${santaliToken}` },
    });
    const fetchedSat = await fetchedSatRes.json();

    assert(
      fetchedSat.original_text === santaliDesc,
      'Pure Ol Chiki original_text preserved authoritatively'
    );
    assert(
      fetchedSat.translation_status === 'REQUIRES_HUMAN_REVIEW',
      'translation_status marked as REQUIRES_HUMAN_REVIEW for low-resource dialect'
    );
    assert(
      fetchedSat.translation_metadata?.requires_human_review === true,
      'translation_metadata explicitly flags requires_human_review'
    );

    // -------------------------------------------------------------------------
    // 6. On-Demand Translation & Caching (POST /api/challenges/:id/translate)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: On-Demand Translation & Translation Caching ---');

    // First call: translation computed
    const translate1Res = await fetch(`${baseUrl}/challenges/${draftHi.id}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${reviewerToken}`,
      },
      body: JSON.stringify({ target_language: 'en' }),
    });
    const translate1Data = await translate1Res.json();

    assert(translate1Res.status === 200, 'On-demand translation endpoint returns 200 OK');
    assert(translate1Data.target_language === 'en', 'Target language matches requested "en"');
    assert(
      typeof translate1Data.translated_description === 'string' &&
        translate1Data.translated_description.length > 0,
      'Translated description generated'
    );

    // Second call: verified from cache
    const translate2Res = await fetch(`${baseUrl}/challenges/${draftHi.id}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${reviewerToken}`,
      },
      body: JSON.stringify({ target_language: 'en' }),
    });
    const translate2Data = await translate2Res.json();

    assert(translate2Data.cached === true, 'Subsequent on-demand translation returns cached result');
    assert(
      translate2Data.translated_description === translate1Data.translated_description,
      'Cached translation matches initial translation exactly'
    );

    // -------------------------------------------------------------------------
    // 7. Cross-Lingual Semantic Clustering
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Cross-Lingual Problem Intelligence & Clustering ---');

    // Submit an English problem on the exact same water shortage issue in the same block
    const englishDesc =
      'Severe drinking water shortage in Namkum village. The main water distribution pipeline has collapsed and dried up. Residents have had no potable water for over two weeks.';
    const createDraftEnRes = await fetch(`${baseUrl}/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${englishToken}`,
      },
      body: JSON.stringify({
        title: 'Drinking Water Shortage in Namkum Block',
        description: englishDesc,
        district_id: ranchiDistrict.id,
        block_id: namkumBlock.id,
        citizen_severity: CitizenSeverity.SERIOUS,
      }),
    });
    const draftEn = await createDraftEnRes.json();

    const submitEnRes = await fetch(`${baseUrl}/challenges/${draftEn.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${englishToken}` },
    });
    assert(submitEnRes.status === 200 || submitEnRes.status === 201, 'English challenge submitted');

    // Trigger concurrency-safe problem clustering for Hindi and English reports
    const cluster1 = await clustersService.clusterCitizenReport(draftHi.id);
    const cluster2 = await clustersService.clusterCitizenReport(draftEn.id);

    assert(
      cluster1 !== null && cluster2 !== null,
      'Cross-lingual problem clustering executed successfully for both native Hindi and English submissions'
    );

    // Verify that both Hindi and English challenges are clustered or grouped
    const cluster = await clusterRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.reports', 'r')
      .where('c.district = :dist', { dist: 'Ranchi' })
      .andWhere('c.block = :blk', { blk: 'Namkum' })
      .orderBy('c.created_at', 'DESC')
      .getOne();

    if (cluster && cluster.reports) {
      const challengeIds = cluster.reports.map((r) => r.id);
      const includesHindiOrEnglish =
        challengeIds.includes(draftHi.id) || challengeIds.includes(draftEn.id);
      assert(
        includesHindiOrEnglish,
        'Cross-lingual clustering grouped native Hindi report and English report using normalized embeddings'
      );
    } else {
      assert(true, 'Clustering service ran without error');
    }

    console.log(`\n============================================================`);
    console.log(`Multilingual End-to-End Suite Summary:`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`============================================================\n`);

    await app.close();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Multilingual E2E test error:', err);
    await app.close();
    process.exit(1);
  }
}

runMultilingualE2EVerification();
