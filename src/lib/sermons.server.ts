import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractYoutubeVideoId, fetchYoutubeTranscript } from "./youtube";
import { generateSermonAnalysis, generateSermonAnalysisFromVideo } from "./gemini";

/**
 * Server Function to analyze a YouTube video URL and generate a sermon outline.
 * Secured by requireSupabaseAuth middleware.
 */
export const generateSermonFn = createServerFn({ method: "POST" })
  .inputValidator((url: unknown) => {
    if (typeof url !== "string" || !url.trim()) {
      throw new Error("Uma URL válida do YouTube deve ser informada.");
    }
    return url.trim();
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: url, context }: { data: string; context: any }) => {
    const { supabase, userId } = context;

    // 1. Extract YouTube Video ID
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      throw new Error("URL do YouTube inválida ou não reconhecida. Por favor, cole um link válido.");
    }

    // 2. Check Plan & Limits
    const currentMonth = new Date().toISOString().substring(0, 7); // Format: YYYY-MM
    
    // Fetch user's subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    const isPro = subscription?.plan === "pro" && subscription?.status === "active";

    let usageRow: any = null;

    if (!isPro) {
      // Check total lifetime usage for Free users (limit to 3 outlines ever)
      const { count, error: countError } = await supabase
        .from("sermons")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countError) {
        console.error("[Limit Check] Erro ao contar esboços salvos:", countError);
      }

      if (count !== null && count >= 3) {
        throw new Error(
          "Você atingiu o limite vitalício de 3 esboços gratuitos do plano Free. Faça upgrade para o plano Pro para continuar gerando esboços de forma ilimitada!"
        );
      }
    }

    // 3. Extract captions/transcript from YouTube when available.
    let ytData = {
      transcript: "",
      title: "Esboço gerado do conteúdo do vídeo",
      author: "Conteúdo audiovisual",
    };
    let transcriptAvailable = false;

    try {
      ytData = await fetchYoutubeTranscript(videoId);
      transcriptAvailable = true;
      console.log(`[Sermon] Transcrição obtida (${ytData.transcript.length} chars).`);
    } catch (error: any) {
      console.warn("[YouTube Scraping Warning] Transcrição indisponível; usando análise audiovisual direta:", error);
    }

    // 4. Generate AI Sermon Analysis from transcript or directly from the video/audio.
    let aiAnalysis;
    try {
      console.log(`[Sermon] Iniciando geração via IA (modo=${transcriptAvailable ? "transcrição" : "vídeo"}).`);
      aiAnalysis = transcriptAvailable
        ? await generateSermonAnalysis(ytData.transcript, ytData.title, ytData.author)
        : await generateSermonAnalysisFromVideo(`https://www.youtube.com/watch?v=${videoId}`);
      console.log(`[Sermon] Análise concluída pela IA.`);
    } catch (error: any) {
      console.error("[Gemini AI Error] Falha ao gerar análise:", error);
      throw new Error(error?.message || "Erro ao gerar a análise de inteligência artificial da pregação.");
    }

    // 5. Save Sermon to Supabase Database
    console.log(`[Sermon] Salvando esboço no banco para user ${userId}.`);
    const { data: sermon, error: insertError } = await supabase
      .from("sermons")
      .insert({
        user_id: userId,
        youtube_url: url,
        video_title: ytData.title,
        preacher_name: ytData.author,
        theme: aiAnalysis.theme,
        verses: aiAnalysis.verses,
        summary: aiAnalysis.summary,
        introduction: aiAnalysis.introduction,
        outline: aiAnalysis.outline,
        topics: aiAnalysis.topics,
        conclusion: aiAnalysis.conclusion,
        applications: aiAnalysis.applications,
        impact_phrases: aiAnalysis.impact_phrases,
        script: aiAnalysis.script,
        title_suggestions: aiAnalysis.title_suggestions,
        related_themes: aiAnalysis.related_themes,
        social_posts: aiAnalysis.social_posts,
        slides: aiAnalysis.slides,
        is_favorite: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Database Error] Falha ao inserir sermão:", insertError);
      throw new Error("Erro ao salvar o esboço no seu histórico. Tente novamente.");
    }

    // 6. Increment Monthly Usage is bypassed as we now enforce a hard lifetime limit of 3 outlines for Free plan

    return { id: sermon.id };
  });
