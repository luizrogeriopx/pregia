import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Youtube, Sparkles, Loader2, BookOpen, User, Calendar, Star, ArrowRight, Video } from "lucide-react";
import { toast } from "sonner";
import { generateSermonFn } from "@/lib/sermons.server";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>): { url?: string } => {
    return {
      url: typeof search.url === "string" ? search.url : undefined,
    };
  },
  head: () => ({ meta: [{ title: "Dashboard — PregAI" }] }),
  component: Dashboard,
});

const LOADING_STEPS = [
  "Lendo o link do YouTube...",
  "Conectando ao vídeo e buscando metadados...",
  "Extraindo transcrição e legenda do áudio...",
  "Lovable AI analisando estrutura teológica...",
  "Gerando esboço homilético detalhado...",
  "Criando slides de apresentação...",
  "Escrevendo posts sociais e frases de impacto...",
  "Finalizando e salvando no seu histórico...",
];

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { url: urlParam } = Route.useSearch();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [recentSermons, setRecentSermons] = useState<any[]>([]);
  const [fetchingRecent, setFetchingRecent] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [sermonCount, setSermonCount] = useState<number | null>(null);

  // Fetch recent analyses and plan usage
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      // 1. Fetch Subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle();
      
      const activePro = sub?.plan === "pro" && sub?.status === "active";
      setIsPro(activePro);

      // 2. Fetch Lifetime Outline count
      const { count } = await supabase
        .from("sermons")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      setSermonCount(count || 0);

      // 3. Fetch Recent Outlines
      const { data: sermons, error: sermonsErr } = await supabase
        .from("sermons")
        .select("id, video_title, preacher_name, theme, created_at, is_favorite")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (sermonsErr) throw sermonsErr;
      setRecentSermons(sermons || []);
    } catch (e) {
      console.error("Erro ao carregar dados da dashboard:", e);
    } finally {
      setFetchingRecent(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Cycle loading messages to engage user during AI generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < LOADING_STEPS.length - 1) return prev + 1;
          return prev; // Stay on the last step if it takes longer
        });
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const analyze = async (targetUrl?: string) => {
    const urlToAnalyze = typeof targetUrl === "string" ? targetUrl : url;
    if (!urlToAnalyze) return;
    
    // Safety check on client side
    if (!isPro && sermonCount !== null && sermonCount >= 3) {
      toast.error("Você atingiu o limite de 3 esboços gratuitos do plano Free.");
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    
    try {
      const res = await generateSermonFn({ data: urlToAnalyze });
      toast.success("Esboço gerado com excelência teológica!");
      navigate({
        to: "/dashboard/sermon/$id",
        params: { id: res.id },
      });
    } catch (err: any) {
      console.error("Erro ao gerar sermão:", err);
      toast.error(err?.message || "Ocorreu um erro ao processar a pregação.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-trigger analysis if a URL is passed from landing/auth pages
  useEffect(() => {
    if (!fetchingRecent && urlParam) {
      setUrl(urlParam);
      
      // Clear the search query from the URL to prevent triggering again on manual refresh
      navigate({
        to: "/dashboard",
        search: {},
        replace: true,
      });

      analyze(urlParam);
    }
  }, [fetchingRecent, urlParam]);

  const isLimitReached = !isPro && sermonCount !== null && sermonCount >= 3;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-12">
      {/* Upper Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Nova análise</h1>
        <p className="text-muted-foreground">
          Cole a URL de um vídeo do YouTube para gerar o esboço homilético completo com IA.
        </p>
      </div>

      {/* Main Form Box */}
      <div
        className="rounded-2xl border border-border bg-card p-6 space-y-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Plan usage indicator for free users */}
        {!isPro && sermonCount !== null && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40 mb-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Uso do Plano Grátis: <strong className="text-gold font-bold">{sermonCount} de 3</strong> esboços gerados
            </span>
            <div className="w-full sm:w-48 bg-muted h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gold h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((sermonCount / 3) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
            Link do Vídeo do YouTube
          </label>
          <div
            className={`rounded-xl border p-1.5 flex items-center gap-2 transition-all duration-300 ${
              loading ? "border-gold/50 bg-accent/5" : "border-border focus-within:border-gold/50 bg-background"
            } ${isLimitReached ? "opacity-60 bg-muted/10 cursor-not-allowed" : ""}`}
            style={loading ? { boxShadow: "var(--shadow-glow)" } : undefined}
          >
            <div className="px-3">
              <Youtube className={`h-5 w-5 ${loading ? "text-gold animate-pulse" : isLimitReached ? "text-muted-foreground" : "text-red-400"}`} />
            </div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading || isLimitReached}
              placeholder={isLimitReached ? "Limite gratuito atingido" : "https://www.youtube.com/watch?v=... ou https://youtu.be/..."}
              className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <Button
              variant="hero"
              onClick={() => analyze()}
              disabled={loading || !url || isLimitReached}
              className="h-11 transition-all duration-300"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Analisar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Limit reached warning banner */}
        {isLimitReached && (
          <div className="p-5 rounded-xl bg-gold/5 border border-gold/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-gold animate-pulse shrink-0" />
                Limite do Plano Free atingido
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você atingiu o limite vitalício de 3 esboços gratuitos. Faça upgrade para o plano Pro por apenas R$27/mês para continuar gerando esboços de forma ilimitada!
              </p>
            </div>
            <Button
              variant="gold"
              size="sm"
              className="font-bold text-xs shadow-sm shrink-0 w-full sm:w-auto"
              onClick={() => navigate({ to: "/dashboard/billing" })}
            >
              Fazer Upgrade Pro
            </Button>
          </div>
        )}

        {/* Loading Progress State */}
        {loading && (
          <div className="bg-accent/10 border border-border/40 p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <Loader2 className="h-5 w-5 text-gold animate-spin shrink-0" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">Sua pregação está sendo analisada</div>
              <div className="text-xs text-muted-foreground transition-all duration-300">
                {LOADING_STEPS[loadingStep]}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Analyses List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gold" />
            Análises Recentes
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link to="/dashboard/history">Ver histórico completo</Link>
          </Button>
        </div>

        {fetchingRecent ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : recentSermons.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {recentSermons.map((sermon) => (
              <Link
                key={sermon.id}
                to="/dashboard/sermon/$id"
                params={{ id: sermon.id }}
                className="group relative rounded-xl border border-border bg-card/40 p-5 hover:border-gold/40 hover:bg-card transition-all duration-300 flex flex-col justify-between h-40"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-gold transition-colors">
                      {sermon.video_title}
                    </h3>
                    {sermon.is_favorite && (
                      <Star className="h-4 w-4 text-gold fill-current shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                    <User className="h-3 w-3 text-gold" /> {sermon.preacher_name}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(sermon.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="flex items-center gap-0.5 group-hover:translate-x-1 transition-transform font-semibold text-gold">
                    Acessar <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/25 space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 border border-border">
              <Video className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Nenhum esboço gerado ainda</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Cole um link de pregação do YouTube acima para criar seu primeiro material homilético com IA.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}