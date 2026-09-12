import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase8ImpactVerificationAndOutcomes1710800000000
  implements MigrationInterface
{
  name = 'Phase8ImpactVerificationAndOutcomes1710800000000';
  transaction = false; // Non-transactional to allow safe enum creation

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create custom enums for Phase 8
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "impact_assessment_status_enum" AS ENUM (
          'IMPACT_VERIFICATION_PENDING', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'VERIFIED', 'REJECTED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "impact_metric_category_enum" AS ENUM (
          'POPULATION_REACHED', 'FINANCIAL_SAVINGS', 'ENVIRONMENTAL_IMPACT', 'INFRASTRUCTURE_CREATED', 'HEALTH_OUTCOMES', 'EFFICIENCY_IMPROVEMENT'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "impact_evidence_type_enum" AS ENUM (
          'FIELD_PHOTO', 'BENEFICIARY_TESTIMONIAL', 'GOVERNMENT_RECORD', 'IMPACT_REPORT', 'MEASUREMENT_DATA', 'CERTIFICATION', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "impact_review_decision_enum" AS ENUM (
          'APPROVED', 'REVISION_REQUIRED', 'REJECTED', 'REVOKED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create impact_assessments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "impact_assessments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL REFERENCES "projects" ("id") ON DELETE CASCADE,
        "submitted_by_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "status" "impact_assessment_status_enum" NOT NULL DEFAULT 'IMPACT_VERIFICATION_PENDING',
        "summary" text NOT NULL,
        "problem_addressed" text NOT NULL,
        "solution_implemented" text NOT NULL,
        "beneficiaries_reached" int,
        "geographic_coverage" text,
        "implementation_cost" numeric(12, 2),
        "sustainability_notes" text,
        "submitted_at" timestamptz,
        "verified_at" timestamptz,
        "rejected_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_impact_assessments_project_id" UNIQUE ("project_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_impact_assessments_project_id" ON "impact_assessments" ("project_id");
      CREATE INDEX IF NOT EXISTS "idx_impact_assessments_status" ON "impact_assessments" ("status");
      CREATE INDEX IF NOT EXISTS "idx_impact_assessments_submitted_by" ON "impact_assessments" ("submitted_by_id");
    `);

    // 3. Create impact_metrics table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "impact_metrics" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "impact_assessment_id" uuid NOT NULL REFERENCES "impact_assessments" ("id") ON DELETE CASCADE,
        "metric_category" "impact_metric_category_enum" NOT NULL,
        "metric_name" varchar(255) NOT NULL,
        "baseline_value" varchar(100),
        "target_value" varchar(100),
        "actual_value" varchar(100) NOT NULL,
        "unit" varchar(50) NOT NULL,
        "measurement_method" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_impact_metrics_assessment" ON "impact_metrics" ("impact_assessment_id");
      CREATE INDEX IF NOT EXISTS "idx_impact_metrics_category" ON "impact_metrics" ("metric_category");
    `);

    // 4. Create impact_evidence table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "impact_evidence" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "impact_assessment_id" uuid NOT NULL REFERENCES "impact_assessments" ("id") ON DELETE CASCADE,
        "uploaded_by_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "file_url" text NOT NULL,
        "storage_key" varchar(255) NOT NULL,
        "document_type" "impact_evidence_type_enum" NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" bigint NOT NULL,
        "checksum" varchar(64) NOT NULL,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_impact_evidence_assessment" ON "impact_evidence" ("impact_assessment_id");
      CREATE INDEX IF NOT EXISTS "idx_impact_evidence_uploaded_by" ON "impact_evidence" ("uploaded_by_id");
      CREATE INDEX IF NOT EXISTS "idx_impact_evidence_doc_type" ON "impact_evidence" ("document_type");
    `);

    // 5. Create impact_feedback table (Anti-astroturfing, strictly 1 feedback per eligible citizen)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "impact_feedback" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "impact_assessment_id" uuid NOT NULL REFERENCES "impact_assessments" ("id") ON DELETE CASCADE,
        "submitted_by_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "rating" int NOT NULL,
        "feedback" text NOT NULL,
        "benefit_confirmed" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_impact_feedback_assessment_user" UNIQUE ("impact_assessment_id", "submitted_by_id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_impact_feedback_assessment" ON "impact_feedback" ("impact_assessment_id");
      CREATE INDEX IF NOT EXISTS "idx_impact_feedback_user" ON "impact_feedback" ("submitted_by_id");
    `);

    // 6. Create impact_reviews table (Immutable government decisions audit log)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "impact_reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "impact_assessment_id" uuid NOT NULL REFERENCES "impact_assessments" ("id") ON DELETE CASCADE,
        "reviewer_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
        "decision" "impact_review_decision_enum" NOT NULL,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_impact_reviews_assessment" ON "impact_reviews" ("impact_assessment_id");
      CREATE INDEX IF NOT EXISTS "idx_impact_reviews_reviewer" ON "impact_reviews" ("reviewer_id");
      CREATE INDEX IF NOT EXISTS "idx_impact_reviews_decision" ON "impact_reviews" ("decision");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "impact_reviews" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "impact_feedback" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "impact_evidence" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "impact_metrics" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "impact_assessments" CASCADE;`);

    await queryRunner.query(`DROP TYPE IF EXISTS "impact_review_decision_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "impact_evidence_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "impact_metric_category_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "impact_assessment_status_enum";`);
  }
}
