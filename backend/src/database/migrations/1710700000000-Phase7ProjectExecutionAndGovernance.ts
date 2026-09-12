import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase7ProjectExecutionAndGovernance1710700000000
  implements MigrationInterface
{
  name = 'Phase7ProjectExecutionAndGovernance1710700000000';
  transaction = false; // Non-transactional to allow safe enum creation & ALTER TYPE

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend project_status_enum with Phase 7 states
    await queryRunner.query(`
      ALTER TYPE "project_status_enum" ADD VALUE IF NOT EXISTS 'INITIATED';
      ALTER TYPE "project_status_enum" ADD VALUE IF NOT EXISTS 'KICKOFF_PENDING';
      ALTER TYPE "project_status_enum" ADD VALUE IF NOT EXISTS 'KICKOFF_REVISION';
      ALTER TYPE "project_status_enum" ADD VALUE IF NOT EXISTS 'ACTIVE';
      ALTER TYPE "project_status_enum" ADD VALUE IF NOT EXISTS 'BLOCKED';
      ALTER TYPE "project_status_enum" ADD VALUE IF NOT EXISTS 'IMPACT_VERIFIED';
      ALTER TYPE "project_status_enum" ADD VALUE IF NOT EXISTS 'TERMINATED';
    `);

    // 2. Create custom enums for Phase 7
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "milestone_status_enum" AS ENUM (
          'PENDING', 'IN_PROGRESS', 'REVIEW_REQUESTED', 'REVISION_REQUIRED', 'APPROVED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "task_status_enum" AS ENUM (
          'TODO', 'IN_PROGRESS', 'DONE'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "deliverable_document_type_enum" AS ENUM (
          'REPORT', 'PROTOTYPE_SPEC', 'FIELD_PHOTO', 'CERTIFICATION', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "project_update_type_enum" AS ENUM (
          'PROGRESS', 'BLOCKER', 'RESOLUTION'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "project_review_action_enum" AS ENUM (
          'KICKOFF_APPROVED', 'KICKOFF_REVISION_REQUIRED', 'MILESTONE_APPROVED', 'MILESTONE_REVISION_REQUIRED',
          'BLOCKER_REVIEWED', 'BLOCKER_RESOLVED', 'PROJECT_COMPLETED', 'PROJECT_TERMINATED', 'IMPACT_VERIFIED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Add columns to projects table
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD COLUMN IF NOT EXISTS "objectives" text,
      ADD COLUMN IF NOT EXISTS "expected_outcomes" text;
    `);

    // 4. Create project_milestones table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_milestones" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL REFERENCES "projects" ("id") ON DELETE CASCADE,
        "title" varchar(255) NOT NULL,
        "description" text,
        "due_date" date,
        "status" "milestone_status_enum" NOT NULL DEFAULT 'PENDING',
        "order_index" int NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_milestones_project" ON "project_milestones" ("project_id");
      CREATE INDEX IF NOT EXISTS "idx_project_milestones_status" ON "project_milestones" ("status");
      CREATE INDEX IF NOT EXISTS "idx_project_milestones_order" ON "project_milestones" ("project_id", "order_index");
    `);

    // 5. Create project_tasks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_tasks" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "milestone_id" uuid NOT NULL REFERENCES "project_milestones" ("id") ON DELETE CASCADE,
        "assigned_participant_id" uuid REFERENCES "project_participants" ("id") ON DELETE SET NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "status" "task_status_enum" NOT NULL DEFAULT 'TODO',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_tasks_milestone" ON "project_tasks" ("milestone_id");
      CREATE INDEX IF NOT EXISTS "idx_project_tasks_assigned" ON "project_tasks" ("assigned_participant_id");
      CREATE INDEX IF NOT EXISTS "idx_project_tasks_status" ON "project_tasks" ("status");
    `);

    // 6. Create project_deliverables table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_deliverables" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL REFERENCES "projects" ("id") ON DELETE CASCADE,
        "milestone_id" uuid REFERENCES "project_milestones" ("id") ON DELETE SET NULL,
        "uploaded_by_participant_id" uuid REFERENCES "project_participants" ("id") ON DELETE SET NULL,
        "uploaded_by_user_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "document_type" "deliverable_document_type_enum" NOT NULL DEFAULT 'REPORT',
        "title" varchar(255) NOT NULL,
        "description" text,
        "storage_key" varchar(255) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" bigint NOT NULL,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_deliverables_project" ON "project_deliverables" ("project_id");
      CREATE INDEX IF NOT EXISTS "idx_project_deliverables_milestone" ON "project_deliverables" ("milestone_id");
      CREATE INDEX IF NOT EXISTS "idx_project_deliverables_participant" ON "project_deliverables" ("uploaded_by_participant_id");
      CREATE INDEX IF NOT EXISTS "idx_project_deliverables_user" ON "project_deliverables" ("uploaded_by_user_id");
    `);

    // 7. Create project_reviews table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL REFERENCES "projects" ("id") ON DELETE CASCADE,
        "milestone_id" uuid REFERENCES "project_milestones" ("id") ON DELETE SET NULL,
        "reviewer_user_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "action" "project_review_action_enum" NOT NULL,
        "comments" text,
        "feedback" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_reviews_project" ON "project_reviews" ("project_id");
      CREATE INDEX IF NOT EXISTS "idx_project_reviews_milestone" ON "project_reviews" ("milestone_id");
      CREATE INDEX IF NOT EXISTS "idx_project_reviews_reviewer" ON "project_reviews" ("reviewer_user_id");
    `);

    // 8. Create project_updates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_updates" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL REFERENCES "projects" ("id") ON DELETE CASCADE,
        "author_participant_id" uuid REFERENCES "project_participants" ("id") ON DELETE SET NULL,
        "author_user_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "update_type" "project_update_type_enum" NOT NULL DEFAULT 'PROGRESS',
        "summary" varchar(255) NOT NULL,
        "details" text,
        "blocker_status" varchar(50),
        "resolved_by_review_id" uuid REFERENCES "project_reviews" ("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_updates_project" ON "project_updates" ("project_id");
      CREATE INDEX IF NOT EXISTS "idx_project_updates_participant" ON "project_updates" ("author_participant_id");
      CREATE INDEX IF NOT EXISTS "idx_project_updates_user" ON "project_updates" ("author_user_id");
      CREATE INDEX IF NOT EXISTS "idx_project_updates_type" ON "project_updates" ("update_type");
      CREATE INDEX IF NOT EXISTS "idx_project_updates_resolved_review" ON "project_updates" ("resolved_by_review_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_updates" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_reviews" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_deliverables" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_tasks" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_milestones" CASCADE;`);

    await queryRunner.query(`
      ALTER TABLE "projects"
      DROP COLUMN IF EXISTS "expected_outcomes",
      DROP COLUMN IF EXISTS "objectives";
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS "project_review_action_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project_update_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "deliverable_document_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "milestone_status_enum";`);
  }
}
