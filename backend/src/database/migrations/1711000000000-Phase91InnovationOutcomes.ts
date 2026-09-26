import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase91InnovationOutcomes1711000000000 implements MigrationInterface {
  name = 'Phase91InnovationOutcomes1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums for Innovation Outcomes
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "innovation_outcome_type_enum" AS ENUM (
          'PATENT',
          'PATENT_APPLICATION',
          'IP_GENERATED',
          'STARTUP_CREATED',
          'INNOVATION_OUTCOME',
          'TECHNOLOGY_TRANSFER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "innovation_outcome_status_enum" AS ENUM (
          'PROPOSED',
          'VERIFIED',
          'REJECTED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create project_innovation_outcomes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_innovation_outcomes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "outcome_type" "innovation_outcome_type_enum" NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "status" "innovation_outcome_status_enum" NOT NULL DEFAULT 'PROPOSED',
        "reference_number" character varying(255),
        "organization_id" uuid,
        "created_by_user_id" uuid,
        "verified_by_user_id" uuid,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "verification_notes" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_innovation_outcomes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_innovation_outcomes_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_project_innovation_outcomes_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_project_innovation_outcomes_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_project_innovation_outcomes_verifier" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      );
    `);

    // 3. Create Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_project_innovation_outcomes_project_id" ON "project_innovation_outcomes" ("project_id");
      CREATE INDEX IF NOT EXISTS "IDX_project_innovation_outcomes_outcome_type" ON "project_innovation_outcomes" ("outcome_type");
      CREATE INDEX IF NOT EXISTS "IDX_project_innovation_outcomes_status" ON "project_innovation_outcomes" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_project_innovation_outcomes_organization_id" ON "project_innovation_outcomes" ("organization_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_innovation_outcomes"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "innovation_outcome_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "innovation_outcome_type_enum"`);
  }
}
