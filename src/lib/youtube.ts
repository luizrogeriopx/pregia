import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Utility functions to extract YouTube video metadata and transcripts.
 */

/**
 * Extracts the 11-character YouTube video ID from a variety of URL formats.
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle watch, short, embed, live, and mobile URLs
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/live\/|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return match[2];
  }
  
  // Backup simple checks for raw 11-char IDs
  const cleanUrl = url.trim();
  if (cleanUrl.length === 11 && !cleanUrl.includes('/') && !cleanUrl.includes('.')) {
    return cleanUrl;
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
  
  // 1. Fetch Metadata via oEmbed (Official YouTube endpoint, highly reliable)
  let title = "Vídeo do YouTube";
  let author = "Pregador Desconhecido";
  
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      title = data.title || title;
      author = data.author_name || author;
    }
  } catch (err) {
    console.error("[YouTube Metadata] Erro ao buscar oEmbed:", err);
    // Continue anyway, metadata is secondary to the transcript
  }

  // 2. Fetch Transcript via specialized library
  try {
    // We try to fetch in Portuguese first, then English, then whatever is available
    const transcriptData = await YoutubeTranscript.fetchTranscript(watchUrl, {
      lang: 'pt' 
    }).catch(async (err) => {
      // If pt fails, try without language specification to get default
      console.warn("[YouTube Transcript] Falha ao buscar em PT, tentando padrão:", err.message);
      return await YoutubeTranscript.fetchTranscript(watchUrl);
    });
    
    const transcript = transcriptData
      .map(t => t.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
      
    if (!transcript) {
      throw new Error("A transcrição obtida está vazia.");
    }

    return {
      transcript,
      title,
      author
    };
  } catch (err: any) {
    console.error("[YouTube Transcript] Erro fatal:", err);
    
    const errorMessage = err?.message || "";
    
    const lowError = errorMessage.toLowerCase();
    
    if (lowError.includes('transcript is disabled') || lowError.includes('no transcript found')) {
      throw new Error("As legendas estão desativadas ou não foram encontradas para este vídeo. O PregAI precisa de vídeos com legendas disponíveis para realizar a análise.");
    }
    
    if (lowError.includes('captcha') || lowError.includes('too many requests') || lowError.includes('429')) {
      throw new Error("O YouTube limitou o acesso temporariamente devido ao alto volume de pedidos. Por favor, tente novamente em alguns minutos ou com outro vídeo.");
    }
    
    throw new Error("Não foi possível extrair a transcrição. Verifique se o vídeo é público e possui legendas/transcrição ativa nas configurações do YouTube.");
  }
}
