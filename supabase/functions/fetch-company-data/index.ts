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

    // Call ANAF OpenAPI with fallbacks and robust parsing
    const urls = [
      'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva',
      'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva/'
    ];

    let anafData: ANAFResponse | null = null;

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'YanaCRM/1.0'
          },
          body: JSON.stringify([{ cui: parseInt(cleanCIF, 10), data: new Date().toISOString().split('T')[0] }])
        });

        const text = await res.text();
        console.log('🌐 ANAF URL tried:', url, 'status:', res.status);

        if (!res.ok) {
          console.error('❌ ANAF non-200 status for', url, res.status);
          continue; // try next URL
        }

        try {
          anafData = JSON.parse(text);
          console.log('📦 ANAF Full Response:', JSON.stringify(anafData, null, 2));
        } catch (e) {
          console.error('❌ JSON parse failed for ANAF response:', e);
          continue; // try next URL
        }

        break; // parsed successfully
      } catch (fetchErr) {
        console.error('❌ Fetch to ANAF failed for', url, fetchErr);
        continue; // try next URL
      }
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
