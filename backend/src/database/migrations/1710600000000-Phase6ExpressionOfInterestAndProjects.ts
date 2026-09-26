import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6ExpressionOfInterestAndProjects1710600000000
  implements MigrationInterface
{
  name = 'Phase6ExpressionOfInterestAndProjects1710600000000';
  transaction = false; // Non-transactional to allow safe enum creation & ALTER TYPE

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend challenge_status_enum with PROJECT_INITIATED
    await queryRunner.query(`
      ALTER TYPE "challenge_status_enum" ADD VALUE IF NOT EXISTS 'PROJECT_INITIATED';
    `);

    // 2. Create custom enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "eoi_status_enum" AS ENUM (
          'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DISCUSSION_REQUIRED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'PROJECT_FORMED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "eoi_timeline_enum" AS ENUM (
          'LESS_THAN_3_MONTHS', 'THREE_TO_SIX_MONTHS', 'SIX_TO_TWELVE_MONTHS', 'MORE_THAN_12_MONTHS'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "eoi_contribution_type_enum" AS ENUM (
          'RESEARCH', 'EXPERTISE', 'FACULTY', 'STUDENT_TEAM', 'TECHNOLOGY', 'PROTOTYPING',
          'INFRASTRUCTURE', 'TESTING', 'MENTORSHIP', 'FIELD_IMPLEMENTATION', 'MANUFACTURING',
          'DEPLOYMENT', 'CSR_SUPPORT', 'FUNDING_SUPPORT', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "eoi_evidence_type_enum" AS ENUM (
          'TECHNICAL_PROPOSAL', 'COST_ESTIMATE', 'PROTOTYPE_SPECIFICATION',
          'IMPLEMENTATION_CONCEPT', 'SUPPORTING_LETTER', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "eoi_review_action_enum" AS ENUM (
          'SUBMIT', 'REQUEST_DISCUSSION', 'RESUBMIT', 'ACCEPT', 'REJECT', 'WITHDRAW'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Create expression_of_interests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expression_of_interests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "challenge_id" uuid NOT NULL REFERENCES "challenges" ("id") ON DELETE CASCADE,
        "organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "proposer_user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "status" "eoi_status_enum" NOT NULL DEFAULT 'DRAFT',
        "motivation" text,
        "proposed_contribution" text,
        "proposed_approach" text,
        "resource_summary" text,
        "timeline" "eoi_timeline_enum",
        "timeline_notes" text,
        "collaboration_lead_name" varchar(255),
        "collaboration_lead_designation" varchar(150),
        "collaboration_lead_email" varchar(255),
        "collaboration_lead_phone" varchar(50),
        "project_id" uuid REFERENCES "projects" ("id") ON DELETE SET NULL,
        "submitted_at" timestamptz,
        "reviewed_at" timestamptz,
        "accepted_at" timestamptz,
        "rejected_at" timestamptz,
        "withdrawn_at" timestamptz,
        "project_formed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 4. Create partial unique index on (organization_id, challenge_id) for active statuses
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_eoi_org_challenge_active"
      ON "expression_of_interests" ("organization_id", "challenge_id")
      WHERE "status" IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DISCUSSION_REQUIRED', 'ACCEPTED');
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_challenge" ON "expression_of_interests" ("challenge_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_org" ON "expression_of_interests" ("organization_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_proposer" ON "expression_of_interests" ("proposer_user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_status" ON "expression_of_interests" ("status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_project" ON "expression_of_interests" ("project_id");
    `);

    // 5. Create eoi_contributions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "eoi_contributions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eoi_id" uuid NOT NULL REFERENCES "expression_of_interests" ("id") ON DELETE CASCADE,
        "contribution_type" "eoi_contribution_type_enum" NOT NULL,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_contributions_eoi" ON "eoi_contributions" ("eoi_id");
    `);

    // 6. Create eoi_evidence table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "eoi_evidence" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eoi_id" uuid NOT NULL REFERENCES "expression_of_interests" ("id") ON DELETE CASCADE,
        "evidence_type" "eoi_evidence_type_enum" NOT NULL DEFAULT 'OTHER',
        "title" varchar(255) NOT NULL,
        "description" text,
        "storage_key" varchar(255) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" bigint NOT NULL,
        "metadata" jsonb,
        "uploaded_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_evidence_eoi" ON "eoi_evidence" ("eoi_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_evidence_uploader" ON "eoi_evidence" ("uploaded_by");
    `);

    // 7. Create eoi_reviews table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "eoi_reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eoi_id" uuid NOT NULL REFERENCES "expression_of_interests" ("id") ON DELETE CASCADE,
        "reviewer_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "action" "eoi_review_action_enum" NOT NULL,
        "previous_status" "eoi_status_enum" NOT NULL,
        "new_status" "eoi_status_enum" NOT NULL,
        "reason" text,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_reviews_eoi" ON "eoi_reviews" ("eoi_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_eoi_reviews_reviewer" ON "eoi_reviews" ("reviewer_id");
    `);

    // 8. Create project_participants table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_participants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL REFERENCES "projects" ("id") ON DELETE CASCADE,
        "organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "source_eoi_id" uuid REFERENCES "expression_of_interests" ("id") ON DELETE SET NULL,
        "participant_role" varchar(100) NOT NULL DEFAULT 'PARTNER',
        "status" varchar(50) NOT NULL DEFAULT 'ACTIVE',
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_project_organization_participant" UNIQUE ("project_id", "organization_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_participants_project" ON "project_participants" ("project_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_participants_org" ON "project_participants" ("organization_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_participants_source_eoi" ON "project_participants" ("source_eoi_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_participants" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "eoi_reviews" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "eoi_evidence" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "eoi_contributions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expression_of_interests" CASCADE;`);

    await queryRunner.query(`DROP TYPE IF EXISTS "eoi_review_action_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "eoi_evidence_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "eoi_contribution_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "eoi_timeline_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "eoi_status_enum";`);
  }
}
