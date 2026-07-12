import { NextResponse } from 'next/server'
import { PLANS } from '@/lib/stripe'

/**
 * GET /api/stripe/products
 * Devuelve todos los planes disponibles con sus precios y características
 */
export async function GET() {
  try {
    const products = Object.entries(PLANS).map(([key, plan]) => ({
      key,
      name: plan.name,
      price: plan.price,
      limits: plan.limits,
      features: [...plan.features],
      stripePriceId: plan.stripePriceId || null,
    }))

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Error al obtener los planes' },
      { status: 500 }
    )
  }
}
