import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24',
  typescript: true,
})

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    limits: { maxUsers: 1, maxProjects: 3, maxClients: 5, maxStorage: 50 },
    features: ['1 miembro del equipo', '3 proyectos', '5 clientes', '500 MB almacenamiento', 'Portal del Cliente'],
  },
  basic: {
    name: 'Básico',
    price: 29,
    stripePriceId: process.env.STRIPE_PRICE_BASIC,
    limits: { maxUsers: 5, maxProjects: 15, maxClients: 30, maxStorage: 500 },
    features: ['5 miembros del equipo', '15 proyectos', '30 clientes', '5 GB almacenamiento', 'Portal del Cliente', 'Temas personalizados'],
  },
  pro: {
    name: 'Pro',
    price: 79,
    stripePriceId: process.env.STRIPE_PRICE_PRO,
    limits: { maxUsers: 15, maxProjects: 50, maxClients: 100, maxStorage: 2000 },
    features: ['15 miembros del equipo', '50 proyectos', '100 clientes', '25 GB almacenamiento', 'Portal del Cliente', 'Temas personalizados', 'API accesos'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
    limits: { maxUsers: -1, maxProjects: -1, maxClients: -1, maxStorage: 10000 },
    features: ['Miembros ilimitados', 'Proyectos ilimitados', 'Clientes ilimitados', '100 GB almacenamiento', 'White-label', 'API personalizada', 'Soporte prioritario'],
  },
} as const

export type PlanKey = keyof typeof PLANS
export type PlanLimits = (typeof PLANS)[PlanKey]['limits']

export function getPlanKeyByPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.stripePriceId === priceId) return key as PlanKey
  }
  return null
}
