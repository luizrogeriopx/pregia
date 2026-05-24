import { YoutubeTranscript } from "youtube-transcript";
import { Innertube, Log } from "youtubei.js";

/**
 * Utility functions to extract YouTube video content without relying on title,
 * channel, description, comments, or any promotional page metadata.
 */

const WATCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.7,en;q=0.6",
};

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
  extractionMethod: "library" | "innertube" | "caption-tracks" | "timedtext";
}

export interface YouTubeAudioData {
  audioBase64: string;
  mimeType: string;
  durationSeconds: number | null;
  contentLength: number | null;
  truncated: boolean;
}

const MAX_AUDIO_BYTES = 24 * 1024 * 1024;

/**
 * Fetches captions/transcripts using multiple strategies. The returned title and
 * author are deliberately sanitized so the AI and UI do not use channel/video metadata.
 */
export async function fetchYoutubeTranscript(videoId: string): Promise<YouTubeVideoData> {
  console.log(`[YouTube] Iniciando extração em camadas para o vídeo: ${videoId}`);

  const attempts: Array<{
    method: YouTubeVideoData["extractionMethod"];
    run: () => Promise<string>;
  }> = [
    { method: "library", run: () => fetchTranscriptWithLibrary(videoId, "pt") },
    { method: "library", run: () => fetchTranscriptWithLibrary(videoId) },
    { method: "innertube", run: () => fetchTranscriptFromInnertube(videoId) },
    { method: "caption-tracks", run: () => fetchTranscriptFromCaptionTracks(videoId) },
    { method: "timedtext", run: () => fetchTranscriptFromTimedText(videoId) },
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const transcript = normalizeTranscript(await attempt.run());
      if (transcript.length >= 80) {
        console.log(`[YouTube] Transcrição extraída via ${attempt.method} (${transcript.length} chars).`);
        return {
          transcript,
          title: "Esboço gerado do conteúdo do vídeo",
          author: "Conteúdo audiovisual",
          extractionMethod: attempt.method,
        };
      }
      errors.push(`${attempt.method}: conteúdo muito curto`);
    } catch (error: any) {
      const message = error?.message || String(error);
      console.warn(`[YouTube] Falha em ${attempt.method}:`, message);
      errors.push(`${attempt.method}: ${message}`);
    }
  }

  throw new Error(
    `Não foi possível extrair legendas/transcrição por métodos diretos. Tentaremos analisar o conteúdo audiovisual com IA. Detalhes técnicos: ${errors.join(" | ")}`
  );
}

