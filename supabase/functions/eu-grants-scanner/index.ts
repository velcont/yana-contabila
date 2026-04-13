import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EUGrant {
  title: string;
  description: string;
  deadline: string | null;
  funding_amount: string | null;
  source_url: string;
  program: string;
  eligibility_score: number;
  eligibility_notes: string;
  source_type: 'eu_official' | 'ro_national' | 'perplexity';
}

interface CompanyProfile {
  industry: string;
  business_type: string;
  employees_count?: number;
  annual_revenue?: number;
  cui?: string;
  county?: string;
}

/**
 * EU Grants Scanner — Multi-source pipeline for Romanian SRLs
 * 
 * Sources:
 * 1. EU SEDIA API (ec.europa.eu) — real-time open calls
 * 2. Perplexity sonar-pro — Romanian-specific programs (MIPE, ADR, PNRR)
 * 3. Lovable AI — eligibility matching & scoring
 */

async function searchEUSediaAPI(profile: CompanyProfile): Promise<EUGrant[]> {
  const grants: EUGrant[] = [];
  
  try {
    // Search EU Funding & Tenders portal API
    const keywords = encodeURIComponent(`${profile.industry} SME Romania`);
    const apiUrl = `https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=${keywords}&pageSize=10&pageNumber=1`;
    
    const res = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (res.ok) {
      const data = await res.json();
      const results = data?.results || [];
      
      for (const item of results.slice(0, 5)) {
        const content = item?.content || {};
        grants.push({
          title: content.title || item.title || 'EU Grant',
          description: (content.description || content.summary || '').slice(0, 300),
          deadline: content.deadlineDate || null,
          funding_amount: content.budget || null,
          source_url: content.url || `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-search`,
          program: content.programmeName || 'EU Programme',
          eligibility_score: 5,
          eligibility_notes: 'Verificați criteriile de eligibilitate pe portalul oficial.',
          source_type: 'eu_official',
        });
      }
    }
  } catch (err) {
    console.error('[eu-grants] SEDIA API error:', err);
  }
  
  return grants;
}

