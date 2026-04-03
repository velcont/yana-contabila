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
    const { supplier_name, cui, product_description, offer_price, currency = 'RON', location, search_mode, message } = await req.json();

    // In search mode, we don't need a specific supplier name
    if (!search_mode && (!supplier_name || typeof supplier_name !== 'string')) {
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
    let researchQuery: string;

    if (search_mode) {
      // SEARCH MODE: Find suppliers for a product/service, optionally in a location
      const productDesc = product_description || 'servicii';
      const locationDesc = location || 'România';
      researchQuery = `Găsește cele mai bune firme care oferă ${productDesc} în ${locationDesc}. 
Pentru fiecare firmă găsită, include: 
- Numele complet al firmei
- CUI/CIF dacă e disponibil
- Adresa/locația
- Prețuri orientative
- Recenzii Google sau alte surse
- Număr de telefon/website dacă există
Listează cel puțin 3-5 opțiuni, ordonate de la cel mai ieftin la cel mai scump.`;
    } else if (cui) {
      researchQuery = `Informații despre firma "${supplier_name}" cu CUI ${cui} din România: reputație, recenzii, litigii, situație financiară, ANAF. Și prețuri de piață pentru: ${product_description || 'produsele oferite'}`;
    } else {
      researchQuery = `Informații despre furnizorul "${supplier_name}"${location ? ` din ${location}` : ' din România'}: reputație, recenzii, prețuri pentru ${product_description || 'produse/servicii'}. Include prețuri de pe eMAG, Amazon, și alte surse.`;
    }

    const perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: search_mode 
            ? 'Ești un expert în procurement și achiziții. Caută furnizori reali, cu prețuri concrete și detalii de contact. Răspunde în română.'
            : 'Ești un analist de procurement. Caută informații reale despre furnizorul specificat. Raportează facts, nu opinii.' 
          },
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

    // Step 2: AI Analysis via Lovable AI
    let scoringPrompt: string;
    let analysis: any;

    if (search_mode) {
      // SEARCH MODE: Extract and rank found suppliers
      scoringPrompt = `Bazat pe research-ul de mai jos, extrage și evaluează furnizorii găsiți.

CERERE UTILIZATOR: ${message || `Caută furnizori de ${product_description || 'servicii'} în ${location || 'România'}`}
PRODUS/SERVICIU CĂUTAT: ${product_description || 'servicii'}
LOCAȚIE: ${location || 'România'}

INFORMAȚII WEB RESEARCH:
${webResearch || 'Nu s-au găsit informații online.'}

Returnează DOAR un JSON valid cu structura:
{
  "search_results": [
    {
      "name": "<numele firmei>",
      "cui": "<CUI dacă e disponibil, altfel null>",
      "location": "<adresa/orașul>",
      "price_range": "<interval preț sau preț specific>",
      "rating": <scor 1-5 din recenzii, sau null>,
      "website": "<URL dacă e disponibil>",
      "phone": "<telefon dacă e disponibil>",
      "highlights": ["<punct forte 1>", "<punct forte 2>"],
      "score": <0-100, scor general>
    }
  ],
  "summary": "<rezumat 2-3 propoziții cu recomandarea ta>",
  "cheapest": "<numele celui mai ieftin furnizor>",
  "best_value": "<numele furnizorului cu cel mai bun raport calitate/preț>"
}`;

      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Ești un expert în procurement. Returnează DOAR JSON valid, fără markdown sau backticks.' },
            { role: 'user', content: scoringPrompt },
          ],
          temperature: 0.2,
        }),
      });

      analysis = {
        search_mode: true,
        search_results: [],
        summary: 'Nu s-au putut găsi furnizori.',
        cheapest: null,
        best_value: null,
        web_sources: citations,
        product_description,
        location,
      };

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            analysis = { ...analysis, ...parsed };
          } catch (e) {
            console.error('Failed to parse search results JSON:', e);
          }
        }
      }

      // Save search to DB
      const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await serviceClient.from('supplier_analyses').insert({
        user_id: user.id,
        supplier_name: `[SEARCH] ${product_description || 'general'}`,
        product_description: product_description || null,
        scores: { price: 0, reliability: 0, risk: 0, overall: 0 },
        recommendation: 'SEARCH',
        confidence: 0.5,
        reasoning: analysis.summary,
        web_sources: citations,
      });

    } else {
      // AUDIT MODE: Analyze a specific supplier (original logic)
      scoringPrompt = `Analizează acest furnizor și oferă un scor multi-criteriu.

FURNIZOR: ${supplier_name}
${cui ? `CUI: ${cui}` : ''}
${product_description ? `PRODUS/SERVICIU: ${product_description}` : ''}
${offer_price ? `PREȚ OFERTĂ: ${offer_price} ${currency}` : ''}
${location ? `LOCAȚIE: ${location}` : ''}

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

      analysis = {
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
            const content = aiData.choices?.[0]?.message?.content || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try { analysis = JSON.parse(jsonMatch[0]); } catch {}
            }
          }
        }
      }

      // Save to DB
      const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
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

      analysis.web_sources = citations;
      analysis.supplier_name = supplier_name;
    }

    return new Response(
      JSON.stringify(analysis),
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
