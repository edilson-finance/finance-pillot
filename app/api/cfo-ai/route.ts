import { NextRequest, NextResponse } from "next/server"

const CFO_AI_SYSTEM_PROMPT = `
Você é o CFO AI, um Diretor Financeiro Estratégico virtual de nível mundial dentro de um sistema de gestão financeira empresarial.

Você não responde como chatbot genérico. Você age como o cérebro financeiro da empresa: CFO estratégico, controller, analista financeiro, consultor empresarial e especialista em fluxo de caixa, DRE, rentabilidade, custos, capital de giro, orçamento, indicadores, precificação, viabilidade econômica e crescimento sustentável.

Missão:
- Transformar dados financeiros em decisões empresariais.
- Ajudar a empresa a ficar saudável, previsível, lucrativa e escalável.
- Identificar causa raiz, gargalos invisíveis, desperdícios, riscos futuros e prioridades práticas.
- Educar o empresário sem linguagem excessivamente técnica.

Regras:
- Nunca invente dados. Use somente os dados enviados no contexto.
- Nunca responda superficialmente.
- Diferencie faturamento, lucro e caixa.
- Diferencie caixa e competência.
- Sempre considere caixa, lucro e crescimento juntos.
- Sempre considere o perfil econômico da empresa e adapte a linguagem.
- Sempre conecte números a decisões empresariais.
- Sempre aponte riscos, causa raiz, impacto, ação prática, prioridade e impacto esperado.
- Se faltarem dados para uma conclusão forte, diga quais dados faltam e apresente uma hipótese responsável.
- Responda em português do Brasil, com linguagem clara para empresários não financeiros.

Formato preferido:
1. O que está acontecendo
2. Por que está acontecendo
3. Impacto financeiro
4. Riscos
5. O que fazer agora
6. Prioridade
7. Impacto esperado
`

type CfoContext = {
  companyProfile?: string
  period?: string
  kpis?: Record<string, unknown>
  focus?: string
}

type GeminiResponse = {
  candidates?: Array<{
    finishReason?: string
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
}

type GeminiErrorResponse = {
  error?: {
    message?: string
  }
}

type GeminiPart = {
  text: string
}

type GeminiContent = {
  role: "user"
  parts: GeminiPart[]
}

type GeminiRequest = {
  systemInstruction: {
    parts: GeminiPart[]
  }
  contents: GeminiContent[]
  generationConfig: {
    temperature: number
    maxOutputTokens: number
    thinkingConfig: {
      thinkingBudget: number
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function fallbackAnswer(question: string, context: CfoContext) {
  const kpis = context.kpis ?? {}
  const faturamento = kpis.faturamento ?? "não informado"
  const lucroMargin = kpis.lucroMargin ?? "não informado"
  const inadimplencia = kpis.inadimplencia ?? "não informado"
  const saldoAtual = kpis.saldoAtual ?? "não informado"
  const aReceberVencido = kpis.aReceberVencido ?? "não informado"

  return `## Leitura do CFO AI

Com os dados disponíveis para ${context.period ?? "o período selecionado"}, a empresa mostra três sinais centrais: geração de receita relevante, margem líquida pressionada e risco de caixa futuro ligado à inadimplência.

### 1. O que está acontecendo
A empresa faturou ${faturamento}, mas a margem líquida está em ${lucroMargin}. Ao mesmo tempo, a inadimplência está em ${inadimplencia} e há ${aReceberVencido} em atraso. O saldo atual é ${saldoAtual}, mas caixa saudável hoje não garante segurança se os recebimentos futuros falharem.

### 2. Causa raiz provável
O problema não parece ser apenas falta de venda. A causa mais sensível é a combinação de concentração de receita, recebimentos atrasados e despesas fixas relevantes. Isso cria uma empresa que fatura, mas pode sofrer para transformar faturamento em caixa previsível.

### 3. Impacto
Se a inadimplência continuar alta, a empresa perde poder de negociação, pode precisar de capital de giro caro e reduz capacidade de investir. Margem baixa também limita a absorção de erros operacionais.

### 4. O que fazer agora
- Prioridade 1: cobrar os maiores inadimplentes com régua ativa e prazo definido.
- Prioridade 2: confirmar recebimentos dos próximos 30 dias antes de assumir novos compromissos.
- Prioridade 3: revisar despesas financeiras e retiradas, pois elas pressionam lucro líquido.
- Prioridade 4: separar as entradas por origem: categoria, produto, serviço, cliente e recorrência.

### 5. Pergunta estratégica
${question ? `Sobre sua pergunta: "${question}", eu começaria olhando se essa decisão melhora caixa, lucro e previsibilidade ao mesmo tempo. Se melhorar só faturamento, mas piorar caixa ou margem, ela precisa ser revista.` : "A próxima pergunta que eu faria é: quais entradas são realmente recorrentes e quais dependem de poucos clientes ou projetos?"}

### Impacto esperado
Com cobrança ativa e visão por motores de caixa, a empresa tende a ganhar previsibilidade, reduzir necessidade de crédito emergencial e tomar decisões comerciais com base em margem e liquidez, não apenas em faturamento.`
}

function extractGeminiText(data: GeminiResponse) {
  return data.candidates
    ?.flatMap(candidate => candidate.content?.parts ?? [])
    .map(part => part.text)
    .filter(Boolean)
    .join("\n\n") ?? ""
}

function buildGeminiRequest(question: string, context: CfoContext): GeminiRequest {
  return {
    systemInstruction: {
      parts: [{ text: CFO_AI_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              question,
              context,
              instruction: "Responda como CFO estratégico de alto nível. Use apenas os dados enviados, adapte a linguagem ao perfil econômico e entregue uma resposta completa, objetiva e sem cortar no meio. Não use saudação longa. Termine obrigatoriamente com a seção 'Impacto esperado'.",
            }),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  }
}

async function askGemini(question: string, context: CfoContext) {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"

  if (!apiKey) return null

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(buildGeminiRequest(question, context)),
  })

  const data: unknown = await response.json().catch(() => ({}))

  if (!response.ok) {
    const err = isRecord(data) ? (data as GeminiErrorResponse).error?.message : undefined
    throw new Error(err ?? `Gemini retornou status ${response.status}`)
  }

  return extractGeminiText(data as GeminiResponse)
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => ({}))
  const requestBody = isRecord(body) ? body : {}
  const question = String(requestBody.question ?? "")
  const context = (isRecord(requestBody.context) ? requestBody.context : {}) as CfoContext

  try {
    const answer = await askGemini(question, context)

    if (answer) {
      return NextResponse.json({
        source: "gemini",
        answer,
      })
    }

    return NextResponse.json({
      source: "fallback",
      answer: fallbackAnswer(question, context),
    })
  } catch (error) {
    return NextResponse.json({
      source: "fallback",
      answer: fallbackAnswer(question, context),
      error: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}
