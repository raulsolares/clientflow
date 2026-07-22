#!/usr/bin/env python3
"""Apply CRM migration: client_notes table + client_id on tasks"""
import os, requests, json

PAT = os.environ.get("SUPABASE_PAT", "your-pat-here")
REF = os.environ.get("SUPABASE_REF", "your-ref-here")
BASE = f"https://api.supabase.com/v1/projects/{REF}/database/query"
HEADERS = {"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"}

def run(sql, desc):
    r = requests.post(BASE, headers=HEADERS, json={"query": sql}, timeout=30)
    if r.status_code == 201:
        print(f"✅ {desc}")
        return True
    else:
        print(f"❌ {desc}: {r.status_code} {r.text[:300]}")
        return False

# 1. Add client_id to tasks
run("""
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
NOTIFY pgrst, 'reload schema';
""", "Add client_id to tasks")

# 2. Create client_notes table
run("""
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_company ON client_notes(company_id);
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';
""", "Create client_notes table")

# 3. RLS policies
run("""
DROP POLICY IF EXISTS "client_notes_select" ON client_notes;
CREATE POLICY "client_notes_select" ON client_notes FOR SELECT USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    OR client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "client_notes_insert" ON client_notes;
CREATE POLICY "client_notes_insert" ON client_notes FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

DROP POLICY IF EXISTS "client_notes_delete" ON client_notes;
CREATE POLICY "client_notes_delete" ON client_notes FOR DELETE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

DROP POLICY IF EXISTS "client_notes_update" ON client_notes;
CREATE POLICY "client_notes_update" ON client_notes FOR UPDATE USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

NOTIFY pgrst, 'reload schema';
""", "RLS policies for client_notes")

print("\n✅ Migration complete!")
