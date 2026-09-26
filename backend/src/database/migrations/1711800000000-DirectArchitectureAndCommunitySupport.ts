import { MigrationInterface, QueryRunner } from 'typeorm';

export class DirectArchitectureAndCommunitySupport1711800000000 implements MigrationInterface {
  name = 'DirectArchitectureAndCommunitySupport1711800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add AUDIO to evidence_type_enum if not already present
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "evidence_type_enum" ADD VALUE IF NOT EXISTS 'AUDIO';
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Set default status for problem clusters in direct architecture
    await queryRunner.query(`
      ALTER TABLE "problem_clusters"
      ALTER COLUMN "status" SET DEFAULT 'OPEN_FOR_SOLUTIONS';
    `);

    // 3. Update existing clusters in AWAITING_GOVERNMENT_VERIFICATION to OPEN_FOR_SOLUTIONS
    await queryRunner.query(`
      UPDATE "problem_clusters"
      SET "status" = 'OPEN_FOR_SOLUTIONS'
      WHERE "status" = 'AWAITING_GOVERNMENT_VERIFICATION';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "problem_clusters"
      ALTER COLUMN "status" SET DEFAULT 'AWAITING_GOVERNMENT_VERIFICATION';
    `);
  }
}