export async function fetchYoutubeAudioForTranscription(videoId: string): Promise<YouTubeAudioData> {
  console.log(`[YouTube] Tentando extrair fluxo de áudio para STT: ${videoId}`);
  Log.setLevel(Log.Level.NONE);

  const innertube = await withTimeout(
    () => Innertube.create({ lang: "pt-BR", location: "BR", retrieve_player: false }),
    12000
  );
  const info: any = await withTimeout(() => innertube.getBasicInfo(videoId, { client: "IOS" }), 15000);
  const formats = info?.streaming_data?.adaptive_formats || [];
  const audioFormats = formats
    .filter((format: any) => format?.has_audio && !format?.has_video && format?.url)
    .sort((a: any, b: any) => Number(a.content_length || Infinity) - Number(b.content_length || Infinity));

  const selected = audioFormats.find((format: any) => String(format.mime_type || "").includes("mp4")) || audioFormats[0];
  if (!selected?.url) {
    throw new Error("Não foi possível localizar um fluxo de áudio público para este vídeo.");
  }

  const contentLength = Number(selected.content_length || 0) || null;
  const truncated = !!contentLength && contentLength > MAX_AUDIO_BYTES;
  const response = await withTimeout(
    () =>
      fetch(selected.url, {
        headers: {
          ...WATCH_HEADERS,
          Range: `bytes=0-${Math.min((contentLength || MAX_AUDIO_BYTES) - 1, MAX_AUDIO_BYTES - 1)}`,
        },
      }),
    30000
  );

  if (!response.ok && response.status !== 206) {
    throw new Error(`Falha ao baixar áudio do YouTube: HTTP ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  if (audioBuffer.byteLength < 1024) {
    throw new Error("O áudio extraído está vazio ou inválido.");
  }

  console.log(`[YouTube] Áudio extraído (${audioBuffer.byteLength} bytes, mime=${selected.mime_type}).`);
  return {
    audioBase64: arrayBufferToBase64(audioBuffer),
    mimeType: String(selected.mime_type || response.headers.get("content-type") || "audio/mp4").split(";")[0],
    durationSeconds: selected.approx_duration_ms ? Math.round(Number(selected.approx_duration_ms) / 1000) : null,
    contentLength,
    truncated,
  };
}

async function fetchTranscriptWithLibrary(videoId: string, lang?: string): Promise<string> {
  const transcriptData = await withTimeout(
    () => YoutubeTranscript.fetchTranscript(videoId, lang ? { lang } : undefined),
    10000
  );

  if (!transcriptData || transcriptData.length === 0) {
    throw new Error("No transcript found");
  }

  return transcriptData.map((item: any) => item.text).join(" ");
}

async function fetchTranscriptFromInnertube(videoId: string): Promise<string> {
  const response = await withTimeout(
    () =>
      fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: {
          ...WATCH_HEADERS,
          "Content-Type": "application/json",
          "X-YouTube-Client-Name": "1",
          "X-YouTube-Client-Version": "2.20240501.00.00",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240501.00.00",
              hl: "pt-BR",
              gl: "BR",
            },
          },
          videoId,
        }),
      }),
    12000
  );

  if (!response.ok) {
    throw new Error(`Innertube HTTP ${response.status}`);
  }

  const playerResponse = await response.json();
  return readBestCaptionTrack(playerResponse);
}

async function fetchTranscriptFromCaptionTracks(videoId: string): Promise<string> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=pt&gl=BR&bpctr=9999999999&has_verified=1`;
  const html = await fetchText(watchUrl, 12000);
  const playerResponse = extractPlayerResponse(html);
  return readBestCaptionTrack(playerResponse);
}

async function readBestCaptionTrack(playerResponse: any): Promise<string> {
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("Nenhuma faixa de legenda encontrada no player.");
  }

  const preferredTracks = [...tracks].sort((a: any, b: any) => scoreCaptionTrack(b) - scoreCaptionTrack(a));
  const trackErrors: string[] = [];

  for (const track of preferredTracks) {
    const baseUrl = decodeHtmlEntities(track.baseUrl || "");
    if (!baseUrl) continue;

    try {
      const jsonUrl = setUrlParam(baseUrl, "fmt", "json3");
      const jsonText = await fetchText(jsonUrl, 10000);
      const transcript = parseJson3Transcript(jsonText);
      if (transcript) return transcript;
    } catch (error: any) {
      trackErrors.push(error?.message || String(error));
    }

    try {
      const xmlUrl = setUrlParam(baseUrl, "fmt", "srv3");
      const xmlText = await fetchText(xmlUrl, 10000);
      const transcript = parseXmlTranscript(xmlText);
      if (transcript) return transcript;
    } catch (error: any) {
      trackErrors.push(error?.message || String(error));
    }
  }

  throw new Error(`Faixas encontradas, mas nenhuma pôde ser lida. ${trackErrors.join(" | ")}`);
}

async function fetchTranscriptFromTimedText(videoId: string): Promise<string> {
  const hosts = ["https://www.youtube.com/api/timedtext", "https://video.google.com/timedtext"];
  const languages = ["pt", "pt-BR", "en", "es"];
  const kinds = [undefined, "asr"];
  const errors: string[] = [];

  for (const host of hosts) {
    for (const lang of languages) {
      for (const kind of kinds) {
        const params = new URLSearchParams({ v: videoId, lang, fmt: "json3" });
        if (kind) params.set("kind", kind);
        try {
          const text = await fetchText(`${host}?${params.toString()}`, 8000);
          const transcript = parseJson3Transcript(text);
          if (transcript) return transcript;
        } catch (error: any) {
          errors.push(error?.message || String(error));
        }
      }
    }
  }

  throw new Error(`Timedtext indisponível. ${errors.slice(0, 4).join(" | ")}`);
}

function extractPlayerResponse(html: string): any {
  const markers = ["ytInitialPlayerResponse =", "ytInitialPlayerResponse="];

  for (const marker of markers) {
    const markerIndex = html.indexOf(marker);
    if (markerIndex === -1) continue;

    const start = html.indexOf("{", markerIndex);
    if (start === -1) continue;

    const json = extractBalancedJson(html, start);
    if (json) return JSON.parse(json);
  }

  throw new Error("Resposta do player não encontrada.");
}

function extractBalancedJson(source: string, startIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') inString = true;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return source.slice(startIndex, i + 1);
    }
  }

  return null;
}

function scoreCaptionTrack(track: any): number {
  const lang = String(track.languageCode || "").toLowerCase();
  let score = 0;
  if (lang === "pt-br") score += 120;
  else if (lang === "pt") score += 110;
  else if (lang.startsWith("pt")) score += 100;
  else if (lang === "en") score += 70;
  else if (lang === "es") score += 60;
  else score += 10;
  if (track.kind !== "asr") score += 15;
  return score;
}

function parseJson3Transcript(text: string): string {
  if (!text.trim() || text.trim().startsWith("<")) return "";
  const data = JSON.parse(text);
  const events = Array.isArray(data.events) ? data.events : [];
  return events
    .map((event: any) => {
      if (!Array.isArray(event.segs)) return "";
      return event.segs.map((seg: any) => seg.utf8 || "").join("");
    })
    .join(" ");
}

function parseXmlTranscript(text: string): string {
  const matches = [...text.matchAll(/<(?:text|s)[^>]*>([\s\S]*?)<\/(?:text|s)>/g)];
  return matches.map((match) => decodeHtmlEntities(match[1] || "")).join(" ");
}

function normalizeTranscript(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/\[(?:música|music|aplausos|applause|risos|laughter)\]/gi, " ")
    .replace(/\b(?:inscreva-se|deixe o like|ative o sininho|compartilhe este vídeo)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function setUrlParam(rawUrl: string, key: string, value: string): string {
  const url = new URL(rawUrl);
  url.searchParams.set(key, value);
  return url.toString();
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const response = await withTimeout(
    () =>
      fetch(url, {
        headers: WATCH_HEADERS,
      }),
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Timeout ao acessar o YouTube")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
