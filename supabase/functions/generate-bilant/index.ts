const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getBilantCorrelationsPrompt } from '../_shared/bilant-correlations.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { balanceData, companyName, period, cui, analysisId } = await req.json();

    if (!balanceData) {
      return new Response(JSON.stringify({ error: 'Datele balanței sunt necesare' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[generate-bilant] Generating for ${companyName || 'unknown'}, period: ${period || 'unknown'}`);

    const correlationsPrompt = getBilantCorrelationsPrompt();

    const systemPrompt = `${correlationsPrompt}

IMPORTANT:
- Toate valorile trebuie să fie numerice (fără separatori de mii, punct pentru zecimale)
- Dacă o valoare lipsește din balanță, pune 0
- Verifică TOATE corelațiile și raportează statusul fiecăreia
- Echilibrul bilanțier TREBUIE verificat obligatoriu
- Returnează EXCLUSIV JSON valid, fără text suplimentar
- Impozit pe profit: 16% (Art. 17 Cod Fiscal)`;

    const userPrompt = `Generează bilanțul contabil (F10) și contul de profit și pierdere (F20) din următoarea balanță de verificare:

Firma: ${companyName || 'Necunoscută'}
CUI: ${cui || 'Necunoscut'}
Perioadă: ${period || 'Necunoscută'}

DATELE BALANȚEI:
${typeof balanceData === 'string' ? balanceData : JSON.stringify(balanceData, null, 2)}

Returnează JSON-ul conform structurii specificate.`;

    // Use Lovable AI Gateway
    const aiResponse = await fetch('https://ai.lovable.dev/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[generate-bilant] AI error:', errText);
      return new Response(JSON.stringify({ error: 'Eroare la generarea bilanțului' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    let bilantData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        bilantData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      console.error('[generate-bilant] Parse error:', parseErr);
      return new Response(JSON.stringify({ 
        error: 'Nu am putut parsa bilanțul generat',
        rawResponse: content.substring(0, 500),
      }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Run validation checks
    const validationResults = validateBilant(bilantData);
    bilantData.validari = [...(bilantData.validari || []), ...validationResults];
    bilantData.companyName = companyName;
    bilantData.period = period;
    bilantData.cui = cui;

    console.log(`[generate-bilant] Success. Echilibru: ${bilantData.echilibru}, Validări: ${bilantData.validari?.length || 0}`);

    return new Response(JSON.stringify(bilantData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[generate-bilant] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Eroare internă' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function validateBilant(data: any): any[] {
  const validations: any[] = [];
  
  if (!data?.bilant) return validations;

  const { activ, pasiv } = data.bilant;
  
  // Helper to get final value
  const getVal = (section: any, rd: string): number => {
    return section?.[rd]?.final || section?.[rd]?.curent || 0;
  };

  // Check basic sums in activ
  if (activ) {
    const rd06Calc = (getVal(activ, 'rd01') + getVal(activ, 'rd02') + getVal(activ, 'rd03') + getVal(activ, 'rd04') + getVal(activ, 'rd05'));
    const rd06Val = getVal(activ, 'rd06');
    if (Math.abs(rd06Calc - rd06Val) > 1) {
      validations.push({ regula: 'Rd.06 = Rd.01+02+03+04+05', status: 'EROARE', detalii: `Calculat: ${rd06Calc}, Declarat: ${rd06Val}` });
    }
  }

  // Check equilibrium
  if (activ && pasiv) {
    const totalActiv = getVal(activ, 'rd47') || getVal(activ, 'rd19');
    const totalPasiv = getVal(pasiv, 'rd85') || getVal(pasiv, 'rd83');
    if (totalActiv > 0 && totalPasiv > 0 && Math.abs(totalActiv - totalPasiv) > 1) {
      validations.push({ 
        regula: 'ECHILIBRU BILANȚIER: Total Activ = Total Pasiv', 
        status: 'EROARE', 
        detalii: `Activ: ${totalActiv}, Pasiv: ${totalPasiv}, Diferență: ${Math.abs(totalActiv - totalPasiv)}` 
      });
      data.echilibru = false;
    } else if (totalActiv > 0) {
      validations.push({ regula: 'ECHILIBRU BILANȚIER', status: 'OK', detalii: `${totalActiv} = ${totalPasiv}` });
      data.echilibru = true;
    }
  }

  // Check CPP
  if (data.cpp) {
    const venituri = getVal(data.cpp, 'rd58');
    const cheltuieli = getVal(data.cpp, 'rd59');
    const profitNet = getVal(data.cpp, 'rd64');
    const pierdereNeta = getVal(data.cpp, 'rd65');
    
    if (venituri > 0 && cheltuieli > 0) {
      const rezultat = venituri - cheltuieli;
      if (rezultat > 0 && Math.abs(rezultat - profitNet) > 1) {
        validations.push({ regula: 'Profit Net = Venituri - Cheltuieli', status: 'EROARE', detalii: `Calculat: ${rezultat}, Declarat: ${profitNet}` });
      }
    }
  }

  return validations;
}
