import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase55BRealEcosystemOnboarding1710500000000
  implements MigrationInterface
{
  name = 'Phase55BRealEcosystemOnboarding1710500000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create geographic_reach_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "geographic_reach_enum" AS ENUM (
          'DISTRICT', 'STATEWIDE', 'NATIONAL'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Extend organizations table with geographic_reach and is_demo
    await queryRunner.query(`
      ALTER TABLE "organizations"
      ADD COLUMN IF NOT EXISTS "geographic_reach" "geographic_reach_enum" NOT NULL DEFAULT 'DISTRICT',
      ADD COLUMN IF NOT EXISTS "is_demo" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_organizations_geographic_reach" ON "organizations" ("geographic_reach");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_organizations_is_demo" ON "organizations" ("is_demo");
    `);

    // 3. Extend organization_evidence with is_public
    await queryRunner.query(`
      ALTER TABLE "organization_evidence"
      ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_organization_evidence_is_public" ON "organization_evidence" ("is_public");
    `);

    // 4. Create organization_onboarding_requests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_onboarding_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "requester_user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "name" varchar(255) NOT NULL,
        "organization_type" "organization_type_enum" NOT NULL DEFAULT 'OTHER',
        "registration_number" varchar(100),
        "email" varchar(255) NOT NULL,
        "website" varchar(255),
        "phone" varchar(50),
        "address" text,
        "district" varchar(100) NOT NULL,
        "state" varchar(100) NOT NULL DEFAULT 'Jharkhand',
        "geographic_reach" "geographic_reach_enum" NOT NULL DEFAULT 'DISTRICT',
        "verification_document_url" varchar(1000),
        "status" "review_status_enum" NOT NULL DEFAULT 'PENDING',
        "reviewed_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "reviewed_at" timestamptz,
        "admin_notes" text,
        "created_organization_id" uuid REFERENCES "organizations" ("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_onboard_req_user" ON "organization_onboarding_requests" ("requester_user_id");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_onboard_req_status" ON "organization_onboarding_requests" ("status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_onboard_req_district" ON "organization_onboarding_requests" ("district");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_onboarding_requests" CASCADE;`);
    await queryRunner.query(`
      ALTER TABLE "organization_evidence"
      DROP COLUMN IF EXISTS "is_public";
    `);
    await queryRunner.query(`
      ALTER TABLE "organizations"
      DROP COLUMN IF EXISTS "geographic_reach",
      DROP COLUMN IF EXISTS "is_demo";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "geographic_reach_enum";`);
  }
}
