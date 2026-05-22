import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Star,
  Calendar,
  User,
  BookOpen,
  ArrowRight,
  Loader2,
  Video,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/history")({
  head: () => ({ meta: [{ title: "Histórico de Esboços — PregAI" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const [sermons, setSermons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("sermons")
          .select("id, video_title, preacher_name, theme, created_at, is_favorite")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSermons(data || []);
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [user]);

  // Filter sermons client-side for fast UX
  const filteredSermons = sermons.filter((sermon) => {
    const matchesSearch =
      (sermon.video_title?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (sermon.preacher_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (sermon.theme?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesFavorite = !onlyFavorites || sermon.is_favorite;

    return matchesSearch && matchesFavorite;
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2 border-b border-border/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Histórico de Esboços</h1>
        <p className="text-muted-foreground">
          Gerencie e acesse todos os esboços teológicos e materiais de apoio gerados anteriormente.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por título, pregador ou tema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 w-full"
          />
        </div>
        
        <Button
          variant={onlyFavorites ? "gold" : "outline"}
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className="h-10 shrink-0 select-none transition-all duration-300"
        >
          <Star className={`h-4 w-4 mr-2 ${onlyFavorites ? "fill-current" : ""}`} />
          Apenas Favoritos
        </Button>
      </div>

      {/* Main Grid/List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className="text-xs text-muted-foreground">Carregando histórico de esboços...</p>
        </div>
      ) : filteredSermons.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredSermons.map((sermon) => (
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
                <p className="text-xs text-muted-foreground/80 line-clamp-1 flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-muted-foreground/60" /> Tema: {sermon.theme}
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
        <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card/25 space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 border border-border">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">
              {search || onlyFavorites ? "Nenhum resultado encontrado" : "Nenhum esboço gerado"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {search || onlyFavorites
                ? "Tente mudar os termos de pesquisa ou remover o filtro de favoritos."
                : "Seus esboços gerados no painel principal serão salvos e listados aqui automaticamente."}
            </p>
          </div>
          {(search || onlyFavorites) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setOnlyFavorites(false);
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}