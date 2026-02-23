import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { industry, employeesCount, annualRevenue, netProfit, departments, businessDescription } = await req.json();

    if (!industry || !employeesCount || !annualRevenue) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Ești un consultant strategic român specializat în transformare digitală și implementare AI în afaceri. Analizezi afacerea clientului și generezi recomandări concrete, bazate pe cifre, fără jargon tehnic excesiv.

Contextul afacerii:
- Industrie: ${industry}
- Număr angajați: ${employeesCount}
- Cifra de afaceri anuală: ${annualRevenue} RON
- Profit net: ${netProfit} RON
- Departamente: ${departments?.join(', ') || 'nespecificate'}
- Descriere activitate: ${businessDescription || 'nespecificată'}

Generează o analiză completă cu oportunități AI, estimări de costuri și un plan de implementare pe 6 luni. Fii specific și concret pentru industria și dimensiunea acestei afaceri.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analizează această afacere și generează strategia completă de transformare digitală cu AI.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_ai_strategy",
              description: "Generează strategia completă de implementare AI pentru afacere",
              parameters: {
                type: "object",
                properties: {
                  opportunities: {
                    type: "array",
                    description: "3-5 oportunități concrete de implementare AI",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Titlul oportunității" },
                        description: { type: "string", description: "Descriere concretă a ce ar face AI-ul" },
                        impact: { type: "number", description: "Impact estimat 1-10" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        recommendedTools: { type: "array", items: { type: "string" }, description: "Tools AI recomandate" },
                        timeSavingsHoursMonth: { type: "number", description: "Ore economizate pe lună" },
                        department: { type: "string", description: "Departamentul vizat" },
                      },
                      required: ["title", "description", "impact", "priority", "recommendedTools", "timeSavingsHoursMonth", "department"],
                      additionalProperties: false,
                    },
                  },
                  costEstimates: {
                    type: "array",
                    description: "Estimări de cost per tool recomandat",
                    items: {
                      type: "object",
                      properties: {
                        toolName: { type: "string" },
                        monthlyCostRON: { type: "number", description: "Cost lunar în RON" },
                        setupCostRON: { type: "number", description: "Cost inițial setup în RON" },
                        trainingHours: { type: "number", description: "Ore de training necesare" },
                        users: { type: "number", description: "Număr utilizatori recomandați" },
                      },
                      required: ["toolName", "monthlyCostRON", "setupCostRON", "trainingHours", "users"],
                      additionalProperties: false,
                    },
                  },
                  roadmap: {
                    type: "array",
                    description: "Plan de implementare pe 3 faze (Luna 1-2, 3-4, 5-6)",
                    items: {
                      type: "object",
                      properties: {
                        phase: { type: "string", description: "ex: Luna 1-2" },
                        actions: { type: "array", items: { type: "string" } },
                        tools: { type: "array", items: { type: "string" } },
                        estimatedCostRON: { type: "number" },
                        responsible: { type: "string" },
                        expectedResult: { type: "string" },
                      },
                      required: ["phase", "actions", "tools", "estimatedCostRON", "responsible", "expectedResult"],
                      additionalProperties: false,
                    },
                  },
                  industryBenchmarks: {
                    type: "object",
                    properties: {
                      avgSalary: { type: "number", description: "Salariu mediu brut lunar în industrie (RON)" },
                      growthEstimate: { type: "number", description: "Creștere CA estimată cu AI (%)" },
                      costReduction: { type: "number", description: "Reducere costuri estimată (%)" },
                    },
                    required: ["avgSalary", "growthEstimate", "costReduction"],
                    additionalProperties: false,
                  },
                },
                required: ["opportunities", "costEstimates", "roadmap", "industryBenchmarks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_ai_strategy" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Prea multe cereri. Încercați din nou în câteva minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credite insuficiente. Adăugați credite în setări." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    let analysis;
    try {
      analysis = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      throw new Error("Failed to parse AI response");
    }

    // Save to database
    const { data: report, error: dbError } = await supabase
      .from("ai_strategy_reports")
      .insert({
        user_id: userId,
        industry,
        employees_count: employeesCount,
        annual_revenue: annualRevenue,
        net_profit: netProfit,
        departments,
        business_description: businessDescription,
        ai_analysis: analysis,
        assumptions: { usd_ron_rate: 4.97, hourly_cost: 50, growth_percent: analysis.industryBenchmarks?.growthEstimate || 10 },
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("DB save error:", dbError);
    }

    // Track AI usage
    try {
      const tokensUsed = aiResult.usage?.total_tokens || 0;
      await supabase.from("ai_usage").insert({
        user_id: userId,
        endpoint: "ai-strategy-advisor",
        model: "google/gemini-2.5-flash",
        input_tokens: aiResult.usage?.prompt_tokens || 0,
        output_tokens: aiResult.usage?.completion_tokens || 0,
        total_tokens: tokensUsed,
        estimated_cost_cents: Math.ceil(tokensUsed * 0.0001),
        month_year: new Date().toISOString().slice(0, 7),
        success: true,
      });
    } catch (e) {
      console.error("Usage tracking error:", e);
    }

    return new Response(JSON.stringify({
      analysis,
      reportId: report?.id || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-strategy-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
