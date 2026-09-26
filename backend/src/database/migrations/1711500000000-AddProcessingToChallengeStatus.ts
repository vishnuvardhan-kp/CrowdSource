import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessingToChallengeStatus1711500000000 implements MigrationInterface {
  name = 'AddProcessingToChallengeStatus1711500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "challenge_status_enum" ADD VALUE IF NOT EXISTS 'PROCESSING';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres enums do not support safely removing values without recreation
  }
}
