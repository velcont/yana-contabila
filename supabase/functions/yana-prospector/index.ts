import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEARCH_QUERIES = [
  "firme SRL Romania contact email office",
  "antreprenori romani firme mici email contact",
  "firme contabilitate Romania email office",
  "SRL-uri Bucuresti Cluj Timisoara email contact",
  "firme consultanta Romania email office",
  "startup-uri Romania email contact",
  "firme IT Romania email office",
  "firme comert Romania email contact",
  "firme servicii Romania email office",
  "firme productie Romania email contact",
];

function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex) || [];
  // Only keep generic business emails
  const genericPrefixes = ['office', 'contact', 'info', 'secretariat', 'receptie', 'comenzi', 'vanzari'];
  return emails.filter(email => {
    const prefix = email.split('@')[0].toLowerCase();
    return genericPrefixes.some(p => prefix.includes(p));
  });
}

function extractCompanyInfo(text: string, email: string): { company_name: string; website: string | null; city: string | null } {
  const domain = email.split('@')[1];
  const website = `https://${domain}`;
  
  // Try to extract company name from context around the email
  const emailIndex = text.indexOf(email);
  const contextStart = Math.max(0, emailIndex - 200);
  const contextEnd = Math.min(text.length, emailIndex + 200);
  const context = text.substring(contextStart, contextEnd);
  
  // Simple heuristic: use domain as company name
  const companyName = domain.replace(/\.(ro|com|eu|net|org)$/i, '').replace(/[.-]/g, ' ').trim();
  
  // Try to detect city
  const cities = ['București', 'Bucuresti', 'Cluj', 'Timișoara', 'Timisoara', 'Iași', 'Iasi', 'Constanța', 'Constanta', 'Brașov', 'Brasov', 'Sibiu', 'Oradea', 'Craiova', 'Ploiești', 'Ploiesti', 'Galați', 'Galati', 'Arad'];
  let city: string | null = null;
  for (const c of cities) {
    if (context.toLowerCase().includes(c.toLowerCase())) {
      city = c;
      break;
    }
  }
  
  return { company_name: companyName, website, city };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Pick a random search query
    const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
    
    console.log(`[yana-prospector] Searching: "${query}"`);

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
            content: 'Ești un asistent care caută firme SRL din România. Răspunde cu o listă de firme incluzând: numele firmei, emailul de contact (office@, contact@, info@), website-ul și orașul. Listează cât mai multe firme posibil cu emailuri reale de contact găsite online. Concentrează-te pe emailuri generice de firmă, nu personale.'
          },
          {
            role: 'user',
            content: `Găsește firme SRL din România cu emailuri de contact publice. Caută: ${query}. Listează numele firmei, emailul, website-ul și orașul pentru fiecare.`
          }
        ],
        temperature: 0.5,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      throw new Error(`Perplexity API error [${perplexityResponse.status}]: ${errorText}`);
    }

    const perplexityData = await perplexityResponse.json();
    const responseText = perplexityData.choices?.[0]?.message?.content || '';
    
    console.log(`[yana-prospector] Response length: ${responseText.length}`);

    // Extract emails from the response
    const emails = extractEmails(responseText);
    console.log(`[yana-prospector] Found ${emails.length} emails`);

    // Get existing emails to avoid duplicates
    const { data: existingLeads } = await supabase
      .from('outreach_leads')
      .select('email');
    
    const { data: unsubscribed } = await supabase
      .from('outreach_unsubscribes')
      .select('email');

    const existingEmails = new Set([
      ...(existingLeads || []).map((l: any) => l.email.toLowerCase()),
      ...(unsubscribed || []).map((u: any) => u.email.toLowerCase()),
    ]);

    // Insert new leads
    let inserted = 0;
    for (const email of emails) {
      if (existingEmails.has(email.toLowerCase())) continue;
      
      const info = extractCompanyInfo(responseText, email);
      
      const { error } = await supabase.from('outreach_leads').insert({
        company_name: info.company_name,
        email: email.toLowerCase(),
        website: info.website,
        city: info.city,
        source: 'google',
        status: 'new',
      });

      if (!error) {
        inserted++;
        existingEmails.add(email.toLowerCase());
      }
    }

    console.log(`[yana-prospector] Inserted ${inserted} new leads`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        query,
        emailsFound: emails.length, 
        newLeadsInserted: inserted 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[yana-prospector] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
