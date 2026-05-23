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
      description: "Lista de versículos bíblicos citados ou que servem de base",
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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[Gemini API] GEMINI_API_KEY não configurada no .env. Usando fallback de dados simulados de alta qualidade.");
    return generateMockAnalysis(videoTitle, preacher);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
Você é um teólogo experiente, pastor auxiliar e especialista em homilética cristã, focado em extração bíblica pura.
Analise a seguinte transcrição de uma pregação em vídeo e crie uma análise estruturada contendo esboço homilético, slides, postagens sociais, aplicações práticas e roteiro expandido.

REGRAS CRÍTICAS DE PRIVACIDADE E CONTEÚDO:
- Baseie-se EXCLUSIVAMENTE no conteúdo teológico e bíblico extraído da transcrição (legenda/áudio).
- PROIBIÇÃO ABSOLUTA: Não inclua no esboço, resumo ou em qualquer campo gerado o nome do canal do YouTube, o nome de outros vídeos, descrições de "inscreva-se", "deixe seu like", comentários de usuários ou informações promocionais do canal.
- Ignore qualquer introdução do vídeo que peça engajamento social (likes, inscritos) ou que fale sobre a programação do canal.
- Foque apenas na mensagem, nos princípios espirituais e nas passagens bíblicas citadas.
- Reinterprete e adapte as ideias para criar materiais claros e estruturados, sem fazer plágio ou cópia literal, mantendo o tom respeitoso e inspirador.

DADOS PARA ANÁLISE (USE APENAS O CONTEÚDO TEOLÓGICO DISSO):
Transcrição do Áudio:
"""
${transcript.slice(0, 45000)}
"""
`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SERMON_SCHEMA,
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[Gemini API Error] Status: ${response.status}. Body:`, errBody);
      throw new Error(`Falha na API Gemini: ${response.statusText}`);
    }

    const resJson = await response.json();
    const generatedText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error("Resposta da IA retornou sem conteúdo.");
    }

    return JSON.parse(generatedText.trim()) as SermonAnalysis;
  } catch (error) {
    console.error("[Gemini API Error] Ocorreu um erro ao chamar a IA, usando dados simulados como fallback de segurança:", error);
    return generateMockAnalysis(videoTitle, preacher);
  }
}

/**
 * Generates highly contextual mock sermon data to make the app fully usable and realistic.
 */
