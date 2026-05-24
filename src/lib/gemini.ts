/**
 * Integration with Gemini API to generate structured sermon analysis.
 */

export interface SermonAnalysis {
  theme: string;
  verses: Array<{ reference: string; text: string }>;
  summary: string;
  introduction: string;
  outline: Array<{ title: string; subpoints: string[]; keyVerse?: string }>;
  topics: string[];
  conclusion: string;
  applications: string[];
  impact_phrases: string[];
  script: string;
  title_suggestions: string[];
  related_themes: string[];
  social_posts: Array<{ platform: string; type: string; content: string }>;
  slides: Array<{ title: string; content: string[] }>;
}

const SERMON_SCHEMA = {
  type: "OBJECT",
  properties: {
    theme: { type: "STRING", description: "O tema teológico central da pregação" },
    verses: {
      type: "ARRAY",
      description: "Lista de versículos bíblicos citados ou que servem de base. Sempre retorne objetos com reference e text; nunca retorne apenas strings.",
      items: {
        type: "OBJECT",
        properties: {
          reference: { type: "STRING", description: "Ex: João 3:16" },
          text: { type: "STRING", description: "Texto completo do versículo" }
        },
        required: ["reference", "text"]
      }
    },
    summary: { type: "STRING", description: "Um resumo conciso de um parágrafo da mensagem" },
    introduction: { type: "STRING", description: "Introdução cativante para o esboço da pregação" },
    outline: {
      type: "ARRAY",
      description: "O esboço homilético estruturado em tópicos principais",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Título do ponto principal (Ex: 1. A Necessidade da Graça)" },
          subpoints: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "2 a 4 pontos de desenvolvimento ou reflexão prática para este ponto"
          },
          keyVerse: { type: "STRING", description: "Referência bíblica opcional de apoio" }
        },
        required: ["title", "subpoints"]
      }
    },
    topics: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Palavras-chave ou tópicos curtos (Ex: Graça, Fé, Redenção)"
    },
    conclusion: {
      type: "STRING",
      description: "Conclusão da pregação com um apelo ou reflexão final forte"
    },
    applications: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "3 a 5 aplicações práticas da mensagem para a vida diária do ouvinte"
    },
    impact_phrases: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "3 a 5 frases curtas, marcantes e inspiradoras ditas ou inspiradas pela pregação"
    },
    script: {
      type: "STRING",
      description: "Um roteiro ou texto narrado completo expandido da pregação baseada no esboço estruturado"
    },
    title_suggestions: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "3 a 5 sugestões de títulos alternativos atraentes para esta pregação"
    },
    related_themes: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "3 temas teológicos ou ministeriais relacionados para estudo futuro"
    },
    social_posts: {
      type: "ARRAY",
      description: "Sugestões de postagens para redes sociais baseadas na pregação",
      items: {
        type: "OBJECT",
        properties: {
          platform: { type: "STRING", description: "Ex: Instagram, Threads, Facebook" },
          type: { type: "STRING", description: "Ex: Feed Devocional, Reels Script, Carrossel" },
          content: { type: "STRING", description: "Conteúdo completo do post, com quebras de linha e emojis" }
        },
        required: ["platform", "type", "content"]
      }
    },
    slides: {
      type: "ARRAY",
      description: "Esboço de slides para projeção no culto",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Título do slide (Ex: Slide 1: Título e Tema)" },
          content: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Frases curtas ou tópicos para exibir no slide"
          }
        },
        required: ["title", "content"]
      }
    }
  },
  required: [
    "theme",
    "verses",
    "summary",
    "introduction",
    "outline",
    "topics",
    "conclusion",
    "applications",
    "impact_phrases",
    "script",
    "title_suggestions",
    "related_themes",
    "social_posts",
    "slides"
  ]
};

/**
 * Calls Gemini API to analyze the transcript and generate structured JSON.
 * Falls back to highly realistic mock data if API key is missing.
 */
