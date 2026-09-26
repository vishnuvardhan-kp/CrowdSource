import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialDatabaseSchema1710000000000 implements MigrationInterface {
  name = 'InitialDatabaseSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Custom Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role_enum" AS ENUM (
          'CITIZEN', 'UNIVERSITY_ADMIN', 'FACULTY', 'STUDENT', 'INDUSTRY', 'GOVERNMENT', 'PLATFORM_ADMIN'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "organization_type_enum" AS ENUM (
          'INSTITUTION', 'INDUSTRY', 'GOVERNMENT', 'NGO', 'COMMUNITY_ORGANIZATION', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "verification_status_enum" AS ENUM (
          'UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "capability_source_enum" AS ENUM (
          'OFFICIAL_WEBSITE', 'PUBLIC_DATA', 'ORGANIZATION_PROVIDED', 'ADMIN_ENTERED', 'PROJECT_HISTORY', 'PARTNER_VERIFIED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "challenge_status_enum" AS ENUM (
          'SUBMITTED', 'UNDER_REVIEW', 'VALIDATED', 'REJECTED', 'MATCHING', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "challenge_priority_enum" AS ENUM (
          'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "evidence_type_enum" AS ENUM (
          'IMAGE', 'VIDEO', 'DOCUMENT', 'LINK', 'LOCATION_DATA', 'SURVEY_DATA', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "project_status_enum" AS ENUM (
          'PROPOSED', 'APPROVED', 'IN_DEVELOPMENT', 'PILOT_DEPLOYMENT', 'VERIFIED', 'COMPLETED', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "review_status_enum" AS ENUM (
          'PENDING', 'APPROVED', 'REJECTED', 'MODIFIED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Tables

    // organizations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "organization_type" "organization_type_enum" NOT NULL DEFAULT 'OTHER',
        "description" text,
        "website" varchar(255),
        "email" varchar(255),
        "phone" varchar(50),
        "address" text,
        "district" varchar(100),
        "state" varchar(100),
        "latitude" numeric(10, 7),
        "longitude" numeric(10, 7),
        "verification_status" "verification_status_enum" NOT NULL DEFAULT 'UNVERIFIED',
        "verification_source" varchar(100),
        "verified_at" timestamptz,
        "verified_by" uuid,
        "is_claimed" boolean NOT NULL DEFAULT false,
        "claimed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_type" ON "organizations" ("organization_type");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_district" ON "organizations" ("district");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_verification" ON "organizations" ("verification_status");`);

    // users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL UNIQUE,
        "phone" varchar(50),
        "role" "user_role_enum" NOT NULL DEFAULT 'CITIZEN',
        "organization_id" uuid REFERENCES "organizations" ("id") ON DELETE SET NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_org" ON "users" ("organization_id");`);

    // Add verified_by foreign key to organizations now that users exists
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "organizations"
        ADD CONSTRAINT "fk_organizations_verified_by"
        FOREIGN KEY ("verified_by") REFERENCES "users" ("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
      END $$;
    `);

    // capabilities
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "capabilities" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(150) NOT NULL UNIQUE,
        "slug" varchar(150) NOT NULL UNIQUE,
        "category" varchar(100) NOT NULL DEFAULT 'General',
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_capabilities_category" ON "capabilities" ("category");`);

    // institution_profiles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "institution_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL UNIQUE REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "institution_code" varchar(100) UNIQUE,
        "institution_category" varchar(100),
        "accreditation_details" jsonb,
        "established_year" int,
        "campus_area" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // departments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "institution_id" uuid NOT NULL REFERENCES "institution_profiles" ("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "code" varchar(50),
        "head_of_department" varchar(255),
        "contact_email" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_departments_institution" ON "departments" ("institution_id");`);

    // faculty_members
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "faculty_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "department_id" uuid NOT NULL REFERENCES "departments" ("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "name" varchar(255) NOT NULL,
        "designation" varchar(150) NOT NULL,
        "email" varchar(255),
        "specializations" jsonb,
        "profile_url" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_faculty_dept" ON "faculty_members" ("department_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_faculty_user" ON "faculty_members" ("user_id");`);

    // research_areas
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_areas" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "institution_id" uuid NOT NULL REFERENCES "institution_profiles" ("id") ON DELETE CASCADE,
        "title" varchar(255) NOT NULL,
        "description" text,
        "lead_faculty_id" uuid REFERENCES "faculty_members" ("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_research_institution" ON "research_areas" ("institution_id");`);

    // laboratories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "laboratories" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "institution_id" uuid NOT NULL REFERENCES "institution_profiles" ("id") ON DELETE CASCADE,
        "department_id" uuid REFERENCES "departments" ("id") ON DELETE SET NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "equipment_list" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_labs_institution" ON "laboratories" ("institution_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_labs_dept" ON "laboratories" ("department_id");`);

    // facilities
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "facilities" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "institution_id" uuid NOT NULL REFERENCES "institution_profiles" ("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "facility_type" varchar(100) NOT NULL,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_facilities_institution" ON "facilities" ("institution_id");`);

    // institution_capabilities
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "institution_capabilities" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "institution_id" uuid NOT NULL REFERENCES "institution_profiles" ("id") ON DELETE CASCADE,
        "capability_id" uuid NOT NULL REFERENCES "capabilities" ("id") ON DELETE CASCADE,
        "department_id" uuid REFERENCES "departments" ("id") ON DELETE SET NULL,
        "laboratory_id" uuid REFERENCES "laboratories" ("id") ON DELETE SET NULL,
        "source" "capability_source_enum" NOT NULL DEFAULT 'OFFICIAL_WEBSITE',
        "verification_status" "verification_status_enum" NOT NULL DEFAULT 'UNVERIFIED',
        "confidence_score" numeric(3, 2),
        "evidence_summary" text,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_cap_inst" ON "institution_capabilities" ("institution_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_cap_cap" ON "institution_capabilities" ("capability_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inst_cap_verification" ON "institution_capabilities" ("verification_status");`);

    // industry_profiles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "industry_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL UNIQUE REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "company_registration_number" varchar(100),
        "industry_type" varchar(100),
        "headquarters" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // industry_sectors
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "industry_sectors" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(150) NOT NULL UNIQUE,
        "code" varchar(50) NOT NULL UNIQUE,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // industry_support_types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "industry_support_types" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(50) NOT NULL UNIQUE,
        "name" varchar(150) NOT NULL,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // industry_capabilities
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "industry_capabilities" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "industry_id" uuid NOT NULL REFERENCES "industry_profiles" ("id") ON DELETE CASCADE,
        "capability_id" uuid NOT NULL REFERENCES "capabilities" ("id") ON DELETE CASCADE,
        "support_type_id" uuid REFERENCES "industry_support_types" ("id") ON DELETE SET NULL,
        "source" "capability_source_enum" NOT NULL DEFAULT 'ORGANIZATION_PROVIDED',
        "verification_status" "verification_status_enum" NOT NULL DEFAULT 'UNVERIFIED',
        "confidence_score" numeric(3, 2),
        "notes" text,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ind_cap_ind" ON "industry_capabilities" ("industry_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ind_cap_cap" ON "industry_capabilities" ("capability_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ind_cap_verification" ON "industry_capabilities" ("verification_status");`);

    // verification_records (reusable provenance model)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "verification_records" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "entity_type" varchar(100) NOT NULL,
        "entity_id" uuid NOT NULL,
        "verification_status" "verification_status_enum" NOT NULL DEFAULT 'PENDING_VERIFICATION',
        "verification_source" varchar(100) NOT NULL,
        "verified_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "verified_at" timestamptz,
        "notes" text,
        "evidence_url" varchar(1000),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_verif_entity" ON "verification_records" ("entity_type", "entity_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_verif_status" ON "verification_records" ("verification_status");`);

    // challenges
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "challenges" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar(300) NOT NULL,
        "description" text NOT NULL,
        "submitted_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "organization_id" uuid REFERENCES "organizations" ("id") ON DELETE SET NULL,
        "district" varchar(100) NOT NULL,
        "state" varchar(100) NOT NULL,
        "location" text,
        "latitude" numeric(10, 7),
        "longitude" numeric(10, 7),
        "status" "challenge_status_enum" NOT NULL DEFAULT 'SUBMITTED',
        "priority" "challenge_priority_enum" NOT NULL DEFAULT 'MEDIUM',
        "category" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenges_status" ON "challenges" ("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenges_district" ON "challenges" ("district");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenges_category" ON "challenges" ("category");`);

    // challenge_evidence
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "challenge_evidence" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "challenge_id" uuid NOT NULL REFERENCES "challenges" ("id") ON DELETE CASCADE,
        "evidence_type" "evidence_type_enum" NOT NULL DEFAULT 'DOCUMENT',
        "title" varchar(255),
        "description" text,
        "url" varchar(1000) NOT NULL,
        "mime_type" varchar(100),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_challenge_evidence_cid" ON "challenge_evidence" ("challenge_id");`);

    // challenge_ai_analysis
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "challenge_ai_analysis" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "challenge_id" uuid NOT NULL UNIQUE REFERENCES "challenges" ("id") ON DELETE CASCADE,
        "category" varchar(100),
        "sub_category" varchar(100),
        "summary" text,
        "priority_score" numeric(4, 2),
        "severity_score" numeric(4, 2),
        "affected_population" varchar(100),
        "extracted_entities" jsonb,
        "required_capabilities" jsonb,
        "duplicate_group" varchar(100),
        "embedding_reference" varchar(255),
        "model_name" varchar(100),
        "model_version" varchar(50),
        "confidence" numeric(4, 3),
        "raw_analysis" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_analysis_dup_group" ON "challenge_ai_analysis" ("duplicate_group");`);

    // recommendation_reviews (human explainability)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recommendation_reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "challenge_id" uuid NOT NULL REFERENCES "challenges" ("id") ON DELETE CASCADE,
        "recommended_organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "recommended_entity_type" varchar(50) NOT NULL,
        "ai_recommendation_score" numeric(4, 2),
        "ai_match_reasons" jsonb,
        "human_review_status" "review_status_enum" NOT NULL DEFAULT 'PENDING',
        "final_decision" varchar(100),
        "reviewer_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "review_notes" text,
        "reviewed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_rec_reviews_challenge" ON "recommendation_reviews" ("challenge_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_rec_reviews_org" ON "recommendation_reviews" ("recommended_organization_id");`);

    // projects
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "challenge_id" uuid NOT NULL REFERENCES "challenges" ("id") ON DELETE CASCADE,
        "title" varchar(255) NOT NULL,
        "description" text,
        "lead_institution_id" uuid REFERENCES "institution_profiles" ("id") ON DELETE SET NULL,
        "partner_industry_id" uuid REFERENCES "industry_profiles" ("id") ON DELETE SET NULL,
        "status" "project_status_enum" NOT NULL DEFAULT 'PROPOSED',
        "start_date" date,
        "target_completion_date" date,
        "actual_completion_date" date,
        "budget_allocated" numeric(12, 2),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_projects_challenge" ON "projects" ("challenge_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_projects_status" ON "projects" ("status");`);

    // project_impacts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_impacts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL UNIQUE REFERENCES "projects" ("id") ON DELETE CASCADE,
        "people_benefited" int,
        "cost_saved" numeric(12, 2),
        "time_saved" varchar(100),
        "efficiency_improvement" varchar(100),
        "coverage_area" varchar(255),
        "adoption_rate" varchar(50),
        "deployment_status" varchar(100),
        "community_feedback_score" numeric(3, 2),
        "impact_metrics" jsonb,
        "verified_at" timestamptz,
        "verified_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_impacts" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recommendation_reviews" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "challenge_ai_analysis" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "challenge_evidence" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "challenges" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "verification_records" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "industry_capabilities" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "industry_support_types" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "industry_sectors" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "industry_profiles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institution_capabilities" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "facilities" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "laboratories" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "research_areas" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "faculty_members" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institution_profiles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "capabilities" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations" CASCADE;`);

    await queryRunner.query(`DROP TYPE IF EXISTS "review_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "evidence_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "challenge_priority_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "challenge_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "capability_source_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "verification_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "organization_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum";`);
  }
}
