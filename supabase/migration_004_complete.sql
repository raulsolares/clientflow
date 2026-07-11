-- ==============================================================
-- CLIENTFLOW - MIGRACIÓN COMPLETA (re-runnable)
-- Migra project_members a v2, crea invitations, funciones RPC
-- ==============================================================

BEGIN;

-- ==============================================================
-- 1. ADD created_by COLUMN TO PROJECTS
-- ==============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- ==============================================================
-- 2. DROP & RECREATE project_members (v2 schema)
-- ==============================================================
-- DROP TABLE CASCADE removes all policies on it automatically
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

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user    ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role    ON project_members(role);
CREATE INDEX IF NOT EXISTS idx_project_members_lookup  ON project_members(project_id, user_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ==============================================================
-- 4. CREATE invitations TABLE (if not exists)
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

CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token   ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email    ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status   ON invitations(status);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ==============================================================
-- 5. HELPER FUNCTIONS
-- ==============================================================
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID LANGUAGE SQL STABLE
AS $$ SELECT company_id FROM profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin_or_manager()
RETURNS BOOLEAN LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
$$;

CREATE OR REPLACE FUNCTION public.get_project_member_role(p_project_id UUID)
RETURNS TEXT LANGUAGE SQL STABLE
AS $$
  SELECT role FROM project_members
  WHERE project_id = p_project_id AND user_id = auth.uid()
$$;

-- ==============================================================
-- 6. SECURITY DEFINER FUNCTIONS
-- ==============================================================

CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_invitation RECORD; v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  SELECT * INTO v_invitation FROM invitations
  WHERE token = invitation_token AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  IF v_invitation.expires_at < now() THEN
    UPDATE invitations SET status = 'expired', updated_at = now() WHERE id = v_invitation.id;
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;
  UPDATE profiles SET company_id = v_invitation.company_id,
    role = CASE WHEN v_invitation.role = 'client' THEN 'viewer'::member_role ELSE v_invitation.role::member_role END,
    is_client = (v_invitation.role = 'client'), updated_at = now()
  WHERE id = v_user_id;
  UPDATE invitations SET status = 'accepted', updated_at = now() WHERE id = v_invitation.id;
  RETURN jsonb_build_object('success', true, 'company_id', v_invitation.company_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invitation(p_email TEXT, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id UUID; v_is_admin BOOLEAN; v_token TEXT; v_invite RECORD;
BEGIN
  SELECT company_id, role = 'admin' INTO v_company_id, v_is_admin FROM profiles WHERE id = auth.uid();
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can create invitations');
  END IF;
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO invitations (company_id, email, role, token, invited_by, status)
  VALUES (v_company_id, p_email, p_role, v_token, auth.uid(), 'pending') RETURNING * INTO v_invite;
  RETURN jsonb_build_object('success', true, 'id', v_invite.id, 'token', v_token,
    'email', p_email, 'role', p_role, 'expires_at', v_invite.expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_invitation(invitation_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id UUID; v_is_admin BOOLEAN;
BEGIN
  SELECT company_id, role = 'admin' INTO v_company_id, v_is_admin FROM profiles WHERE id = auth.uid();
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can revoke invitations');
  END IF;
  UPDATE invitations SET status = 'expired', updated_at = now()
  WHERE id = invitation_id AND company_id = v_company_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already processed');
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_project_member(p_project_id UUID, p_user_id UUID, p_role TEXT DEFAULT 'viewer')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id UUID; v_caller_role TEXT;
BEGIN
  SELECT pr.company_id, pr.role INTO v_company_id, v_caller_role FROM profiles pr WHERE pr.id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'manager') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins and managers can add project members');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND company_id = v_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Project not found in your company');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND company_id = v_company_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in your company');
  END IF;
  INSERT INTO project_members (project_id, user_id, role, invited_by)
  VALUES (p_project_id, p_user_id, p_role, auth.uid())
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role, invited_by = EXCLUDED.invited_by;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_project_member(p_project_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id UUID; v_caller_role TEXT;
BEGIN
  SELECT pr.company_id, pr.role INTO v_company_id, v_caller_role FROM profiles pr WHERE pr.id = auth.uid();
  IF v_caller_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can remove project members');
  END IF;
  DELETE FROM project_members
  WHERE project_id = p_project_id AND user_id = p_user_id
    AND EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND company_id = v_company_id);
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Membership not found'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_project_members(p_project_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company_id UUID; v_result JSONB;
BEGIN
  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND company_id = v_company_id)
     AND NOT EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_array();
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'id', pm.id, 'project_id', pm.project_id, 'user_id', pm.user_id,
    'role', pm.role, 'invited_by', pm.invited_by, 'created_at', pm.created_at,
    'user_full_name', p.full_name, 'user_email', p.email, 'inviter_name', i.full_name
  ) ORDER BY p.full_name) INTO v_result
  FROM project_members pm
  JOIN profiles p ON p.id = pm.user_id
  LEFT JOIN profiles i ON i.id = pm.invited_by
  WHERE pm.project_id = p_project_id;
  RETURN COALESCE(v_result, jsonb_build_array());
END;
$$;

-- ==============================================================
-- 7. RLS POLICIES — project_members
-- ==============================================================
CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid()
    AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
    AND pr.role IN ('admin', 'manager'))
);
CREATE POLICY "project_members_insert" ON project_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid()
    AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
    AND pr.role IN ('admin', 'manager'))
);
CREATE POLICY "project_members_update" ON project_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid()
    AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
    AND pr.role IN ('admin', 'manager'))
);
CREATE POLICY "project_members_delete" ON project_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = auth.uid()
    AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
    AND pr.role = 'admin')
);

-- ==============================================================
-- 8. RLS POLICIES — invitations
-- ==============================================================
CREATE POLICY "invitations_select" ON invitations FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "invitations_insert" ON invitations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
    AND company_id = invitations.company_id AND role = 'admin')
);
CREATE POLICY "invitations_update" ON invitations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
    AND company_id = invitations.company_id AND role = 'admin')
);
CREATE POLICY "invitations_delete" ON invitations FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
    AND company_id = invitations.company_id AND role = 'admin')
);

-- ==============================================================
-- 9. RLS POLICIES — projects (recreated with correct column names)
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
-- 10. RLS POLICIES — tasks (recreated with correct column names)
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
