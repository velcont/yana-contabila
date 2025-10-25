import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

interface ANAFResponse {
  cod: number;
  message: string;
  found?: Array<{
    date_generale: {
      cui: number;
      data: string;
      denumire: string;
      adresa: string;
      nrRegCom?: string;
      telefon?: string;
      fax?: string;
      codPostal?: string;
      act?: string;
      stare_inactiv?: string;
      statusInactivi?: string;
    };
    inregistrare_scop_Tva?: {
      scpTVA: boolean;
      data_inregistrare_scop_Tva?: string;
      data_anulare_inregistrare_scop_Tva?: string;
    };
  }>;
  notfound?: Array<{
    cui: number;
    data: string;
  }>;
}

interface CompanyData {
  source: string;
  company_name: string;
  cui: string;
  registration_number: string;
  address: string;
  vat_payer: boolean;
  phone: string;
  email: string;
  caen_code: string;
  status: string;
  found: boolean;
}

// Method 1: Targetare.ro - Primary source with API key
async function fetchFromTargetare(cui: string): Promise<CompanyData> {
  const apiKey = Deno.env.get('TARGETARE_API_KEY');
  
  if (!apiKey) {
    console.error('❌ TARGETARE_API_KEY not configured');
    throw new Error('API key lipsă pentru Targetare.ro');
  }

  try {
    // Targetare.ro API endpoint - documented at https://api.targetare.ro/
    const url = `https://api.targetare.ro/v1/companies/${cui}`;
    console.log(`🔍 Calling Targetare.ro: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });

    console.log(`📊 Targetare response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`📋 Targetare error response: ${errorText.substring(0, 500)}`);
      throw new Error(`Targetare.ro returned status ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`❌ Targetare returned ${contentType} instead of JSON`);
      throw new Error('Invalid content type from Targetare.ro');
    }

    const data = await response.json();
    console.log('📦 Targetare raw data:', JSON.stringify(data).substring(0, 500));

    // Targetare API response structure: { success: true, data: {...} }
    if (!data.success || !data.data) {
      console.error('❌ Invalid response structure from Targetare:', data);
      throw new Error('Invalid response structure');
    }

    const companyInfo = data.data;

    // Extract company data based on Targetare API structure
    const companyData: CompanyData = {
      source: 'Targetare.ro',
      company_name: companyInfo.companyName || '',
      cui: companyInfo.taxId || cui,
      registration_number: companyInfo.companyId || '',
      address: companyInfo.fullAddress || '',
      vat_payer: companyInfo.VAT === true || companyInfo.checkoutVAT === true,
      phone: companyInfo.hasPhone ? '(disponibil prin API separat)' : '',
      email: companyInfo.hasEmail ? '(disponibil prin API separat)' : '',
      caen_code: Array.isArray(companyInfo.caen) ? companyInfo.caen[companyInfo.caen.length - 1] : '',
      status: companyInfo.status === 'functiune' ? 'ACTIVA' : companyInfo.status?.toUpperCase() || 'NECUNOSCUT',
      found: true
    };

    console.log('✅ Targetare formatted data:', companyData);
    return companyData;

  } catch (error: any) {
    console.error(`❌ Targetare failed:`, error.message);
    throw error;
  }
}


// Main handler with fallback cascade
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Accept both 'cui' and 'cif' parameters
    const cui = body.cui || body.cif;
    
    if (!cui || cui.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'CUI/CIF lipsă sau invalid', found: false }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanCui = cui.toString().replace(/\D/g, '');
    
    if (cleanCui.length < 2 || cleanCui.length > 10) {
      return new Response(
        JSON.stringify({ error: 'CUI/CIF trebuie să aibă între 2 și 10 cifre', found: false }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`\n🚀 Starting fetch for CUI: ${cleanCui}`);

    // Use only Targetare.ro as requested by user
    let companyData: CompanyData | null = null;
    
    try {
      console.log('\n📍 Fetching from Targetare.ro...');
      companyData = await fetchFromTargetare(cleanCui);
      console.log('✅ SUCCESS: Targetare.ro');
    } catch (error: any) {
      console.error('\n❌ Targetare.ro failed:', error.message);
      return new Response(
        JSON.stringify({ 
          error: 'Nu s-au putut prelua date de la Targetare.ro',
          details: error.message,
          found: false
        }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('\n✅ Company data found from:', companyData.source);
    console.log('📋 Data:', {
      name: companyData.company_name,
      cui: companyData.cui,
      vat_payer: companyData.vat_payer
    });

    return new Response(
      JSON.stringify(companyData), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('\n💥 FATAL ERROR:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Eroare la preluarea datelor firmei',
        details: error.message,
        found: false
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
