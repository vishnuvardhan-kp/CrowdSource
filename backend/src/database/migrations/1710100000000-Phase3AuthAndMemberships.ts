import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3AuthAndMemberships1710100000000 implements MigrationInterface {
  name = 'Phase3AuthAndMemberships1710100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend user_role_enum with new granular roles
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'INDUSTRY_ADMIN';`);
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'INDUSTRY_MEMBER';`);
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'GOVERNMENT_ADMIN';`);
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'GOVERNMENT_OFFICER';`);

    // 2. Create organization membership role enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "organization_role_enum" AS ENUM ('ADMIN', 'MEMBER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Create membership status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "membership_status_enum" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'REVOKED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 4. Create claim request status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "claim_request_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 5. Add password_hash to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);
    `);

    // 6. Create organization_memberships table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_memberships" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "organization_role" "organization_role_enum" NOT NULL DEFAULT 'MEMBER',
        "membership_status" "membership_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_user_organization" UNIQUE ("user_id", "organization_id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_org_memberships_user" ON "organization_memberships" ("user_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_org_memberships_org" ON "organization_memberships" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_org_memberships_status" ON "organization_memberships" ("membership_status");`);

    // 7. Create organization_claim_requests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_claim_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "requesting_user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "status" "claim_request_status_enum" NOT NULL DEFAULT 'PENDING',
        "reason" text NOT NULL,
        "submitted_at" timestamptz NOT NULL DEFAULT now(),
        "reviewed_at" timestamptz,
        "reviewed_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "review_notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_claim_requests_org" ON "organization_claim_requests" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_claim_requests_user" ON "organization_claim_requests" ("requesting_user_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_claim_requests_status" ON "organization_claim_requests" ("status");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_claim_requests" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_memberships" CASCADE;`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "claim_request_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "membership_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "organization_role_enum";`);
  }
}
