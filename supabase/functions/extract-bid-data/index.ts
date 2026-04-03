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
    const { document_text } = await req.json();

    if (!document_text || typeof document_text !== 'string' || document_text.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Textul documentului trebuie să aibă minim 10 caractere' }),
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

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'Ești un expert în extracție date din documente de ofertă, facturi și licitații. Extrage toate câmpurile relevante cu precizie maximă.',
          },
          {
            role: 'user',
            content: `Extrage datele structurate din acest document:\n\n${document_text.slice(0, 8000)}`,
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_bid_fields',
            description: 'Extract structured fields from bid/offer document',
            parameters: {
              type: 'object',
              properties: {
                vendor_name: { type: 'string', description: 'Numele furnizorului' },
                vendor_cui: { type: 'string', description: 'CUI/CIF furnizor' },
                total_price: { type: 'number', description: 'Preț total' },
                currency: { type: 'string', enum: ['RON', 'EUR', 'USD'] },
                bid_date: { type: 'string', description: 'Data ofertei (YYYY-MM-DD)' },
                valid_until: { type: 'string', description: 'Valabilitate ofertă' },
                delivery_terms: { type: 'string', description: 'Termen livrare' },
                payment_terms: { type: 'string', description: 'Condiții plată' },
                warranty: { type: 'string', description: 'Garanție' },
                reference_number: { type: 'string', description: 'Nr. referință/ofertă' },
                items: {
                  type: 'array',
                  description: 'Produse/servicii detaliate',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      quantity: { type: 'number' },
                      unit_price: { type: 'number' },
                      total: { type: 'number' },
                    },
                  },
                },
                specifications: { type: 'string', description: 'Specificații tehnice' },
                confidence_score: { type: 'number', description: 'Scor încredere extracție 0-1' },
              },
              required: ['vendor_name', 'confidence_score'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_bid_fields' } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, reîncearcă în câteva secunde.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Credite AI insuficiente.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI extraction failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: any = {};

    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {
        extracted = { vendor_name: 'Necunoscut', confidence_score: 0 };
      }
    }

    return new Response(
      JSON.stringify({ extracted, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-bid-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
