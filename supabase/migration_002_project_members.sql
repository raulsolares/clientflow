-- ==============================================================
-- MIGRATION 002: Project Members, Invitations & Enhanced RLS
-- ==============================================================
-- Creates the project_members (v2), invitations tables,
-- adds created_by to projects, helper functions, and
-- comprehensive RLS policies for the permissions model.
-- ==============================================================

BEGIN;

-- ==============================================================
-- 1. ADD created_by COLUMN TO PROJECTS
-- ==============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);


-- ==============================================================
-- 2. DROP OLD POLICIES THAT REFERENCE OLD project_members SCHEMA
-- ==============================================================
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "task_attachments_select" ON task_attachments;


-- ==============================================================
-- 3. DROP & RECREATE project_members (schema changed: v2)
-- ==============================================================
-- Old table used (project_id, profile_id) as PK with role_in_project.
-- New table has UUID PK, user_id, role as (viewer|editor|manager),
-- invited_by, created_at, and UNIQUE(project_id, user_id).
-- ==============================================================
DROP TABLE IF EXISTS project_members CASCADE;

CREATE TABLE project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'viewer'
              CHECK (role IN ('viewer', 'editor', 'manager')),
  invited_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);


-- ==============================================================
-- 4. CREATE invitations TABLE
-- ==============================================================
CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('admin', 'manager', 'member', 'viewer', 'client')),
  token       TEXT NOT NULL UNIQUE,
  invited_by  UUID REFERENCES profiles(id),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);


-- ==============================================================
-- 5. INDEXES
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user    ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role    ON project_members(role);
CREATE INDEX IF NOT EXISTS idx_project_members_lookup  ON project_members(project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_invitations_company     ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token       ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email       ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status      ON invitations(status);


-- ==============================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ==============================================================
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
-- project_members already had RLS enabled from schema.sql, but
-- re-enforcing for safety:
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;


-- ==============================================================
-- 7. HELPER FUNCTIONS
-- ==============================================================

-- Returns the company_id of the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;

-- Returns true if current user is an admin in their company
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Returns true if current user is admin or manager
CREATE OR REPLACE FUNCTION public.is_company_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
$$;

-- Returns the project_members role for the current user on a given project,
-- or NULL if they are not a member
CREATE OR REPLACE FUNCTION public.get_project_member_role(p_project_id UUID)
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT role FROM project_members
  WHERE project_id = p_project_id AND user_id = auth.uid()
$$;

-- Trigger: auto-update updated_at on invitations
CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ==============================================================
-- 8. RLS POLICIES — project_members
-- ==============================================================

CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (
  -- Can see your own memberships
  user_id = auth.uid()
  -- Admin/manager can see all members in their company's projects
  OR EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid()
      AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
      AND pr.role IN ('admin', 'manager')
  )
);

CREATE POLICY "project_members_insert" ON project_members FOR INSERT WITH CHECK (
  -- Admin/manager can add members to projects in their company
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid()
      AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
      AND pr.role IN ('admin', 'manager')
  )
);

CREATE POLICY "project_members_update" ON project_members FOR UPDATE USING (
  -- Admin/manager can update memberships
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid()
      AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
      AND pr.role IN ('admin', 'manager')
  )
);

CREATE POLICY "project_members_delete" ON project_members FOR DELETE USING (
  -- Only admin can remove members
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid()
      AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
      AND pr.role = 'admin'
  )
);


-- ==============================================================
-- 9. RLS POLICIES — invitations
-- ==============================================================

CREATE POLICY "invitations_select" ON invitations FOR SELECT USING (
  -- Members of the same company can see invitations
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "invitations_insert" ON invitations FOR INSERT WITH CHECK (
  -- Only admin can create invitations
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = invitations.company_id
      AND role = 'admin'
  )
);

CREATE POLICY "invitations_update" ON invitations FOR UPDATE USING (
  -- Only admin can update invitations
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = invitations.company_id
      AND role = 'admin'
  )
);

CREATE POLICY "invitations_delete" ON invitations FOR DELETE USING (
  -- Only admin can delete invitations
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = invitations.company_id
      AND role = 'admin'
  )
);


-- ==============================================================
-- 10. RLS POLICIES — projects (enhanced)
-- ==============================================================

CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    -- Owner / creator
    created_by = auth.uid()
    -- Member of the project
    OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    -- Admin or manager can see all projects in their company
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    -- Client assigned to this project
    OR client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
  )
);

CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  -- Only admin or manager can create projects
  company_id = get_user_company_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  company_id = get_user_company_id()
  AND (
    -- Owner can edit
    created_by = auth.uid()
    -- Member with editor or manager role on the project
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = auth.uid() AND role IN ('editor', 'manager')
    )
    -- Admin or manager can edit any project
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  )
);

CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  company_id = get_user_company_id()
  AND (
    -- Owner can delete
    created_by = auth.uid()
    -- Admin can delete any project
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
);


-- ==============================================================
-- 11. RLS POLICIES — tasks (enhanced)
-- ==============================================================

CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    -- Admin/manager can see all tasks
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    -- Assigned to the user
    OR assigned_to = auth.uid()
    -- Member of the project (via new project_members.user_id)
    OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    -- Client: only tasks marked visible_to_client
    OR (visible_to_client = true AND project_id IN (
      SELECT p.id FROM projects p JOIN clients c ON c.id = p.client_id WHERE c.profile_id = auth.uid()
    ))
  )
);

CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  company_id = get_user_company_id()
  AND (
    -- Admin/manager can add tasks anywhere
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    -- Member with editor/manager role on the project can add tasks
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role IN ('editor', 'manager')
    )
  )
);

CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  company_id = get_user_company_id()
  AND (
    -- Admin/manager can update any task
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    -- User assigned to the task can update it
    OR assigned_to = auth.uid()
    -- Member with editor/manager role on the project can update tasks
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role IN ('editor', 'manager')
    )
  )
);

CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  company_id = get_user_company_id()
  AND (
    -- Admin can delete any task
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    -- Manager can delete tasks in their company
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  )
);


-- ==============================================================
-- 12. RLS POLICIES — task_comments
-- ==============================================================

CREATE POLICY "task_comments_select" ON task_comments FOR SELECT USING (
  task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
);

CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT WITH CHECK (
  -- Only the comment author can insert (self)
  author_id = auth.uid()
  -- And must be in the same company
  AND task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
);

CREATE POLICY "task_comments_update" ON task_comments FOR UPDATE USING (
  -- Author can edit their own comments
  author_id = auth.uid()
  -- Admin/manager can edit any comment
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE USING (
  -- Admin/manager can delete any comment
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  -- Author can delete their own comment
  OR author_id = auth.uid()
);


-- ==============================================================
-- 13. RLS POLICIES — task_attachments (updated for new schema)
-- ==============================================================

CREATE POLICY "task_attachments_select" ON task_attachments FOR SELECT USING (
  task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
  AND (
    -- Admin/manager can see all
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    -- Project member can see attachments
    OR task_id IN (
      SELECT t.id FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
    -- Client: only visible_to_client tasks
    OR task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.visible_to_client = true
        AND t.project_id IN (
          SELECT p.id FROM projects p
          JOIN clients c ON c.id = p.client_id
          WHERE c.profile_id = auth.uid()
        )
    )
  )
);

CREATE POLICY "task_attachments_insert" ON task_attachments FOR INSERT WITH CHECK (
  uploaded_by = auth.uid()
  AND task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR task_id IN (
      SELECT t.id FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid() AND pm.role IN ('editor', 'manager')
    )
  )
);

CREATE POLICY "task_attachments_delete" ON task_attachments FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  OR uploaded_by = auth.uid()
);


-- ==============================================================
-- 14. RLS POLICIES — project_files
-- ==============================================================

CREATE POLICY "project_files_select" ON project_files FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    OR (visible_to_client = true AND project_id IN (
      SELECT p.id FROM projects p
      JOIN clients c ON c.id = p.client_id
      WHERE c.profile_id = auth.uid()
    ))
  )
);

CREATE POLICY "project_files_insert" ON project_files FOR INSERT WITH CHECK (
  company_id = get_user_company_id()
  AND uploaded_by = auth.uid()
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('editor', 'manager')
    )
  )
);

CREATE POLICY "project_files_delete" ON project_files FOR DELETE USING (
  company_id = get_user_company_id()
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR uploaded_by = auth.uid()
  )
);


-- ==============================================================
-- 15. RLS POLICIES — clients
-- ==============================================================

-- Existing clients policies use company_id scoping.
-- Adding explicit policies for INSERT/UPDATE/DELETE:

CREATE POLICY "clients_select" ON clients FOR SELECT USING (
  company_id = get_user_company_id()
  OR profile_id = auth.uid()
);

CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (
  company_id = get_user_company_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "clients_update" ON clients FOR UPDATE USING (
  company_id = get_user_company_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "clients_delete" ON clients FOR DELETE USING (
  company_id = get_user_company_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ==============================================================
-- 16. SECURITY DEFINER FUNCTIONS
-- ==============================================================

-- Accept an invitation by token
-- Updates the current user's profile with the company and role from the invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation invitations%ROWTYPE;
  v_profile_id UUID;
BEGIN
  -- Look up valid invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation token');
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be logged in to accept an invitation');
  END IF;

  -- Update profile: map 'client' role to is_client=true + viewer role
  IF v_invitation.role = 'client' THEN
    UPDATE profiles
    SET
      company_id = v_invitation.company_id,
      is_client  = true,
      role       = 'viewer'::member_role,
      updated_at = now()
    WHERE id = auth.uid()
    RETURNING id INTO v_profile_id;
  ELSE
    UPDATE profiles
    SET
      company_id = v_invitation.company_id,
      role       = v_invitation.role::member_role,
      updated_at = now()
    WHERE id = auth.uid()
    RETURNING id INTO v_profile_id;
  END IF;

  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success',    true,
    'company_id', v_invitation.company_id,
    'role',       v_invitation.role
  );
END;
$$;


-- Create an invitation (admin only — also enforced by RLS)
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_email TEXT,
  p_role  TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_is_admin   BOOLEAN;
  v_token      TEXT;
BEGIN
  -- Get caller's company and check admin role
  SELECT company_id, role = 'admin'
  INTO v_company_id, v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can create invitations');
  END IF;

  -- Check if user already belongs to this company
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email AND company_id = v_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already belongs to this company');
  END IF;

  -- Generate unique token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Insert invitation
  INSERT INTO invitations (company_id, email, role, token, invited_by)
  VALUES (v_company_id, p_email, p_role, v_token, auth.uid());

  RETURN jsonb_build_object(
    'success', true,
    'token',   v_token,
    'email',   p_email
  );
END;
$$;


-- Revoke (cancel) an invitation
CREATE OR REPLACE FUNCTION public.revoke_invitation(invitation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_is_admin   BOOLEAN;
BEGIN
  SELECT company_id, role = 'admin'
  INTO v_company_id, v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can revoke invitations');
  END IF;

  UPDATE invitations
  SET status = 'expired', updated_at = now()
  WHERE id = invitation_id
    AND company_id = v_company_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already processed');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- Add user to project (admin/manager only — also enforced by RLS)
CREATE OR REPLACE FUNCTION public.add_project_member(
  p_project_id UUID,
  p_user_id    UUID,
  p_role       TEXT DEFAULT 'viewer'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Verify caller is admin/manager in the same company as the project
  SELECT pr.company_id, pr.role
  INTO v_company_id, v_caller_role
  FROM profiles pr
  WHERE pr.id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'manager') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins and managers can add project members');
  END IF;

  -- Verify project belongs to the same company
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND company_id = v_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found in your company');
  END IF;

  -- Verify user belongs to the same company
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND company_id = v_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in your company');
  END IF;

  -- Insert or update membership
  INSERT INTO project_members (project_id, user_id, role, invited_by)
  VALUES (p_project_id, p_user_id, p_role, auth.uid())
  ON CONFLICT (project_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, invited_by = EXCLUDED.invited_by;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- Remove user from project (admin only)
CREATE OR REPLACE FUNCTION public.remove_project_member(
  p_project_id UUID,
  p_user_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_caller_role TEXT;
BEGIN
  SELECT pr.company_id, pr.role
  INTO v_company_id, v_caller_role
  FROM profiles pr
  WHERE pr.id = auth.uid();

  IF v_caller_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can remove project members');
  END IF;

  DELETE FROM project_members
  WHERE project_id = p_project_id AND user_id = p_user_id
    AND EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND company_id = v_company_id);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Membership not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- Get all members of a project (admin/manager and members of the project)
CREATE OR REPLACE FUNCTION public.get_project_members(p_project_id UUID)
RETURNS TABLE (
  user_id    UUID,
  email      VARCHAR(255),
  full_name  VARCHAR(200),
  role       TEXT,
  avatar_url VARCHAR(500)
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Must be admin/manager OR a member of the project
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ) AND NOT EXISTS (
    SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    pm.user_id,
    pr.email,
    pr.full_name,
    pm.role,
    pr.avatar_url
  FROM project_members pm
  JOIN profiles pr ON pr.id = pm.user_id
  WHERE pm.project_id = p_project_id
  ORDER BY pr.full_name;
END;
$$;


-- ==============================================================
-- 17. SET DEFAULT created_by FOR EXISTING PROJECTS (if any)
-- ==============================================================
-- If there are existing projects with NULL created_by, we try to
-- infer the creator from activity_log or leave NULL.
-- This is a no-op on a fresh database.
-- Uncomment the following if you want to set a fallback:
-- UPDATE projects SET created_by = (SELECT id FROM profiles LIMIT 1) WHERE created_by IS NULL;


COMMIT;

-- ==============================================================
-- VERIFICATION QUERIES (run these in Supabase SQL Editor)
-- ==============================================================
/*
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('project_members', 'invitations');

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'accept_invitation', 'create_invitation', 'revoke_invitation',
    'add_project_member', 'remove_project_member', 'get_project_members',
    'get_user_company_id', 'is_company_admin', 'is_company_admin_or_manager',
    'get_project_member_role'
  )
ORDER BY routine_name;
*/
