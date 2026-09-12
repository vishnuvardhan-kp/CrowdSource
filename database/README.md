# SamadhanSetu — Database Layer (Phase 1)

## Overview
This directory contains the database setup and infrastructure configuration for SamadhanSetu.

## Technical Architecture
- **DBMS**: PostgreSQL 16
- **Vector Search Engine**: `pgvector` (for vector embeddings, deduplication, and semantic search in future phases)
- **Geographic Data**: PostGIS extension support (for location-based societal challenge mapping in future phases)

## Docker Setup
The PostgreSQL instance is managed via `docker-compose.yml` at the project root using the `pgvector/pgvector:pg16` image.

### Environment Variables
- `DATABASE_HOST`: `localhost` or `postgres` (in Docker)
- `DATABASE_PORT`: `5432`
- `DATABASE_NAME`: `samadhan_setu`
- `DATABASE_USER`: `postgres`
- `DATABASE_PASSWORD`: `postgres_password`

## Future Phase Roadmap (Phase 2)
In Phase 2, the relational schema will be established including:
- `users` (Citizens, HEI representatives, Industry partners, Admins)
- `challenges` (Submitted societal issues, location, category, severity)
- `institutions` (HEIs, capabilities, research departments)
- `industry_partners` (Companies, mentorship programs, CSR/R&D funding)
- `projects` & `milestones` (Execution lifecycle tracking)
