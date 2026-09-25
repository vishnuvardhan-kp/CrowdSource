import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthoritativeLGDIntegration1711700000000 implements MigrationInterface {
  name = 'AuthoritativeLGDIntegration1711700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add Authoritative LGD fields to institutions table
    await queryRunner.query(`
      ALTER TABLE "institutions"
      ADD COLUMN IF NOT EXISTS "name_local" varchar(255),
      ADD COLUMN IF NOT EXISTS "parent_lgd_code" varchar(50),
      ADD COLUMN IF NOT EXISTS "parent_institution_id" uuid REFERENCES "institutions"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "is_authoritative_lgd" boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "lgd_version" varchar(20) DEFAULT '1',
      ADD COLUMN IF NOT EXISTS "last_synced_at" timestamptz;
    `);

    // 2. Add Representative Authority tracking fields to institution_memberships table
    await queryRunner.query(`
      ALTER TABLE "institution_memberships"
      ADD COLUMN IF NOT EXISTS "identity_verification_status" varchar(50) NOT NULL DEFAULT 'VERIFIED',
      ADD COLUMN IF NOT EXISTS "authority_verification_reference" varchar(255),
      ADD COLUMN IF NOT EXISTS "verified_relationship" "representative_relationship_enum";
    `);

    // 3. Create indexes for high-throughput LGD hierarchy lookups and validation
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_parent_lgd" ON "institutions" ("parent_lgd_code");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_parent_id" ON "institutions" ("parent_institution_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_authoritative" ON "institutions" ("is_authoritative_lgd");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_institutions_name_local" ON "institutions" ("name_local");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_districts_code" ON "districts" ("code");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_blocks_code" ON "blocks" ("code");`);

    // 4. Reconcile existing demo / synthetic records without breaking foreign keys
    await queryRunner.query(`
      UPDATE "institutions"
      SET 
        "is_authoritative_lgd" = false,
        "metadata" = COALESCE("metadata", '{}'::jsonb) || '{"is_authoritative_lgd": false, "reconciliation_status": "LEGACY_PRE_LGD_DEMO", "note": "Preserved for historical referential integrity"}'::jsonb
      WHERE "type" = 'ULB';
    `);

    await queryRunner.query(`
      UPDATE "institutions"
      SET 
        "is_authoritative_lgd" = false,
        "metadata" = COALESCE("metadata", '{}'::jsonb) || '{"is_authoritative_lgd": false, "reconciliation_status": "DEPARTMENT_ENTITY"}'::jsonb
      WHERE "type" = 'GOVERNMENT_DEPARTMENT';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_blocks_code";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_districts_code";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_institutions_name_local";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_institutions_authoritative";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_institutions_parent_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_institutions_parent_lgd";`);

    await queryRunner.query(`
      ALTER TABLE "institution_memberships"
      DROP COLUMN IF EXISTS "verified_relationship",
      DROP COLUMN IF EXISTS "authority_verification_reference",
      DROP COLUMN IF EXISTS "identity_verification_status";
    `);

    await queryRunner.query(`
      ALTER TABLE "institutions"
      DROP COLUMN IF EXISTS "last_synced_at",
      DROP COLUMN IF EXISTS "lgd_version",
      DROP COLUMN IF EXISTS "is_authoritative_lgd",
      DROP COLUMN IF EXISTS "parent_institution_id",
      DROP COLUMN IF EXISTS "parent_lgd_code",
      DROP COLUMN IF EXISTS "name_local";
    `);
  }
}