export async function generateSermonAnalysis(
  transcript: string,
  videoTitle: string,
  preacher: string
): Promise<SermonAnalysis> {
  const cleanTranscript = sanitizeSourceContent(transcript);
  const userPrompt = `Abaixo está a transcrição bruta extraída do áudio de uma pregação. Extraia apenas o miolo teológico e produza um esboço homilético novo e autêntico.\n\nTRANSCRIÇÃO (use só o conteúdo espiritual/bíblico; ignore vinhetas, saudações, pedidos de like/inscrição, propagandas e menções a canal ou pregador):\n"""\n${transcript.slice(0, 45000)}\n"""`;

  return requestSermonAnalysis(userPrompt.replace(transcript.slice(0, 45000), cleanTranscript.slice(0, 45000)), 0.85);
}

export async function generateSermonAnalysisFromVideo(videoUrl: string): Promise<SermonAnalysis> {
  console.warn(`[Lovable AI] Tentativa de análise direta de vídeo bloqueada (sem áudio extraído): ${videoUrl}`);
  throw new Error("Não foi possível extrair o áudio deste vídeo para transcrição.");
}

export async function generateSermonAnalysisFromAudio(audioBase64: string, mimeType: string): Promise<SermonAnalysis> {
  const transcript = await transcribeAudioContent(audioBase64, mimeType);
  return generateSermonAnalysis(transcript, "Esboço gerado do conteúdo do áudio", "Conteúdo audiovisual");
}

async function transcribeAudioContent(audioBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Serviço de IA indisponível no momento.");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcreva fielmente somente a fala humana deste áudio em português brasileiro. Ignore música, vinhetas, nomes de canal, pedidos de inscrição/like e comentários promocionais. Retorne apenas a transcrição limpa, sem resumo.",
            },
            {
              type: "file",
              file: {
                filename: mimeType.includes("webm") ? "audio.webm" : "audio.mp4",
                file_data: `data:${mimeType};base64,${audioBase64}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[Lovable AI STT Error] Status: ${response.status}. Body:`, errBody);
    throw new Error("Falha ao transcrever o áudio do vídeo.");
  }

  const resJson = await response.json();
  const transcript = sanitizeSourceContent(String(resJson?.choices?.[0]?.message?.content || ""));
  if (transcript.length < 80) {
    throw new Error("A IA não encontrou fala suficiente no áudio extraído para gerar um esboço confiável.");
  }
  console.log(`[Lovable AI STT] Transcrição gerada a partir do áudio (${transcript.length} chars).`);
  return transcript;
}

