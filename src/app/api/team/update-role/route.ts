import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { memberId, newRole } = await request.json()
    if (!memberId || !newRole) {
      return NextResponse.json({ error: 'Miembro y rol requeridos' }, { status: 400 })
    }

    const validRoles = ['admin', 'manager', 'member', 'viewer', 'client']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden cambiar roles' }, { status: 403 })
    }

    // Get target member to verify same company
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', memberId)
      .single()

    if (!targetProfile || targetProfile.company_id !== callerProfile.company_id) {
      return NextResponse.json({ error: 'Miembro no encontrado en tu empresa' }, { status: 404 })
    }

    // Cannot demote yourself from admin
    if (memberId === user.id && newRole !== 'admin') {
      return NextResponse.json({ error: 'No puedes cambiarte tu propio rol de administrador' }, { status: 400 })
    }

    const roleToSet = newRole === 'client' ? 'viewer' : newRole

    const { error } = await supabase
      .from('profiles')
      .update({
        role: roleToSet,
        is_client: newRole === 'client',
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
