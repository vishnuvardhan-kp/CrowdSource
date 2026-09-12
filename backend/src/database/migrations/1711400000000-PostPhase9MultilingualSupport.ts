import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostPhase9MultilingualSupport1711400000000 implements MigrationInterface {
  name = 'PostPhase9MultilingualSupport1711400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add multilingual columns to challenges table
    await queryRunner.query(`
      ALTER TABLE "challenges"
      ADD COLUMN IF NOT EXISTS "original_text" text,
      ADD COLUMN IF NOT EXISTS "original_language" varchar(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS "normalized_text" text,
      ADD COLUMN IF NOT EXISTS "processing_language" varchar(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS "translation_status" varchar(50) DEFAULT 'NOT_REQUIRED',
      ADD COLUMN IF NOT EXISTS "translation_metadata" jsonb DEFAULT '{}'::jsonb;
    `);

    // 2. Add user preferred language
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "preferred_language" varchar(10) DEFAULT 'en';
    `);

    // 3. Backfill existing challenges so original_text matches description and status is NOT_REQUIRED
    await queryRunner.query(`
      UPDATE "challenges"
      SET "original_text" = COALESCE("original_text", "description"),
          "original_language" = COALESCE("original_language", 'en'),
          "normalized_text" = COALESCE("normalized_text", "description"),
          "processing_language" = COALESCE("processing_language", 'en'),
          "translation_status" = COALESCE("translation_status", 'NOT_REQUIRED')
      WHERE "original_text" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "challenges"
      DROP COLUMN IF EXISTS "original_text",
      DROP COLUMN IF EXISTS "original_language",
      DROP COLUMN IF EXISTS "normalized_text",
      DROP COLUMN IF EXISTS "processing_language",
      DROP COLUMN IF EXISTS "translation_status",
      DROP COLUMN IF EXISTS "translation_metadata";
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "preferred_language";
    `);
  }
}
