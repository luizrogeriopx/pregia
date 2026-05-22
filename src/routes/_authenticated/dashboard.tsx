import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Youtube, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PregAI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!url) return;
    setLoading(true);
    // Placeholder — IA será conectada na próxima etapa
    setTimeout(() => {
      setLoading(false);
      toast.info("Conecte a IA na próxima etapa para gerar análises reais.");
    }, 800);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Nova análise</h1>
      <p className="text-muted-foreground mb-8">Cole a URL de um vídeo do YouTube para gerar o esboço.</p>

      <div
        className="rounded-2xl border border-border bg-card p-2 flex items-center gap-2"
        style={{ boxShadow: "var(--shadow-glow)" }}
      >
        <div className="px-3"><Youtube className="h-5 w-5 text-red-400" /></div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button variant="hero" onClick={analyze} disabled={loading || !url}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" />Analisar</>}
        </Button>
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        Suas análises geradas aparecerão aqui.
      </div>
    </div>
  );
}