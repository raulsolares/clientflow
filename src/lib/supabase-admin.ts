import { createClient } from '@supabase/supabase-js'

// Admin client with service_role key - for admin-only API operations
// NEVER use this client on the client side or expose the key

let hasServiceKey = true

export function createAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    hasServiceKey = false
    // Return a dummy client that will fail gracefully when used
    return createClient(supabaseUrl, 'missing-service-role-key-for-clientflow', {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function isAdminClientAvailable() {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY
}
