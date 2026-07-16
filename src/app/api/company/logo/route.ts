import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Perfil sin empresa' }, { status: 400 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden cambiar el logo' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    // Validate type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no permitido. Usa PNG, JPG, WebP o SVG' }, { status: 400 })
    }

    // Validate size (5MB max for logos)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El logo excede 5MB' }, { status: 400 })
    }

    // Upload to Supabase Storage under company-logos bucket
    const ext = file.name.split('.').pop() || 'png'
    const fileName = `logo-${profile.company_id}.${ext}`
    const filePath = `${profile.company_id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(filePath, file, {
        cacheControl: '31536000',
        upsert: true, // Replace existing logo
      })

    if (uploadError) {
      if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
        return NextResponse.json({
          error: 'Bucket "company-logos" no encontrado. Créalo en Supabase Storage.',
        }, { status: 500 })
      }
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('company-logos')
      .getPublicUrl(filePath)

    // Update company record with new logo_url
    const { error: updateError } = await supabase
      .from('companies')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', profile.company_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      logo_url: publicUrl,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Perfil sin empresa' }, { status: 400 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    // Get current logo_url
    const { data: company } = await supabase
      .from('companies')
      .select('logo_url')
      .eq('id', profile.company_id)
      .single()

    // Remove from storage if exists
    if (company?.logo_url) {
      const pathMatch = company.logo_url.match(/company-logos\/(.+)$/)
      if (pathMatch) {
        await supabase.storage.from('company-logos').remove([pathMatch[1]])
      }
    }

    // Clear logo_url in DB
    await supabase
      .from('companies')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', profile.company_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
