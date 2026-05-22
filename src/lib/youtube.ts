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
 * Fetches the YouTube watch page, extracts subtitles/captions URL and metadata,
 * and parses the captions XML into plain text.
 */
export async function fetchYoutubeTranscript(videoId: string): Promise<YouTubeVideoData> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const response = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    throw new Error(`Não foi possível acessar a página do YouTube (Status: ${response.status})`);
  }

  const html = await response.text();

  // Try to find the title from HTML tags
  let title = "";
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  if (titleMatch) {
    title = titleMatch[1].replace(" - YouTube", "").trim();
  }

  // Find ytInitialPlayerResponse JSON
  const regex = /ytInitialPlayerResponse\s*=\s*({.+?});/s;
  const match = html.match(regex);
  if (!match) {
    throw new Error(
      "Não foi possível obter os dados internos do vídeo. O vídeo pode ser privado, restrito ou não permitir carregamento automatizado."
    );
  }

  let playerResponse: any;
  try {
    // Extract JSON safely by trimming outer bounds if needed
    let jsonStr = match[1].trim();
    playerResponse = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error("Erro ao analisar os metadados do vídeo do YouTube.");
  }

  // Extract author (preacher/channel name) and real title
  const videoDetails = playerResponse.videoDetails;
  const author = videoDetails?.author || "Pregador Desconhecido";
  if (videoDetails?.title) {
    title = videoDetails.title;
  }

  const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) {
    throw new Error(
      "Nenhuma legenda ou transcrição foi encontrada para este vídeo. Certifique-se de que o vídeo possui legendas ativadas."
    );
  }

  // Prioritize Portuguese (pt, pt-BR), then English (en), then first available track
  let track = captionTracks.find((t: any) => t.languageCode === "pt" || t.languageCode === "pt-BR");
  if (!track) {
    track = captionTracks.find((t: any) => t.languageCode.startsWith("pt"));
  }
  if (!track) {
    track = captionTracks.find((t: any) => t.languageCode.startsWith("en"));
  }
  if (!track) {
    track = captionTracks[0];
  }

  const captionUrl = track.baseUrl;
  if (!captionUrl) {
    throw new Error("Não foi possível localizar o endereço da transcrição de áudio.");
  }

  // Fetch the XML captions
  const captionResponse = await fetch(captionUrl);
  if (!captionResponse.ok) {
    throw new Error(`Não foi possível baixar a legenda selecionada (Status: ${captionResponse.status})`);
  }

  const xmlText = await captionResponse.text();

  // Parse the XML <text start="X" dur="Y">text</text> tags
  const textRegex = /<text[^>]*>(.*?)<\/text>/g;
  let textMatch;
  const transcriptParts: string[] = [];

  while ((textMatch = textRegex.exec(xmlText)) !== null) {
    // Decode basic HTML entities that commonly appear in subtitles
    const rawText = textMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;#39;/g, "'")
      .replace(/&#10;/g, " ") // newlines
      .replace(/\n/g, " ");
    
    transcriptParts.push(rawText);
  }

  const transcript = transcriptParts.join(" ").replace(/\s+/g, " ").trim();
  if (!transcript) {
    throw new Error("A transcrição obtida está vazia ou sem texto legível.");
  }

  return {
    transcript,
    title,
    author,
  };
}
