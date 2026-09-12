import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5AiIntelligenceAndMatching1710300000000
  implements MigrationInterface
{
  name = 'Phase5AiIntelligenceAndMatching1710300000000';
  transaction = false; // Non-transactional to allow safe enum creation

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create entity_embedding_type_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "entity_embedding_type_enum" AS ENUM (
          'CHALLENGE', 'ORGANIZATION', 'CAPABILITY', 'INSTITUTION_PROFILE', 'INDUSTRY_PROFILE'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create entity_embeddings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "entity_embeddings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "entity_type" "entity_embedding_type_enum" NOT NULL DEFAULT 'CHALLENGE',
        "entity_id" uuid NOT NULL,
        "embedding_version" varchar(50) NOT NULL DEFAULT 'v1.0',
        "model_provider" varchar(50) NOT NULL DEFAULT 'mock',
        "model_name" varchar(150) NOT NULL DEFAULT 'nvidia/nv-embed-v1',
        "model_version" varchar(50) NOT NULL DEFAULT '1.0',
        "dimensions" int NOT NULL DEFAULT 1024,
        "source_text" text NOT NULL,
        "source_text_hash" varchar(64) NOT NULL,
        "metadata" jsonb,
        "embedding" jsonb NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_entity_embeddings_type" ON "entity_embeddings" ("entity_type");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_entity_embeddings_eid" ON "entity_embeddings" ("entity_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_entity_embeddings_ver" ON "entity_embeddings" ("embedding_version");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_entity_embeddings_hash" ON "entity_embeddings" ("source_text_hash");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_entity_embeddings_active" ON "entity_embeddings" ("is_active");`);

    // 3. Create recommendation_runs table for reproducibility
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recommendation_runs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "challenge_id" uuid NOT NULL REFERENCES "challenges" ("id") ON DELETE CASCADE,
        "embedding_version" varchar(50) NOT NULL DEFAULT 'v1.0',
        "model_name" varchar(150),
        "reranker_model" varchar(50),
        "scoring_config" jsonb NOT NULL,
        "candidate_pool_size" int NOT NULL DEFAULT 0,
        "total_matched" int NOT NULL DEFAULT 0,
        "run_timestamp" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_rec_runs_challenge" ON "recommendation_runs" ("challenge_id");`);

    // 4. Add availability TTL columns to organizations if not present
    await queryRunner.query(`
      ALTER TABLE "organizations"
      ADD COLUMN IF NOT EXISTS "available_capacity" int DEFAULT 3,
      ADD COLUMN IF NOT EXISTS "availability_confirmed_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "availability_expires_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "availability_status" varchar(20) DEFAULT 'UNKNOWN';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
      DROP COLUMN IF EXISTS "available_capacity",
      DROP COLUMN IF EXISTS "availability_confirmed_at",
      DROP COLUMN IF EXISTS "availability_expires_at",
      DROP COLUMN IF EXISTS "availability_status";
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "recommendation_runs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "entity_embeddings";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "entity_embedding_type_enum";`);
  }
}
