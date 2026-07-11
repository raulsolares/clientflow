import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const { clientId, userId } = await request.json()

  if (!clientId) {
    return NextResponse.json({ error: 'clientId es requerido' }, { status: 400 })
  }

  const supabase = await createServerSupabase()

  // Verify authenticated user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado. Debes iniciar sesión.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Solo los administradores pueden eliminar clientes.' }, { status: 403 })
  }

  // If userId provided, delete the auth user using admin client
  if (userId) {
    const adminSupabase = createAdminSupabase()
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId)
    if (authError) {
      return NextResponse.json({ error: 'Error al eliminar usuario de autenticación: ' + authError.message }, { status: 500 })
    }
  }

  // Delete the client record from the clients table
  const { error: deleteError } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)

  if (deleteError) {
    return NextResponse.json({ error: 'Error al eliminar cliente: ' + deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
