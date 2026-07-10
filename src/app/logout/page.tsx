import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'

export default async function LogoutPage() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
