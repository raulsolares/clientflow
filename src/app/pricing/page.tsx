import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "siempre gratis",
    description: "Perfecto para explorar la plataforma",
    features: [
      "1 usuario",
      "3 proyectos",
      "5 clientes",
      "500 MB almacenamiento",
      "Portal del cliente básico",
      "1 tema visual",
      "Soporte por email",
    ],
    cta: "Empezar gratis",
    popular: false,
  },
  {
    name: "Básico",
    price: "$29",
    period: "/mes",
    description: "Ideal para freelancers y equipos pequeños",
    features: [
      "5 usuarios",
      "15 proyectos",
      "30 clientes",
      "5 GB almacenamiento",
      "Portal del cliente completo",
      "3 temas visuales",
      "Soporte prioritario por email",
    ],
    cta: "Elegir plan",
    popular: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/mes",
    description: "Para agencias en crecimiento",
    features: [
      "15 usuarios",
      "50 proyectos",
      "100 clientes",
      "25 GB almacenamiento",
      "Portal del cliente premium",
      "Todos los temas visuales",
      "Soporte prioritario 24/7",
      "Integraciones avanzadas",
    ],
    cta: "Elegir plan",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/mes",
    description: "Para grandes agencias y empresas",
    features: [
      "Usuarios ilimitados",
      "Proyectos ilimitados",
      "Clientes ilimitados",
      "100 GB almacenamiento",
      "Portal del cliente white-label",
      "Todos los temas + personalizados",
      "Soporte dedicado con SLA",
      "Integraciones avanzadas",
      "API personalizada",
    ],
    cta: "Contactar ventas",
    popular: false,
  },
]

const faqs = [
  {
    question: "¿Puedo cambiar de plan en cualquier momento?",
    answer:
      "Sí, puedes actualizar o degradar tu plan cuando lo necesites. Los cambios se aplican de forma inmediata y se prorratea el cobro.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), así como transferencias bancarias para planes Enterprise.",
  },
  {
    question: "¿Hay un período de prueba?",
    answer:
      "El plan Free te permite explorar la plataforma sin compromiso. Los planes de pago incluyen 14 días de prueba gratuita sin necesidad de tarjeta de crédito.",
  },
  {
    question: "¿Qué pasa si supero los límites de mi plan?",
    answer:
      "Te notificaremos cuando estés cerca del límite. No se bloqueará tu acceso, pero no podrás agregar más recursos hasta que actualices tu plan o liberes espacio.",
  },
]

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo-clientflow.png"
                alt="ClientFlow"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link href="/login">
                <Button size="sm" className="lime-glow">
                  Empezar ahora
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Planes y Precios
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            El plan perfecto para tu agencia. Escala tu negocio con las
            herramientas que necesitas.
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-6 flex flex-col ${
                  plan.popular
                    ? "border-gold/50 bg-card/90 shadow-lg shadow-gold/5"
                    : "border-border/50 bg-card/60"
                } backdrop-blur-sm transition-all duration-200 hover:border-gold/30`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-gold/10 border border-gold/30 px-3 py-1 text-xs font-medium text-gold-light">
                      Más popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">
                    {plan.period}
                  </span>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`w-full text-center ${
                    plan.popular ? "lime-glow" : ""
                  }`}
                >
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-20">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm"
              >
                <summary className="cursor-pointer list-none px-6 py-4 text-sm font-medium text-foreground flex items-center justify-between">
                  {faq.question}
                  <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <div className="px-6 pb-4 text-sm text-muted-foreground">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img
                  src="/logo-clientflow.png"
                  alt="ClientFlow"
                  className="h-8 w-auto object-contain opacity-60"
                />
                <span className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} ClientFlow. Todos los derechos
                  reservados.
                </span>
              </div>
              <nav className="flex items-center gap-6 text-xs text-muted-foreground">
                <Link
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Términos de servicio
                </Link>
                <Link
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Política de privacidad
                </Link>
                <Link
                  href="#"
                  className="hover:text-foreground transition-colors"
                >
                  Contacto
                </Link>
              </nav>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