async function requestSermonAnalysis(
  userContent: string | Array<Record<string, unknown>>,
  temperature: number,
  timeoutMs = 55000
): Promise<SermonAnalysis> {
  const apiKey = process.env.LOVABLE_API_KEY;

  if (!apiKey) {
    throw new Error("Serviço de IA indisponível no momento.");
  }

  const systemPrompt = `Você é um teólogo experiente, pastor auxiliar e especialista em homilética cristã reformada. Sua tarefa é produzir um esboço homilético ORIGINAL, AUTÊNTICO e EXCLUSIVO a partir EXCLUSIVAMENTE do conteúdo teológico/bíblico falado na transcrição, áudio ou vídeo de uma pregação.

REGRAS ABSOLUTAS E INEGOCIÁVEIS:
1. NUNCA mencione, cite ou faça referência a: nome do pregador, nome do canal do YouTube, nome da igreja/ministério, nome de outros vídeos, pedidos de inscrição/like/compartilhamento, comentários, descrição do vídeo, links, redes sociais do autor original ou qualquer metadado promocional. Se aparecer na transcrição, IGNORE.
2. NÃO copie frases literais da transcrição. REINTERPRETE, REESCREVA e REESTRUTURE todo o conteúdo com vocabulário próprio, mantendo somente a essência teológica/bíblica das ideias.
3. O esboço deve ser AUTORAL: novas frases de impacto, novas aplicações práticas, novos exemplos quando úteis — nunca uma cópia ou paráfrase superficial do vídeo original.
4. Use somente os versículos bíblicos citados ou claramente aludidos no áudio; se nenhum for citado, escolha passagens canônicas alinhadas ao tema central detectado.
5. Escreva em português brasileiro claro, reverente, com profundidade teológica acessível.
6. Em NENHUM campo (theme, summary, introduction, outline, script, slides, social_posts, etc.) cite o autor original, canal ou origem do vídeo. Trate o material como pregação inédita produzida pelo próprio usuário.
7. Retorne ESTRITAMENTE um JSON válido conforme o schema fornecido pela ferramenta — sem texto antes ou depois.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    console.log(`[Lovable AI] Iniciando requisição (temperature=${temperature}, contentType=${typeof userContent === "string" ? "text" : "multimodal"})`);

    const useJsonMode = Array.isArray(userContent);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `${systemPrompt}\n\nQuando não houver chamada de ferramenta disponível, responda como JSON puro contendo exatamente estes campos obrigatórios: ${SERMON_SCHEMA.required.join(", ")}.` },
          { role: "user", content: userContent },
        ],
        ...(useJsonMode
          ? { response_format: { type: "json_object" } }
          : {
              tools: [
                {
                  type: "function",
                  function: {
                    name: "render_sermon_outline",
                    description: "Retorna o esboço homilético estruturado e original.",
                    parameters: toJsonSchema(SERMON_SCHEMA),
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "render_sermon_outline" } },
            }),
        temperature,
        max_tokens: 8192,
      }),
    }).finally(() => clearTimeout(timeoutId));

    console.log(`[Lovable AI] Resposta recebida com status ${response.status}`);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[Lovable AI Error] Status: ${response.status}. Body:`, errBody);
      if (response.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
      if (response.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na IA: ${response.statusText}`);
    }

    const resJson = await response.json();
    const analysis = parseSermonResponse(resJson);
    if (analysis) return await enrichVerseTexts(analysis);

    const toolCall = resJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args || args === "null") {
      console.error("[Lovable AI Error] Resposta sem tool_call nem conteúdo. Payload:", JSON.stringify(resJson).slice(0, 500));
      throw new Error("Resposta da IA sem conteúdo estruturado.");
    }
    return await enrichVerseTexts(assertValidSermonAnalysis(JSON.parse(args)));
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.error(`[Lovable AI Error] Timeout após ${timeoutMs}ms aguardando a IA.`);
      throw new Error("A IA demorou demais para responder. Tente novamente com um vídeo mais curto ou aguarde alguns instantes antes de tentar de novo.");
    }
    console.error("[Lovable AI Error] Falha ao gerar análise:", error);
    throw error;
  }
}

/**
 * Converts the Gemini-style UPPERCASE schema into JSON Schema (lowercase) for OpenAI tool calling.
 */
function toJsonSchema(node: any): any {
  if (Array.isArray(node)) return node.map(toJsonSchema);
  if (node && typeof node === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "type" && typeof v === "string") {
        out.type = v.toLowerCase();
      } else {
        out[k] = toJsonSchema(v);
      }
    }
    return out;
  }
  return node;
}

function parseSermonResponse(resJson: any): SermonAnalysis | null {
  const message = resJson?.choices?.[0]?.message;
  const toolArgs = message?.tool_calls?.[0]?.function?.arguments;
  const rawContent = typeof message?.content === "string" ? message.content : "";
  const candidates = [toolArgs, rawContent, extractJsonObject(rawContent)].filter(
    (value): value is string => typeof value === "string" && value.trim() !== "" && value.trim() !== "null"
  );

  for (const candidate of candidates) {
    try {
      return assertValidSermonAnalysis(JSON.parse(candidate));
    } catch (error) {
      console.warn("[Lovable AI] Candidato JSON inválido, tentando próximo formato.", error);
    }
  }

  return null;
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function assertValidSermonAnalysis(value: any): SermonAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error("Resposta da IA vazia ou inválida.");
  }

  const fallback = generateMockAnalysis();
  return {
    theme: ensureString(value.theme, fallback.theme),
    verses: normalizeVerses(
      value.verses ?? value.base_verses ?? value.key_verses ?? value.biblical_texts ?? value.scriptures,
      fallback.verses
    ),
    summary: ensureString(value.summary, fallback.summary),
    introduction: ensureString(value.introduction, fallback.introduction),
    outline: normalizeOutline(value.outline, fallback.outline),
    topics: ensureArray(value.topics, fallback.topics),
    conclusion: ensureString(value.conclusion, fallback.conclusion),
    applications: ensureArray(value.applications, fallback.applications),
    impact_phrases: ensureArray(value.impact_phrases, fallback.impact_phrases),
    script: ensureString(value.script, fallback.script),
    title_suggestions: ensureArray(value.title_suggestions, fallback.title_suggestions),
    related_themes: ensureArray(value.related_themes, fallback.related_themes),
    social_posts: ensureArray(value.social_posts, fallback.social_posts),
    slides: normalizeSlides(value.slides, fallback.slides),
  };
}

function ensureString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function ensureArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) && value.length > 0 ? (value as T[]) : fallback;
}

function normalizeVerses(
  value: unknown,
  fallback: Array<{ reference: string; text: string }>
): Array<{ reference: string; text: string }> {
  if (!Array.isArray(value) || value.length === 0) return fallback;

  const normalized = value
    .map((item: any) => {
      if (typeof item === "string") {
        const reference = item.trim();
        return reference ? { reference, text: "Texto bíblico base identificado na pregação." } : null;
      }

      if (!item || typeof item !== "object") return null;

      const reference = ensureString(
        item.reference ?? item.ref ?? item.verse ?? item.citation ?? item.passage ?? item.texto,
        ""
      );
      const text = ensureString(
        item.text ?? item.content ?? item.verse_text ?? item.biblical_text ?? item.texto_biblico,
        "Texto bíblico base identificado na pregação."
      );

      return reference ? { reference, text } : null;
    })
    .filter(Boolean) as Array<{ reference: string; text: string }>;

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeOutline(
  value: unknown,
  fallback: Array<{ title: string; subpoints: string[]; keyVerse?: string }>
): Array<{ title: string; subpoints: string[]; keyVerse?: string }> {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const normalized = value
    .map((item: any) => {
      if (!item || typeof item !== "object") return null;
      const title =
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : typeof item.point === "string" && item.point.trim()
            ? item.point.trim()
            : typeof item.heading === "string" && item.heading.trim()
              ? item.heading.trim()
              : "";
      const rawSubs = Array.isArray(item.subpoints)
        ? item.subpoints
        : Array.isArray(item.sub_points)
          ? item.sub_points
          : Array.isArray(item.points)
            ? item.points
            : [];
      const subpoints = rawSubs
        .map((s: any) => (typeof s === "string" ? s : s?.text ?? s?.content ?? ""))
        .filter((s: string) => typeof s === "string" && s.trim().length > 0);
      const keyVerse =
        typeof item.keyVerse === "string"
          ? item.keyVerse
          : typeof item.key_verse === "string"
            ? item.key_verse
            : typeof item.verse === "string"
              ? item.verse
              : undefined;
      if (!title) return null;
      return { title, subpoints, ...(keyVerse ? { keyVerse } : {}) };
    })
    .filter(Boolean) as Array<{ title: string; subpoints: string[]; keyVerse?: string }>;
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeSlides(
  value: unknown,
  fallback: Array<{ title: string; content: string[] }>
): Array<{ title: string; content: string[] }> {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const normalized = value
    .map((item: any) => {
      if (!item || typeof item !== "object") return null;
      const title =
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : typeof item.heading === "string"
            ? item.heading.trim()
            : "";
      const rawContent = Array.isArray(item.content)
        ? item.content
        : Array.isArray(item.bullets)
          ? item.bullets
          : Array.isArray(item.points)
            ? item.points
            : typeof item.content === "string"
              ? [item.content]
              : [];
      const content = rawContent
        .map((c: any) => (typeof c === "string" ? c : c?.text ?? ""))
        .filter((c: string) => typeof c === "string" && c.trim().length > 0);
      if (!title) return null;
      return { title, content };
    })
    .filter(Boolean) as Array<{ title: string; content: string[] }>;
  return normalized.length > 0 ? normalized : fallback;
}

function sanitizeSourceContent(text: string): string {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((part) => {
      const normalized = part.toLowerCase();
      return !/(\bcanal\b|inscrev|like|sininho|compartilh|coment[aá]rio|descri[cç][aã]o|pastor\s+[a-zà-ÿ]+|pregador\s+[a-zà-ÿ]+|igreja\s+[a-zà-ÿ]+|minist[eé]rio\s+[a-zà-ÿ]+)/i.test(normalized);
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates highly contextual mock sermon data to make the app fully usable and realistic.
 */
function generateMockAnalysis(): SermonAnalysis {
  let theme = "Fidelidade e Confiança em Deus";
  let mainVerse = { reference: "Salmos 23:1", text: "O Senhor é o meu pastor, nada me faltará." };
  let topics = ["Fé", "Confiança", "Provisão", "Perseverança"];

  const otherVerses = [
    mainVerse,
    { reference: "Hebreus 11:1", text: "Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que se não veem." },
    { reference: "Isaías 40:31", text: "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão." }
  ];

  return {
    theme,
    verses: otherVerses,
    summary: `Esta mensagem nos convida a refletir sobre a importância de firmar nossas vidas nos princípios bíblicos. Através de ilustrações práticas e verdades eternas, somos encorajados a dar passos concretos de fé, superando as distrações deste tempo presente para vivermos a plenitude daquilo que Deus planejou para nós.`,
    introduction: `Hoje entraremos em uma reflexão profunda sobre ${theme}. A Palavra nos desafia a olhar para além das circunstâncias imediatas e encontrar nossa âncora de segurança nas promessas do Altíssimo. Abriremos a Escritura no texto base de ${mainVerse.reference} para compreendermos como essa verdade se aplica às nossas maiores lutas cotidianas.`,
    outline: [
      {
        title: "1. O Reconhecimento da Provisão Divina",
        subpoints: [
          "Compreender que Deus se importa com cada área da nossa existência.",
          "Identificar as mentiras da escassez que o mundo tenta nos impor.",
          "Descansar na certeza de que Ele conhece nossas necessidades antes mesmo de pedirmos."
        ],
        keyVerse: mainVerse.reference
      },
      {
        title: "2. A Resposta da Fé Ativa",
        subpoints: [
          "A fé não é um sentimento passivo, mas uma decisão de obedecer.",
          "Dar o primeiro passo mesmo quando o caminho parece incerto ou difícil.",
          "Submeter nossa vontade pessoal à autoridade soberana de Cristo."
        ],
        keyVerse: "Hebreus 11:1"
      },
      {
        title: "3. O Testemunho da Perseverança",
        subpoints: [
          "Permanecer firme durante a estação de espera no deserto.",
          "Entender que o silêncio de Deus não significa Sua ausência.",
          "Compartilhar com outros as vitórias e livramentos que Deus já realizou."
        ],
        keyVerse: "Isaías 40:31"
      }
    ],
    topics,
    conclusion: `Portanto, amados, que a mensagem desta pregação não seja apenas informação, mas transformação. Lembremo-nos de que ${mainVerse.reference} nos assegura a suficiência de Deus. Que nesta semana você tome a decisão de confiar e agir conforme a palavra que foi semeada no seu coração. Que Deus abençoe a todos.`,
    applications: [
      "Faça um inventário das suas maiores preocupações hoje e entregue-as em oração deliberadamente.",
      "Pratique a gratidão anotando pelo menos três livramentos ou bênçãos que você recebeu nesta última semana.",
      "Escolha uma promessa bíblica específica para meditar e memorizar ao longo dos próximos dias.",
      "Identifique uma área onde você tem hesitado em obedecer a Deus e dê um passo prático de obediência."
    ],
    impact_phrases: [
      "O silêncio de Deus não é um sinal de ausência, mas um convite à intimidade e à preparação.",
      "A nossa fé não é medida pelo tamanho do nosso gigante, mas pela grandeza do Deus que nos acompanha.",
      "Obediência parcial ainda é desobediência. A fé exige entrega completa.",
      "O deserto não é o seu destino final; é apenas a sala de aula onde Deus molda o seu caráter."
    ],
    script: `Queridos irmãos, hoje quero compartilhar com vocês uma mensagem que arde no meu coração sobre "${theme}". Vivemos dias em que somos constantemente bombardeados por preocupações, medos e incertezas. Mas a Escritura nos chama de volta ao centro da vontade do Pai.

No texto de ${mainVerse.reference}, o salmista nos lembra: "${mainVerse.text}". Essa não é apenas uma frase bonita de conforto, é uma declaração de soberania. Se o Senhor é de fato o nosso Pastor, a nossa necessidade de controle deve cessar. Não nos faltará paz, não nos faltará direção, não nos faltará sustento.

O primeiro grande ponto que precisamos entender é o reconhecimento da provisão. Muitas vezes vivemos sob uma mentalidade de escassez, temendo o amanhã. Mas a Palavra nos diz que nosso Pai sabe do que precisamos. Em segundo lugar, somos chamados a uma fé ativa. A fé não é apenas teoria de domingo; ela se prova na segunda-feira, quando escolhemos agir com integridade e amor, mesmo que isso custe nossa comodidade. E finalmente, precisamos perseverar. O deserto é temporário, mas o caráter forjado nele dura para a eternidade.

Portanto, exorto cada um de vocês a aplicar essa palavra. Não saia daqui da mesma forma que entrou. Entregue suas ansiedades, firme sua fé e caminhe na certeza de que Aquele que começou a boa obra em sua vida é fiel para completá-la. Amém!`,
    title_suggestions: [
      `Vivendo Sob a Paternidade de Deus`,
      "Quando Nada Mais nos Falta: O Segredo do Contentamento",
      `A Âncora da Fé no Meio da Tempestade — ${theme}`,
      "Dando Passos de Fé na Escuridão"
    ],
    related_themes: [
      "Teologia da Confiança e Providência Divina",
      "Homilética e Estruturação de Sermões Expositivos",
      "Discipulado Cristão e Práticas Espirituais Diárias"
    ],
    social_posts: [
      {
        platform: "Instagram",
        type: "Feed Devocional",
        content: `📖 "${mainVerse.text}" (${mainVerse.reference})\n\nVocê já parou para pensar no impacto dessa frase na sua vida prática?\n\nQuando colocamos nossa vida sob a direção de Deus, a ansiedade perde o poder. Ele não promete uma jornada sem desafios, mas garante a Sua presença e cuidado constante.\n\nHoje, entregue suas preocupações Àquele que cuida de você. Que a sua semana seja guiada pela paz que excede todo o entendimento! 🙌✨\n\n#PregAI #Sermao #Fe #Devocional #PalavraDeDeus`
      },
      {
        platform: "Reels / Shorts",
        type: "Roteiro de Vídeo Curto",
        content: `[CENA INICIAL: Imagem de alguém olhando o mar ou horizonte de forma pensativa. Texto na tela: "Sentindo-se sobrecarregado?"]\n\n🎙️ (Narrador em tom calmo): "Muitas vezes, a nossa maior fonte de ansiedade é tentar controlar coisas que não estão sob o nosso poder. Mas sabia que a Bíblia nos dá uma direção totalmente diferente?"\n\n[CORTA PARA: Imagem da Bíblia aberta ou versículo em destaque]\n\n🎙️: "O Salmo 23 diz que o Senhor é o nosso pastor e NADA nos faltará. Isso significa que a presença d'Ele é o suficiente para as nossas necessidades de hoje."\n\n[CENA FINAL: Mensagem de ânimo e logo do PregAI]\n\n🎙️: "Seja qual for a tempestade que você está enfrentando, lembre-se: Deus está no controle. Curta e compartilhe este vídeo com alguém que precisa ouvir isso hoje!"`
      }
    ],
    slides: [
      {
        title: `${theme}`,
        content: [
          `Tema Central: ${theme}`,
          `Texto Base: ${mainVerse.reference}`
        ]
      },
      {
        title: "Ponto 1: A Suficiência de Deus",
        content: [
          `"${mainVerse.text}" - ${mainVerse.reference}`,
          "A nossa segurança depende de QUEM nos guia.",
          "O descanso vem da confiança na provisão paterna."
        ]
      },
      {
        title: "Ponto 2: A Resposta da Fé",
        content: [
          "A fé ativa exige dar passos práticos.",
          "Submissão da nossa vontade à Palavra.",
          "Confiar mesmo quando o caminho parece escuro."
        ]
      },
      {
        title: "Ponto 3: O Valor da Perseverança",
        content: [
          "O deserto é uma estação de preparo, não um destino.",
          "O silêncio de Deus não anula as Suas promessas.",
          "Nossa história de perseverança inspira outros."
        ]
      },
      {
        title: "Conclusão e Apelo",
        content: [
          "Entregue suas ansiedades e medos hoje.",
          "Tome uma decisão prática de obediência esta semana.",
          "Caminhe na paz de Cristo!"
        ]
      }
    ]
  };
}
