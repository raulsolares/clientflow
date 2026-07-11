import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createServerSupabase()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Try to get preferences; if none exist, return defaults
    const { data: prefs, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching notification preferences:', error)
      return NextResponse.json({ error: 'Error al obtener preferencias' }, { status: 500 })
    }

    if (!prefs) {
      // Return defaults
      return NextResponse.json({
        preferences: {
          new_task_assigned: true,
          task_completed: true,
          task_due_soon: true,
          project_invite: true,
          comment_added: true,
          weekly_digest: false,
        },
      })
    }

    return NextResponse.json({ preferences: prefs })
  } catch (err) {
    console.error('Unexpected error in GET /api/notification-preferences:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabase()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const allowedKeys = [
      'new_task_assigned',
      'task_completed',
      'task_due_soon',
      'project_invite',
      'comment_added',
      'weekly_digest',
    ]

    // Validate that only allowed keys with boolean values are sent
    const updates: Record<string, boolean> = {}
    for (const key of allowedKeys) {
      if (typeof body[key] === 'boolean') {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay preferencias válidas para actualizar' }, { status: 400 })
    }

    // Upsert: insert if not exists, update if exists
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error upserting notification preferences:', error)
      return NextResponse.json({ error: 'Error al guardar preferencias' }, { status: 500 })
    }

    return NextResponse.json({ preferences: data })
  } catch (err) {
    console.error('Unexpected error in PUT /api/notification-preferences:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
