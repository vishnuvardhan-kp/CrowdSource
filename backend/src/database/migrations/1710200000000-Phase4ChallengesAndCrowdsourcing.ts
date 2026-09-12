import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4ChallengesAndCrowdsourcing1710200000000 implements MigrationInterface {
  name = 'Phase4ChallengesAndCrowdsourcing1710200000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend challenge_status_enum with DRAFT and ARCHIVED
    await queryRunner.query(`ALTER TYPE "challenge_status_enum" ADD VALUE IF NOT EXISTS 'DRAFT';`);
    await queryRunner.query(`ALTER TYPE "challenge_status_enum" ADD VALUE IF NOT EXISTS 'ARCHIVED';`);

    // 2. Create citizen_severity_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "citizen_severity_enum" AS ENUM ('NOT_SURE', 'MODERATE', 'SERIOUS');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Create districts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "districts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL UNIQUE,
        "state" varchar(100) NOT NULL DEFAULT 'Jharkhand',
        "code" varchar(50),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_districts_name" ON "districts" ("name");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_districts_state" ON "districts" ("state");`);

    // 4. Create blocks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blocks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "district_id" uuid NOT NULL REFERENCES "districts" ("id") ON DELETE CASCADE,
        "name" varchar(100) NOT NULL,
        "code" varchar(50),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_district_block" UNIQUE ("district_id", "name")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_blocks_district" ON "blocks" ("district_id");`);

    // 5. Seed Jharkhand districts and blocks
    const jharkhandDistricts: { name: string; code: string; blocks: string[] }[] = [
      {
        name: 'Ranchi',
        code: 'JH-RAN',
        blocks: ['Kanke', 'Ratu', 'Ormanjhi', 'Namkum', 'Angara', 'Burmu', 'Bero', 'Itki', 'Mandar', 'Silli', 'Sonahatu', 'Tamar', 'Lapung', 'Chanho', 'Nagri', 'Bundu'],
      },
      {
        name: 'Dhanbad',
        code: 'JH-DHN',
        blocks: ['Dhanbad', 'Jharia', 'Baghmara', 'Baliapur', 'Govindpur', 'Nirsa', 'Topchanchi', 'Tundi', 'Egarkund', 'Kaliasol'],
      },
      {
        name: 'East Singhbhum',
        code: 'JH-ESN',
        blocks: ['Jamshedpur (Golmuri)', 'Ghatshila', 'Potka', 'Patamda', 'Musabani', 'Baharagora', 'Dhalbhumgarh', 'Dumaria', 'Bodam', 'Chakulia', 'Gura Banda'],
      },
      {
        name: 'Bokaro',
        code: 'JH-BOK',
        blocks: ['Chas', 'Chandankiyari', 'Bermo', 'Gomia', 'Peterbar', 'Kasmar', 'Jaridih', 'Nawadih', 'Chandrapura'],
      },
      {
        name: 'Hazaribagh',
        code: 'JH-HAZ',
        blocks: ['Sadar Hazaribagh', 'Katkamsandi', 'Bishnugarh', 'Barhi', 'Barkagaon', 'Churchu', 'Chouparan', 'Daru', 'Ichak', 'Keredari', 'Padma'],
      },
      {
        name: 'Deoghar',
        code: 'JH-DEO',
        blocks: ['Deoghar', 'Madhupur', 'Mohanpur', 'Sarath', 'Sarwan', 'Palojori', 'Karon', 'Devipur', 'Sonaraithari', 'Margomunda'],
      },
      {
        name: 'Palamu',
        code: 'JH-PAL',
        blocks: ['Medininagar', 'Chainpur', 'Patan', 'Bishrampur', 'Chhatarpur', 'Hariharganj', 'Hussainabad', 'Mohammadganj', 'Lesliganj', 'Satbarwa'],
      },
      {
        name: 'Dumka',
        code: 'JH-DUM',
        blocks: ['Dumka', 'Jama', 'Jarmundi', 'Kathikund', 'Gopikandar', 'Masalia', 'Ramgarh', 'Ranishwar', 'Shikaripara', 'Saraiyahat'],
      },
      {
        name: 'Giridih',
        code: 'JH-GIR',
        blocks: ['Giridih', 'Gandey', 'Bengabad', 'Pirtand', 'Dumri', 'Bagodar', 'Birni', 'Deori', 'Dhanwar', 'Jamua', 'Tisri', 'Gawan'],
      },
      {
        name: 'Ramgarh',
        code: 'JH-RAM',
        blocks: ['Ramgarh', 'Gola', 'Mandu', 'Patratu', 'Dulmi', 'Chitarpur'],
      },
      {
        name: 'West Singhbhum',
        code: 'JH-WSN',
        blocks: ['Chaibasa', 'Chakradharpur', 'Jhinkpani', 'Khuntpani', 'Manjhari', 'Tonto', 'Jagannathpur', 'Noamundi', 'Sonua'],
      },
      {
        name: 'Saraikela Kharsawan',
        code: 'JH-SAK',
        blocks: ['Saraikela', 'Kharsawan', 'Gamharia', 'Chandil', 'Ichagarh', 'Nimdih', 'Kukru', 'Rajnagar', 'Kuchai'],
      },
      {
        name: 'Khunti',
        code: 'JH-KHU',
        blocks: ['Khunti', 'Murhu', 'Torpa', 'Rania', 'Karra', 'Arki'],
      },
      {
        name: 'Latehar',
        code: 'JH-LAT',
        blocks: ['Latehar', 'Chandwa', 'Balumath', 'Bariyatu', 'Herhanj', 'Mahuadanr', 'Manika', 'Garu', 'Barwadih'],
      },
      {
        name: 'Lohardaga',
        code: 'JH-LOH',
        blocks: ['Lohardaga', 'Kuru', 'Bhandra', 'Kisko', 'Peshrar', 'Sennan', 'Kisko'],
      },
      {
        name: 'Gumla',
        code: 'JH-GUM',
        blocks: ['Gumla', 'Ghaghra', 'Bishunpur', 'Chainpur', 'Dumri', 'Kamdara', 'Sisai', 'Palkot', 'Raidih', 'Basia'],
      },
      {
        name: 'Simdega',
        code: 'JH-SIM',
        blocks: ['Simdega', 'Kolebira', 'Bano', 'Jaldega', 'Thethaitangar', 'Bolba', 'Kurdeg', 'Kersai', 'Pakartanr'],
      },
      {
        name: 'Garhwa',
        code: 'JH-GAR',
        blocks: ['Garhwa', 'Meral', 'Ranka', 'Bhandaria', 'Chiniya', 'Dhurki', 'Nagar Untari', 'Ramna', 'Majhiaon', 'Kandi'],
      },
      {
        name: 'Chatra',
        code: 'JH-CHA',
        blocks: ['Chatra', 'Hunterganj', 'Itkhori', 'Kanhachatti', 'Kunda', 'Lawalong', 'Mayurhand', 'Pratappur', 'Simaria', 'Tandwa'],
      },
      {
        name: 'Koderma',
        code: 'JH-KOD',
        blocks: ['Koderma', 'Jainagar', 'Chandwara', 'Markacho', 'Satgawan', 'Domchanch'],
      },
      {
        name: 'Jamtara',
        code: 'JH-JAM',
        blocks: ['Jamtara', 'Karmatanr', 'Nala', 'Kundhit', 'Narayanpur', 'Fatehpur'],
      },
      {
        name: 'Godda',
        code: 'JH-GOD',
        blocks: ['Godda', 'Poraiyahat', 'Sundarpahari', 'Pathargama', 'Mahagama', 'Boarijor', 'Meherma', 'Thakurgangti'],
      },
      {
        name: 'Sahibganj',
        code: 'JH-SAH',
        blocks: ['Sahibganj', 'Borio', 'Barhait', 'Taljhari', 'Rajmahal', 'Udhwa', 'Mandro', 'Barharwa'],
      },
      {
        name: 'Pakur',
        code: 'JH-PAK',
        blocks: ['Pakur', 'Hiranpur', 'Littipara', 'Amrapara', 'Pakuria', 'Maheshpur'],
      },
    ];

    for (const dist of jharkhandDistricts) {
      const distRes = await queryRunner.query(
        `INSERT INTO "districts" ("name", "state", "code")
         VALUES ($1, 'Jharkhand', $2)
         ON CONFLICT ("name") DO UPDATE SET "code" = EXCLUDED."code"
         RETURNING "id";`,
        [dist.name, dist.code],
      );
      const districtId = distRes[0].id;

      for (const blockName of dist.blocks) {
        await queryRunner.query(
          `INSERT INTO "blocks" ("district_id", "name")
           VALUES ($1, $2)
           ON CONFLICT ("district_id", "name") DO NOTHING;`,
          [districtId, blockName],
        );
      }
    }

    // 6. Create challenge_confirmations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "challenge_confirmations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "challenge_id" uuid NOT NULL REFERENCES "challenges" ("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_challenge_user_confirmation" UNIQUE ("challenge_id", "user_id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenge_conf_cid" ON "challenge_confirmations" ("challenge_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenge_conf_uid" ON "challenge_confirmations" ("user_id");`);

    // 7. Alter challenges table
    await queryRunner.query(`
      ALTER TABLE "challenges"
      ADD COLUMN IF NOT EXISTS "district_id" uuid REFERENCES "districts" ("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "block_id" uuid REFERENCES "blocks" ("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "village_locality" varchar(255),
      ADD COLUMN IF NOT EXISTS "citizen_severity" "citizen_severity_enum",
      ADD COLUMN IF NOT EXISTS "affected_population" varchar(100),
      ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "validated_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "rejection_reason" text;
    `);

    await queryRunner.query(`ALTER TABLE "challenges" ALTER COLUMN "district" DROP NOT NULL;`);
    await queryRunner.query(`ALTER TABLE "challenges" ALTER COLUMN "state" DROP NOT NULL;`);
    await queryRunner.query(`ALTER TABLE "challenges" ALTER COLUMN "state" SET DEFAULT 'Jharkhand';`);
    await queryRunner.query(`ALTER TABLE "challenges" ALTER COLUMN "status" SET DEFAULT 'DRAFT';`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenges_dist_id" ON "challenges" ("district_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenges_block_id" ON "challenges" ("block_id");`);

    // 8. Alter challenge_evidence table
    await queryRunner.query(`
      ALTER TABLE "challenge_evidence"
      ADD COLUMN IF NOT EXISTS "uploaded_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_evidence_uploader" ON "challenge_evidence" ("uploaded_by");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "challenge_confirmations" CASCADE;`);
    await queryRunner.query(`
      ALTER TABLE "challenges"
      DROP COLUMN IF EXISTS "district_id",
      DROP COLUMN IF EXISTS "block_id",
      DROP COLUMN IF EXISTS "village_locality",
      DROP COLUMN IF EXISTS "citizen_severity",
      DROP COLUMN IF EXISTS "affected_population",
      DROP COLUMN IF EXISTS "submitted_at",
      DROP COLUMN IF EXISTS "validated_at",
      DROP COLUMN IF EXISTS "rejection_reason";
    `);
    await queryRunner.query(`
      ALTER TABLE "challenge_evidence"
      DROP COLUMN IF EXISTS "uploaded_by";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "blocks" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "districts" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "citizen_severity_enum";`);
  }
}
