-- Arreglo completo: company_id correcto
BEGIN;

-- 1. Policy para UPDATE en projects (admin/manager)
DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  company_id = get_user_company_id()
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  )
);

-- 2. Policy para DELETE en projects (admin only)
DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  company_id = get_user_company_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Agregar columnas de tiempo a tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_estimated NUMERIC(8,1) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_spent NUMERIC(8,1) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_unit TEXT DEFAULT 'hours' CHECK (time_unit IN ('hours', 'minutes', 'days'));

-- 4. Agregar project_id a files (opcional)
ALTER TABLE files ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE files ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- 5. Actualizar created_by de proyectos existentes
UPDATE projects
SET created_by = '79592430-0c7a-4127-883d-2b9f6ab53a8d'
WHERE created_by IS NULL
  AND company_id = 'fb30ae71-15cd-4e60-bc91-b8989fa39493';

-- 6. Políticas de Storage para bucket project-files
DROP POLICY IF EXISTS "authenticated_select_project_files" ON storage.objects;
CREATE POLICY "authenticated_select_project_files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-files');

DROP POLICY IF EXISTS "authenticated_insert_project_files" ON storage.objects;
CREATE POLICY "authenticated_insert_project_files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files');

DROP POLICY IF EXISTS "authenticated_update_own_files" ON storage.objects;
CREATE POLICY "authenticated_update_own_files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-files' AND owner = auth.uid());

DROP POLICY IF EXISTS "authenticated_delete_files" ON storage.objects;
CREATE POLICY "authenticated_delete_files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-files' AND (
  owner = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
));

COMMIT;
