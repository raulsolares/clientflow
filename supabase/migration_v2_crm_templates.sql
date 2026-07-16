-- ==============================================================
-- CLIENTFLOW - MIGRACIÓN CRM + PLANTILLAS + SUBTAREAS
-- ==============================================================

-- 1. MODIFICAR TABLA tasks
ALTER TABLE tasks ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule JSONB DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

DROP INDEX IF EXISTS idx_tasks_client;
DROP INDEX IF EXISTS idx_tasks_parent;
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);

-- 2. CREAR ENUMS (safe way)
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('meeting', 'call', 'deadline', 'reminder', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE action_type_v2 AS ENUM ('call', 'email', 'meeting', 'note', 'task_completed', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. TABLA: calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  event_type event_type DEFAULT 'meeting',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  color VARCHAR(7) DEFAULT '#c9a961',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calendar_company ON calendar_events(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_client ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_dates ON calendar_events(company_id, start_date);

-- 4. TABLA: client_notes
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_pinned ON client_notes(client_id, pinned);

-- 5. TABLA: client_actions
CREATE TABLE IF NOT EXISTS client_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  action_type action_type_v2 DEFAULT 'note',
  title VARCHAR(300) NOT NULL,
  description TEXT,
  outcome TEXT,
  scheduled_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_client_actions_client ON client_actions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_actions_date ON client_actions(client_id, scheduled_date);

-- 6. TABLA: project_templates
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  color VARCHAR(7) DEFAULT '#c9a961',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_templates_company ON project_templates(company_id);

-- 7. TABLA: project_template_tasks
CREATE TABLE IF NOT EXISTS project_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'medium',
  estimated_hours DECIMAL(6,1),
  sort_order INTEGER DEFAULT 0,
  section VARCHAR(100) DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_tasks_template ON project_template_tasks(template_id);

-- 8. template_id en projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES project_templates(id) ON DELETE SET NULL;

-- 9. TRIGGERS updated_at
DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_client_notes_updated_at ON client_notes;
CREATE TRIGGER trg_client_notes_updated_at BEFORE UPDATE ON client_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_client_actions_updated_at ON client_actions;
CREATE TRIGGER trg_client_actions_updated_at BEFORE UPDATE ON client_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_project_templates_updated_at ON project_templates;
CREATE TRIGGER trg_project_templates_updated_at BEFORE UPDATE ON project_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. RLS
ALTER TABLE IF EXISTS calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_template_tasks ENABLE ROW LEVEL SECURITY;

-- Calendar Events policies
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
CREATE POLICY "calendar_events_select" ON calendar_events FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
    OR client_id IS NULL
  )
);
DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
CREATE POLICY "calendar_events_insert" ON calendar_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'member'))
);
DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
CREATE POLICY "calendar_events_update" ON calendar_events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;
CREATE POLICY "calendar_events_delete" ON calendar_events FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Client Notes policies
DROP POLICY IF EXISTS "client_notes_select" ON client_notes;
CREATE POLICY "client_notes_select" ON client_notes FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'member'))
    OR client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "client_notes_insert" ON client_notes;
CREATE POLICY "client_notes_insert" ON client_notes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'member'))
);
DROP POLICY IF EXISTS "client_notes_update" ON client_notes;
CREATE POLICY "client_notes_update" ON client_notes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Client Actions policies
DROP POLICY IF EXISTS "client_actions_select" ON client_actions;
CREATE POLICY "client_actions_select" ON client_actions FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'member'))
    OR client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "client_actions_insert" ON client_actions;
CREATE POLICY "client_actions_insert" ON client_actions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'member'))
);

-- Project Templates policies
DROP POLICY IF EXISTS "templates_select" ON project_templates;
CREATE POLICY "templates_select" ON project_templates FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);
DROP POLICY IF EXISTS "templates_insert" ON project_templates;
CREATE POLICY "templates_insert" ON project_templates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
DROP POLICY IF EXISTS "templates_update" ON project_templates;
CREATE POLICY "templates_update" ON project_templates FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
DROP POLICY IF EXISTS "templates_delete" ON project_templates;
CREATE POLICY "templates_delete" ON project_templates FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Template Tasks policies
DROP POLICY IF EXISTS "template_tasks_select" ON project_template_tasks;
CREATE POLICY "template_tasks_select" ON project_template_tasks FOR SELECT USING (
  template_id IN (SELECT id FROM project_templates WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
);
DROP POLICY IF EXISTS "template_tasks_insert" ON project_template_tasks;
CREATE POLICY "template_tasks_insert" ON project_template_tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
DROP POLICY IF EXISTS "template_tasks_delete" ON project_template_tasks;
CREATE POLICY "template_tasks_delete" ON project_template_tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- 11. ACTUALIZAR POLÍTICAS EXISTENTES para tasks con project_id nullable
DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR assigned_to = auth.uid()
    OR (project_id IS NOT NULL AND project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.profile_id = auth.uid()))
    OR (visible_to_client = true AND project_id IS NOT NULL AND project_id IN (
      SELECT p.id FROM projects p JOIN clients c ON c.id = p.client_id WHERE c.profile_id = auth.uid()
    ))
    OR (client_id IS NOT NULL AND client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid()))
  )
);
