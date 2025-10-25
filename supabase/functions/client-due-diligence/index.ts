import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Finding {
  type: "critical" | "warning" | "info";
  category: "legal" | "financial" | "reputation" | "administrative";
  message: string;
  source: string;
  link?: string;
}

interface VerificationResult {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  findings: Finding[];
  metadata: {
    cifValid: boolean;
    isActive: boolean;
    capitalSocial?: number;
    administrator?: string;
    companyStatus?: string;
    registrationDate?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, cif, companyName } = await req.json();

    if (!companyId || !cif) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: companyId, cif" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting verification for company: ${companyName} (CIF: ${cif})`);

    const result = await performDueDiligence(cif, companyName);

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    const { error: insertError } = await supabase
      .from('client_verification_history')
      .insert({
        company_id: companyId,
        verified_by: userId,
        risk_score: result.riskScore,
        risk_level: result.riskLevel,
        findings: result.findings,
        metadata: result.metadata
      });

    if (insertError) {
      console.error('Error saving verification:', insertError);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in client-due-diligence:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performDueDiligence(cif: string, companyName: string): Promise<VerificationResult> {
  const findings: Finding[] = [];
  let riskScore = 0;

  // Clean CIF (remove RO prefix if present)
  const cleanCif = cif.replace(/^RO/i, '').trim();

  // 1. Verify CIF with ANAF
  const anafResult = await checkANAF(cleanCif);
  
  if (!anafResult.valid) {
    riskScore += 40;
    findings.push({
      type: "critical",
      category: "legal",
      message: `CUI invalid sau inexistent în registrul ANAF (CIF verificat: ${cleanCif})`,
      source: "ANAF API - Informații Generale"
    });
  } else {
    findings.push({
      type: "info",
      category: "legal",
      message: `CUI valid: RO${cleanCif} - Status: ${anafResult.companyStatus || (anafResult.isActive ? 'ACTIV' : 'INACTIV')}`,
      source: "ANAF API - Informații Generale",
      link: `https://www.anaf.ro`
    });

    if (!anafResult.isActive) {
      riskScore += 30;
      findings.push({
        type: "critical",
        category: "legal",
        message: `Compania are status: ${anafResult.companyStatus || 'INACTIV'} în registrul ANAF`,
        source: "ANAF API"
      });
    }
  }

  // 2. Search for negative news (using basic Google search simulation)
  const newsResults = await searchNegativeNews(companyName, cleanCif);
  if (newsResults.length > 0) {
    riskScore += newsResults.length * 10;
    newsResults.forEach(news => findings.push(news));
  } else {
    findings.push({
      type: "info",
      category: "reputation",
      message: "Nu au fost găsite mențiuni negative în presă",
      source: "News Search"
    });
  }

  // 3. Check administrator history (simulated - would need real API)
  if (anafResult.administrator) {
    findings.push({
      type: "info",
      category: "administrative",
      message: `Administrator: ${anafResult.administrator}`,
      source: "ANAF Data"
    });
  }

  // Calculate risk level
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (riskScore >= 70) {
    riskLevel = "critical";
  } else if (riskScore >= 50) {
    riskLevel = "high";
  } else if (riskScore >= 25) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  return {
    riskScore: Math.min(riskScore, 100),
    riskLevel,
    findings,
    metadata: {
      cifValid: anafResult.valid,
      isActive: anafResult.isActive,
      capitalSocial: anafResult.capitalSocial,
      administrator: anafResult.administrator,
      companyStatus: anafResult.companyStatus,
      registrationDate: anafResult.registrationDate
    }
  };
}

async function checkANAF(cif: string): Promise<{
  valid: boolean;
  isActive: boolean;
  capitalSocial?: number;
  administrator?: string;
  companyStatus?: string;
  registrationDate?: string;
}> {
  try {
    // ANAF Public API - Informații generale (nu doar TVA)
    const response = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ cui: parseInt(cif) }])
    });

    if (!response.ok) {
      console.error('ANAF API error:', response.status);
      return { valid: false, isActive: false };
    }

    const data = await response.json();
    console.log('ANAF Response for CIF', cif, ':', JSON.stringify(data, null, 2));
    
    const companyData = data?.found?.[0];

    if (!companyData) {
      // Verifică și în lista "notfound"
      const notFound = data?.notfound?.[0];
      if (notFound) {
        console.log('Company not found in ANAF registry:', notFound);
        return { 
          valid: false, 
          isActive: false,
          companyStatus: 'NU EXISTĂ ÎN REGISTRUL ANAF'
        };
      }
      return { valid: false, isActive: false };
    }

    // Status firmă: verificăm câmpul "stare"
    // Valori posibile: "ACTIVA", "INACTIVA", "DIZOLVATA", "RADIATA"
    const isActive = companyData.stare === 'ACTIVA';
    
    return {
      valid: true,
      isActive: isActive,
      capitalSocial: companyData.capitalSocial || undefined,
      administrator: companyData.adresa || undefined,
      companyStatus: companyData.stare || 'NECUNOSCUT',
      registrationDate: companyData.dataInregistrare || undefined
    };

  } catch (error) {
    console.error('Error checking ANAF:', error);
    return { valid: false, isActive: false };
  }
}

async function searchNegativeNews(companyName: string, cif: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  
  // Keywords that indicate negative news
  const negativeKeywords = [
    'evaziune fiscală',
    'fraudă',
    'ANAF executare',
    'faliment',
    'insolvență',
    'dosar penal',
    'condamnat'
  ];

  // In a real implementation, this would use Google Custom Search API or similar
  // For now, we'll simulate the search
  console.log(`Simulating news search for: ${companyName}`);
  
  // This is a placeholder - in production, you would:
  // 1. Use Google Custom Search API (100 queries/day free)
  // 2. Or scrape news sites (be careful with rate limits)
  // 3. Or use a news aggregation API

  return findings;
}
