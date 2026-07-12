import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// Plan limits: max users per plan
const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  basic: 5,
  pro: 15,
  enterprise: Infinity,
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { email, role } = await request.json()
    if (!email || !role) {
      return NextResponse.json({ error: 'Email y rol son requeridos' }, { status: 400 })
    }

    // Check plan limits before creating invitation
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Perfil o empresa no encontrada' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo admins pueden invitar' }, { status: 403 })
    }

    // Get company plan
    const { data: company } = await supabase
      .from('companies')
      .select('plan')
      .eq('id', profile.company_id)
      .single()

    const currentPlan = company?.plan || 'free'
    const maxUsers = PLAN_LIMITS[currentPlan] ?? PLAN_LIMITS.free

    // Count current team members (non-client profiles in the company)
    const { count: currentMembers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('is_client', false)
      .is('deleted_at', null)

    // Also count pending invitations
    const { count: pendingInvites } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'pending')

    const totalUsed = (currentMembers || 0) + (pendingInvites || 0)

    if (maxUsers !== Infinity && totalUsed >= maxUsers) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de miembros de tu plan. Actualiza para agregar más.' },
        { status: 403 }
      )
    }

    // Try using the SECURITY DEFINER function first
    const { data, error } = await supabase.rpc('create_invitation', {
      p_email: email,
      p_role: role,
    })

    if (error) {
      // Fallback: direct insert if function doesn't exist
      if (error.message?.includes('function') || error.code === '42883') {
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

        // Also send email via Supabase Auth invite (uses service_role key)
        const adminSupabase = createAdminSupabase()
        const { error: authInviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: inviteLink,
          data: { invited_by: user.id, company_id: profile.company_id, role },
        })

        return NextResponse.json({
          success: true,
          token: invite.token,
          email: invite.email,
          link: inviteLink,
          emailSent: !authInviteError,
          emailError: authInviteError?.message || null,
        })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin')}/invite?token=${data.token}`

    // Also send email via Supabase Auth invite (uses service_role key)
    const adminSupabase = createAdminSupabase()
    const { error: authInviteError } = await adminSupabase.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: inviteLink,
    })

    return NextResponse.json({
      success: true,
      token: data.token,
      email: data.email,
      link: inviteLink,
      emailSent: !authInviteError,
      emailError: authInviteError?.message || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
