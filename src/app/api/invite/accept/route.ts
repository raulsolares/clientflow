import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 })

    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

    // Try using SECURITY DEFINER function
    const { data, error } = await supabase.rpc('accept_invitation', {
      invitation_token: token,
    })

    if (error) {
      // Fallback if function doesn't exist
      if (error.message?.includes('function') || error.code === '42883') {
        // Get invitation
        const { data: invitation, error: invError } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', token)
          .single()

        if (invError || !invitation) {
          return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
        }
        if (invitation.status !== 'pending') {
          return NextResponse.json({ error: 'Invitación ya procesada' }, { status: 400 })
        }
        if (new Date(invitation.expires_at) < new Date()) {
          return NextResponse.json({ error: 'Invitación expirada' }, { status: 400 })
        }

        // Update profile
        const role = invitation.role === 'client' ? 'viewer' : invitation.role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            company_id: invitation.company_id,
            role,
            is_client: invitation.role === 'client',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

        // Mark invitation as accepted
        await supabase
          .from('invitations')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', invitation.id)

        return NextResponse.json({
          success: true,
          company_id: invitation.company_id,
          role: invitation.role,
        })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
