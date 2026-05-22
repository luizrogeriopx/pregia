import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Sparkles, LayoutDashboard, History, CreditCard, LogOut, Shield, Smartphone, Download, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // PWA & Plan states
  const [hasPlan, setHasPlan] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    
    async function checkAdmin() {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (data) {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error("Erro ao verificar cargo admin:", err);
      }
    }
    
    async function checkSubscription() {
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user.id)
          .maybeSingle();
        
        // Only trigger PWA for active contracted Pro plan (advantage of being Pro)
        if (data && data.status === "active" && data.plan === "pro") {
          setHasPlan(true);
        } else {
          setHasPlan(false);
          // If they downgraded or lost Pro status, clean up PWA components immediately
          const link = document.querySelector("link[rel='manifest']");
          if (link) link.remove();
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              for (const reg of registrations) {
                reg.unregister();
              }
            });
          }
        }
      } catch (err) {
        console.error("Erro ao verificar inscrição para PWA:", err);
      }
    }
    
    checkAdmin();
    checkSubscription();
  }, [user]);

  // Load PWA manifest and service worker ONLY if user has a contracted plan
  useEffect(() => {
    if (!hasPlan) return;

    // 1. Inject Manifest dynamically
    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = "/manifest.json";
      document.head.appendChild(manifestLink);
    }

    // 2. Register Service Worker dynamically
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => console.log("PWA Service Worker registrado com sucesso no escopo:", reg.scope))
        .catch((err) => console.error("Falha ao registrar PWA Service Worker:", err));
    }

    // 3. Listen for installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    // 5. Detect iOS device
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [hasPlan]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        toast.info("No iOS: clique em 'Compartilhar' no Safari e escolha 'Adicionar à Tela de Início'.");
      } else {
        toast.info("A instalação já foi concluída ou não é suportada neste navegador.");
      }
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstalled(true);
      toast.success("PregAI adicionado à sua tela de início!");
    }
  };

  const handleSignOut = async () => {
    // Unregister PWA components on logout to protect session privacy
    const link = document.querySelector("link[rel='manifest']");
    if (link) link.remove();
    
    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      } catch (err) {
        console.error("Erro ao unregistar service worker:", err);
      }
    }
    await signOut();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const showInstallOption = hasPlan && !isInstalled && (deferredPrompt || isIOS);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex h-16 items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight text-sm">
            Preg<span className="text-gold">AI</span>
          </span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
          <Menu className="h-5 w-5 text-foreground" />
        </Button>
      </header>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-background/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-card p-6 flex flex-col justify-between border-r border-border animate-in slide-in-from-left duration-300">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
                <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-sm">
                    Preg<span className="text-gold">AI</span>
                  </span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="space-y-1.5" onClick={() => setMobileMenuOpen(false)}>
                <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
                <NavLink to="/dashboard/history" icon={History}>Histórico</NavLink>
                <NavLink to="/dashboard/billing" icon={CreditCard}>Financeiro</NavLink>
                {isAdmin && (
                  <NavLink to="/admin" icon={Shield}>Painel Admin</NavLink>
                )}
              </nav>
            </div>

            <div className="space-y-4">
              {showInstallOption && (
                <div className="p-4 rounded-xl bg-gold/5 border border-gold/20 flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 opacity-10">
                    <Sparkles className="h-16 w-16 text-gold" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-gold" />
                      PregAI no Celular
                    </h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Instale o aplicativo PWA para acesso rápido.
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    size="sm"
                    className="w-full text-[11px] h-8 font-semibold"
                    onClick={handleInstallClick}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Instalar Aplicativo
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <div className="text-[11px] text-muted-foreground mb-2 truncate">{user.email}</div>
                <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { setMobileMenuOpen(false); handleSignOut(); }}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
          {/* Close tap background area */}
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/30">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">
              Preg<span className="text-gold">AI</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
          <NavLink to="/dashboard/history" icon={History}>Histórico</NavLink>
          <NavLink to="/dashboard/billing" icon={CreditCard}>Financeiro</NavLink>
          {isAdmin && (
            <NavLink to="/admin" icon={Shield}>Painel Admin</NavLink>
          )}
        </nav>

        {/* Desktop PWA Install Promotion Box */}
        {showInstallOption && (
          <div className="mx-4 my-2 p-4 rounded-xl bg-gold/5 border border-gold/20 flex flex-col gap-2.5 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <Sparkles className="h-16 w-16 text-gold" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-gold" />
                PregAI no Computador
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Instale nosso aplicativo PWA para ter acesso direto na sua barra de tarefas.
              </p>
            </div>
            <Button
              variant="gold"
              size="sm"
              className="w-full text-[11px] h-8 font-semibold shadow-sm"
              onClick={handleInstallClick}
            >
              <Download className="h-3 w-3 mr-1" />
              Instalar Aplicativo
            </Button>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2 truncate">{user.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, icon: Icon, children }: { to: string; icon: typeof LayoutDashboard; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition"
      activeProps={{ className: "bg-accent/10 text-foreground" }}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}