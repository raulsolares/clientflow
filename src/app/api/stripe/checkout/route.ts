import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/stripe/checkout
 * Crea una sesión de checkout de Stripe
 * Body: { priceId: string, email?: string, companyName?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { priceId, email, companyName } = body

    if (!priceId) {
      return NextResponse.json(
        { error: 'El ID de precio es requerido' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/settings/billing?canceled=true`,
      customer_email: email || undefined,
      metadata: {
        companyName: companyName || '',
        priceId: priceId,
      },
      subscription_data: {
        metadata: {
          companyName: companyName || '',
          priceId: priceId,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Error al crear la sesión de pago' },
      { status: 500 }
    )
  }
}
