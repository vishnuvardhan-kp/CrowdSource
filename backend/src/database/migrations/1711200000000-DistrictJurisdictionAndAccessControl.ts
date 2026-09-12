import { MigrationInterface, QueryRunner } from 'typeorm';

export class DistrictJurisdictionAndAccessControl1711200000000 implements MigrationInterface {
  name = 'DistrictJurisdictionAndAccessControl1711200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend users table with authoritative jurisdiction fields
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "district_id" uuid REFERENCES "districts"("id") ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "district" character varying(100),
        ADD COLUMN IF NOT EXISTS "state" character varying(100) DEFAULT 'Jharkhand',
        ADD COLUMN IF NOT EXISTS "jurisdiction_scope" character varying(50) DEFAULT 'DISTRICT';
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_district_id" ON "users" ("district_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_district" ON "users" ("district");`);

    // 2. Extend organizations table with canonical district_id
    await queryRunner.query(`
      ALTER TABLE "organizations"
        ADD COLUMN IF NOT EXISTS "district_id" uuid REFERENCES "districts"("id") ON DELETE SET NULL;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizations_district_id" ON "organizations" ("district_id");`);

    // 3. Extend verification_records with audit jurisdiction fields
    await queryRunner.query(`
      ALTER TABLE "verification_records"
        ADD COLUMN IF NOT EXISTS "jurisdiction" character varying(100),
        ADD COLUMN IF NOT EXISTS "verifier_role" character varying(50);
    `);

    // 4. Extend notifications table with district targeting fields
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "district_id" uuid REFERENCES "districts"("id") ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "district" character varying(100);
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_district_id" ON "notifications" ("district_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_district" ON "notifications" ("district");`);

    // 5. Data Normalization: Authoritatively backfill district_id for existing records
    await queryRunner.query(`
      UPDATE "organizations" o
      SET "district_id" = d."id"
      FROM "districts" d
      WHERE o."district_id" IS NULL
        AND o."district" IS NOT NULL
        AND LOWER(TRIM(o."district")) = LOWER(TRIM(d."name"));
    `);

    await queryRunner.query(`
      UPDATE "challenges" c
      SET "district_id" = d."id"
      FROM "districts" d
      WHERE c."district_id" IS NULL
        AND c."district" IS NOT NULL
        AND LOWER(TRIM(c."district")) = LOWER(TRIM(d."name"));
    `);

    await queryRunner.query(`
      UPDATE "users" u
      SET "district_id" = d."id"
      FROM "districts" d
      WHERE u."district_id" IS NULL
        AND u."district" IS NOT NULL
        AND LOWER(TRIM(u."district")) = LOWER(TRIM(d."name"));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_district";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_district_id";`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "district", DROP COLUMN IF EXISTS "district_id";`);

    await queryRunner.query(`ALTER TABLE "verification_records" DROP COLUMN IF EXISTS "verifier_role", DROP COLUMN IF EXISTS "jurisdiction";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_organizations_district_id";`);
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "district_id";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_district";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_district_id";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "jurisdiction_scope", DROP COLUMN IF EXISTS "state", DROP COLUMN IF EXISTS "district", DROP COLUMN IF EXISTS "district_id";`);
  }
}
