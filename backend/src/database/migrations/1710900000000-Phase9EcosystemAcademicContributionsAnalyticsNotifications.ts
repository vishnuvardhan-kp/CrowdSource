import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase9EcosystemAcademicContributionsAnalyticsNotifications1710900000000
  implements MigrationInterface
{
  name = 'Phase9EcosystemAcademicContributionsAnalyticsNotifications1710900000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums for Phase 9
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "academic_member_role_enum" AS ENUM (
          'STUDENT', 'FACULTY_MENTOR', 'ACADEMIC_COORDINATOR'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "academic_member_status_enum" AS ENUM (
          'ACTIVE', 'INACTIVE', 'COMPLETED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "project_contribution_type_enum" AS ENUM (
          'MENTORSHIP', 'FUNDING', 'TECHNOLOGY', 'PROTOTYPING',
          'TESTING', 'PILOT_SUPPORT', 'TECHNOLOGY_TRANSFER', 'DEPLOYMENT_SUPPORT'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contribution_status_enum" AS ENUM (
          'PROPOSED', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'CLARIFICATION_REQUESTED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contribution_visibility_enum" AS ENUM (
          'CONSORTIUM', 'CONTRIBUTOR_AND_LEAD_ONLY'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "notification_type_enum" AS ENUM (
          'CHALLENGE_STATUS', 'EOI_UPDATE', 'PROJECT_GOVERNANCE',
          'MILESTONE_ACTION', 'CONTRIBUTION_UPDATE', 'IMPACT_UPDATE', 'SYSTEM'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create project_academic_members table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_academic_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL REFERENCES "projects" ("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "role" "academic_member_role_enum" NOT NULL,
        "department" varchar(255),
        "specialization" varchar(255),
        "status" "academic_member_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "joined_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_project_academic_member" UNIQUE ("project_id", "user_id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_proj_acad_members_project" ON "project_academic_members" ("project_id");
      CREATE INDEX IF NOT EXISTS "idx_proj_acad_members_org" ON "project_academic_members" ("organization_id");
      CREATE INDEX IF NOT EXISTS "idx_proj_acad_members_user" ON "project_academic_members" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_proj_acad_members_role" ON "project_academic_members" ("role");
    `);

    // 3. Create project_contributions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_contributions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL REFERENCES "projects" ("id") ON DELETE CASCADE,
        "participant_id" uuid NOT NULL REFERENCES "project_participants" ("id") ON DELETE CASCADE,
        "contribution_type" "project_contribution_type_enum" NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "status" "contribution_status_enum" NOT NULL DEFAULT 'PROPOSED',
        "visibility" "contribution_visibility_enum" NOT NULL DEFAULT 'CONSORTIUM',
        "value" numeric(14, 2),
        "currency" varchar(10) NOT NULL DEFAULT 'INR',
        "evidence_url" text,
        "transfer_details" jsonb,
        "verification_notes" text,
        "verified_by_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_proj_contrib_project" ON "project_contributions" ("project_id");
      CREATE INDEX IF NOT EXISTS "idx_proj_contrib_participant" ON "project_contributions" ("participant_id");
      CREATE INDEX IF NOT EXISTS "idx_proj_contrib_type" ON "project_contributions" ("contribution_type");
      CREATE INDEX IF NOT EXISTS "idx_proj_contrib_status" ON "project_contributions" ("status");
    `);

    // 4. Create notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "type" "notification_type_enum" NOT NULL DEFAULT 'SYSTEM',
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "reference_type" varchar(50),
        "reference_id" uuid,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("user_id", "is_read");
      CREATE INDEX IF NOT EXISTS "idx_notifications_created" ON "notifications" ("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_contributions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_academic_members";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contribution_visibility_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contribution_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project_contribution_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "academic_member_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "academic_member_role_enum";`);
  }
}
