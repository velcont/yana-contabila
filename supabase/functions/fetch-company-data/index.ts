import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ANAFResponse {
  cod: number;
  data: string;
  nume: string;
  adresa: string;
  scpTVA: boolean;
  data_inregistrare?: string;
  statusRO?: string;
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

    // Call ANAF OpenAPI
    const anafResponse = await fetch('https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        cui: parseInt(cleanCIF),
        data: new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
      }])
    });

    // Try to parse response even on error status
    let anafData;
    try {
      anafData = await anafResponse.json();
      console.log('📦 ANAF Response:', JSON.stringify(anafData, null, 2));
      console.log('📊 ANAF Status:', anafResponse.status);
    } catch (parseError) {
      console.error('❌ Failed to parse ANAF response:', parseError);
      console.error('❌ ANAF API status:', anafResponse.status);
      return new Response(
        JSON.stringify({ error: 'Eroare la procesarea răspunsului ANAF', found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Check if company was found
    if (!anafData.found || anafData.found.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'CIF invalid sau firma nu este înregistrată în baza ANAF', 
          found: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const companyData: ANAFResponse = anafData.found[0];

    // Return structured data
    const result = {
      found: true,
      cif: `RO${cleanCIF}`,
      company_name: companyData.nume,
      address: companyData.adresa,
      vat_payer: companyData.scpTVA,
      registration_date: companyData.data_inregistrare || null,
      status: companyData.statusRO || 'ACTIV',
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
