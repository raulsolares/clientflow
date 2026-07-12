import { createAdminSupabase } from './supabase-admin'
import { PLANS, type PlanKey, type PlanLimits } from './stripe'

/**
 * Obtiene el plan actual de una empresa
 */
export async function getCompanyPlan(companyId: string): Promise<PlanKey> {
  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('companies')
    .select('plan')
    .eq('id', companyId)
    .single()

  if (error || !data) {
    return 'free'
  }

  const plan = data.plan as PlanKey
  if (plan && PLANS[plan]) {
    return plan
  }
  return 'free'
}

/**
 * Obtiene los límites de un plan
 */
export function getPlanLimits(planKey: PlanKey): PlanLimits {
  return PLANS[planKey].limits
}

/**
 * Verifica si un recurso está dentro del límite del plan
 */
export async function checkLimit(
  companyId: string,
  resource: 'users' | 'projects' | 'clients'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const plan = await getCompanyPlan(companyId)
  const limits = getPlanLimits(plan)

  const supabase = createAdminSupabase()

  let current = 0
  let limit = 0

  switch (resource) {
    case 'users': {
      limit = limits.maxUsers
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('is_client', false)
      current = count ?? 0
      break
    }
    case 'projects': {
      limit = limits.maxProjects
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
      current = count ?? 0
      break
    }
    case 'clients': {
      limit = limits.maxClients
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
      current = count ?? 0
      break
    }
  }

  // -1 means unlimited
  const allowed = limit === -1 || current < limit

  return { allowed, current, limit }
}

/**
 * Obtiene el uso actual de todos los recursos de una empresa
 */
export async function getCompanyUsage(companyId: string) {
  const supabase = createAdminSupabase()

  const [
    { count: users },
    { count: projects },
    { count: clients },
    { count: storageFiles },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('is_client', false),
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId),
    supabase
      .from('project_files')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId),
  ])

  return {
    users: users ?? 0,
    projects: projects ?? 0,
    clients: clients ?? 0,
    storageFiles: storageFiles ?? 0,
  }
}

/**
 * Hook para usar en Server Components - obtiene plan, límites y uso
 */
export async function usePlanLimits(companyId: string) {
  const plan = await getCompanyPlan(companyId)
  const limits = getPlanLimits(plan)
  const usage = await getCompanyUsage(companyId)

  const canCreate = {
    users: limits.maxUsers === -1 || usage.users < limits.maxUsers,
    projects: limits.maxProjects === -1 || usage.projects < limits.maxProjects,
    clients: limits.maxClients === -1 || usage.clients < limits.maxClients,
  }

  const upgradeRequired = {
    users: !canCreate.users,
    projects: !canCreate.projects,
    clients: !canCreate.clients,
  }

  return {
    plan,
    planName: PLANS[plan].name,
    limits,
    usage,
    canCreate,
    upgradeRequired,
  }
}
