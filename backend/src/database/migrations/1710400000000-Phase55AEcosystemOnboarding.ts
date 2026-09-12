import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase55AEcosystemOnboarding1710400000000
  implements MigrationInterface
{
  name = 'Phase55AEcosystemOnboarding1710400000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create indexing_status_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "indexing_status_enum" AS ENUM (
          'PENDING', 'PROCESSING', 'ACTIVE', 'FAILED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Extend entity_embeddings table with recoverable indexing state
    await queryRunner.query(`
      ALTER TABLE "entity_embeddings" 
      ADD COLUMN IF NOT EXISTS "indexing_status" "indexing_status_enum" NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "indexing_requested_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "last_indexed_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "indexing_attempts" int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "last_indexing_error" text;
    `);
    await queryRunner.query(`
      ALTER TABLE "entity_embeddings" ALTER COLUMN "embedding" DROP NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_entity_embeddings_indexing_status" ON "entity_embeddings" ("indexing_status");
    `);

    // 3. Create taxonomy_addition_requests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "taxonomy_addition_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "submitted_by" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "proposed_name" varchar(150) NOT NULL,
        "proposed_category" varchar(100) NOT NULL DEFAULT 'General',
        "reason" text NOT NULL,
        "status" "review_status_enum" NOT NULL DEFAULT 'PENDING',
        "reviewed_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "reviewed_at" timestamptz,
        "admin_notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tax_req_org" ON "taxonomy_addition_requests" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tax_req_submitter" ON "taxonomy_addition_requests" ("submitted_by");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tax_req_status" ON "taxonomy_addition_requests" ("status");`);

    // 4. Create organization_evidence table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_evidence" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL REFERENCES "organizations" ("id") ON DELETE CASCADE,
        "institution_capability_id" uuid REFERENCES "institution_capabilities" ("id") ON DELETE SET NULL,
        "industry_capability_id" uuid REFERENCES "industry_capabilities" ("id") ON DELETE SET NULL,
        "capability_id" uuid REFERENCES "capabilities" ("id") ON DELETE SET NULL,
        "uploaded_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "evidence_type" "evidence_type_enum" NOT NULL DEFAULT 'DOCUMENT',
        "title" varchar(255) NOT NULL,
        "description" text,
        "url" varchar(1000) NOT NULL,
        "mime_type" varchar(100),
        "verification_status" "verification_status_enum" NOT NULL DEFAULT 'UNVERIFIED',
        "verified_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "verified_at" timestamptz,
        "verification_notes" text,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_org_evid_org" ON "organization_evidence" ("organization_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_org_evid_inst_cap" ON "organization_evidence" ("institution_capability_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_org_evid_ind_cap" ON "organization_evidence" ("industry_capability_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_org_evid_status" ON "organization_evidence" ("verification_status");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_evidence" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "taxonomy_addition_requests" CASCADE;`);
    await queryRunner.query(`
      ALTER TABLE "entity_embeddings" 
      DROP COLUMN IF EXISTS "indexing_status",
      DROP COLUMN IF EXISTS "indexing_requested_at",
      DROP COLUMN IF EXISTS "last_indexed_at",
      DROP COLUMN IF EXISTS "indexing_attempts",
      DROP COLUMN IF EXISTS "last_indexing_error";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "indexing_status_enum";`);
  }
}
