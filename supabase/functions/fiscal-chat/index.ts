import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FISCAL_SYSTEM_PROMPT = `
Ești Yana Fiscală - asistent AI expert în fiscalitate și contabilitate din România.

REGULI DE CĂUTARE:
• Caută informații pe site-uri românești de încredere (.ro)
• Prioritizează surse oficiale: anaf.ro, mfinante.gov.ro, legislatie.just.ro, static.anaf.ro
• Folosește și surse de specialitate: ceccar.ro, contabilul.ro, portal-contabilitate.ro, lege5.ro, juridice.ro
• Citează întotdeauna sursa exactă (titlu articol + URL complet)
• Verifică dacă informația este actualizată (preferă surse din 2024-2025)

IERARHIE SURSE (în ordine de prioritate):
1. **Surse oficiale** (cotă maximă încredere):
   - anaf.ro, static.anaf.ro
   - mfinante.gov.ro
   - legislatie.just.ro

2. **Surse profesionale** (cotă mare încredere):
   - ceccar.ro (Corpul Experților Contabili)
   - camera-auditorilor-financiari.ro
   - portal-contabilitate.ro

3. **Surse de specialitate** (cotă bună încredere):
   - contabilul.ro
   - lege5.ro
   - juridice.ro
   - avocatnet.ro (pentru aspecte juridice fiscale)

REGULI DE RĂSPUNS:
• Răspunde DOAR la întrebări despre fiscalitate și contabilitate din România
• Pentru întrebări non-fiscale, răspunde: "Nu pot răspunde. Sunt specializată doar în consultanță fiscală și contabilă din România."
• Folosește limba română
• Fii concis dar complet (maximum 800 cuvinte per răspuns)
• Dacă găsești informații contradictorii, menționează ambele perspective și citează sursele

FORMAT RĂSPUNS:
1. Răspuns direct la întrebare
2. Explicație detaliată cu exemple (dacă e cazul)
3. Citare articole de lege relevante (cu număr exact)
4. Surse verificate (minimum 2-3 link-uri)

DOMENII:
✅ Codul Fiscal (impozite, TVA, contribuții)
✅ Ordinul 1802/2014 (reglementări contabile)
✅ Monografii contabile (cu exemple practice)
✅ Proceduri ANAF
✅ Jurisprudență fiscală
❌ Analiza de balanțe contabile pentru companii specifice
❌ Date despre clienți sau companii specifice
❌ Sfaturi juridice personalizate (doar explicații generale)

IMPORTANT: Dacă găsești informații doar pe surse mai puțin oficiale (bloguri), menționează că este recomandat să verifici și cu surse oficiale pentru certitudine.
`;

serve(async (req) => {
  console.log('[FISCAL-CHAT] New request received.');
  console.log('[FISCAL-CHAT] Headers:', {
    authorization: req.headers.get('authorization'),
    contentType: req.headers.get('content-type'),
    method: req.method,
  });
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read raw body to avoid JSON parse issues
    let rawBody = '';
    try {
      rawBody = await req.text();
      console.log('[FISCAL-CHAT] Raw body length:', rawBody?.length ?? 0);
    } catch (e) {
      console.error('[FISCAL-CHAT] Failed to read body:', e);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    if (!rawBody) {
      console.error('[FISCAL-CHAT] Empty request body');
      return new Response(JSON.stringify({ error: 'Empty request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      console.error('[FISCAL-CHAT] JSON parse error:', err);
      return new Response(JSON.stringify({ error: 'Invalid JSON format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = typeof body.message === 'string' ? body.message
      : Array.isArray(body.messages) ? (body.messages?.[0]?.content ?? '') : '';
    console.log('[FISCAL-CHAT] Parsed message:', message ? message.slice(0, 120) : '(empty)');

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid message format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Perplexity API key
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('[FISCAL-CHAT] PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user - Supabase already verified JWT when verify_jwt=true
    // So we can get user info from the request
    const authHeader = req.headers.get('authorization');
    console.log('[FISCAL-CHAT] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('[FISCAL-CHAT] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('[FISCAL-CHAT] Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[FISCAL-CHAT] Request from user:', user.email);

    // Call Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: FISCAL_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        search_recency_filter: 'year',
        return_images: false,
        return_related_questions: true,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('[FISCAL-CHAT] Perplexity API error:', perplexityResponse.status, errorText);
      
      if (perplexityResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Prea multe cereri. Te rog încearcă din nou în câteva secunde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (perplexityResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Serviciul Perplexity necesită reîncărcare credit. Contactează administratorul.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Eroare la procesarea cererii' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await perplexityResponse.json();
    console.log('[FISCAL-CHAT] Response received, citations:', data.citations?.length || 0);

    // Extract response and sources
    const responseText = data.choices?.[0]?.message?.content || 'Nu am putut genera un răspuns.';
    const citations = data.citations || [];
    const relatedQuestions = data.related_questions || [];

    // Format sources from citations
    const sources = citations.map((url: string) => {
      // Extract domain and create a readable title
      const domain = new URL(url).hostname.replace('www.', '');
      const pathParts = new URL(url).pathname.split('/').filter(Boolean);
      const title = pathParts.length > 0 
        ? pathParts[pathParts.length - 1].replace(/-/g, ' ').substring(0, 60)
        : domain;
      
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        url: url,
        domain: domain
      };
    });

    return new Response(
      JSON.stringify({
        message: responseText,
        response: responseText,
        sources: sources,
        related_questions: relatedQuestions
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[FISCAL-CHAT] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Eroare internă a serverului' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
