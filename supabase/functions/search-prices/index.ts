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
    const { product, currency = 'RON' } = await req.json();

    if (!product || typeof product !== 'string' || product.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Produsul trebuie să aibă minim 2 caractere' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Neautorizat' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = `Find the best prices for "${product.trim()}" in Romania (${currency}). Search on eMAG, Amazon, AliExpress, OLX, and other major e-commerce sites. For each result provide: store name, product name, price in ${currency}, and URL. Return at least 3-5 results sorted by price ascending.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a price comparison assistant. Return results as valid JSON array. Each item must have: {"store": "string", "product_name": "string", "price": number, "currency": "${currency}", "url": "string"}. Only return the JSON array, nothing else. If you can't find exact prices, estimate based on search results. Always include the source URL.`,
          },
          { role: 'user', content: searchQuery },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error('Perplexity API error:', errData);
      return new Response(
        JSON.stringify({ error: `Search API error: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    const citations = data.citations || [];

    // Parse results - try to extract JSON array
    let results: any[] = [];
    try {
      // Try direct parse
      const parsed = JSON.parse(content);
      results = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Try to find JSON array in the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          results = JSON.parse(jsonMatch[0]);
        } catch {
          results = [];
        }
      }
    }

    // Calculate best price
    const validResults = results.filter((r: any) => r.price && typeof r.price === 'number');
    const bestResult = validResults.length > 0
      ? validResults.reduce((min: any, r: any) => r.price < min.price ? r : min, validResults[0])
      : null;

    // Save to DB using service role
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await serviceClient.from('price_searches').insert({
      user_id: user.id,
      product_query: product.trim(),
      results: results,
      best_price: bestResult?.price || null,
      best_source: bestResult?.store || null,
      currency,
      sources_checked: results.length,
    });

    return new Response(
      JSON.stringify({
        results,
        best_price: bestResult?.price || null,
        best_source: bestResult?.store || null,
        citations,
        sources_checked: results.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-prices:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
