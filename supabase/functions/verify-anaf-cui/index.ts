import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  cui: z.string().min(1).max(15).regex(/^\d{1,10}$/, "CUI trebuie să conțină doar cifre (1-10)")
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'CUI invalid', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { cui } = parsed.data;
    const today = new Date().toISOString().split('T')[0];

    console.log(`Verifying CUI: ${cui}`);

    // Call ANAF public API
    const anafResponse = await fetch(
      'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v9/ws/tva',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ cui: parseInt(cui), data: today }])
      }
    );

    if (!anafResponse.ok) {
      console.error(`ANAF API error: ${anafResponse.status}`);
      return new Response(
        JSON.stringify({ 
          error: 'Serviciul ANAF nu este disponibil momentan. Încearcă din nou mai târziu.',
          anafStatus: anafResponse.status
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anafData = await anafResponse.json();
    console.log('ANAF response:', JSON.stringify(anafData).substring(0, 500));

    const found = anafData?.found?.[0];
    const notFound = anafData?.notfound;

    if (!found) {
      return new Response(
        JSON.stringify({
          success: false,
          cui,
          message: `CUI ${cui} nu a fost găsit în baza de date ANAF.`,
          notFound: notFound || true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract relevant data
    const generalData = found.date_generale || {};
    const tvaData = found.inregistrare_scop_Tva || {};
    const splitTva = found.inregistrare_RTVAI || {};

    const result = {
      success: true,
      cui,
      denumire: generalData.denumire || 'N/A',
      adresa: generalData.adresa || 'N/A',
      judet: generalData.judet || 'N/A',
      codPostal: generalData.codPostal || 'N/A',
      telefon: generalData.telefon || 'N/A',
      stare: generalData.stare_inregistrare || 'N/A',
      dataInregistrare: generalData.data_inregistrare || 'N/A',
      codCAEN: generalData.cod_CAEN || 'N/A',
      
      // TVA
      tvaActiv: tvaData.scpTVA || false,
      tvaDataInregistrare: tvaData.data_inregistrare_scpTVA || null,
      tvaDataAnulare: tvaData.data_anulare_scpTVA || null,
      
      // Split TVA
      splitTVA: splitTva.dataInceputSplitTVA ? true : false,
      splitTVADataInceput: splitTva.dataInceputSplitTVA || null,
      splitTVADataSfarsit: splitTva.dataAnulareSplitTVA || null,
      
      // Status
      statusActiv: generalData.statusInactivi || false,
      dataVerificare: today,
      
      // Formatted message for chat
      formattedMessage: formatForChat(cui, generalData, tvaData, splitTva)
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-anaf-cui:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Eroare necunoscută' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatForChat(cui: string, general: any, tva: any, split: any): string {
  const stare = general.stare_inregistrare || 'Necunoscută';
  const tvaStatus = tva.scpTVA ? '✅ TVA activ' : '❌ TVA inactiv';
  const splitStatus = split.dataInceputSplitTVA && !split.dataAnulareSplitTVA
    ? '⚠️ Split TVA activ'
    : 'Split TVA inactiv';
  
  return `🏢 **${general.denumire || 'N/A'}** (CUI: ${cui})

📍 Adresă: ${general.adresa || 'N/A'}
📋 Stare: **${stare}**
🔢 Cod CAEN: ${general.cod_CAEN || 'N/A'}

💰 **Status fiscal:**
- ${tvaStatus}${tva.data_inregistrare_scpTVA ? ` (din ${tva.data_inregistrare_scpTVA})` : ''}
- ${splitStatus}

📅 Verificat la: ${new Date().toLocaleDateString('ro-RO')}`;
}
