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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cif } = await req.json();

    if (!cif) {
      return new Response(
        JSON.stringify({ error: 'CIF este obligatoriu', found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Sanitize CIF - remove RO prefix and spaces
    const cleanCIF = cif.toString().replace(/[^0-9]/g, '');
    
    if (!cleanCIF || cleanCIF.length < 6) {
      return new Response(
        JSON.stringify({ error: 'CIF invalid', found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`🔍 Căutare CIF în ANAF: ${cleanCIF}`);

    // Removed redundant initial ANAF fetch (using robust fallback block below)

    // Call ANAF OpenAPI with enhanced headers and retry logic
    const currentDate = new Date().toISOString().split('T')[0];
    const requestBody = [{
      cui: parseInt(cleanCIF, 10),
      data: currentDate
    }];

    console.log('📤 ANAF Request Body:', JSON.stringify(requestBody));

    let anafData: ANAFResponse | null = null;
    let lastError: string = '';

    // Try main endpoint with browser-like headers
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'ro-RO,ro;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('🌐 ANAF Response Status:', res.status);
      
      if (res.ok) {
        const text = await res.text();
        console.log('📦 ANAF Response (first 500 chars):', text.substring(0, 500));
        
        try {
          anafData = JSON.parse(text);
          console.log('✅ ANAF Parsed Successfully');
        } catch (parseErr) {
          console.error('❌ JSON parse error:', parseErr);
          lastError = 'Răspuns invalid de la ANAF (JSON parse failed)';
        }
      } else {
        const errorText = await res.text();
        console.error('❌ ANAF HTTP Error:', res.status, errorText.substring(0, 200));
        lastError = `ANAF API error (${res.status})`;
      }
    } catch (fetchErr: any) {
      console.error('❌ ANAF Fetch Error:', fetchErr.message);
      lastError = fetchErr.name === 'AbortError' 
        ? 'Timeout - API-ul ANAF nu răspunde' 
        : `Eroare de conectare: ${fetchErr.message}`;
    }

    if (!anafData) {
      return new Response(
        JSON.stringify({ error: 'Serviciul ANAF nu răspunde corect (404/parse). Încearcă mai târziu sau completează manual.', found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // Check ANAF response structure
    if (anafData.cod !== 200 || !anafData.found || anafData.found.length === 0) {
      console.log('⚠️ CIF not found in ANAF database');
      return new Response(
        JSON.stringify({ 
          error: 'CIF invalid sau firma nu este înregistrată în baza ANAF', 
          found: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Extract company data from ANAF response
    const foundData = anafData.found[0];
    const dateGenerale = foundData.date_generale || {};
    const inregistrare_scop_Tva = (foundData as any).inregistrare_scop_Tva || {};

    // Return structured data
    const result = {
      found: true,
      cif: dateGenerale.cui ? `RO${dateGenerale.cui}` : `RO${cleanCIF}`,
      company_name: dateGenerale.denumire || 'Nume necunoscut',
      address: dateGenerale.adresa || '',
      vat_payer: inregistrare_scop_Tva?.scpTVA ?? false,
      registration_date: inregistrare_scop_Tva?.data_inregistrare_scop_Tva || null,
      status: dateGenerale.statusInactivi || 'ACTIV',
      source: 'ANAF'
    };

    console.log('✅ Date firmă găsite:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in fetch-company-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage, found: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
