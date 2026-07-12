-- ============================================================
--  ClientFlow SaaS — Schema Sync Migration
--  Adds missing tables and columns that the code expects
--  Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add missing columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#c9a961';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Add missing columns to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;

-- 3. Create project_files table (used by files feature)
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  file_url VARCHAR(1000) NOT NULL,
  file_name VARCHAR(300) NOT NULL,
  mime_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  visibility VARCHAR(20) DEFAULT 'company',
  is_link BOOLEAN DEFAULT false,
  link_url VARCHAR(1000),
  category VARCHAR(20) DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on project_files
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS policy for project_files
CREATE POLICY "project_files_company_access" ON project_files
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 5. Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) DEFAULT 'event',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  color VARCHAR(7) DEFAULT '#c9a961',
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_company_access" ON calendar_events
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 6. Add deleted_at for soft deletes to ALL tables that need it
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 7. Re-add profile_id to clients (for portal access)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- 8. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
--  Verify what was added
-- ============================================================
SELECT 'Migration complete!' as status;
