import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteProductionSchemaAlignment1712100000000
  implements MigrationInterface
{
  name = 'CompleteProductionSchemaAlignment1712100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. users: department, designation, specializations
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "department" varchar(255),
        ADD COLUMN IF NOT EXISTS "designation" varchar(150),
        ADD COLUMN IF NOT EXISTS "specializations" jsonb DEFAULT '[]'::jsonb;
    `);

    // 2. challenges: professional title, refinement, and facts
    await queryRunner.query(`
      ALTER TABLE "challenges"
        ADD COLUMN IF NOT EXISTS "professional_title" varchar(300),
        ADD COLUMN IF NOT EXISTS "professional_problem_statement" text,
        ADD COLUMN IF NOT EXISTS "refinement_status" varchar(50) DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "refined_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "citizen_facts" jsonb DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "platform_metadata" jsonb DEFAULT '{}'::jsonb;
    `);

    // 3. challenge_ai_analysis: professional title, refinement, and facts
    await queryRunner.query(`
      ALTER TABLE "challenge_ai_analysis"
        ADD COLUMN IF NOT EXISTS "professional_title" varchar(300),
        ADD COLUMN IF NOT EXISTS "professional_problem_statement" text,
        ADD COLUMN IF NOT EXISTS "key_facts" jsonb DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "citizen_facts" jsonb DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "platform_metadata" jsonb DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS "refinement_status" varchar(50) DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "refined_at" timestamptz;
    `);

    // 4. departments: description and status
    await queryRunner.query(`
      ALTER TABLE "departments"
        ADD COLUMN IF NOT EXISTS "description" text,
        ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'ACTIVE';
    `);

    // 5. proposed_solutions: rejection_reason and review_notes
    await queryRunner.query(`
      ALTER TABLE "proposed_solutions"
        ADD COLUMN IF NOT EXISTS "rejection_reason" text,
        ADD COLUMN IF NOT EXISTS "review_notes" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "proposed_solutions"
        DROP COLUMN IF EXISTS "review_notes",
        DROP COLUMN IF EXISTS "rejection_reason";
    `);

    await queryRunner.query(`
      ALTER TABLE "departments"
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "description";
    `);

    await queryRunner.query(`
      ALTER TABLE "challenge_ai_analysis"
        DROP COLUMN IF EXISTS "refined_at",
        DROP COLUMN IF EXISTS "refinement_status",
        DROP COLUMN IF EXISTS "platform_metadata",
        DROP COLUMN IF EXISTS "citizen_facts",
        DROP COLUMN IF EXISTS "key_facts",
        DROP COLUMN IF EXISTS "professional_problem_statement",
        DROP COLUMN IF EXISTS "professional_title";
    `);

    await queryRunner.query(`
      ALTER TABLE "challenges"
        DROP COLUMN IF EXISTS "platform_metadata",
        DROP COLUMN IF EXISTS "citizen_facts",
        DROP COLUMN IF EXISTS "refined_at",
        DROP COLUMN IF EXISTS "refinement_status",
        DROP COLUMN IF EXISTS "professional_problem_statement",
        DROP COLUMN IF EXISTS "professional_title";
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "specializations",
        DROP COLUMN IF EXISTS "designation",
        DROP COLUMN IF EXISTS "department";
    `);
  }
}
