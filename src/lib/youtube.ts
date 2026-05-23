import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Utility functions to extract YouTube video metadata and transcripts.
 */

/**
 * Extracts the 11-character YouTube video ID from a variety of URL formats.
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Robust regex for various YouTube URL formats (watch, shorts, live, embed, youtu.be)
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Fallback for raw 11-char IDs
  const cleanId = url.trim();
  if (cleanId.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(cleanId)) {
    return cleanId;
  }
  
  return null;
}

interface YouTubeVideoData {
  transcript: string;
  title: string;
  author: string;
}

/**
 * Fetches YouTube video metadata via oEmbed and transcript via specialized library.
 * This approach is more robust against rate limiting and IP blocks.
 */
export async function fetchYoutubeTranscript(videoId: string): Promise<YouTubeVideoData> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // 1. Fetch Metadata via oEmbed (Official YouTube endpoint)
  let title = "Vídeo do YouTube";
  let author = "Pregador";
  
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) {
      const data = await res.json();
      title = data.title || title;
      author = data.author_name || author;
    }
  } catch (err) {
    console.error("[YouTube Metadata Error]:", err);
  }

  // 2. Fetch Transcript
  console.log(`[YouTube] Iniciando extração de transcrição para o vídeo: ${videoId}`);
  
  try {
    // Strategy 1: Attempt using the library directly with videoId
    let transcriptData = null;
    
    const fetchWithTimeout = async (vId: string, lang?: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        return await YoutubeTranscript.fetchTranscript(vId, lang ? { lang } : undefined);
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      transcriptData = await fetchWithTimeout(videoId, 'pt');
    } catch (e) {
      console.warn(`[YouTube] Falha em PT para ${videoId}, tentando sem idioma...`);
      try {
        transcriptData = await fetchWithTimeout(videoId);
      } catch (e2) {
        console.error(`[YouTube] Falha total na extração para ${videoId}:`, e2);
      }
    }

    if (!transcriptData || transcriptData.length === 0) {
       throw new Error("No transcript found");
    }

    const transcript = transcriptData
      .map((t: any) => t.text)
      .join(' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    return {
      transcript,
      title,
      author
    };
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.error(`[YouTube Transcript Error] [Video: ${videoId}]:`, errorMessage);
    
    const lowError = errorMessage.toLowerCase();
    
    if (lowError.includes('transcript is disabled') || lowError.includes('no transcript found')) {
      throw new Error("Não conseguimos encontrar as legendas para este vídeo. Verifique se o vídeo possui legendas (mesmo as automáticas) ativadas diretamente no YouTube.");
    }
    
    if (lowError.includes('captcha') || lowError.includes('too many requests') || lowError.includes('429')) {
      throw new Error("O YouTube bloqueou temporariamente o acesso por excesso de tráfego. Por favor, tente novamente em instantes.");
    }
    
    throw new Error("Não foi possível extrair a transcrição deste vídeo. Tente usar um vídeo diferente ou verifique se as legendas estão disponíveis no link original.");
  }
}
