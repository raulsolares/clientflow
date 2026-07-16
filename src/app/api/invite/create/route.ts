import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { email, role } = await request.json()
    if (!email || !role) {
      return NextResponse.json({ error: 'Email y rol son requeridos' }, { status: 400 })
    }

    // Try using the SECURITY DEFINER function first
    const { data, error } = await supabase.rpc('create_invitation', {
      p_email: email,
      p_role: role,
    })

    if (error) {
      // Fallback: direct insert if function doesn't exist
      if (error.message?.includes('function') || error.code === '42883') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id, role')
          .eq('id', user.id)
          .single()

        if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
        if (profile.role !== 'admin') return NextResponse.json({ error: 'Solo admins pueden invitar' }, { status: 403 })

        const token = Array.from({ length: 48 }, () =>
          'abcdef0123456789'.charAt(Math.floor(Math.random() * 16))
        ).join('')

        const { data: invite, error: insertError } = await supabase
          .from('invitations')
          .insert({
            company_id: profile.company_id,
            email,
            role,
            token,
            invited_by: user.id,
          })
          .select()
          .single()

        if (insertError) {
          if (insertError.message?.includes('relation') || insertError.code === '42P01') {
            return NextResponse.json({
              error: 'Base de datos no migrada',
              detail: 'Ejecuta la migración SQL primero (supabase/migration_002_project_members.sql)',
            }, { status: 500 })
          }
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin')}/invite?token=${invite.token}`

        // Try sending email via Supabase Auth invite (uses service_role key)
        let emailSent = false
        let emailError: string | null = null
        try {
          const adminSupabase = createAdminSupabase()
          const { error: authInviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
            redirectTo: inviteLink,
            data: { invited_by: user.id, company_id: profile.company_id, role },
          })
          emailSent = !authInviteError
          emailError = authInviteError?.message || null
        } catch (e: any) {
          emailError = e.message || 'Error al enviar email'
        }

        return NextResponse.json({
          success: true,
          token: invite.token,
          email: invite.email,
          link: inviteLink,
          emailSent,
          emailError,
        })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin')}/invite?token=${data.token}`

    // Try sending email (gracefully handle missing service key)
    let emailSent = false
    let emailError: string | null = null
    try {
      const adminSupabase = createAdminSupabase()
      const { error: authInviteError } = await adminSupabase.auth.admin.inviteUserByEmail(data.email, {
        redirectTo: inviteLink,
      })
      emailSent = !authInviteError
      emailError = authInviteError?.message || null
    } catch (e: any) {
      emailError = e.message || 'Error al enviar email'
    }

    return NextResponse.json({
      success: true,
      token: data.token,
      email: data.email,
      link: inviteLink,
      emailSent,
      emailError,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
