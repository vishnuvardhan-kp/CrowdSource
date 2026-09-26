import { MigrationInterface, QueryRunner } from 'typeorm';

export class InstitutionalVerificationPRIULB1711600000000 implements MigrationInterface {
  name = 'InstitutionalVerificationPRIULB1711600000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "institution_type_enum" AS ENUM (
          'PRI', 'ULB', 'GOVERNMENT_DEPARTMENT'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "institution_subtype_enum" AS ENUM (
          'GRAM_PANCHAYAT', 'PANCHAYAT_SAMITI', 'ZILLA_PARISHAD',
          'MUNICIPAL_CORPORATION', 'MUNICIPAL_COUNCIL', 'NAGAR_PANCHAYAT',
          'STATE_DEPARTMENT', 'DISTRICT_OFFICE', 'BLOCK_OFFICE'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "institution_status_enum" AS ENUM (
          'ACTIVE', 'INACTIVE'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "representative_relationship_enum" AS ENUM (
          'EMPLOYEE', 'ELECTED_REPRESENTATIVE', 'AUTHORIZED_OFFICER', 'AUTHORIZED_STAFF'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "authority_verification_status_enum" AS ENUM (
          'PENDING', 'IDENTITY_VERIFIED', 'AFFILIATION_PENDING', 'UNDER_REVIEW',
          'VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'LEGACY_PENDING_REVIEW'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "authority_verification_source_enum" AS ENUM (
          'OFFICIAL_GOVERNMENT_RECORD', 'GOVERNMENT_SSO', 'OFFICIAL_APPOINTMENT_RECORD',
          'AUTHORIZED_DOCUMENT_REVIEW', 'AUTHORIZED_ADMIN_REVIEW', 'FUTURE_GOVERNMENT_API'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "institution_evidence_type_enum" AS ENUM (
          'APPOINTMENT_LETTER', 'OFFICIAL_ID_CARD', 'AUTHORIZATION_RESOLUTION',
          'GOVERNMENT_ORDER', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reporter_type_enum" AS ENUM (
          'INDIVIDUAL', 'COMMUNITY', 'PRI', 'ULB', 'GOVERNMENT_DEPARTMENT'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add to notification_type_enum if existing
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'INSTITUTION_VERIFICATION';
    `);

    // 2. Create Institutions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "institutions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "type" "institution_type_enum" NOT NULL,
        "subtype" "institution_subtype_enum" NOT NULL,
        "lgd_code" varchar(50) NOT NULL UNIQUE,
        "state" varchar(100) NOT NULL DEFAULT 'Jharkhand',
        "district_id" uuid REFERENCES "districts"("id") ON DELETE SET NULL,
        "district_name" varchar(100),
        "block_id" uuid REFERENCES "blocks"("id") ON DELETE SET NULL,
        "block_name" varchar(100),
        "pincode" varchar(10),
        "status" "institution_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "contact_email" varchar(255),
        "contact_phone" varchar(50),
        "address" text,
        "hierarchy_level" varchar(50) NOT NULL,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_lgd_code" ON "institutions" ("lgd_code");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_type" ON "institutions" ("type");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_subtype" ON "institutions" ("subtype");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_district" ON "institutions" ("district_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_block" ON "institutions" ("block_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_state" ON "institutions" ("state");`);

    // 3. Create Institution Memberships Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "institution_memberships" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "institution_id" uuid NOT NULL REFERENCES "institutions"("id") ON DELETE CASCADE,
        "relationship" "representative_relationship_enum" NOT NULL,
        "designation" varchar(150) NOT NULL,
        "official_email" varchar(255),
        "official_phone" varchar(50),
        "department_name" varchar(150),
        "authority_status" "authority_verification_status_enum" NOT NULL DEFAULT 'PENDING',
        "authority_source" "authority_verification_source_enum" NOT NULL DEFAULT 'AUTHORIZED_DOCUMENT_REVIEW',
        "verified_at" timestamptz,
        "verified_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "verification_notes" text,
        "rejection_reason" text,
        "valid_until" timestamptz,
        "metadata" jsonb DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_user_institution_membership" UNIQUE ("user_id", "institution_id")
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_memberships_user" ON "institution_memberships" ("user_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_memberships_inst" ON "institution_memberships" ("institution_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_memberships_status" ON "institution_memberships" ("authority_status");`);

    // 4. Create Institution Evidence Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "institution_evidence" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "membership_id" uuid NOT NULL REFERENCES "institution_memberships"("id") ON DELETE CASCADE,
        "evidence_type" "institution_evidence_type_enum" NOT NULL,
        "document_url" text NOT NULL,
        "document_name" varchar(255) NOT NULL,
        "mime_type" varchar(100),
        "file_size" integer,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),
        "verified" boolean NOT NULL DEFAULT false,
        "review_notes" text
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_evidence_membership" ON "institution_evidence" ("membership_id");`);

    // 5. Create Institution Audit Logs Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "institution_audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "entity_type" varchar(50) NOT NULL,
        "entity_id" uuid NOT NULL,
        "action" varchar(50) NOT NULL,
        "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "previous_state" jsonb,
        "new_state" jsonb,
        "notes" text,
        "ip_address" varchar(45),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_audit_entity" ON "institution_audit_logs" ("entity_type", "entity_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_audit_actor" ON "institution_audit_logs" ("actor_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_audit_created" ON "institution_audit_logs" ("created_at");`);

    // 6. Alter Challenges Table
    await queryRunner.query(`
      ALTER TABLE "challenges"
      ADD COLUMN IF NOT EXISTS "reporter_type" "reporter_type_enum" NOT NULL DEFAULT 'INDIVIDUAL',
      ADD COLUMN IF NOT EXISTS "institution_id" uuid REFERENCES "institutions"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "institution_membership_id" uuid REFERENCES "institution_memberships"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "verification_snapshot" jsonb;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenges_reporter_type" ON "challenges" ("reporter_type");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenges_institution" ON "challenges" ("institution_id");`);

    // 7. Seed Authentic LGD Data
    await queryRunner.query(`
      -- Insert Apex Zilla Parishads
      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Ranchi Zilla Parishad', 'PRI', 'ZILLA_PARISHAD', '340', 'Jharkhand', d.id, d.name, 'APEX_DISTRICT', '{"panchayat_level": "DISTRICT", "lgd_type": "ZILLA_PARISHAD"}'::jsonb
      FROM "districts" d WHERE d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Dhanbad Zilla Parishad', 'PRI', 'ZILLA_PARISHAD', '341', 'Jharkhand', d.id, d.name, 'APEX_DISTRICT', '{"panchayat_level": "DISTRICT", "lgd_type": "ZILLA_PARISHAD"}'::jsonb
      FROM "districts" d WHERE d.name = 'Dhanbad'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Bokaro Zilla Parishad', 'PRI', 'ZILLA_PARISHAD', '342', 'Jharkhand', d.id, d.name, 'APEX_DISTRICT', '{"panchayat_level": "DISTRICT", "lgd_type": "ZILLA_PARISHAD"}'::jsonb
      FROM "districts" d WHERE d.name = 'Bokaro'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'East Singhbhum Zilla Parishad', 'PRI', 'ZILLA_PARISHAD', '343', 'Jharkhand', d.id, d.name, 'APEX_DISTRICT', '{"panchayat_level": "DISTRICT", "lgd_type": "ZILLA_PARISHAD"}'::jsonb
      FROM "districts" d WHERE d.name = 'East Singhbhum'
      ON CONFLICT ("lgd_code") DO NOTHING;

      -- Insert Intermediate Panchayat Samitis
      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Kanke Panchayat Samiti', 'PRI', 'PANCHAYAT_SAMITI', '2351', 'Jharkhand', d.id, d.name, b.id, b.name, 'INTERMEDIATE_BLOCK', '{"panchayat_level": "BLOCK", "lgd_type": "PANCHAYAT_SAMITI"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Kanke' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Ratu Panchayat Samiti', 'PRI', 'PANCHAYAT_SAMITI', '2352', 'Jharkhand', d.id, d.name, b.id, b.name, 'INTERMEDIATE_BLOCK', '{"panchayat_level": "BLOCK", "lgd_type": "PANCHAYAT_SAMITI"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Ratu' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Namkum Panchayat Samiti', 'PRI', 'PANCHAYAT_SAMITI', '2353', 'Jharkhand', d.id, d.name, b.id, b.name, 'INTERMEDIATE_BLOCK', '{"panchayat_level": "BLOCK", "lgd_type": "PANCHAYAT_SAMITI"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Namkum' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Dhanbad Panchayat Samiti', 'PRI', 'PANCHAYAT_SAMITI', '2360', 'Jharkhand', d.id, d.name, b.id, b.name, 'INTERMEDIATE_BLOCK', '{"panchayat_level": "BLOCK", "lgd_type": "PANCHAYAT_SAMITI"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Dhanbad' AND d.name = 'Dhanbad'
      ON CONFLICT ("lgd_code") DO NOTHING;

      -- Insert Village Gram Panchayats
      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Kanke Gram Panchayat', 'PRI', 'GRAM_PANCHAYAT', '108742', 'Jharkhand', d.id, d.name, b.id, b.name, 'VILLAGE_GRAM_PANCHAYAT', '{"panchayat_level": "VILLAGE", "lgd_type": "GRAM_PANCHAYAT"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Kanke' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Boreya Gram Panchayat', 'PRI', 'GRAM_PANCHAYAT', '108743', 'Jharkhand', d.id, d.name, b.id, b.name, 'VILLAGE_GRAM_PANCHAYAT', '{"panchayat_level": "VILLAGE", "lgd_type": "GRAM_PANCHAYAT"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Kanke' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Arsande Gram Panchayat', 'PRI', 'GRAM_PANCHAYAT', '108744', 'Jharkhand', d.id, d.name, b.id, b.name, 'VILLAGE_GRAM_PANCHAYAT', '{"panchayat_level": "VILLAGE", "lgd_type": "GRAM_PANCHAYAT"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Kanke' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Ratu Gram Panchayat', 'PRI', 'GRAM_PANCHAYAT', '108780', 'Jharkhand', d.id, d.name, b.id, b.name, 'VILLAGE_GRAM_PANCHAYAT', '{"panchayat_level": "VILLAGE", "lgd_type": "GRAM_PANCHAYAT"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Ratu' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Tigra Gram Panchayat', 'PRI', 'GRAM_PANCHAYAT', '108781', 'Jharkhand', d.id, d.name, b.id, b.name, 'VILLAGE_GRAM_PANCHAYAT', '{"panchayat_level": "VILLAGE", "lgd_type": "GRAM_PANCHAYAT"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Ratu' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Namkum Gram Panchayat', 'PRI', 'GRAM_PANCHAYAT', '108760', 'Jharkhand', d.id, d.name, b.id, b.name, 'VILLAGE_GRAM_PANCHAYAT', '{"panchayat_level": "VILLAGE", "lgd_type": "GRAM_PANCHAYAT"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Namkum' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Sidroll Gram Panchayat', 'PRI', 'GRAM_PANCHAYAT', '108761', 'Jharkhand', d.id, d.name, b.id, b.name, 'VILLAGE_GRAM_PANCHAYAT', '{"panchayat_level": "VILLAGE", "lgd_type": "GRAM_PANCHAYAT"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Namkum' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Dhanbad Gram Panchayat', 'PRI', 'GRAM_PANCHAYAT', '105620', 'Jharkhand', d.id, d.name, b.id, b.name, 'VILLAGE_GRAM_PANCHAYAT', '{"panchayat_level": "VILLAGE", "lgd_type": "GRAM_PANCHAYAT"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Dhanbad' AND d.name = 'Dhanbad'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Bhelatand Gram Panchayat', 'PRI', 'GRAM_PANCHAYAT', '105621', 'Jharkhand', d.id, d.name, b.id, b.name, 'VILLAGE_GRAM_PANCHAYAT', '{"panchayat_level": "VILLAGE", "lgd_type": "GRAM_PANCHAYAT"}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Dhanbad' AND d.name = 'Dhanbad'
      ON CONFLICT ("lgd_code") DO NOTHING;

      -- Insert Urban Local Bodies (ULBs)
      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Ranchi Municipal Corporation', 'ULB', 'MUNICIPAL_CORPORATION', '250101', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_CORPORATION", "wards_count": 53}'::jsonb
      FROM "districts" d WHERE d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Dhanbad Municipal Corporation', 'ULB', 'MUNICIPAL_CORPORATION', '250102', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_CORPORATION", "wards_count": 55}'::jsonb
      FROM "districts" d WHERE d.name = 'Dhanbad'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Chas Municipal Corporation', 'ULB', 'MUNICIPAL_CORPORATION', '250103', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_CORPORATION", "wards_count": 35}'::jsonb
      FROM "districts" d WHERE d.name = 'Bokaro'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Mango Municipal Corporation', 'ULB', 'MUNICIPAL_CORPORATION', '250104', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_CORPORATION", "wards_count": 30}'::jsonb
      FROM "districts" d WHERE d.name = 'East Singhbhum'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Deoghar Municipal Corporation', 'ULB', 'MUNICIPAL_CORPORATION', '250105', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_CORPORATION", "wards_count": 36}'::jsonb
      FROM "districts" d WHERE d.name = 'Deoghar'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Giridih Municipal Corporation', 'ULB', 'MUNICIPAL_CORPORATION', '250106', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_CORPORATION", "wards_count": 36}'::jsonb
      FROM "districts" d WHERE d.name = 'Giridih'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Medininagar Municipal Corporation', 'ULB', 'MUNICIPAL_CORPORATION', '250107', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_CORPORATION", "wards_count": 35}'::jsonb
      FROM "districts" d WHERE d.name = 'Palamu'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Adityapur Municipal Corporation', 'ULB', 'MUNICIPAL_CORPORATION', '250108', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_CORPORATION", "wards_count": 35}'::jsonb
      FROM "districts" d WHERE d.name = 'Seraikela Kharsawan'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Hazaribagh Municipal Corporation', 'ULB', 'MUNICIPAL_CORPORATION', '250109', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_CORPORATION", "wards_count": 32}'::jsonb
      FROM "districts" d WHERE d.name = 'Hazaribagh'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Ramgarh Municipal Council', 'ULB', 'MUNICIPAL_COUNCIL', '250201', 'Jharkhand', d.id, d.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "MUNICIPAL_COUNCIL", "wards_count": 32}'::jsonb
      FROM "districts" d WHERE d.name = 'Ramgarh'
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "block_id", "block_name", "hierarchy_level", "metadata")
      SELECT 
        'Bundu Nagar Panchayat', 'ULB', 'NAGAR_PANCHAYAT', '250301', 'Jharkhand', d.id, d.name, b.id, b.name, 'URBAN_LOCAL_BODY', '{"ulb_type": "NAGAR_PANCHAYAT", "wards_count": 13}'::jsonb
      FROM "blocks" b JOIN "districts" d ON b.district_id = d.id WHERE b.name = 'Bundu' AND d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;

      -- Insert Government Departments
      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "hierarchy_level", "metadata")
      VALUES 
        ('Jharkhand Rural Development Department', 'GOVERNMENT_DEPARTMENT', 'STATE_DEPARTMENT', 'JH-RDD-01', 'Jharkhand', 'STATE', '{"department": "Rural Development", "state": "Jharkhand"}'::jsonb),
        ('Jharkhand Urban Development & Housing Department', 'GOVERNMENT_DEPARTMENT', 'STATE_DEPARTMENT', 'JH-UDHD-01', 'Jharkhand', 'STATE', '{"department": "Urban Development", "state": "Jharkhand"}'::jsonb)
      ON CONFLICT ("lgd_code") DO NOTHING;

      INSERT INTO "institutions" ("name", "type", "subtype", "lgd_code", "state", "district_id", "district_name", "hierarchy_level", "metadata")
      SELECT 
        'Ranchi District Collectorate', 'GOVERNMENT_DEPARTMENT', 'DISTRICT_OFFICE', 'JH-DC-RAN', 'Jharkhand', d.id, d.name, 'DISTRICT_OFFICE', '{"department": "District Administration", "district": "Ranchi"}'::jsonb
      FROM "districts" d WHERE d.name = 'Ranchi'
      ON CONFLICT ("lgd_code") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "verification_snapshot";`);
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "institution_membership_id";`);
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "institution_id";`);
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "reporter_type";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institution_audit_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institution_evidence";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institution_memberships";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institutions";`);
  }
}
