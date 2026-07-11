-- ==============================================================
-- CLIENTFLOW - FIX RLS + STORAGE
-- ==============================================================

BEGIN;

-- ==============================================================
-- 1. FIX: project_members RLS (remove circular reference to projects)
-- ==============================================================
DROP POLICY IF EXISTS "project_members_select" ON project_members;
DROP POLICY IF EXISTS "project_members_insert" ON project_members;
DROP POLICY IF EXISTS "project_members_update" ON project_members;
DROP POLICY IF EXISTS "project_members_delete" ON project_members;

-- SELECT: avoid circular reference by using get_user_company_id() on profiles only
CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = get_user_company_id()
      AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "project_members_insert" ON project_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = get_user_company_id()
      AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "project_members_update" ON project_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = get_user_company_id()
      AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "project_members_delete" ON project_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = get_user_company_id()
      AND role = 'admin'
  )
);

-- ==============================================================
-- 2. FIX: projects RLS (use subquery on project_members without recursion)
-- ==============================================================
DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR created_by = auth.uid()
    OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  )
);

-- ==============================================================
-- 3. FIX: tasks RLS (same pattern)
-- ==============================================================
DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR assigned_to = auth.uid()
    OR project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
  )
);

COMMIT;
