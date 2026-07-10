'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'

export async function login(formData: FormData) {
  const supabase = await createServerSupabase()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message === 'Invalid login credentials'
      ? 'Email o contraseña incorrectos'
      : 'Error al iniciar sesión. Intenta de nuevo.'
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createServerSupabase()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' }
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
    return { error: error.message === 'User already registered'
      ? 'Este email ya está registrado'
      : 'Error al crear la cuenta'
    }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
