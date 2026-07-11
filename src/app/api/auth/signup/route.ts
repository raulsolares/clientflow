import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password, name } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  // Only admins can create accounts
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado. Debes iniciar sesión como administrador.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Solo los administradores pueden crear cuentas.' }, { status: 403 })
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name || email.split('@')[0],
        role: 'member',
        is_client: false,
      },
    },
  })

  if (error) {
    const message = error.message === 'User already registered'
      ? 'Este email ya está registrado'
      : 'Error al crear la cuenta'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
