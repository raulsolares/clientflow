import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { fileId, fileUrl } = await request.json()
    if (!fileId) return NextResponse.json({ error: 'ID de archivo requerido' }, { status: 400 })

    // Get the file record
    const { data: fileRecord, error: fetchError } = await supabase
      .from('project_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fetchError) {
      if (fetchError.message?.includes('relation')) {
        return NextResponse.json({ error: 'Migración pendiente' }, { status: 500 })
      }
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    // Check permissions (admin/manager/uploader)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const canDelete = profile &&
      (profile.role === 'admin' || profile.role === 'manager' || fileRecord.uploaded_by === user.id)

    if (!canDelete) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar este archivo' }, { status: 403 })
    }

    // Delete from storage
    if (fileRecord.file_url) {
      const storagePath = fileRecord.file_url.split('/').slice(-2).join('/')
      if (storagePath) {
        await supabase.storage.from('project-files').remove([storagePath])
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
