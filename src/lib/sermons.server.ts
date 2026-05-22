import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractYoutubeVideoId, fetchYoutubeTranscript } from "./youtube";
import { generateSermonAnalysis } from "./gemini";

/**
 * Server Function to analyze a YouTube video URL and generate a sermon outline.
 * Secured by requireSupabaseAuth middleware.
 */
export const generateSermonFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((url: unknown) => {
    if (typeof url !== "string" || !url.trim()) {
      throw new Error("Uma URL válida do YouTube deve ser informada.");
    }
    return url.trim();
  })
  .handler(async ({ data: url, context }) => {
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
      // Check monthly usage for Free users
      const { data: usage, error: usageError } = await supabase
        .from("monthly_usage")
        .select("id, analyses_count")
        .eq("user_id", userId)
        .eq("year_month", currentMonth)
        .maybeSingle();

      if (usageError) {
        console.error("[Limit Check] Erro ao buscar uso mensal:", usageError);
      }

      if (usage && usage.analyses_count >= 3) {
        throw new Error(
          "Você atingiu o limite de 3 análises gratuitas deste mês. Faça upgrade para o plano Pro para ter análises ilimitadas!"
        );
      }
      usageRow = usage;
    }

    // 3. Extract Transcript & Metadata from YouTube
    let ytData;
    try {
      ytData = await fetchYoutubeTranscript(videoId);
    } catch (error: any) {
      console.error("[YouTube Scraping Error] Falha ao extrair transcrição:", error);
      throw new Error(error?.message || "Falha ao extrair áudio ou transcrição do vídeo. Certifique-se de que o vídeo possui legendas.");
    }

    // 4. Generate AI Sermon Analysis via Gemini
    let aiAnalysis;
    try {
      aiAnalysis = await generateSermonAnalysis(ytData.transcript, ytData.title, ytData.author);
    } catch (error: any) {
      console.error("[Gemini AI Error] Falha ao gerar análise:", error);
      throw new Error("Erro ao gerar a análise de inteligência artificial da pregação.");
    }

    // 5. Save Sermon to Supabase Database
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

    // 6. Increment Monthly Usage if Free Plan
    if (!isPro) {
      if (usageRow) {
        // Update existing row
        const { error: updateError } = await supabase
          .from("monthly_usage")
          .update({ analyses_count: usageRow.analyses_count + 1 })
          .eq("id", usageRow.id);
        
        if (updateError) {
          console.error("[Limit Update Error] Falha ao atualizar uso mensal:", updateError);
        }
      } else {
        // Insert new row
        const { error: createError } = await supabase
          .from("monthly_usage")
          .insert({
            user_id: userId,
            year_month: currentMonth,
            analyses_count: 1,
          });

        if (createError) {
          console.error("[Limit Create Error] Falha ao criar uso mensal:", createError);
        }
      }
    }

    return { id: sermon.id };
  });
