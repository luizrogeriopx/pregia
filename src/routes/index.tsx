import { createFileRoute, Link } from "@tanstack/react-router";
import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  Youtube,
  FileText,
  Presentation,
  Share2,
  BookOpen,
  Quote,
  Check,
  Crown,
  ArrowRight,
  Zap,
  Shield,
  Heart,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PregAI — Transforme pregações em esboços com IA" },
      {
        name: "description",
        content:
          "Cole a URL de um vídeo do YouTube e gere esboços, slides, posts e roteiros de pregação com inteligência artificial. Para pastores, pregadores e estudantes da Bíblia.",
      },
      { property: "og:title", content: "PregAI — Esboços de pregação com IA" },
      {
        property: "og:description",
        content:
          "Plataforma cristã premium para gerar esboços, slides e conteúdo de pregação a partir de vídeos do YouTube.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <LogoBar />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <a href="#" className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Preg<span className="text-gold">AI</span>
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Funcionalidades</a>
          <a href="#how" className="hover:text-foreground transition">Como funciona</a>
          <a href="#pricing" className="hover:text-foreground transition">Planos</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/auth">Começar grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <img
        src={heroBg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      <div className="container relative mx-auto px-6 pt-24 pb-32 md:pt-32 md:pb-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-medium text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            IA cristã para pregadores
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            Transforme qualquer pregação em{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-gold)" }}
            >
              esboços completos
            </span>{" "}
            em segundos
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Cole a URL de um vídeo do YouTube e nossa IA gera esboço homilético,
            tópicos, slides, posts e roteiro completo — sem copiar, reinterpretando
            com excelência teológica.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="lg" className="group">
              Começar gratuitamente
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline" size="lg">Ver demonstração</Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            3 análises grátis por mês · sem cartão de crédito
          </p>
        </div>

        {/* URL input mockup */}
        <div className="mx-auto mt-16 max-w-2xl">
          <div
            className="rounded-2xl border border-border bg-card/80 backdrop-blur p-2 flex items-center gap-2"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <div className="flex items-center gap-2 px-3 text-muted-foreground">
              <Youtube className="h-5 w-5 text-red-400" />
            </div>
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button variant="hero" size="sm">
              Analisar <Sparkles className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoBar() {
  return (
    <section className="border-y border-border bg-card/30">
      <div className="container mx-auto px-6 py-8">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
          Confiado por pregadores e ministérios
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
          {["Ministério Vida", "Igreja Renovo", "Casa de Oração", "Pulpit Co.", "Vinha Church"].map((n) => (
            <span key={n} className="text-sm font-semibold tracking-tight text-muted-foreground">
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: FileText,
    title: "Esboço homilético",
    desc: "Introdução, desenvolvimento, clímax, apelo e aplicações estruturados automaticamente.",
  },
  {
    icon: BookOpen,
    title: "Versículos & tema",
    desc: "Identifica o tema central, versículos-chave e a progressão emocional da mensagem.",
  },
  {
    icon: Presentation,
    title: "Slides automáticos",
    desc: "Apresentação completa pronta para o domingo, com títulos e versículos formatados.",
  },
  {
    icon: Share2,
    title: "Posts para redes",
    desc: "Conteúdo pronto para Instagram, Facebook e stories com frases de impacto.",
  },
  {
    icon: Quote,
    title: "Frases de impacto",
    desc: "Citações memoráveis extraídas e reescritas para uso devocional e divulgação.",
  },
  {
    icon: Shield,
    title: "Sem plágio",
    desc: "A IA reinterpreta e estrutura — nunca copia literalmente sermões protegidos.",
  },
];

function Features() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-medium text-gold mb-3">Funcionalidades</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Tudo que você precisa para preparar mensagens poderosas
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ background: "var(--gradient-primary)" }}
              >
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Cole a URL", d: "Insira o link do vídeo de pregação do YouTube." },
    { n: "02", t: "IA analisa", d: "Extraímos a transcrição e interpretamos a estrutura." },
    { n: "03", t: "Receba tudo", d: "Esboço, slides, posts e roteiro prontos para usar." },
  ];
  return (
    <section id="how" className="py-24 md:py-32 bg-card/30 border-y border-border">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-medium text-gold mb-3">Como funciona</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Três passos. Um sermão pronto.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-background p-8">
              <div
                className="text-5xl font-bold bg-clip-text text-transparent mb-4"
                style={{ backgroundImage: "var(--gradient-gold)" }}
              >
                {s.n}
              </div>
              <h3 className="text-xl font-semibold mb-2">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "R$ 0",
      desc: "Para experimentar",
      cta: "Começar grátis",
      highlight: false,
      features: [
        "3 análises por mês",
        "Esboço básico",
        "Download em PDF",
        "Sem histórico salvo",
      ],
    },
    {
      name: "Pro",
      price: "R$ 27",
      period: "/mês",
      desc: "Para pregadores ativos",
      cta: "Assinar Pro",
      highlight: true,
      features: [
        "Análises ilimitadas",
        "Histórico completo de esboços",
        "Geração de slides",
        "Posts automáticos para redes",
        "Frases de impacto",
        "Favoritos e exportação avançada",
        "Suporte prioritário",
      ],
    },
  ];
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-medium text-gold mb-3">Planos</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Comece grátis. Escale quando precisar.
          </h2>
        </div>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-8 ${
                p.highlight
                  ? "border-gold/50 bg-card"
                  : "border-border bg-card/60"
              }`}
              style={p.highlight ? { boxShadow: "var(--shadow-gold)" } : undefined}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-accent-foreground">
                  <Crown className="h-3 w-3" /> Mais escolhido
                </div>
              )}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight">{p.price}</span>
                {p.period && <span className="text-muted-foreground">{p.period}</span>}
              </div>
              <Button
                variant={p.highlight ? "hero" : "outline"}
                className="w-full mt-6"
                size="lg"
              >
                {p.cta}
              </Button>
              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="h-5 w-5 shrink-0 text-gold" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      name: "Pr. Daniel Souza",
      role: "Igreja Renovo",
      quote:
        "Reduzi meu tempo de preparação de sermão pela metade. A estrutura homilética que a IA gera é impressionante.",
    },
    {
      name: "Marcos Ribeiro",
      role: "Estudante de Teologia",
      quote:
        "Uso para estudar pregações de grandes nomes. Os esboços me ajudam a entender a homilética por trás.",
    },
    {
      name: "Pra. Joana Lima",
      role: "Ministério Vida",
      quote:
        "Os slides e posts automáticos transformaram nossa comunicação de domingo. Recomendo a todos.",
    },
  ];
  return (
    <section className="py-24 md:py-32 bg-card/30 border-y border-border">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-medium text-gold mb-3">Depoimentos</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Pregadores que aceleraram seu ministério
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.name}
              className="rounded-2xl border border-border bg-background p-6"
            >
              <Quote className="h-6 w-6 text-gold mb-4" />
              <blockquote className="text-sm leading-relaxed text-foreground">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-6">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "A IA copia o sermão original?",
      a: "Não. A IA analisa, estrutura, reinterpreta e adapta o conteúdo. Nunca copia literalmente — gera material original baseado na análise homilética da pregação.",
    },
    {
      q: "Funciona com qualquer vídeo do YouTube?",
      a: "Sim, desde que o vídeo tenha legendas (automáticas ou manuais) disponíveis. A grande maioria dos vídeos de pregação atende esse requisito.",
    },
    {
      q: "Posso cancelar a qualquer momento?",
      a: "Sim. O plano Pro é mensal e pode ser cancelado a qualquer momento direto pelo seu painel.",
    },
    {
      q: "Quantas análises posso fazer no plano Free?",
      a: "3 análises por mês. Você pode baixar e copiar o conteúdo, mas nada fica salvo no histórico.",
    },
    {
      q: "Os slides são editáveis?",
      a: "Sim. Você baixa em formatos compatíveis com PowerPoint e Google Slides para personalizar.",
    },
  ];
  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-medium text-gold mb-3">Perguntas frequentes</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Tire suas dúvidas
          </h2>
        </div>
        <Accordion type="single" collapsible className="mx-auto max-w-2xl">
          {items.map((it, i) => (
            <AccordionItem key={i} value={`i-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {it.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div
          className="relative overflow-hidden rounded-3xl border border-gold/30 p-12 md:p-20 text-center"
          style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-glow)" }}
        >
          <Heart className="mx-auto h-10 w-10 text-gold mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl mx-auto">
            Pregue com mais profundidade. Prepare em menos tempo.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Junte-se a pastores e pregadores que já transformaram sua preparação.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="hero" size="lg">
              <Zap className="mr-2 h-4 w-4" />
              Começar gratuitamente
            </Button>
            <Button variant="outline" size="lg">Ver planos</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">
            Preg<span className="text-gold">AI</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} PregAI · Feito com fé para a Igreja
        </p>
      </div>
    </footer>
  );
}
