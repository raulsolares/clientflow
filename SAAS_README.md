# ClientFlow SaaS

> **Rama:** `saas` — Conversión de ClientFlow a SaaS multi-tenant con Stripe billing.
> **URL (producción):** https://clientflow-app-two.vercel.app
> **URL (preview):** Vercel preview deployment

---

## 📋 Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 + Turbopack |
| Estilos | Tailwind CSS v4 |
| Base de datos | Supabase PostgreSQL |
| Auth | Supabase Auth + RLS |
| Pagos | Stripe (Checkout, Customer Portal, Webhooks) |
| Hosting | Vercel |

---

## 📁 Estructura nueva (SaaS)

```
src/
├── app/
│   ├── pricing/                          # Página pública de precios
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── dashboard/settings/billing/       # Facturación dentro del dashboard
│   │   └── page.tsx
│   └── api/stripe/                       # Backend Stripe
│       ├── checkout/route.ts             # Crear sesión de checkout
│       ├── portal/route.ts               # Portal de facturación
│       ├── products/route.ts             # Listar planes
│       └── webhook/route.ts              # Webhooks Stripe
├── components/
│   ├── team/permissions-modal.tsx        # Modal de permisos
│   ├── onboarding/onboarding-modal.tsx   # Wizard de onboarding
│   └── upgrade-modal.tsx                 # Modal de upgrade
├── lib/
│   ├── stripe.ts                         # Cliente Stripe + planes
│   └── plan-limits.ts                    # Límites por plan
```

---

## 💳 Planes y precios

| Plan | Precio | Usuarios | Proyectos | Clientes | Almacenamiento |
|------|--------|----------|-----------|----------|---------------|
| Free | $0 | 1 | 3 | 5 | 500 MB |
| Básico | $29/mes | 5 | 15 | 30 | 5 GB |
| Pro | $79/mes | 15 | 50 | 100 | 25 GB |
| Enterprise | $199/mes | ∞ | ∞ | ∞ | 100 GB |

Los límites se definen en `src/lib/stripe.ts` y se verifican en `src/lib/plan-limits.ts`.

---

## 🔧 Configuración Stripe

### 1. Crear productos en Stripe Dashboard

1. Ve a [Stripe Dashboard > Productos](https://dashboard.stripe.com/products)
2. Crea 3 productos (recurring monthly):
   - **Básico** — $29/mes
   - **Pro** — $79/mes (marcar como "más popular")
   - **Enterprise** — $199/mes
3. Copia los **Price IDs** (ej: `price_abc123`)

### 2. Configurar Webhook

1. Stripe Dashboard > Developers > Webhooks
2. Añadir endpoint: `https://tudominio.com/api/stripe/webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copiar el **Webhook Secret** (`whsec_...`)

### 3. Variables de entorno

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx_o tu_sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx_o tu_pk_test_xxx
STRIPE_PRICE_BASIC=price_basic_xxx
STRIPE_PRICE_PRO=price_pro_xxx
STRIPE_PRICE_ENTERPRISE=price_enterprise_xxx
```

---

## 🗄️ Migración Supabase

Columnas añadidas a la tabla `companies`:

```sql
ALTER TABLE companies ADD COLUMN plan text DEFAULT 'free';
ALTER TABLE companies ADD COLUMN subscription_status text DEFAULT 'inactive';
ALTER TABLE companies ADD COLUMN stripe_customer_id text;
ALTER TABLE companies ADD COLUMN stripe_subscription_id text;
```

Para migrar empresas existentes:
```sql
UPDATE companies SET plan = 'free', subscription_status = 'active' WHERE plan IS NULL;
```

---

## 🚀 Flujo SaaS completo

```
Usuario → /pricing → Selecciona plan → Stripe Checkout
                                              ↓
                                     Paga con tarjeta
                                              ↓
                              Webhook: checkout.session.completed
                                              ↓
                              Se crea/actualiza empresa con plan+stripe
                                              ↓
                              Usuario redirigido a /dashboard
                                              ↓
                              Onboarding wizard (3 pasos)
                                              ↓
                              Dashboard funcional con límites del plan
```

---

## 🔒 Límites por plan

Los límites se verifican en:

| Acción | Dónde se verifica |
|--------|------------------|
| Invitar miembro | `src/app/api/invite/create/route.ts` |
| Crear proyecto | `src/lib/plan-limits.ts → checkLimit()` |
| Crear cliente | `src/lib/plan-limits.ts → checkLimit()` |

Cuando se alcanza un límite, se muestra el **Upgrade Modal** (`src/components/upgrade-modal.tsx`).

---

## 🧪 Stripe modo test

1. Stripe Dashboard > Activar "Modo test"
2. Usar tarjeta de prueba: `4242 4242 4242 4242`
3. Webhooks funcionan igual en test mode
4. Ver eventos en Stripe Dashboard > Developers > Events

---

## 📦 Deploy a Vercel

```bash
# 1. Conectar repo a Vercel
vercel link

# 2. Agregar variables de entorno en Vercel Dashboard
#    (todas las STRIPE_* + SUPABASE_*)

# 3. Deploy
git push origin saas
# Vercel auto-deploya
```

---

## 📄 Documentación relacionada

| Archivo | Contenido |
|---------|-----------|
| `.hermes/plans/2026-07-11_saas-conversion.md` | Plan de implementación original |
| `README.md` | Documentación general de ClientFlow |

---

## ✅ Checklist de lanzamiento SaaS

- [ ] Variables Stripe configuradas en Vercel
- [ ] Webhook Stripe apuntando a URL de producción
- [ ] Productos Stripe creados (Basic, Pro, Enterprise)
- [ ] `checkout.session.completed` → crear/actualizar empresa
- [ ] Límites verificados en invite, create project, create client
- [ ] Pricing page pública (sin auth)
- [ ] Billing section en Settings funcional
- [ ] Stripe Customer Portal link funcional
- [ ] Onboarding para nuevos usuarios
- [ ] Upgrade modal se muestra al alcanzar límites
- [ ] Test con tarjeta 4242 en modo test
