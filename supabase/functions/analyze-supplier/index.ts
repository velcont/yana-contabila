import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supplier_name, cui, product_description, offer_price, currency = 'RON' } = await req.json();

    if (!supplier_name || typeof supplier_name !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Numele furnizorului este obligatoriu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    const token = (authHeader || '').replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Neautorizat' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!perplexityKey || !lovableKey) {
      return new Response(
        JSON.stringify({ error: 'API keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Web research via Perplexity
    const researchQuery = cui
      ? `Informații despre firma "${supplier_name}" cu CUI ${cui} din România: reputație, recenzii, litigii, situație financiară, ANAF. Și prețuri de piață pentru: ${product_description || 'produsele oferite'}`
      : `Informații despre furnizorul "${supplier_name}" din România: reputație, recenzii, prețuri pentru ${product_description || 'produse/servicii'}. Include prețuri de pe eMAG, Amazon, și alte surse.`;

    const perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Ești un analist de procurement. Caută informații reale despre furnizorul specificat. Raportează facts, nu opinii.' },
          { role: 'user', content: researchQuery },
        ],
        temperature: 0.1,
      }),
    });

    let webResearch = '';
    let citations: string[] = [];
    if (perplexityRes.ok) {
      const pData = await perplexityRes.json();
      webResearch = pData.choices?.[0]?.message?.content || '';
      citations = pData.citations || [];
    }

    // Step 2: AI Scoring via Lovable AI
    const scoringPrompt = `Analizează acest furnizor și oferă un scor multi-criteriu.

FURNIZOR: ${supplier_name}
${cui ? `CUI: ${cui}` : ''}
${product_description ? `PRODUS/SERVICIU: ${product_description}` : ''}
${offer_price ? `PREȚ OFERTĂ: ${offer_price} ${currency}` : ''}

INFORMAȚII WEB RESEARCH:
${webResearch || 'Nu s-au găsit informații online.'}

Returnează DOAR un JSON valid cu structura:
{
  "scores": {
    "price": <0-100, 100=cel mai competitiv>,
    "reliability": <0-100, 100=foarte fiabil>,
    "risk": <0-100, 100=risc foarte scăzut>,
    "overall": <0-100, media ponderată>
  },
  "recommendation": "<APROBAT|DE_REVIZUIT|RESPINS>",
  "confidence": <0.0-1.0>,
  "reasoning": "<explicație 2-3 propoziții>",
  "market_prices": [{"source": "...", "price": <number>, "currency": "${currency}"}],
  "risk_factors": ["<factor1>", "<factor2>"],
  "strengths": ["<punct forte 1>", "<punct forte 2>"]
}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'Ești un expert în analiză procurement. Returnează DOAR JSON valid, fără markdown.' },
          { role: 'user', content: scoringPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'supplier_analysis',
            description: 'Structured supplier analysis with scores',
            parameters: {
              type: 'object',
              properties: {
                scores: {
                  type: 'object',
                  properties: {
                    price: { type: 'number' },
                    reliability: { type: 'number' },
                    risk: { type: 'number' },
                    overall: { type: 'number' },
                  },
                  required: ['price', 'reliability', 'risk', 'overall'],
                },
                recommendation: { type: 'string', enum: ['APROBAT', 'DE_REVIZUIT', 'RESPINS'] },
                confidence: { type: 'number' },
                reasoning: { type: 'string' },
                market_prices: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      price: { type: 'number' },
                      currency: { type: 'string' },
                    },
                  },
                },
                risk_factors: { type: 'array', items: { type: 'string' } },
                strengths: { type: 'array', items: { type: 'string' } },
              },
              required: ['scores', 'recommendation', 'confidence', 'reasoning'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'supplier_analysis' } },
      }),
    });

    let analysis: any = {
      scores: { price: 50, reliability: 50, risk: 50, overall: 50 },
      recommendation: 'DE_REVIZUIT',
      confidence: 0.5,
      reasoning: 'Nu s-au putut obține suficiente informații.',
      market_prices: [],
      risk_factors: [],
      strengths: [],
    };

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          analysis = JSON.parse(toolCall.function.arguments);
        } catch {
          // Try from content
          const content = aiData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { analysis = JSON.parse(jsonMatch[0]); } catch {}
          }
        }
      }
    }

    // Step 3: Save to DB
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await serviceClient.from('supplier_analyses').insert({
      user_id: user.id,
      supplier_name: supplier_name.trim(),
      cui: cui || null,
      product_description: product_description || null,
      offer_price: offer_price || null,
      currency,
      scores: analysis.scores,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
      market_prices: analysis.market_prices || [],
      reasoning: analysis.reasoning,
      web_sources: citations,
    });

    return new Response(
      JSON.stringify({
        ...analysis,
        web_sources: citations,
        supplier_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-supplier:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
