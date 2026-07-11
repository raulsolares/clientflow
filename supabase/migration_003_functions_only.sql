-- ==============================================================
-- MIGRATION 003: Helper Functions + project_members/invitations RLS
-- ==============================================================
-- Safe to run multiple times (uses OR REPLACE / IF NOT EXISTS)
-- ==============================================================

-- ==============================================================
-- 1. HELPER FUNCTIONS
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


-- ==============================================================
-- 2. SECURITY DEFINER FUNCTIONS
-- ==============================================================

-- Accept an invitation by token
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id    UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invitation FROM invitations
  WHERE token = invitation_token AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE invitations SET status = 'expired', updated_at = now()
    WHERE id = v_invitation.id;
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Update the user's profile
  UPDATE profiles
  SET company_id = v_invitation.company_id,
      role = CASE WHEN v_invitation.role = 'client' THEN 'viewer'::member_role ELSE v_invitation.role::member_role END,
      is_client = (v_invitation.role = 'client'),
      updated_at = now()
  WHERE id = v_user_id;

  -- Mark invitation as accepted
  UPDATE invitations SET status = 'accepted', updated_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'company_id', v_invitation.company_id);
END;
$$;

-- Create an invitation (admin only)
CREATE OR REPLACE FUNCTION public.create_invitation(p_email TEXT, p_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_is_admin   BOOLEAN;
  v_token      TEXT;
  v_invite     RECORD;
BEGIN
  SELECT company_id, role = 'admin'
  INTO v_company_id, v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can create invitations');
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO invitations (company_id, email, role, token, invited_by, status)
  VALUES (v_company_id, p_email, p_role, v_token, auth.uid(), 'pending')
  RETURNING * INTO v_invite;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_invite.id,
    'token', v_token,
    'email', p_email,
    'role', p_role,
    'expires_at', v_invite.expires_at
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

-- Add user to project (admin/manager only)
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
  SELECT pr.company_id, pr.role
  INTO v_company_id, v_caller_role
  FROM profiles pr
  WHERE pr.id = auth.uid();

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

-- Get all members of a project
CREATE OR REPLACE FUNCTION public.get_project_members(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_result     JSONB;
BEGIN
  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();

  -- Check access: must be member, admin, or manager of the project's company
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND company_id = v_company_id
  ) AND NOT EXISTS (
    SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_array();
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', pm.id,
      'project_id', pm.project_id,
      'user_id', pm.user_id,
      'role', pm.role,
      'invited_by', pm.invited_by,
      'created_at', pm.created_at,
      'user_full_name', p.full_name,
      'user_email', p.email,
      'inviter_name', i.full_name
    )
    ORDER BY p.full_name
  )
  INTO v_result
  FROM project_members pm
  JOIN profiles p ON p.id = pm.user_id
  LEFT JOIN profiles i ON i.id = pm.invited_by
  WHERE pm.project_id = p_project_id;

  RETURN COALESCE(v_result, jsonb_build_array());
END;
$$;


-- ==============================================================
-- 3. RLS POLICIES — project_members
-- ==============================================================

DROP POLICY IF EXISTS "project_members_select" ON project_members;
CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid()
      AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
      AND pr.role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "project_members_insert" ON project_members;
CREATE POLICY "project_members_insert" ON project_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid()
      AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
      AND pr.role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "project_members_update" ON project_members;
CREATE POLICY "project_members_update" ON project_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid()
      AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
      AND pr.role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "project_members_delete" ON project_members;
CREATE POLICY "project_members_delete" ON project_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid()
      AND pr.company_id = (SELECT p.company_id FROM projects p WHERE p.id = project_id)
      AND pr.role = 'admin'
  )
);


-- ==============================================================
-- 4. RLS POLICIES — invitations
-- ==============================================================

DROP POLICY IF EXISTS "invitations_select" ON invitations;
CREATE POLICY "invitations_select" ON invitations FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "invitations_insert" ON invitations;
CREATE POLICY "invitations_insert" ON invitations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = invitations.company_id
      AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "invitations_update" ON invitations;
CREATE POLICY "invitations_update" ON invitations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = invitations.company_id
      AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "invitations_delete" ON invitations;
CREATE POLICY "invitations_delete" ON invitations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = invitations.company_id
      AND role = 'admin'
  )
);
