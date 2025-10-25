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
    // Targetare.ro API endpoint (most common pattern for Romanian company APIs)
    const url = `https://api.targetare.ro/v1/company/${cui}`;
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

    // Handle different possible response structures
    const companyInfo = data.data || data.company || data;
    
    if (!companyInfo || typeof companyInfo !== 'object') {
      console.error('❌ Invalid data structure from Targetare:', data);
      throw new Error('Invalid data structure');
    }

    // Extract company data (adapting to common Romanian API patterns)
    const companyData: CompanyData = {
      source: 'Targetare.ro',
      company_name: companyInfo.denumire || companyInfo.name || companyInfo.nume || '',
      cui: companyInfo.cui || companyInfo.cif || companyInfo.codFiscal || cui,
      registration_number: companyInfo.nrRegCom || companyInfo.numar_reg_com || companyInfo.registrationNumber || '',
      address: companyInfo.adresa || companyInfo.address || '',
      vat_payer: companyInfo.platitor_tva === true || 
                 companyInfo.tva === 'DA' || 
                 companyInfo.tva === true ||
                 companyInfo.vatPayer === true ||
                 companyInfo.scpTVA === true,
      phone: companyInfo.telefon || companyInfo.phone || '',
      email: companyInfo.email || '',
      caen_code: companyInfo.caen || companyInfo.cod_caen || companyInfo.caenCode || '',
      status: companyInfo.stare || companyInfo.status || 'ACTIVA',
      found: true
    };

    console.log('✅ Targetare formatted data:', companyData);
    return companyData;

  } catch (error: any) {
    console.error(`❌ Targetare failed:`, error.message);
    throw error;
  }
}

// Method 2: ANAF API with optimized headers
async function fetchFromANAF(cui: string): Promise<CompanyData> {
  try {
    console.log('🔍 Calling ANAF API...');
    const url = 'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva';
    const currentDate = new Date().toISOString().split('T')[0];
    
    const requestBody = [{ cui: parseInt(cui.replace(/\D/g, ''), 10), data: currentDate }];
    console.log('📤 ANAF request body:', JSON.stringify(requestBody));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000)
    });

    console.log(`📊 ANAF response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`📋 ANAF error response: ${errorText.substring(0, 500)}`);
      throw new Error(`ANAF returned status ${response.status}`);
    }

    const data: ANAFResponse = await response.json();
    console.log('📦 ANAF raw data:', JSON.stringify(data));

    // Check if company was not found
    if (data.notfound && data.notfound.length > 0) {
      console.log('⚠️ ANAF notfound:', data.notfound);
      throw new Error('Firmă negăsită în baza ANAF');
    }

    if (!data.found || data.found.length === 0) {
      console.log('⚠️ ANAF found array is empty');
      throw new Error('Firmă negăsită în baza ANAF');
    }

    const company = data.found[0];
    console.log('📋 ANAF company object:', JSON.stringify(company));
    
    const dateGenerale = company.date_generale || {};
    const inregistrare_scop_Tva = company.inregistrare_scop_Tva;
    
    const companyData: CompanyData = {
      source: 'ANAF',
      company_name: dateGenerale.denumire || '',
      cui: dateGenerale.cui ? `RO${dateGenerale.cui}` : cui,
      registration_number: dateGenerale.nrRegCom || '',
      address: dateGenerale.adresa || '',
      vat_payer: inregistrare_scop_Tva?.scpTVA ?? false,
      phone: dateGenerale.telefon || '',
      email: '',
      caen_code: '',
      status: dateGenerale.stare_inactiv ? 'INACTIVA' : 'ACTIVA',
      found: true
    };

    console.log('✅ ANAF formatted data:', companyData);
    return companyData;

  } catch (error: any) {
    console.error('❌ ANAF failed:', error.message);
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

    let companyData: CompanyData | null = null;
    const errors: string[] = [];

    // Try Targetare.ro first (primary source with API key)
    try {
      console.log('\n📍 Step 1: Trying Targetare.ro...');
      companyData = await fetchFromTargetare(cleanCui);
      console.log('✅ SUCCESS: Targetare.ro');
    } catch (error: any) {
      errors.push(`Targetare: ${error.message}`);
      console.log('❌ FAILED: Targetare.ro');
      console.log('\n📍 Step 2: Trying ANAF as fallback...');
      
      // Fallback to ANAF (free, no API key needed)
      try {
        companyData = await fetchFromANAF(cleanCui);
        console.log('✅ SUCCESS: ANAF');
      } catch (anafError: any) {
        errors.push(`ANAF: ${anafError.message}`);
        console.log('❌ FAILED: ANAF');
      }
    }

    if (!companyData) {
      console.error('\n❌ All sources failed. Errors:', errors);
      return new Response(
        JSON.stringify({ 
          error: 'Nu s-au putut prelua date din nicio sursă (Targetare.ro și ANAF au eșuat)',
          details: errors,
          found: false
        }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('\n✅ FINAL SUCCESS - Company data found from:', companyData.source);
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
