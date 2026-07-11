import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const supabase = createAdminSupabase()

    // Verify current user
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    }

    // Get user's projects via project_members
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)

    const projectIds = (memberships || []).map(m => m.project_id)

    // Get all projects in company
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('company_id', profile.company_id)
      .order('name')

    return NextResponse.json({
      permissions: projectIds,
      projects: projects || [],
    })
  } catch (error) {
    console.error('Error fetching project permissions:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, projectIds } = body
    const supabase = createAdminSupabase()

    if (!userId || !Array.isArray(projectIds)) {
      return NextResponse.json({ error: 'userId y projectIds requeridos' }, { status: 400 })
    }

    // Verify current user
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Delete existing memberships for this user in this company's projects
    // First get all project IDs in this company
    const { data: companyProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('company_id', profile.company_id)

    const companyProjectIds = (companyProjects || []).map(p => p.id)

    if (companyProjectIds.length > 0) {
      const { error: delError } = await supabase
        .from('project_members')
        .delete()
        .eq('user_id', userId)
        .in('project_id', companyProjectIds)

      if (delError) throw delError
    }

    // Insert new memberships
    if (projectIds.length > 0) {
      const inserts = projectIds.map((projectId: string) => ({
        user_id: userId,
        project_id: projectId,
        role: 'member' as const,
      }))

      const { error: insError } = await supabase
        .from('project_members')
        .insert(inserts)

      if (insError) throw insError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating project permissions:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
