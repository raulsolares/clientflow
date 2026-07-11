-- ==============================================================
-- MIGRATION 008: Add client_id to project_files
-- ==============================================================
BEGIN;

-- Add client_id column to project_files
ALTER TABLE project_files ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Index for client_id lookups
CREATE INDEX IF NOT EXISTS idx_project_files_client ON project_files(client_id);
CREATE INDEX IF NOT EXISTS idx_project_files_linked ON project_files(project_id, client_id);

COMMIT;
