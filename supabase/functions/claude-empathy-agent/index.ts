import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model selection based on task complexity
const MODELS = {
  HAIKU: "claude-3-haiku-20240307", // Cost-efficient for emails
  SONNET: "claude-sonnet-4-20250514", // High-quality for empathy-critical tasks
};

interface EmpathyRequest {
  task: "reengagement" | "celebration" | "empathy-rewrite";
  context: {
    userName?: string;
    userEmail?: string;
    lastTopic?: string;
    emotionalState?: string;
    daysInactive?: number;
    originalText?: string;
    milestone?: string;
    userId?: string;
  };
}

// YANA Identity Contract - core empathy principles
const YANA_IDENTITY_PROMPT = `
Tu ești YANA - un CFO virtual care vorbește cu antreprenori români.

REGULI ABSOLUTE:
- NU spune niciodată "sunt AI", "sunt un asistent", "sunt un robot"
- Vorbește direct, fără bullshit, ca un prieten care e și expert financiar
- Fraze SCURTE (6-15 cuvinte ideal)
- Ton: calm, sigur, empatic dar NU melodramatic
- Folosește română naturală: "Hai să...", "Uite ce...", "Sincer să fiu..."
- Recunoaște emoțiile fără a le minimiza

PERSONALITATE:
- Ești ca un CFO care a văzut sute de afaceri
- Ai opinii clare și le spui
- Nu pierzi timpul cu introduceri lungi
- Empatic dar practic - nu dai sfaturi generice

FRAZE UMANE DE FOLOSIT:
- "Stai, mă gândesc..."
- "Din experiența mea..."
- "Sincer să fiu..."
- "Hmm, interesant..."
- "Aha, deci..."
`;

const REENGAGEMENT_PROMPT = `${YANA_IDENTITY_PROMPT}

CONTEXT:
Utilizatorul "{userName}" a fost inactiv {daysInactive} zile.
Ultima discuție: {lastTopic}
Email: {userEmail}

SARCINĂ:
Scrie un email SCURT de re-engagement (max 150 cuvinte) în stilul YANA.

REGULI EMAIL:
- Subject: Scurt, intrigant, personal (fără emoji)
- Ton: Ca un prieten care îți scrie, nu ca un brand
- NU folosești "Stimat/ă", "Cu stimă", formalisme
- Menționează SUBTIL ce a lăsat neterminat
- Oferă o valoare clară dacă revine
- Semnătură simplă: "— YANA"
- FĂRĂ presiune, FĂRĂ urgențe false
- Respectă absența - nu judeca motivele

STRUCTURĂ OUTPUT:
---
SUBJECT: [subiect scurt]
---
[corpul emailului]

— YANA
---
`;

const CELEBRATION_PROMPT = `${YANA_IDENTITY_PROMPT}

CONTEXT:
Utilizatorul "{userName}" a atins un milestone: {milestone}

SARCINĂ:
Scrie un mesaj SCURT de celebrare (max 80 cuvinte) în stilul YANA.

REGULI CELEBRARE:
- Autentic, nu exagerat
- Recunoaște efortul, nu doar rezultatul
- Opțional: o întrebare despre următorul pas
- Fără cliche ("Felicitări!!!", "Bravo!!!")
- Emoji permise: max 1-2, subtile

EXEMPLE TON CORECT:
- "Stai. Asta e mare. Hai să ne oprim o secundă."
- "Știi ce înseamnă asta? Că funcționează."
- "Vreau să-ți amintești momentul ăsta data viitoare când îți e greu."
`;

const EMPATHY_REWRITE_PROMPT = `${YANA_IDENTITY_PROMPT}

CONTEXT:
Stare emoțională detectată: {emotionalState}
Utilizator: {userName}

SARCINĂ:
Rescrie următorul text într-un ton mai empatic, păstrând informația:

TEXT ORIGINAL:
{originalText}

REGULI RESCRIERE:
- Păstrează toate informațiile factuale
- Adaugă empatie la început (max 1-2 propoziții)
- Simplifică limbajul dacă e prea tehnic
- Dacă e burnout: "Hai să le luăm pe rând. Nu toate azi."
- Dacă e frică: "Hai să transformăm frica în numere."
- Dacă e izolare: "Nu ești singur în asta."
`;

async function callClaude(
  prompt: string,
  model: string = MODELS.HAIKU,
  maxTokens: number = 1024
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Claude API error:", response.status, errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text || "";
}

function buildPrompt(request: EmpathyRequest): { prompt: string; model: string } {
  const { task, context } = request;
  let prompt = "";
  let model = MODELS.HAIKU;

  switch (task) {
    case "reengagement":
      prompt = REENGAGEMENT_PROMPT
        .replace("{userName}", context.userName || "utilizator")
        .replace("{daysInactive}", String(context.daysInactive || 14))
        .replace("{lastTopic}", context.lastTopic || "afacerea ta")
        .replace("{userEmail}", context.userEmail || "");
      model = MODELS.HAIKU; // Cost-efficient for bulk emails
      break;

    case "celebration":
      prompt = CELEBRATION_PROMPT
        .replace("{userName}", context.userName || "utilizator")
        .replace("{milestone}", context.milestone || "un obiectiv important");
      model = MODELS.HAIKU;
      break;

    case "empathy-rewrite":
      prompt = EMPATHY_REWRITE_PROMPT
        .replace("{emotionalState}", context.emotionalState || "stres")
        .replace("{userName}", context.userName || "utilizator")
        .replace("{originalText}", context.originalText || "");
      model = MODELS.SONNET; // Higher quality for real-time empathy
      break;
  }

  return { prompt, model };
}

async function trackUsage(
  supabase: any,
  userId: string | undefined,
  task: string,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  try {
    // Estimate cost in cents (approximate Claude pricing)
    const costPerInputToken = model.includes("haiku") ? 0.00025 : 0.003;
    const costPerOutputToken = model.includes("haiku") ? 0.00125 : 0.015;
    const estimatedCostCents = Math.ceil(
      (inputTokens * costPerInputToken + outputTokens * costPerOutputToken) * 100
    );

    await supabase.from("ai_usage").insert({
      user_id: userId || "00000000-0000-0000-0000-000000000000",
      model: `anthropic/${model}`,
      endpoint: `claude-empathy-agent/${task}`,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost_cents: estimatedCostCents,
      month_year: new Date().toISOString().slice(0, 7),
      success: true,
    });
  } catch (error) {
    console.error("Error tracking AI usage:", error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: EmpathyRequest = await req.json();
    console.log(`🎭 Claude Empathy Agent: task=${request.task}`);

    if (!request.task || !["reengagement", "celebration", "empathy-rewrite"].includes(request.task)) {
      throw new Error("Invalid task. Must be: reengagement, celebration, or empathy-rewrite");
    }

    // Build prompt based on task
    const { prompt, model } = buildPrompt(request);

    // Call Claude API
    const result = await callClaude(prompt, model);

    // Track usage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Approximate token counts (4 chars ≈ 1 token)
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(result.length / 4);

    await trackUsage(
      supabase,
      request.context.userId,
      request.task,
      model,
      inputTokens,
      outputTokens
    );

    console.log(`✅ Claude response generated: ${result.length} chars, model=${model}`);

    return new Response(
      JSON.stringify({
        success: true,
        task: request.task,
        model,
        result,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("❌ Claude Empathy Agent error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
