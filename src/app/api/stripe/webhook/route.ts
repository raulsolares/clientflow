import { NextResponse } from 'next/server'
import { getStripe, PLANS, type PlanKey } from '@/lib/stripe'
import { createAdminSupabase } from '@/lib/supabase-admin'
import type Stripe from 'stripe'

/**
 * POST /api/stripe/webhook
 * Webhook de Stripe para manejar eventos de suscripción
 * Eventos manejados:
 * - checkout.session.completed
 * - invoice.paid
 * - customer.subscription.updated
 * - customer.subscription.deleted
 */
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Firma de webhook faltante' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    const _stripe = getStripe()
    event = _stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Error verificando firma del webhook:', err)
    return NextResponse.json(
      { error: 'Firma de webhook inválida' },
      { status: 400 }
    )
  }

  const supabase = createAdminSupabase()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      }
      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      }
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      }
      default:
        console.log(`Evento no manejado: ${event.type}`)
    }
  } catch (error) {
    console.error(`Error procesando evento ${event.type}:`, error)
    return NextResponse.json(
      { error: 'Error procesando el evento' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

/**
 * Maneja checkout.session.completed
 * Cuando un usuario completa el checkout, actualizamos la empresa con los datos de Stripe
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const supabase = createAdminSupabase()
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  const companyName = session.metadata?.companyName || ''

  // Obtener la suscripción para extraer el plan
  let planKey: PlanKey = 'basic'
  if (subscriptionId) {
    try {
      const subscription = await _stripe.subscriptions.retrieve(subscriptionId)
      const priceId = subscription.items.data[0]?.price.id
      planKey = getPlanKeyFromPriceId(priceId)
    } catch (err) {
      console.error('Error obteniendo suscripción:', err)
    }
  }

  // Si hay un userId en el metadata (usuario logueado al hacer checkout)
  const userId = session.metadata?.userId || session.client_reference_id

  if (userId) {
    // Obtener la empresa del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (profile) {
      await supabase
        .from('companies')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId || null,
          plan: planKey,
          subscription_status: 'active',
        })
        .eq('id', profile.company_id)
    }
  } else if (companyName) {
    // Buscar empresa por nombre (caso de registro nuevo)
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('name', companyName)
      .single()

    if (company) {
      await supabase
        .from('companies')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId || null,
          plan: planKey,
          subscription_status: 'active',
        })
        .eq('id', company.id)
    }
  }
}

/**
 * Maneja invoice.paid
 * Confirma que el pago fue exitoso
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = createAdminSupabase()
  const customerId = invoice.customer as string

  if (!customerId) return

  // Actualizar el estado de suscripción a activo
  await supabase
    .from('companies')
    .update({
      subscription_status: 'active',
    })
    .eq('stripe_customer_id', customerId)
}

/**
 * Maneja customer.subscription.updated
 * Actualiza el plan cuando cambia la suscripción
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createAdminSupabase()
  const customerId = subscription.customer as string

  if (!customerId) return

  const priceId = subscription.items.data[0]?.price.id
  const planKey = getPlanKeyFromPriceId(priceId)

  const status = subscription.status === 'active' ? 'active' : 'past_due'

  await supabase
    .from('companies')
    .update({
      plan: planKey,
      subscription_status: status,
      stripe_subscription_id: subscription.id,
    })
    .eq('stripe_customer_id', customerId)
}

/**
 * Maneja customer.subscription.deleted
 * Cuando la suscripción es cancelada/expirada, regresa al plan free
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createAdminSupabase()
  const customerId = subscription.customer as string

  if (!customerId) return

  await supabase
    .from('companies')
    .update({
      plan: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
    })
    .eq('stripe_customer_id', customerId)
}

/**
 * Obtiene el PlanKey a partir de un Stripe Price ID
 */
function getPlanKeyFromPriceId(priceId: string | undefined): PlanKey {
  if (!priceId) return 'free'

  const planMap: Record<string, PlanKey> = {
    [process.env.STRIPE_PRICE_BASIC || '']: 'basic',
    [process.env.STRIPE_PRICE_PRO || '']: 'pro',
    [process.env.STRIPE_PRICE_ENTERPRISE || '']: 'enterprise',
  }

  return planMap[priceId] || 'free'
}
