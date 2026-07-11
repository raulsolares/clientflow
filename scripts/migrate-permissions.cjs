const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rslhtuhagrsgcmykagcp.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbGh0dWhhZ3JzZ2NteWthZ2NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY0MjUyMCwiZXhwIjoyMDk5MjE4NTIwfQ.p4hJG0zMEQFPM1Cf6fCdb-SGamQCAsMCF84M-lFk8CA'
const supabase = createClient(supabaseUrl, serviceRoleKey)

const run = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS client_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('manager', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id, user_id)
);`,
    `ALTER TABLE client_members ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "client_members_select" ON client_members;`,
    `CREATE POLICY "client_members_select" ON client_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR user_id = auth.uid()
  );`,
    `DROP POLICY IF EXISTS "client_members_insert" ON client_members;`,
    `CREATE POLICY "client_members_insert" ON client_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );`,
    `DROP POLICY IF EXISTS "client_members_delete" ON client_members;`,
    `CREATE POLICY "client_members_delete" ON client_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );`
  ]

  for (const sql of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql_text: sql })
    if (error) {
      console.log('ERR:', error.message)
    } else {
      console.log('OK:', sql.substring(0, 50))
    }
  }
}
run().catch(console.error)