async function searchRomanianGrants(profile: CompanyProfile, perplexityKey: string): Promise<EUGrant[]> {
  const grants: EUGrant[] = [];
  
  const searchQueries = [
    `fonduri europene nerambursabile SRL ${profile.industry} România 2025 2026 active deschise aplicare PNRR POC POCU`,
    `granturi IMM ${profile.industry} România apeluri deschise ADR MIPE MySmis`,
  ];
  
  for (const query of searchQueries) {
    try {
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: `Ești expert în fonduri europene pentru IMM-uri din România. Caută DOAR oportunități de finanțare reale, verificabile, cu link-uri funcționale.

Returnează un JSON array cu maxim 5 oportunități. Format strict:
[{
  "title": "Numele programului",
  "description": "Descriere max 150 cuvinte cu criterii de eligibilitate",
  "deadline": "YYYY-MM-DD sau null",
  "funding_amount": "suma min-max în EUR",
  "source_url": "link oficial verificabil",
  "program": "PNRR/POC/POCU/Horizon/Digital Europe/etc",
  "eligibility_notes": "criterii principale de eligibilitate"
}]

IMPORTANT:
- Doar programe cu apeluri deschise sau care se deschid în următoarele 3 luni
- Surse: mipe.gov.ro, mysmis2021.gov.ro, adrbi.ro, ADR-uri regionale, ec.europa.eu
- Include și programele de minimis (HG 807, Start-Up Nation, etc.)
- Răspunde DOAR cu JSON-ul, fără alte texte.`,
            },
            { role: 'user', content: query },
          ],
          temperature: 0.1,
          search_recency_filter: 'month',
        }),
      });
      
      if (!res.ok) continue;
      
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          for (const g of parsed) {
            grants.push({
              ...g,
              eligibility_score: 5,
              source_type: 'ro_national' as const,
            });
          }
        }
      } catch {
        console.error('[eu-grants] Failed to parse Perplexity response');
      }
    } catch (err) {
      console.error('[eu-grants] Perplexity search error:', err);
    }
  }
  
  // Deduplicate by title similarity
  const seen = new Set<string>();
  return grants.filter(g => {
    const key = g.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function scoreEligibility(
  grants: EUGrant[],
  profile: CompanyProfile,
  lovableKey: string
): Promise<EUGrant[]> {
  if (grants.length === 0) return [];
  
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Ești consultant în fonduri europene pentru IMM-uri românești. Primești o listă de granturi și profilul unei companii. 
Evaluează eligibilitatea fiecărui grant pe o scară 1-10 și adaugă note specifice.

Răspunde DOAR cu JSON array:
[{"index": 0, "score": 8, "notes": "Eligibil. Îndeplinește criteriile de dimensiune și industrie. Trebuie verificat codul CAEN."}]`,
          },
          {
            role: 'user',
            content: `Profil companie:
- Industrie: ${profile.industry}
- Tip: ${profile.business_type || 'SRL'}
- Angajați: ${profile.employees_count || 'necunoscut'}
- Cifră afaceri: ${profile.annual_revenue ? profile.annual_revenue + ' RON' : 'necunoscută'}
- Județ: ${profile.county || 'necunoscut'}

Granturi găsite:
${grants.map((g, i) => `[${i}] ${g.title}\n${g.description}\nProgram: ${g.program}\nEligibilitate: ${g.eligibility_notes || 'N/A'}`).join('\n\n')}`,
          },
        ],
        temperature: 0.2,
      }),
    });
    
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const scores = JSON.parse(cleaned);
      
      for (const s of scores) {
        if (grants[s.index]) {
          grants[s.index].eligibility_score = s.score;
          grants[s.index].eligibility_notes = s.notes;
        }
      }
    } catch {
      console.error('[eu-grants] Failed to parse eligibility scores');
    }
  } catch (err) {
    console.error('[eu-grants] Eligibility scoring error:', err);
  }
  
  // Sort by eligibility score descending
  return grants.sort((a, b) => (b.eligibility_score || 0) - (a.eligibility_score || 0));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!PERPLEXITY_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'API keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get company profile
    const body = await req.json().catch(() => ({}));
    const industry = body.industry || null;
    
    let profile: CompanyProfile = {
      industry: industry || 'IMM România',
      business_type: 'SRL',
    };
    
    // Try to get profile from DB
    if (!industry) {
      const { data: clientProfile } = await supabase
        .from('yana_client_profiles')
        .select('industry, business_type, employees_count, annual_revenue, county')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (clientProfile) {
        profile = {
          industry: clientProfile.industry || 'IMM România',
          business_type: clientProfile.business_type || 'SRL',
          employees_count: clientProfile.employees_count,
          annual_revenue: clientProfile.annual_revenue,
          county: clientProfile.county,
        };
      }
      
      // Also check companies table
      const { data: company } = await supabase
        .from('companies')
        .select('company_name, cui, tax_regime')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (company?.cui) {
        profile.cui = company.cui;
      }
    }
    
    console.log(`[eu-grants] Scanning for user ${user.id}, industry: ${profile.industry}`);
    
    // Run searches in parallel
    const [euGrants, roGrants] = await Promise.all([
      searchEUSediaAPI(profile),
      searchRomanianGrants(profile, PERPLEXITY_API_KEY),
    ]);
    
    // Combine and deduplicate
    const allGrants = [...euGrants, ...roGrants];
    console.log(`[eu-grants] Found ${euGrants.length} EU + ${roGrants.length} RO grants`);
    
    // Score eligibility
    const scoredGrants = await scoreEligibility(allGrants, profile, LOVABLE_API_KEY);
    
    // Store in DB
    for (const grant of scoredGrants.slice(0, 10)) {
      await supabase.from('grant_opportunities').upsert({
        user_id: user.id,
        title: grant.title,
        description: grant.description,
        source_url: grant.source_url || null,
        deadline: grant.deadline && grant.deadline !== 'null' ? grant.deadline : null,
        funding_amount: grant.funding_amount || null,
        relevance_score: grant.eligibility_score || 5,
        industry: profile.industry,
        search_query: `eu-grants-scanner: ${profile.industry}`,
        raw_data: grant as unknown as Record<string, unknown>,
      }, { onConflict: 'user_id,title', ignoreDuplicates: true }).catch(() => {
        // Fallback: insert without upsert
        supabase.from('grant_opportunities').insert({
          user_id: user.id,
          title: grant.title,
          description: grant.description,
          source_url: grant.source_url || null,
          deadline: grant.deadline && grant.deadline !== 'null' ? grant.deadline : null,
          funding_amount: grant.funding_amount || null,
          relevance_score: grant.eligibility_score || 5,
          industry: profile.industry,
          search_query: `eu-grants-scanner: ${profile.industry}`,
          raw_data: grant as unknown as Record<string, unknown>,
        });
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      grants: scoredGrants,
      profile,
      metadata: {
        eu_sources: euGrants.length,
        ro_sources: roGrants.length,
        total: scoredGrants.length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[eu-grants] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
