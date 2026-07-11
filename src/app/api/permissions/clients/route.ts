import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const supabase = createAdminSupabase()

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
      return NextResponse.json({ error: 'Solo admins y managers pueden gestionar permisos' }, { status: 403 })
    }

    // Get user's company
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!myProfile?.company_id) {
      return NextResponse.json({ error: 'Sin empresa' }, { status: 400 })
    }

    if (userId) {
      // Get permissions for a specific user
      const { data: permissions } = await supabase
        .from('client_permissions')
        .select('client_id')
        .eq('user_id', userId)
        .eq('company_id', myProfile.company_id)

      const clientIds = (permissions || []).map(p => p.client_id)

      // Get all clients in company
      const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, status')
        .order('company_name')

      return NextResponse.json({
        permissions: clientIds,
        clients: clients || [],
      })
    }

    // Get all permissions
    const { data: permissions } = await supabase
      .from('client_permissions')
      .select('user_id, client_id')
      .eq('company_id', myProfile.company_id)

    return NextResponse.json({ permissions: permissions || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, clientIds } = body
    const supabase = createAdminSupabase()

    if (!userId || !Array.isArray(clientIds)) {
      return NextResponse.json({ error: 'userId y clientIds requeridos' }, { status: 400 })
    }

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
      return NextResponse.json({ error: 'Solo admins y managers pueden gestionar permisos' }, { status: 403 })
    }

    const companyId = profile.company_id

    // Delete existing permissions
    const { error: delError } = await supabase
      .from('client_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId)

    if (delError) throw delError

    // Insert new permissions
    if (clientIds.length > 0) {
      const inserts = clientIds.map((clientId: string) => ({
        user_id: userId,
        client_id: clientId,
        company_id: companyId,
        can_view: true,
      }))

      const { error: insError } = await supabase
        .from('client_permissions')
        .insert(inserts)

      if (insError) throw insError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
