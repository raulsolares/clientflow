-- Crear tabla time_logs para seguimiento de tiempo
BEGIN;

CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_logs_task ON time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user ON time_logs(user_id);

ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Policies: users can see logs for tasks they can access
CREATE POLICY "time_logs_select" ON time_logs FOR SELECT USING (
  task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
);

CREATE POLICY "time_logs_insert" ON time_logs FOR INSERT WITH CHECK (
  task_id IN (SELECT id FROM tasks WHERE company_id = get_user_company_id())
);

COMMIT;
