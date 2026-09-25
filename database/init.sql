-- ResolvIN Database Initialization (Phase 1 Setup)

-- Enable vector extension for semantic search and AI embeddings (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log initialization phase
CREATE TABLE IF NOT EXISTS _system_meta (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO _system_meta (key, value)
VALUES ('phase', '1'), ('system_name', 'ResolvIN')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;
