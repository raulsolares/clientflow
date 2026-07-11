import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('project_id') as string | null
    const clientId = formData.get('client_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    // Validate size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El archivo excede el límite de 50MB' }, { status: 400 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Perfil sin empresa' }, { status: 400 })
    }

    // Generate unique path
    const ext = file.name.split('.').pop() || 'bin'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = `${profile.company_id}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
        return NextResponse.json({
          error: 'Bucket de almacenamiento no encontrado',
          detail: 'Crea el bucket "project-files" en Supabase Storage',
        }, { status: 500 })
      }
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath)

    // Save record to project_files table
    const insertData: Record<string, any> = {
      company_id: profile.company_id,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      category: 'other',
      uploaded_by: user.id,
    }

    // Link to project or client if provided
    if (projectId) insertData.project_id = projectId
    if (clientId) insertData.client_id = clientId

    const { data: fileRecord, error: dbError } = await supabase
      .from('project_files')
      .insert(insertData)
      .select()
      .single()

    if (dbError) {
      // Table might not exist
      if (dbError.message?.includes('relation') || dbError.code === '42P01') {
        await supabase.storage.from('project-files').remove([filePath])
        return NextResponse.json({
          error: 'Base de datos no migrada',
          detail: 'Ejecuta la migración SQL primero',
        }, { status: 500 })
      }
      // Still return the storage URL even if DB insert fails
      return NextResponse.json({
        warning: 'Archivo subido pero no registrado en BD',
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
      })
    }

    return NextResponse.json({
      success: true,
      file: fileRecord,
      url: publicUrl,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
