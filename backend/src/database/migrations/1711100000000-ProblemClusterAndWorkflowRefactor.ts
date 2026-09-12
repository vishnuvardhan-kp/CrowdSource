import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProblemClusterAndWorkflowRefactor1711100000000 implements MigrationInterface {
  name = 'ProblemClusterAndWorkflowRefactor1711100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "problem_cluster_status_enum" AS ENUM (
          'AWAITING_GOVERNMENT_VERIFICATION',
          'VALIDATED',
          'OPEN_FOR_SOLUTIONS',
          'COLLABORATION',
          'PROJECT_INITIATED',
          'RESOLVED',
          'REJECTED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "clustering_status_enum" AS ENUM (
          'CLUSTERED',
          'POTENTIAL_MATCH',
          'INDEPENDENT'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create problem_clusters table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "problem_clusters" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying(300) NOT NULL,
        "description" text NOT NULL,
        "category" character varying(100) NOT NULL DEFAULT 'General',
        "subcategory" character varying(100),
        "district" character varying(100) NOT NULL,
        "district_id" uuid,
        "block" character varying(100),
        "block_id" uuid,
        "village_locality" character varying(255),
        "location" text,
        "latitude" numeric(10, 7),
        "longitude" numeric(10, 7),
        "report_count" integer NOT NULL DEFAULT 1,
        "evidence_count" integer NOT NULL DEFAULT 0,
        "affected_population" character varying(100),
        "severity" character varying(50) NOT NULL DEFAULT 'MODERATE',
        "priority_score" numeric(5, 2) NOT NULL DEFAULT 50.00,
        "priority" "challenge_priority_enum" NOT NULL DEFAULT 'MEDIUM',
        "priority_reasons" jsonb DEFAULT '[]'::jsonb,
        "status" "problem_cluster_status_enum" NOT NULL DEFAULT 'AWAITING_GOVERNMENT_VERIFICATION',
        "government_verification_status" character varying(50) NOT NULL DEFAULT 'PENDING',
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "verified_by" uuid,
        "rejection_reason" text,
        "ai_confidence" numeric(4, 3) DEFAULT 0.850,
        "ai_processing_status" character varying(50) NOT NULL DEFAULT 'SUCCESS',
        "ai_reasoning" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_problem_clusters_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_problem_clusters_district" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_problem_clusters_block" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_problem_clusters_verifier" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      );
    `);

    // 3. Add cluster columns to challenges table
    await queryRunner.query(`
      ALTER TABLE "challenges" 
      ADD COLUMN IF NOT EXISTS "cluster_id" uuid,
      ADD COLUMN IF NOT EXISTS "potential_cluster_id" uuid,
      ADD COLUMN IF NOT EXISTS "clustering_status" "clustering_status_enum" NOT NULL DEFAULT 'CLUSTERED';
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "challenges"
        ADD CONSTRAINT "FK_challenges_cluster" FOREIGN KEY ("cluster_id") REFERENCES "problem_clusters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "challenges"
        ADD CONSTRAINT "FK_challenges_potential_cluster" FOREIGN KEY ("potential_cluster_id") REFERENCES "problem_clusters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 4. Add cluster column to expression_of_interests table
    await queryRunner.query(`
      ALTER TABLE "expression_of_interests" 
      ADD COLUMN IF NOT EXISTS "cluster_id" uuid;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "expression_of_interests"
        ADD CONSTRAINT "FK_eois_cluster" FOREIGN KEY ("cluster_id") REFERENCES "problem_clusters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 5. Add cluster column to projects table
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD COLUMN IF NOT EXISTS "cluster_id" uuid;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "projects"
        ADD CONSTRAINT "FK_projects_cluster" FOREIGN KEY ("cluster_id") REFERENCES "problem_clusters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 6. Add is_required column to project_contributions table
    await queryRunner.query(`
      ALTER TABLE "project_contributions" 
      ADD COLUMN IF NOT EXISTS "is_required" boolean NOT NULL DEFAULT false;
    `);

    // 7. Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_problem_clusters_district" ON "problem_clusters" ("district");
      CREATE INDEX IF NOT EXISTS "IDX_problem_clusters_status" ON "problem_clusters" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_problem_clusters_priority" ON "problem_clusters" ("priority");
      CREATE INDEX IF NOT EXISTS "IDX_problem_clusters_created_at" ON "problem_clusters" ("created_at");
      CREATE INDEX IF NOT EXISTS "IDX_challenges_cluster_id" ON "challenges" ("cluster_id");
      CREATE INDEX IF NOT EXISTS "IDX_challenges_potential_cluster_id" ON "challenges" ("potential_cluster_id");
      CREATE INDEX IF NOT EXISTS "IDX_eois_cluster_id" ON "expression_of_interests" ("cluster_id");
      CREATE INDEX IF NOT EXISTS "IDX_projects_cluster_id" ON "projects" ("cluster_id");
      CREATE INDEX IF NOT EXISTS "IDX_project_contributions_is_required" ON "project_contributions" ("is_required");
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_eoi_org_cluster_unique" ON "expression_of_interests" ("organization_id", "cluster_id") WHERE status NOT IN ('WITHDRAWN', 'REJECTED') AND cluster_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_eoi_org_cluster_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_project_contributions_is_required"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_projects_cluster_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_eois_cluster_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_challenges_potential_cluster_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_challenges_cluster_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_problem_clusters_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_problem_clusters_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_problem_clusters_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_problem_clusters_district"`);

    await queryRunner.query(`ALTER TABLE "project_contributions" DROP COLUMN IF EXISTS "is_required"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "cluster_id"`);
    await queryRunner.query(`ALTER TABLE "expression_of_interests" DROP COLUMN IF EXISTS "cluster_id"`);
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "clustering_status"`);
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "potential_cluster_id"`);
    await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN IF EXISTS "cluster_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "problem_clusters"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "clustering_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "problem_cluster_status_enum"`);
  }
}
