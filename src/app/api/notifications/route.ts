import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabase()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user's profile to find company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // If user has a company, also filter by it
    if (profile?.company_id) {
      query = query.eq('company_id', profile.company_id)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
    }

    return NextResponse.json({ notifications })
  } catch (err) {
    console.error('Unexpected error in GET /api/notifications:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId es requerido' }, { status: 400 })
    }

    // Verify the notification belongs to the current user before marking as read
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', notificationId)
      .single()

    if (fetchError || !notification) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 })
    }

    if (notification.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para modificar esta notificación' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (updateError) {
      console.error('Error marking notification as read:', updateError)
      return NextResponse.json({ error: 'Error al marcar como leída' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error in PATCH /api/notifications:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
