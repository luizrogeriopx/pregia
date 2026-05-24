import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractYoutubeVideoId, fetchYoutubeAudioForTranscription, fetchYoutubeTranscript } from "./youtube";
import { generateSermonAnalysis, generateSermonAnalysisFromAudio } from "./gemini";

/**
 * Update editable fields on a sermon owned by the authenticated user.
 */
export const updateSermonFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const data = input as {
      id?: string;
      video_title?: string;
      introduction?: string;
      summary?: string;
      conclusion?: string;
      topics?: string[];
    };
    if (!data?.id || typeof data.id !== "string") {
      throw new Error("ID do esboço é obrigatório.");
    }
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: any; context: any }) => {
    const { supabase, userId } = context;
    const updates: Record<string, any> = {};
    if (typeof data.video_title === "string") updates.video_title = data.video_title.trim().slice(0, 300);
    if (typeof data.introduction === "string") updates.introduction = data.introduction;
    if (typeof data.summary === "string") updates.summary = data.summary;
    if (typeof data.conclusion === "string") updates.conclusion = data.conclusion;
    if (Array.isArray(data.topics)) updates.topics = data.topics.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 30);

    const { error } = await supabase
      .from("sermons")
      .update(updates)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Generate an image from a social-media post using Lovable AI Gateway (Nano Banana).
 * Returns a data URL the client can preview and download.
 */
export const generatePostImageFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const data = input as { content?: string; platform?: string };
    if (!data?.content || typeof data.content !== "string") {
      throw new Error("Conteúdo do post é obrigatório.");
    }
    return { content: data.content.slice(0, 2000), platform: data.platform || "Instagram" };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: { data: { content: string; platform: string } }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const prompt = `Crie uma imagem de post para ${data.platform} no formato quadrado (1:1), com design cristão moderno, tipografia elegante, paleta sóbria com toques dourados e atmosfera inspiradora. Inclua de forma legível a seguinte frase/texto central da publicação:\n\n"""${data.content}"""\n\nA imagem deve ter alto contraste, ser bonita para redes sociais e transmitir reverência e esperança. Sem marcas d'água.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha ao gerar imagem: ${response.status} ${errText.slice(0, 200)}`);
    }

    const json: any = await response.json();
    const imageUrl = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) throw new Error("A IA não retornou uma imagem.");
    return { imageUrl };
  });

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
      console.warn("[YouTube Scraping Warning] Transcrição indisponível; extraindo áudio para Speech-to-Text:", error);
    }

    // 4. Generate AI Sermon Analysis from transcript, or extract audio and run Speech-to-Text first.
    let aiAnalysis;
    try {
      console.log(`[Sermon] Iniciando geração via IA (modo=${transcriptAvailable ? "transcrição" : "áudio-stt"}).`);
      if (transcriptAvailable) {
        aiAnalysis = await generateSermonAnalysis(ytData.transcript, ytData.title, ytData.author);
      } else {
        const audio = await fetchYoutubeAudioForTranscription(videoId);
        aiAnalysis = await generateSermonAnalysisFromAudio(audio.audioBase64, audio.mimeType);
      }
      console.log(`[Sermon] Análise concluída pela IA.`);
    } catch (error: any) {
      console.error("[Gemini AI Error] Falha ao gerar análise:", error);
      throw new Error(error?.message || "Erro ao gerar a análise da pregação. Nenhum crédito de esboço foi consumido porque o material não foi salvo.");
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
      throw new Error(`Erro ao salvar o esboço no seu histórico: ${insertError.message}`);
    }

    // 6. Increment Monthly Usage is bypassed as we now enforce a hard lifetime limit of 3 outlines for Free plan

    return { id: sermon.id };
  });