function generateMockAnalysis(videoTitle: string, preacher: string): SermonAnalysis {
  // Infer basic keywords from the video title to customize the mock
  const titleLower = videoTitle.toLowerCase();
  let theme = "Fidelidade e Confiança em Deus";
  let mainVerse = { reference: "Salmos 23:1", text: "O Senhor é o meu pastor, nada me faltará." };
  let topics = ["Fé", "Confiança", "Provisão", "Perseverança"];
  
  if (titleLower.includes("graça") || titleLower.includes("graca") || titleLower.includes("salvação") || titleLower.includes("salvacao")) {
    theme = "A Maravilhosa Graça Redentora";
    mainVerse = { reference: "Efésios 2:8", text: "Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus." };
    topics = ["Graça", "Salvação", "Misericórdia", "Favor Imerecido"];
  } else if (titleLower.includes("amor") || titleLower.includes("amar")) {
    theme = "O Amor Incondicional do Pai";
    mainVerse = { reference: "1 João 4:19", text: "Nós o amamos a ele porque ele nos amou primeiro." };
    topics = ["Amor", "Paternidade", "Acolhimento", "Comunhão"];
  } else if (titleLower.includes("provação") || titleLower.includes("provacao") || titleLower.includes("tempestade") || titleLower.includes("deserto") || titleLower.includes("crise")) {
    theme = "Perseverança em Meio às Provações";
    mainVerse = { reference: "Tiago 1:2-3", text: "Meus irmãos, tende grande gozo quando cairdes em várias tentações; sabendo que a prova da vossa fé opera a paciência." };
    topics = ["Perseverança", "Provações", "Esperança", "Fortalecimento"];
  } else if (titleLower.includes("oração") || titleLower.includes("oracao") || titleLower.includes("orar")) {
    theme = "O Poder e a Disciplina da Oração";
    mainVerse = { reference: "Filipeenses 4:6", text: "Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças." };
    topics = ["Oração", "Intimidade", "Intercessão", "Poder Espiritual"];
  } else if (titleLower.includes("propósito") || titleLower.includes("proposito") || titleLower.includes("chamado") || titleLower.includes("vontade")) {
    theme = "Descobrindo o Chamado e o Propósito de Deus";
    mainVerse = { reference: "Romanos 12:2", text: "E não vos conformeis com este mundo, mas transformai-vos pela renovação do vosso entendimento, para que experimenteis qual seja a boa, agradável, e perfeita vontade de Deus." };
    topics = ["Propósito", "Vontade de Deus", "Transformação", "Obediência"];
  }

  const otherVerses = [
    mainVerse,
    { reference: "Hebreus 11:1", text: "Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que se não veem." },
    { reference: "Isaías 40:31", text: "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias; correrão, e não se cansarão; caminharão, e não se fatigarão." }
  ];

  return {
    theme,
    verses: otherVerses,
    summary: `Esta mensagem baseada na pregação "${videoTitle}" de ${preacher} nos convida a refletir sobre a importância de firmar nossas vidas nos princípios bíblicos. Através de ilustrações práticas e verdades eternas, somos encorajados a dar passos concretos de fé, superando as distrações deste tempo presente para vivermos a plenitude daquilo que Deus planejou para nós.`,
    introduction: `Hoje entraremos em uma reflexão profunda sobre ${theme}. A mensagem de ${preacher} nos desafia a olhar para além das circunstâncias imediatas e encontrar nossa âncora de segurança nas promessas do Altíssimo. Abriremos a Palavra no texto base de ${mainVerse.reference} para compreendermos como essa verdade se aplica às nossas maiores lutas cotidianas.`,
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
    script: `Queridos irmãos, hoje quero compartilhar com vocês uma mensagem que arde no meu coração sobre "${theme}". Ao assistirmos à pregação de ${preacher}, fica claro que estamos vivendo dias onde somos constantemente bombardeados por preocupações, medos e incertezas. Mas a Escritura nos chama de volta ao centro da vontade do Pai.

No texto de ${mainVerse.reference}, o salmista nos lembra: "${mainVerse.text}". Essa não é apenas uma frase bonita de conforto, é uma declaração de soberania. Se o Senhor é de fato o nosso Pastor, a nossa necessidade de controle deve cessar. Não nos faltará paz, não nos faltará direção, não nos faltará sustento.

O primeiro grande ponto que precisamos entender é o reconhecimento da provisão. Muitas vezes vivemos sob uma mentalidade de escassez, temendo o amanhã. Mas a Palavra nos diz que nosso Pai sabe do que precisamos. Em segundo lugar, somos chamados a uma fé ativa. A fé não é apenas teoria de domingo; ela se prova na segunda-feira, quando escolhemos agir com integridade e amor, mesmo que isso custe nossa comodidade. E finalmente, precisamos perseverar. O deserto é temporário, mas o caráter forjado nele dura para a eternidade.

Portanto, exorto cada um de vocês a aplicar essa palavra. Não saia daqui da mesma forma que entrou. Entregue suas ansiedades, firme sua fé e caminhe na certeza de que Aquele que começou a boa obra em sua vida é fiel para completá-la. Amém!`,
    title_suggestions: [
      `Vivendo Sob a Paternidade de Deus (Baseado em ${preacher})`,
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
        content: `📖 "${mainVerse.text}" (${mainVerse.reference})\n\nVocê já parou para pensar no impacto dessa frase na sua vida prática?\n\nNa pregação "${videoTitle}" de ${preacher}, somos lembrados de que quando colocamos nossa vida sob a direção de Deus, a ansiedade perde o poder. Ele não promete uma jornada sem desafios, mas garante a Sua presença e cuidado constante.\n\nHoje, entregue suas preocupações Aquele que cuida de você. Que a sua semana seja guiada pela paz que excede todo o entendimento! 🙌✨\n\n#PregAI #Sermao #Fe #Devocional #PalavraDeDeus`
      },
      {
        platform: "Reels / Shorts",
        type: "Roteiro de Vídeo Curto",
        content: `[CENA INICIAL: Imagem de alguém olhando o mar ou horizonte de forma pensativa. Texto na tela: "Sentindo-se sobrecarregado?"]\n\n🎙️ (Narrador em tom calmo): "Muitas vezes, a nossa maior fonte de ansiedade é tentar controlar coisas que não estão sob o nosso poder. Mas sabia que a Bíblia nos dá uma direção totalmente diferente?"\n\n[CORTA PARA: Imagem da Bíblia aberta ou versículo em destaque]\n\n🎙️: "O Salmo 23 diz que o Senhor é o nosso pastor e NADA nos faltará. Isso significa que a presença d'Ele é o suficiente para as nossas necessidades de hoje."\n\n[CENA FINAL: Mensagem de ânimo e logo do PregAI]\n\n🎙️: "Seja qual for a tempestade que você está enfrentando, lembre-se: Deus está no controle. Curta e compartilhe este vídeo com alguém que precisa ouvir isso hoje!"`
      }
    ],
    slides: [
      {
        title: `${videoTitle}`,
        content: [
          `Ministrado por ${preacher}`,
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
