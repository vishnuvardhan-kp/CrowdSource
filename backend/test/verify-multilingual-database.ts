import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Challenge } from '../src/modules/challenges/entities/challenge.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { ChallengeStatus, CitizenSeverity, UserRole } from '../src/common/enums';

async function runMultilingualDatabaseVerification() {
  console.log('🚀 Starting SamadhanSetu Multilingual Database & Unicode Verification...\n');
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

  const app = moduleFixture.createNestApplication();
  await app.init();

  const dataSource = app.get(DataSource);
  const challengeRepo = dataSource.getRepository(Challenge);
  const userRepo = dataSource.getRepository(User);

  try {
    // -------------------------------------------------------------------------
    // 1. Verify User Entity preferred_language Column
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 1: User preferred_language Schema & Storage ---');

    const testUser = userRepo.create({
      name: 'Santali Citizen Test',
      email: `santali-citizen-${Date.now()}@test.local`,
      password_hash: '$2b$10$hashedtestpass123456789012345678901234567890',
      role: UserRole.CITIZEN,
      preferred_language: 'sat',
    });
    const savedUser = await userRepo.save(testUser);

    assert(
      savedUser.preferred_language === 'sat',
      'User preferred_language column correctly stores regional language code (sat)'
    );

    const fetchedUser = await userRepo.findOne({ where: { id: savedUser.id } });
    assert(
      fetchedUser !== null && fetchedUser.preferred_language === 'sat',
      'User preferred_language persists accurately upon retrieval'
    );

    // -------------------------------------------------------------------------
    // 2. Unicode Multi-Script Roundtrip in Challenge Entity
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 2: Unicode & Native Jharkhand Scripts Roundtrip ---');

    // Test cases covering Devanagari, Ol Chiki, Nagpuri, emojis, currency symbols, and mixed scripts
    const unicodeCases = [
      {
        lang: 'hi',
        name: 'Hindi (Devanagari)',
        title: 'पेयजल संकट: नामकुम में पाइपलाइन टूटी 🚨',
        description:
          'नामकुम ब्लॉक के ग्राम खिजरी में पिछले 15 दिनों से मुख्य पेयजल पाइपलाइन क्षतिग्रस्त है। लगभग ₹50,000 की मरम्मत की आवश्यकता है। 500 से अधिक परिवार प्रभावित हैं। 💧🚰',
      },
      {
        lang: 'sat',
        name: 'Santali (Ol Chiki)',
        title: 'ᱫᱟᱜ ᱨᱮᱱᱟᱜ ᱟᱱᱟᱴ: ᱱᱟᱢᱠᱩᱢ ᱨᱮ ᱯᱟᱭᱤᱯ ᱨᱟᱹᱯᱩᱫ ᱟᱠᱟᱱᱟ',
        description:
          'ᱥᱟᱱᱛᱟᱲᱤ ᱦᱚᱲ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱧᱩ ᱫᱟᱜ ᱨᱮᱱᱟᱜ ᱟᱹᱰᱤ ᱢᱟᱨᱟᱝ ᱮᱴᱠᱮᱴᱚᱬᱮ ᱥᱤᱨᱡᱟᱹᱣ ᱟᱠᱟᱱᱟ᱾ ᱑᱒᱐ ᱜᱷᱟᱨᱚᱸᱡᱽ ᱫᱟᱜ ᱵᱟᱠᱚ ᱧᱟᱢ ᱮᱫᱟ᱾ 🌾🚜',
      },
      {
        lang: 'nag',
        name: 'Nagpuri (Sadri in Devanagari)',
        title: 'सड़क टूट गेलक: बेड़ो से लापुंग सड़क गड्ढा भइल',
        description:
          'बेड़ो से लापुंग जाए वाला मुख्य सड़क बहुत बेसी टूट गेलक है। गाड़ी चलेक में भारी परेशानी होत है, बरसात में पानी भर जाथे। 🚧',
      },
      {
        lang: 'kru',
        name: 'Kurukh (Oraon)',
        title: 'कुड़ुख़ चापाकल बिगड़िया: पानी क भारी तंगी',
        description:
          'कुड़ुख़ बस्ती में तीन गो चापाकल हई, दू गो बिगड़ गेलक। बस्ती क संगे संग स्कूल क लईका सब भी परेशान अहें।',
      },
      {
        lang: 'mun',
        name: 'Mundari',
        title: 'ᱢᱩᱱᱰᱟᱨᱤ ᱦᱟᱛᱩ: ᱦᱚᱨ ᱥᱮᱱᱚᱜ ᱮᱴᱠᱮᱴᱚᱬᱮ',
        description:
          'ᱦᱟᱛᱩ ᱨᱮ ᱠᱩᱞᱦᱤ ᱦᱚᱨ ᱨᱟᱹᱯᱩᱫ ᱠᱟᱛᱮ ᱪᱟᱞᱟᱜ ᱦᱤᱡᱩᱜ ᱨᱮ ᱮᱴᱠᱮᱴᱚᱬᱮ ᱦᱩᱭᱩᱜ ᱠᱟᱱᱟ᱾ ᱟᱹᱰᱤ ᱢᱟᱨᱟᱝ ᱜᱟᱹᱰᱤ ᱵᱟᱝ ᱥᱮᱱᱚᱜ ᱠᱟᱱᱟ᱾',
      },
      {
        lang: 'mixed',
        name: 'Mixed Script (Devanagari + Ol Chiki + Latin + Symbols)',
        title: 'Water Pipe broken near NH-33 नामकुम ᱥᱟᱱᱛᱟᱲᱤ (₹75,000 fix)',
        description:
          'Survey in 2026: चापाकल सूख गया & ᱫᱟᱜ ᱟᱱᱟᱴ. Urgently needed: ₹75,000 budget for 1200+ villagers. ⚠️💧',
      },
    ];

    for (const testCase of unicodeCases) {
      const challenge = challengeRepo.create({
        submitted_by: savedUser.id,
        district: 'Ranchi',
        title: testCase.title,
        description: testCase.description,
        original_text: testCase.description,
        original_language: testCase.lang,
        normalized_text:
          testCase.lang === 'hi'
            ? 'Water shortage: Main pipeline damaged in Namkum affecting 500 families.'
            : null,
        processing_language: 'en',
        translation_status: testCase.lang === 'hi' ? 'VERIFIED' : 'REQUIRES_HUMAN_REVIEW',
        translation_metadata: {
          detected_language: testCase.lang,
          confidence: testCase.lang === 'hi' ? 0.98 : 0.65,
          script: testCase.name,
          translations: {},
        },
        status: ChallengeStatus.SUBMITTED,
        citizen_severity: CitizenSeverity.SERIOUS,
      });

      const saved = await challengeRepo.save(challenge);
      const fetched = await challengeRepo.findOne({ where: { id: saved.id } });

      assert(
        fetched !== null && fetched.title === testCase.title,
        `Title roundtrips without character loss for ${testCase.name}`
      );

      assert(
        fetched !== null && fetched.original_text === testCase.description,
        `Original text (including Ol Chiki / Devanagari / emojis / ₹) preserved exactly for ${testCase.name}`
      );

      assert(
        fetched !== null && fetched.original_language === testCase.lang,
        `Original language column accurately stored (${testCase.lang})`
      );

      assert(
        fetched !== null &&
          fetched.translation_metadata?.script === testCase.name &&
          fetched.translation_metadata?.confidence > 0,
        `JSONB translation_metadata preserved with nested properties for ${testCase.name}`
      );
    }

    // -------------------------------------------------------------------------
    // 3. Immutability & Separation of original_text from normalized_text
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 3: Separation of original_text vs normalized_text ---');

    const hindiOriginal = 'चापाकल सूखने से पानी की विकट समस्या';
    const englishNormalized = 'Severe water crisis due to dried tube well';

    const testChallenge = await challengeRepo.save(
      challengeRepo.create({
        submitted_by: savedUser.id,
        district: 'Ranchi',
        title: 'पेयजल समस्या',
        description: hindiOriginal,
        original_text: hindiOriginal,
        original_language: 'hi',
        normalized_text: englishNormalized,
        processing_language: 'en',
        translation_status: 'VERIFIED',
        translation_metadata: {
          detected_language: 'hi',
          confidence: 0.99,
          translations: {
            en: {
              title: 'Drinking Water Issue',
              description: englishNormalized,
              model: 'mock-multilingual-v1',
            },
          },
        },
        status: ChallengeStatus.SUBMITTED,
      })
    );

    // Ensure normalized_text does not overwrite original_text
    const reloaded = await challengeRepo.findOne({ where: { id: testChallenge.id } });
    assert(
      reloaded !== null && reloaded.original_text === hindiOriginal,
      'original_text remains pristine in Hindi and is not overwritten by English'
    );
    assert(
      reloaded !== null && reloaded.normalized_text === englishNormalized,
      'normalized_text is stored separately for common English downstream processing'
    );
    assert(
      reloaded !== null && reloaded.translation_metadata?.translations?.en?.title === 'Drinking Water Issue',
      'translation_metadata caches translations without altering original database fields'
    );

    // -------------------------------------------------------------------------
    // 4. Low-Resource Language Safety (Santali / Kurukh NULL Normalized Text)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 4: Low-Resource Dialect Safety (No Fabricated Text) ---');

    const lowResourceChallenge = await challengeRepo.save(
      challengeRepo.create({
        submitted_by: savedUser.id,
        district: 'Dumka',
        title: 'ᱥᱟᱱᱛᱟᱲᱤ ᱰᱟᱦᱟᱨ ᱮᱴᱠᱮᱴᱚᱬᱮ',
        description: 'ᱱᱚᱣᱟ ᱰᱟᱦᱟᱨ ᱟᱹᱰᱤ ᱵᱟᱹᱲᱤᱡ ᱜᱮᱭᱟ ᱟᱨ ᱦᱤᱡᱩᱜ ᱥᱮᱱᱚᱜ ᱟᱹᱰᱤ ᱢᱩᱥᱠᱤᱞ ᱜᱮᱭᱟ᱾',
        original_text: 'ᱱᱚᱣᱟ ᱰᱟᱦᱟᱨ ᱟᱹᱰᱤ ᱵᱟᱹᱲᱤᱡ ᱜᱮᱭᱟ ᱟᱨ ᱦᱤᱡᱩᱜ ᱥᱮᱱᱚᱜ ᱟᱹᱰᱤ ᱢᱩᱥᱠᱤᱞ ᱜᱮᱭᱟ᱾',
        original_language: 'sat',
        normalized_text: null, // Critical: low-confidence must NEVER fabricate hallucinated English
        processing_language: 'en',
        translation_status: 'REQUIRES_HUMAN_REVIEW',
        translation_metadata: {
          detected_language: 'sat',
          confidence: 0.55,
          requires_human_review: true,
          low_resource: true,
        },
        status: ChallengeStatus.SUBMITTED,
      })
    );

    const reloadedLowResource = await challengeRepo.findOne({
      where: { id: lowResourceChallenge.id },
    });

    assert(
      reloadedLowResource !== null && reloadedLowResource.normalized_text === null,
      'normalized_text is strictly null when translation cannot be verified with high confidence'
    );
    assert(
      reloadedLowResource !== null &&
        reloadedLowResource.translation_status === 'REQUIRES_HUMAN_REVIEW',
      'translation_status is REQUIRES_HUMAN_REVIEW for low-resource languages'
    );
    assert(
      reloadedLowResource !== null &&
        reloadedLowResource.original_text.includes('ᱱᱚᱣᱟ ᱰᱟᱦᱟᱨ'),
      'Santali Ol Chiki text is completely preserved for human review'
    );

    console.log(`\n============================================================`);
    console.log(`Multilingual Database Verification Summary:`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`============================================================\n`);

    await app.close();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal verification error:', err);
    await app.close();
    process.exit(1);
  }
}

runMultilingualDatabaseVerification();
