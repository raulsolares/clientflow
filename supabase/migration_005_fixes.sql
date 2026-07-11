-- ==============================================================
-- Arreglo: projects_update + storage bucket + created_by
-- ==============================================================

-- 1. Permitir que admin/manager actualicen proyectos
DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  company_id = get_user_company_id()
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  )
);

-- 2. Actualizar created_by de proyectos existentes
UPDATE projects
SET created_by = '79592430-0c7a-4127-883d-2b9f6ab53a8d'
WHERE created_by IS NULL
  AND company_id = 'fb30ae71-be70-4c04-a0ea-31951fe7c18a';

-- 3. Políticas de Storage para bucket project-files
-- Permite a usuarios autenticados leer archivos
DROP POLICY IF EXISTS "Give users authenticated access to folder project-files" ON storage.objects;
CREATE POLICY "Give users authenticated access to folder project-files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-files');

-- Permite a usuarios autenticados subir archivos
DROP POLICY IF EXISTS "Give users authenticated upload access to folder project-files" ON storage.objects;
CREATE POLICY "Give users authenticated upload access to folder project-files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- Permite a usuarios actualizar/eliminar sus propios archivos
DROP POLICY IF EXISTS "Give users update access to own files" ON storage.objects;
CREATE POLICY "Give users update access to own files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-files' AND owner = auth.uid());

DROP POLICY IF EXISTS "Give users delete access to own files" ON storage.objects;
CREATE POLICY "Give users delete access to own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-files' AND (owner = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
)));
