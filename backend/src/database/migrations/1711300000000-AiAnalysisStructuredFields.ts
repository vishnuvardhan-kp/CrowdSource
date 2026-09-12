import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiAnalysisStructuredFields1711300000000 implements MigrationInterface {
  name = 'AiAnalysisStructuredFields1711300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "challenge_ai_analysis"
      ADD COLUMN IF NOT EXISTS "domain" varchar(100),
      ADD COLUMN IF NOT EXISTS "subdomain" varchar(100),
      ADD COLUMN IF NOT EXISTS "keywords" jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "required_technologies" jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "ai_processing_status" varchar(50) DEFAULT 'SUCCESS';
    `);

    // Backfill domain/subdomain/technologies from existing rows if present
    await queryRunner.query(`
      UPDATE "challenge_ai_analysis"
      SET "domain" = COALESCE("domain", "category"),
          "subdomain" = COALESCE("subdomain", "sub_category"),
          "required_technologies" = COALESCE("required_technologies", "required_capabilities")
      WHERE "domain" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "challenge_ai_analysis"
      DROP COLUMN IF EXISTS "domain",
      DROP COLUMN IF EXISTS "subdomain",
      DROP COLUMN IF EXISTS "keywords",
      DROP COLUMN IF EXISTS "required_technologies",
      DROP COLUMN IF EXISTS "ai_processing_status";
    `);
  }
}
