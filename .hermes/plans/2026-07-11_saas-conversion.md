# ClientFlow → SaaS Conversion Plan

> **Arquitecto:** Hermes Agent
> **Meta:** Convertir ClientFlow (mono-tenant admin) en SaaS multi-tenant con Stripe billing, plans, límites y onboarding.

**Goal:** Multi-tenant SaaS con suscripciones Stripe, 3 planes (Basic/Pro/Enterprise), límites por plan, billing portal, pricing page, onboarding fluido.

**Architecture:** Next.js 15 + Supabase + Stripe. Tabla `companies` extendida con `plan` y `subscription_status`. Stripe webhooks para sincronizar estado. Feature flags por plan.

**Tech Stack:** Next.js 15, Supabase (RLS), Stripe (Checkout, Customer Portal, Webhooks), Tailwind v4.

---

## Tasks

### TASK 1: Preparar repositorio y estructura

**Objetivo:** Crear el nuevo folder, rama, copiar proyecto, instalar Stripe SDK.

**Pasos:**
1. Copiar `/mnt/d/hermes/clientflow-app` → `/mnt/d/hermes/clientflow-saas`
2. `cd /mnt/d/hermes/clientflow-saas && git checkout -b saas`
3. `npm install @stripe/stripe-js @stripe/react-stripe-js stripe` (frontend + backend)
4. Commit: `git add -A && git commit -m "init: fork saas branch + stripe deps"`

---

### TASK 2: Migración Supabase — companies table extendida

**Objetivo:** Agregar columnas `plan`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id` a `companies`.

**SQL via Management API:**
```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE companies ADD COLUMN IF NOTASCADE plans text[];
```

**Verificar:** `curl -s Supabase REST API` que las columnas existen.

---

### TASK 3: Stripe config + products/prices

**Objetivo:** Configurar Stripe SDK, crear webhook route, sync products/prices.

**Files:**
- Create: `src/lib/stripe.ts` — Stripe client (admin + frontend)
- Create: `src/app/api/stripe/products/route.ts` — GET products list
- Create: `src/app/api/stripe/webhook/route.ts` — POST webhooks

**Products (crear en Stripe Dashboard, referenciar por price ID en .env):**
- **Free** — $0/mes, 1 user, 3 projects, 5 clients
- **Basic** — $29/mes, 5 users, 15 projects, 30 clients
- **Pro** — $79/mes, 15 users, 50 projects, 100 clients
- **Enterprise** — $199/mes, unlimited

---

### TASK 4: Pricing page pública

**Objetivo:** `/pricing` con tabla comparativa de planes.

**Files:**
- Create: `src/app/pricing/page.tsx`
- Incluir: 3 planes (Basic/Pro/Enterprise) + Free row, feature comparison, CTA "Empezar" → Stripe Checkout

---

### TASK 5: Stripe Checkout flow

**Objetivo:** Usuario selecciona plan → Stripe Checkout → éxito crea company + admin → redirect al dashboard.

**Files:**
- Create: `src/app/api/stripe/checkout/route.ts` — create checkout session
- Create: `src/app/api/stripe/portal/route.ts` — billing portal link
- Modify: `src/app/api/stripe/webhook/route.ts` — handle `checkout.session.completed`

**Flujo:**
1. Pricing → "Empezar" → POST `/api/stripe/checkout` con `{priceId, companyName, email}`
2. Stripe Checkout → usuario paga
3. Webhook `checkout.session.completed` → crear company + admin profile + redirect
4. Success page → botón "Ir al Dashboard"

---

### TASK 6: Plan limits enforcement

**Objetivo:** Middleware/libs que verifican límites y bloquean creación si se excede.

**Files:**
- Create: `src/lib/plan-limits.ts` — getPlanLimits(), checkLimit()
- Create: `src/app/api/limits/route.ts` — GET current usage vs limits
- Modify: `src/app/api/projects/route.ts` — check limit before create
- Modify: `src/app/api/clients/route.ts` — check limit before create
- Modify: `src/app/api/team/invite/route.ts` — check limit before invite

**Límites por plan:**
```typescript
const PLANS = {
  free:     { maxUsers: 1,  maxProjects: 3,  maxClients: 5,  maxStorage: 50 },
  basic:    { maxUsers: 5,  maxProjects: 15, maxClients: 30, maxStorage: 500 },
  pro:      { maxUsers: 15, maxProjects: 50, maxClients: 100, maxStorage: 2000 },
  enterprise: { maxUsers: -1, maxProjects: -1, maxClients: -1, maxStorage: 10000 },
}
```

---

### TASK 7: Billing section in Settings

**Objetivo:** UI en Settings para ver plan actual, uso vs límites, enlace a Stripe Customer Portal.

**Files:**
- Create: `src/app/dashboard/settings/billing/page.tsx`
- Modificar sidebar para incluir "Facturación"

**Componentes:**
- Plan badge (Free/Basic/Pro/Enterprise) + subscription status
- Usage bars (users, projects, clients, storage) con % usado
- Botón "Gestionar suscripción" → Stripe Customer Portal

---

### TASK 8: Onboarding post-signup

**Objetivo:** Primera vez que entra, mostrar onboarding (crear primer proyecto, invitar miembro, etc.)

**Files:**
- Create: `src/components/onboarding/onboarding-wizard.tsx`
- Modify: `src/app/dashboard/page.tsx` — check if first login, show wizard

---

### TASK 9: Upgrade prompts & limits UI

**Objetivo:** Cuando un usuario alcanza un límite, mostrar modal de upgrade.

**Files:**
- Create: `src/components/upgrade-modal.tsx`

**Flujo:**
- Al hacer clic en "Nuevo proyecto" si ya llegó al límite → modal "Actualiza a Pro para más proyectos"
- Botón "Ver planes" → redirige a `/pricing?upgrade=true`

---

### TASK 10: Documentación

**Objetivo:** README completo con setup, configuración Stripe, deploy.

**Archivo:** `SAAS_README.md` en raíz del proyecto.

---

## Validación

1. `npm run build` — sin errores
2. Verificar todas las rutas nuevas responden
3. Probar Stripe Checkout (modo test)
4. Verificar webhooks procesan correctamente
5. Verificar límites bloquean creación
6. Verificar pricing page se ve bien
