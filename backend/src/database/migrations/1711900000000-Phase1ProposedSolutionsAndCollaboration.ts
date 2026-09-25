import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1ProposedSolutionsAndCollaboration1711900000000
  implements MigrationInterface
{
  name = 'Phase1ProposedSolutionsAndCollaboration1711900000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "proposed_solution_status_enum" AS ENUM (
          'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PUBLISHED', 'COLLABORATION_OPEN', 'CONVERTED_TO_PROJECT', 'COMPLETED', 'ARCHIVED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "solution_visibility_enum" AS ENUM (
          'PUBLIC', 'INTERNAL', 'CONSORTIUM'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "solution_collaboration_type_enum" AS ENUM (
          'FUNDING', 'MENTORSHIP', 'TECHNOLOGY', 'SOFTWARE', 'HARDWARE', 'PROTOTYPING',
          'TESTING', 'MANUFACTURING', 'PILOT_SUPPORT', 'DEPLOYMENT_SUPPORT', 'TECHNOLOGY_TRANSFER',
          'RESEARCH_COLLABORATION', 'TECHNICAL_EXPERTISE', 'CSR_SUPPORT', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "solution_collaboration_status_enum" AS ENUM (
          'OFFERED', 'UNDER_DISCUSSION', 'ACCEPTED', 'DECLINED', 'CONVERTED_TO_PROJECT'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "solution_team_role_enum" AS ENUM (
          'PROJECT_LEAD', 'FACULTY_MENTOR', 'STUDENT_RESEARCHER', 'CO_INVESTIGATOR', 'ACADEMIC_COORDINATOR'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "solution_document_type_enum" AS ENUM (
          'TECHNICAL_PROPOSAL', 'COST_ESTIMATE', 'PROTOTYPE_SPECIFICATION', 'BLUEPRINT', 'SUPPORTING_LETTER', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create proposed_solutions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "proposed_solutions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "challenge_id" uuid NOT NULL REFERENCES "challenges" ("id") ON DELETE CASCADE,
        "cluster_id" uuid REFERENCES "problem_clusters" ("id") ON DELETE SET NULL,
        "proposing_organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "title" varchar(300) NOT NULL,
        "executive_summary" text,
        "problem_understanding" text,
        "proposed_approach" text,
        "technical_approach" text,
        "required_capabilities" jsonb DEFAULT '[]'::jsonb,
        "expected_outcomes" text,
        "expected_social_impact" text,
        "estimated_budget" numeric(12,2),
        "estimated_timeline" varchar(100),
        "required_resources" text,
        "prototype_requirements" text,
        "deployment_requirements" text,
        "innovation_potential" text,
        "ip_potential" text,
        "status" "proposed_solution_status_enum" NOT NULL DEFAULT 'DRAFT',
        "visibility" "solution_visibility_enum" NOT NULL DEFAULT 'PUBLIC',
        "project_id" uuid REFERENCES "projects" ("id") ON DELETE SET NULL,
        "created_by" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "submitted_at" timestamptz,
        "published_at" timestamptz,
        "converted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_solutions_challenge" ON "proposed_solutions" ("challenge_id");
      CREATE INDEX IF NOT EXISTS "idx_solutions_cluster" ON "proposed_solutions" ("cluster_id");
      CREATE INDEX IF NOT EXISTS "idx_solutions_org" ON "proposed_solutions" ("proposing_organization_id");
      CREATE INDEX IF NOT EXISTS "idx_solutions_status" ON "proposed_solutions" ("status");
      CREATE INDEX IF NOT EXISTS "idx_solutions_visibility" ON "proposed_solutions" ("visibility");
      CREATE INDEX IF NOT EXISTS "idx_solutions_project" ON "proposed_solutions" ("project_id");
      CREATE INDEX IF NOT EXISTS "idx_solutions_creator" ON "proposed_solutions" ("created_by");
    `);

    // 3. Create solution_team_members Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "solution_team_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "solution_id" uuid NOT NULL REFERENCES "proposed_solutions" ("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "email" varchar(255),
        "role" "solution_team_role_enum" NOT NULL DEFAULT 'FACULTY_MENTOR',
        "department" varchar(255),
        "designation" varchar(255),
        "degree_program" varchar(255),
        "student_year" int,
        "weekly_commitment_hours" int,
        "specialization_skills" jsonb DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_solution_members_solution" ON "solution_team_members" ("solution_id");
      CREATE INDEX IF NOT EXISTS "idx_solution_members_user" ON "solution_team_members" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_solution_members_org" ON "solution_team_members" ("organization_id");
    `);

    // 4. Create solution_documents Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "solution_documents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "solution_id" uuid NOT NULL REFERENCES "proposed_solutions" ("id") ON DELETE CASCADE,
        "uploaded_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "title" varchar(255) NOT NULL,
        "document_type" "solution_document_type_enum" NOT NULL DEFAULT 'OTHER',
        "storage_key" varchar(255) NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" bigint NOT NULL,
        "url" text,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_solution_docs_solution" ON "solution_documents" ("solution_id");
    `);

    // 5. Create solution_collaborations Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "solution_collaborations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "solution_id" uuid NOT NULL REFERENCES "proposed_solutions" ("id") ON DELETE CASCADE,
        "offering_organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "offering_user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "collaboration_type" "solution_collaboration_type_enum" NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "financial_contribution" numeric(12,2),
        "resources_offered" text,
        "estimated_timeline" varchar(100),
        "status" "solution_collaboration_status_enum" NOT NULL DEFAULT 'OFFERED',
        "discussion_notes" text,
        "response_notes" text,
        "reviewed_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "accepted_at" timestamptz,
        "declined_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sol_collab_solution" ON "solution_collaborations" ("solution_id");
      CREATE INDEX IF NOT EXISTS "idx_sol_collab_org" ON "solution_collaborations" ("offering_organization_id");
      CREATE INDEX IF NOT EXISTS "idx_sol_collab_status" ON "solution_collaborations" ("status");
    `);

    // 6. Alter projects table to add proposed_solution_id
    await queryRunner.query(`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "proposed_solution_id" uuid REFERENCES "proposed_solutions" ("id") ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS "idx_projects_proposed_solution_id" ON "projects" ("proposed_solution_id");
    `);

    // 7. Safe Migration of Historical EOI Records
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'expression_of_interests') THEN
          INSERT INTO "proposed_solutions" (
            "id", "challenge_id", "cluster_id", "proposing_organization_id", "title",
            "executive_summary", "problem_understanding", "proposed_approach", "technical_approach",
            "required_resources", "estimated_timeline", "status", "project_id", "created_by",
            "submitted_at", "created_at", "updated_at"
          )
          SELECT
            e.id,
            e.challenge_id,
            e.cluster_id,
            e.organization_id,
            COALESCE(c.title || ' - Proposed Solution', 'University Proposed Solution'),
            COALESCE(e.motivation, e.proposed_contribution, 'Solution proposed by institution'),
            e.motivation,
            COALESCE(e.proposed_approach, 'Institutional Technical Approach'),
            COALESCE(e.proposed_contribution, 'Technical methodology and solution deployment'),
            e.resource_summary,
            e.timeline::text,
            CASE 
              WHEN e.status = 'PROJECT_FORMED' THEN 'CONVERTED_TO_PROJECT'::proposed_solution_status_enum
              WHEN e.status = 'ACCEPTED' THEN 'COLLABORATION_OPEN'::proposed_solution_status_enum
              WHEN e.status = 'UNDER_REVIEW' THEN 'UNDER_REVIEW'::proposed_solution_status_enum
              WHEN e.status = 'SUBMITTED' THEN 'SUBMITTED'::proposed_solution_status_enum
              ELSE 'DRAFT'::proposed_solution_status_enum
            END,
            e.project_id,
            e.proposer_user_id,
            e.submitted_at,
            e.created_at,
            e.updated_at
          FROM "expression_of_interests" e
          LEFT JOIN "challenges" c ON c.id = e.challenge_id
          ON CONFLICT ("id") DO NOTHING;

          -- Link projects back to migrated solutions
          UPDATE "projects" p
          SET "proposed_solution_id" = e.id
          FROM "expression_of_interests" e
          WHERE e.project_id = p.id AND p.proposed_solution_id IS NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "proposed_solution_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "solution_collaborations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "solution_documents";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "solution_team_members";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "proposed_solutions";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "solution_document_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "solution_team_role_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "solution_collaboration_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "solution_collaboration_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "solution_visibility_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "proposed_solution_status_enum";`);
  }
}
