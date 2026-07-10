import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { memberId } = await request.json()
    if (!memberId) return NextResponse.json({ error: 'ID de miembro requerido' }, { status: 400 })

    if (memberId === user.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    // Verify caller is admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden eliminar miembros' }, { status: 403 })
    }

    // Get target member
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', memberId)
      .single()

    if (!targetProfile || targetProfile.company_id !== callerProfile.company_id) {
      return NextResponse.json({ error: 'Miembro no encontrado en tu empresa' }, { status: 404 })
    }

    // Remove company association
    const { error } = await supabase
      .from('profiles')
      .update({
        company_id: null,
        role: 'member',
        is_client: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
