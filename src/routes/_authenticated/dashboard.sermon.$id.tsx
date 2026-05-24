import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  FileText,
  Presentation,
  Share2,
  Quote,
  Star,
  BookOpen,
  Sparkles,
  Youtube,
  User,
  Heart,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/sermon/$id")({
  head: () => ({ meta: [{ title: "Esboço de Pregação — PregAI" }] }),
  component: SermonDetail,
});

type Versicle = { reference: string; text: string };
type OutlinePoint = { title: string; subpoints: string[]; keyVerse?: string };
type SocialPost = { platform: string; type: string; content: string };
type Slide = { title: string; content: string[] };

interface SermonData {
  id: string;
  youtube_url: string;
  video_title: string;
  preacher_name: string;
  theme: string;
  verses: Versicle[] | any;
  summary: string;
  introduction: string;
  outline: OutlinePoint[] | any;
  topics: string[] | any;
  conclusion: string;
  applications: string[] | any;
  impact_phrases: string[] | any;
  script: string;
  title_suggestions: string[] | any;
  related_themes: string[] | any;
  social_posts: SocialPost[] | any;
  slides: Slide[] | any;
  is_favorite: boolean;
  created_at: string;
}

function SermonDetail() {
  const { id } = useParams({ from: "/_authenticated/dashboard/sermon/$id" });
  const [sermon, setSermon] = useState<SermonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSermon() {
      try {
        const { data, error } = await supabase
          .from("sermons")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setSermon(data as SermonData);
      } catch (err: any) {
        console.error("Erro ao carregar sermão:", err);
        toast.error("Não foi possível carregar o sermão.");
      } finally {
        setLoading(false);
      }
    }
    loadSermon();
  }, [id]);

  const toggleFavorite = async () => {
    if (!sermon) return;
    setFavoriteLoading(true);
    const newStatus = !sermon.is_favorite;
    try {
      const { error } = await supabase
        .from("sermons")
        .update({ is_favorite: newStatus })
        .eq("id", sermon.id);

      if (error) throw error;
      setSermon({ ...sermon, is_favorite: newStatus });
      toast.success(newStatus ? "Esboço adicionado aos favoritos!" : "Esboço removido dos favoritos.");
    } catch (err) {
      toast.error("Erro ao atualizar favorito.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const copyToClipboard = (text: string, elementId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(elementId);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
          <Sparkles className="absolute h-5 w-5 text-gold animate-pulse" />
        </div>
        <p className="text-muted-foreground animate-pulse text-sm">Carregando esboço e materiais de apoio...</p>
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center mt-12">
        <h2 className="text-2xl font-bold mb-4">Sermão não encontrado</h2>
        <p className="text-muted-foreground mb-6">O esboço solicitado não existe ou você não tem permissão para visualizá-lo.</p>
        <Button asChild>
          <Link to="/dashboard">Voltar para a Dashboard</Link>
        </Button>
      </div>
    );
  }

  // Safety parse JSON fields if database returns raw objects/arrays
  const parsedVerses: Versicle[] = Array.isArray(sermon.verses) ? sermon.verses : [];
  const parsedOutline: OutlinePoint[] = Array.isArray(sermon.outline)
    ? (sermon.outline as any[]).map((p: any) => ({
        title: p?.title ?? p?.point ?? p?.heading ?? "",
        subpoints: Array.isArray(p?.subpoints)
          ? p.subpoints
          : Array.isArray(p?.sub_points)
            ? p.sub_points
            : Array.isArray(p?.points)
              ? p.points
              : [],
        keyVerse: p?.keyVerse ?? p?.key_verse ?? p?.verse,
      }))
    : [];
  const parsedTopics: string[] = Array.isArray(sermon.topics) ? sermon.topics : [];
  const parsedApplications: string[] = Array.isArray(sermon.applications) ? sermon.applications : [];
  const parsedImpactPhrases: string[] = Array.isArray(sermon.impact_phrases) ? sermon.impact_phrases : [];
  const parsedTitleSuggestions: string[] = Array.isArray(sermon.title_suggestions) ? sermon.title_suggestions : [];
  const parsedRelatedThemes: string[] = Array.isArray(sermon.related_themes) ? sermon.related_themes : [];
  const parsedSocialPosts: SocialPost[] = Array.isArray(sermon.social_posts) ? sermon.social_posts : [];
  const parsedSlides: Slide[] = Array.isArray(sermon.slides)
    ? (sermon.slides as any[]).map((s: any) => ({
        title: s?.title ?? s?.heading ?? "",
        content: Array.isArray(s?.content)
          ? s.content
          : Array.isArray(s?.bullets)
            ? s.bullets
            : Array.isArray(s?.points)
              ? s.points
              : [],
      }))
    : [];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="mb-2 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            {sermon.video_title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-gold" />
              {sermon.preacher_name}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-gold" />
              {sermon.theme}
            </span>
            <span className="hidden sm:inline">•</span>
            <a
              href={sermon.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition"
            >
              <Youtube className="h-4 w-4" />
              Assistir vídeo
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={sermon.is_favorite ? "gold" : "outline"}
            size="sm"
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            className="h-9 transition-all duration-300"
          >
            <Star className={`h-4 w-4 mr-1.5 ${sermon.is_favorite ? "fill-current" : ""}`} />
            {sermon.is_favorite ? "Favoritado" : "Favoritar"}
          </Button>
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="outline" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full gap-1 p-1 bg-card border border-border/80 rounded-xl">
          <TabsTrigger value="outline" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm">
            <FileText className="h-4 w-4" /> Esboço
          </TabsTrigger>
          <TabsTrigger value="slides" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm">
            <Presentation className="h-4 w-4" /> Slides
          </TabsTrigger>
          <TabsTrigger value="script" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm">
            <BookOpen className="h-4 w-4" /> Roteiro
          </TabsTrigger>
          <TabsTrigger value="socials" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm">
            <Share2 className="h-4 w-4" /> Posts Sociais
          </TabsTrigger>
          <TabsTrigger value="extras" className="flex items-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm col-span-2 md:col-span-1">
            <Sparkles className="h-4 w-4" /> Sacadas
          </TabsTrigger>
        </TabsList>

        {/* 1. OUTLINE TAB */}
        <TabsContent value="outline" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Introduction Card */}
              <div className="bg-card/40 border border-border rounded-2xl p-6 backdrop-blur-sm space-y-3">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-gold" />
                  Introdução
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {sermon.introduction}
                </p>
              </div>

              {/* Main Outline Points */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 px-2">
                  <span className="w-1.5 h-6 rounded-full bg-gold" />
                  Desenvolvimento Homilético
                </h3>
                <div className="space-y-4">
                  {parsedOutline.map((point, index) => (
                    <div
                      key={index}
                      className="bg-card border border-border hover:border-gold/30 transition-all duration-300 rounded-2xl p-6 space-y-4"
                      style={{ boxShadow: "var(--shadow-card)" }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                        <h4 className="font-bold text-foreground text-md sm:text-lg">
                          {point.title}
                        </h4>
                        {point.keyVerse && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold border border-gold/20">
                            <BookOpen className="h-3 w-3" />
                            {point.keyVerse}
                          </span>
                        )}
                      </div>
                      <ul className="space-y-3 pl-1">
                        {point.subpoints.map((sub, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <ChevronRight className="h-4 w-4 shrink-0 text-gold/70 mt-0.5" />
                            <span className="leading-relaxed">{sub}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conclusion Card */}
              <div className="bg-card/40 border border-border rounded-2xl p-6 backdrop-blur-sm space-y-3">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-gold" />
                  Conclusão & Apelo
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {sermon.conclusion}
                </p>
              </div>
            </div>

            {/* Right Sidebar - Meta Details */}
            <div className="space-y-6">
              {/* Theme & Verses Card */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-foreground text-base border-b border-border/40 pb-3">
                  Textos Bíblicos Base
                </h3>
                <div className="space-y-4">
                  {parsedVerses.map((verse, vIdx) => (
                    <div key={vIdx} className="space-y-1 bg-accent/5 p-3 rounded-lg border border-border/40">
                      <div className="text-xs font-bold text-gold">{verse.reference}</div>
                      <p className="text-xs italic text-muted-foreground leading-relaxed">
                        "{verse.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                <h3 className="font-bold text-foreground text-base border-b border-border/40 pb-3">
                  Resumo Executivo
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {sermon.summary}
                </p>
              </div>

              {/* Keywords/Topics */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                <h3 className="font-bold text-foreground text-base border-b border-border/40 pb-3">
                  Tópicos Relacionados
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {parsedTopics.map((topic, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-xs rounded-full bg-muted border border-border px-2.5 py-1 text-muted-foreground font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. SLIDES TAB */}
        <TabsContent value="slides" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Esboço de Projeção (Slides)</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text = parsedSlides
                  .map((s) => `${s.title}\n${s.content.map((c) => `- ${c}`).join("\n")}`)
                  .join("\n\n");
                copyToClipboard(text, "slides");
              }}
            >
              {copiedId === "slides" ? (
                <>
                  <Check className="h-4 w-4 mr-1.5 text-green-400" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" /> Copiar Todos os Slides
                </>
              )}
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {parsedSlides.map((slide, idx) => (
              <div
                key={idx}
                className="relative aspect-[16/9] rounded-2xl border border-gold/30 bg-slate-950 p-6 flex flex-col justify-between overflow-hidden"
                style={{
                  background: "radial-gradient(ellipse at top right, rgba(212, 175, 55, 0.15), transparent 60%), #030712",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="space-y-4">
                  <div className="border-l-2 border-gold pl-3">
                    <span className="text-[10px] uppercase tracking-wider text-gold font-bold">Slide {idx + 1}</span>
                    <h4 className="text-base md:text-lg font-extrabold text-slate-100">{slide.title}</h4>
                  </div>
                  <ul className="space-y-2 pl-3">
                    {slide.content.map((bullet, bIdx) => (
                      <li key={bIdx} className="text-xs md:text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-gold mt-1">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-[10px] text-slate-500">
                  <span>PregAI Premium</span>
                  <span>{sermon.preacher_name}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 3. SCRIPT TAB */}
        <TabsContent value="script" className="mt-6 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground">Roteiro Escrito Completo</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(sermon.script, "script")}
              >
                {copiedId === "script" ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5 text-green-400" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" /> Copiar Roteiro
                  </>
                )}
              </Button>
            </div>
            <div className="text-sm md:text-base text-muted-foreground leading-relaxed space-y-4 max-w-3xl mx-auto whitespace-pre-wrap font-serif">
              {sermon.script}
            </div>
          </div>
        </TabsContent>

        {/* 4. SOCIAL POSTS TAB */}
        <TabsContent value="socials" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {parsedSocialPosts.map((post, pIdx) => (
              <div
                key={pIdx}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between space-y-4"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Share2 className="h-4 w-4 text-gold" />
                      {post.platform}
                    </span>
                    <span className="text-xs rounded-full bg-gold/10 text-gold px-2.5 py-0.5 border border-gold/20 font-semibold">
                      {post.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono bg-accent/5 p-3 rounded-lg border border-border/40">
                    {post.content}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => copyToClipboard(post.content, `social-${pIdx}`)}
                >
                  {copiedId === `social-${pIdx}` ? (
                    <>
                      <Check className="h-4 w-4 mr-1.5 text-green-400" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1.5" /> Copiar Postagem
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 5. EXTRAS / SACADAS TAB */}
        <TabsContent value="extras" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Impact Phrases */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-foreground text-md flex items-center gap-2 border-b border-border/40 pb-3">
                <Quote className="h-4 w-4 text-gold" />
                Frases de Impacto
              </h3>
              <div className="space-y-4">
                {parsedImpactPhrases.map((phrase, idx) => (
                  <div key={idx} className="flex gap-3 bg-muted/40 p-4 rounded-xl relative overflow-hidden border border-border/60">
                    <span className="text-4xl text-gold/20 font-serif leading-none absolute top-2 left-2">“</span>
                    <p className="text-sm font-medium text-foreground relative z-10 pl-3 leading-relaxed italic">
                      {phrase}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Applications & Suggested Titles */}
            <div className="space-y-6">
              {/* Applications */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-foreground text-md flex items-center gap-2 border-b border-border/40 pb-3">
                  <Sparkles className="h-4 w-4 text-gold" />
                  Aplicações Práticas
                </h3>
                <ul className="space-y-3">
                  {parsedApplications.map((app, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold text-xs font-bold mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{app}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Title Suggestions */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-foreground text-md flex items-center gap-2 border-b border-border/40 pb-3">
                  <FileText className="h-4 w-4 text-gold" />
                  Títulos Sugeridos
                </h3>
                <ul className="space-y-2">
                  {parsedTitleSuggestions.map((tSuggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-normal bg-accent/5 p-2 rounded-lg border border-border/40 font-semibold">
                      <span className="text-gold">•</span>
                      <span>{tSuggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
