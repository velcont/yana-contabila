import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Method 1: OpenAPI.ro - Free and stable API
async function fetchFromOpenAPI(cui: string): Promise<CompanyData> {
  try {
    const url = `https://api.openapi.ro/api/companies/${cui}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`OpenAPI status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.denumire) {
      throw new Error('Date invalide de la OpenAPI');
    }

    return {
      source: 'OpenAPI.ro',
      company_name: data.denumire || '',
      cui: data.cif || cui,
      registration_number: data.numar_reg_com || '',
      address: data.adresa || '',
      vat_payer: data.tva === 'DA' || data.tva === true,
      phone: data.telefon || '',
      email: data.email || '',
      caen_code: data.cod_caen || '',
      status: data.stare || 'ACTIVA',
      found: true
    };
  } catch (error) {
    console.error('❌ OpenAPI failed:', error);
    throw error;
  }
}

// Method 2: ANAF API with optimized headers
async function fetchFromANAF(cui: string): Promise<CompanyData> {
  try {
    const url = 'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva';
    const currentDate = new Date().toISOString().split('T')[0];
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
        'Origin': 'https://www.anaf.ro',
        'Referer': 'https://www.anaf.ro/'
      },
      body: JSON.stringify([{ cui: parseInt(cui.replace(/\D/g, ''), 10), data: currentDate }]),
      signal: AbortSignal.timeout(15000) // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`ANAF status: ${response.status}`);
    }

    const data: ANAFResponse = await response.json();
    
    if (!data.found || data.found.length === 0) {
      throw new Error('Firmă negăsită în ANAF');
    }

    const company = data.found[0];
    const dateGenerale = company.date_generale || {};
    const inregistrare_scop_Tva = company.inregistrare_scop_Tva;
    
    return {
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
  } catch (error) {
    console.error('❌ ANAF failed:', error);
    throw error;
  }
}

// Method 3: ListaFirme.ro scraping (final fallback)
async function fetchFromListaFirme(cui: string): Promise<CompanyData> {
  try {
    const cleanCui = cui.replace(/\D/g, '');
    const url = `https://www.listafirme.ro/search.aspx?q=${cleanCui}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`ListaFirme status: ${response.status}`);
    }

    const html = await response.text();
    
    // Simple HTML parsing (for basic data)
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const addressMatch = html.match(/Adresa[:\s]*([^<]+)</i);
    
    if (!nameMatch) {
      throw new Error('Nu s-au putut extrage date din ListaFirme');
    }

    return {
      source: 'ListaFirme.ro',
      company_name: nameMatch[1].trim(),
      cui: cleanCui,
      registration_number: '',
      address: addressMatch ? addressMatch[1].trim() : '',
      vat_payer: false,
      phone: '',
      email: '',
      caen_code: '',
      status: 'NECUNOSCUT',
      found: true
    };
  } catch (error) {
    console.error('❌ ListaFirme failed:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cif } = await req.json();
    
    if (!cif || cif.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'CIF lipsă sau invalid', found: false }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanCIF = cif.toString().replace(/\D/g, '');
    
    if (cleanCIF.length < 2 || cleanCIF.length > 10) {
      return new Response(
        JSON.stringify({ error: 'CIF trebuie să aibă între 2 și 10 cifre', found: false }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Căutare CIF: ${cleanCIF}`);

    let companyData: CompanyData | null = null;
    let errors: string[] = [];

    // Try OpenAPI (most stable)
    try {
      console.log('📡 Trying OpenAPI.ro...');
      companyData = await fetchFromOpenAPI(cleanCIF);
      console.log('✅ OpenAPI success');
    } catch (error: any) {
      errors.push(`OpenAPI: ${error.message}`);
      console.log('❌ OpenAPI failed, trying ANAF...');
      
      // Fallback to ANAF
      try {
        companyData = await fetchFromANAF(cleanCIF);
        console.log('✅ ANAF success');
      } catch (anafError: any) {
        errors.push(`ANAF: ${anafError.message}`);
        console.log('❌ ANAF failed, trying ListaFirme...');
        
        // Final fallback to ListaFirme
        try {
          companyData = await fetchFromListaFirme(cleanCIF);
          console.log('✅ ListaFirme success');
        } catch (listaError: any) {
          errors.push(`ListaFirme: ${listaError.message}`);
        }
      }
    }

    if (!companyData) {
      console.log('❌ Toate sursele au eșuat:', errors);
      return new Response(
        JSON.stringify({ 
          error: 'Nu s-au putut prelua date din nicio sursă',
          details: errors,
          found: false
        }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Date firmă găsite:', companyData);

    return new Response(
      JSON.stringify(companyData), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message, found: false }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
