import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4ProjectLifecycleStages1712000000000
  implements MigrationInterface
{
  name = 'Phase4ProjectLifecycleStages1712000000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new lifecycle stages to project_status_enum
    const newStatuses = [
      'PLANNING',
      'PROTOTYPE_DEVELOPMENT',
      'TESTING',
      'PILOT',
      'DEPLOYMENT',
      'ON_HOLD',
    ];

    for (const status of newStatuses) {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TYPE "project_status_enum" ADD VALUE IF NOT EXISTS '${status}';
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);
    }

    // 2. Add new document types to deliverable_document_type_enum
    const newDocTypes = [
      'PROTOTYPE',
      'TECHNICAL_REPORT',
      'TESTING_REPORT',
      'PILOT_REPORT',
      'DEPLOYMENT_DOCS',
      'TRAINING_MATERIAL',
      'FINAL_REPORT',
      'EVIDENCE',
    ];

    for (const docType of newDocTypes) {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TYPE "deliverable_document_type_enum" ADD VALUE IF NOT EXISTS '${docType}';
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres enums do not natively support removing values safely without recreating the type
  }
}
