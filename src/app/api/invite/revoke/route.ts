import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const { data, error } = await supabase.rpc('revoke_invitation', {
      invitation_id: id,
    })

    if (error) {
      if (error.message?.includes('function') || error.code === '42883') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id, role')
          .eq('id', user.id)
          .single()

        if (!profile || profile.role !== 'admin') {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const { error: updateError } = await supabase
          .from('invitations')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('company_id', profile.company_id)
          .eq('status', 'pending')

        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

        return NextResponse.json({ success: true })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
