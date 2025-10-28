import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, humanizationLevel = 'moderate', toneStyle = 'academic_formal' } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Textul este obligatoriu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > 50000) {
      return new Response(
        JSON.stringify({ error: 'Textul este prea lung (max 50.000 caractere)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build system prompt based on humanization level and tone
    const intensityMap = {
      subtle: 'SUBTIL (doar ajustări minore, păstrează 90% din structura originală)',
      moderate: 'MODERAT (restructurări clare, variație stilistică, păstrează 70% din structura originală)',
      aggressive: 'AGRESIV (transformare completă, maxim de naturalețe, păstrează doar 50% din structura originală)'
    };

    const toneMap = {
      academic_formal: 'Academic Formal - Menține limbaj tehnic, structură logică strictă, citări și argumente clare',
      academic_conversational: 'Academic Conversațional - Ton mai accesibil, inserții explicative, exemple practice',
      simple_accessible: 'Simplu și Accesibil - Limbaj simplu, fără jargon excesiv, ideal pentru public larg'
    };

    const systemPrompt = `Ești un expert în transformarea textelor generate de AI în texte care să pară scrise de oameni reali, în special pentru contexte academice.

**MISIUNEA TA**: Transformă textul primit astfel încât să treacă de detectoarele AI (GPTZero, Turnitin, Originality.ai).

**NIVEL UMANIZARE**: ${intensityMap[humanizationLevel as keyof typeof intensityMap]}
**TON DORIT**: ${toneMap[toneStyle as keyof typeof toneMap]}

**TEHNICI OBLIGATORII DE UMANIZARE**:

1. **VARIAȚIE SINTACTICĂ** (esențial pentru naturalețe):
   - Alternează propoziții scurte (5-8 cuvinte) cu propoziții lungi (20-30 cuvinte)
   - Folosește inversiuni: "În contextul actual" → "Actualul context ne arată că..."
   - Inserează propoziții incidente: "această abordare (deși controversată) oferă..."
   - Folosește structuri complexe: "Deși X, totuși Y, ceea ce sugerează că Z"

2. **IMPERFECȚIUNI UMANE SUBTILE**:
   - Reformulări naturale: "cu alte cuvinte", "altfel spus", "pentru a simplifica"
   - Inserții metacognitive: "Se poate argumenta că...", "Este important de menționat...", "Totuși, trebuie precizat..."
   - Autocorecții subtile: "sau mai degrabă", "cel puțin parțial", "într-o anumită măsură"

3. **MARCATORI DE DISCURS VARIAȚ**I:
   - NU folosi repetitiv "de asemenea", "în plus", "mai mult decât atât"
   - VARIAZĂ: "Pe de altă parte", "Cu toate acestea", "În schimb", "Totodată", "În acest sens", "Astfel", "Prin urmare"

4. **VOCABULAR ACADEMIC DAR NATURAL**:
   - Sinonime contextuale: "important" → "semnificativ", "esențial", "crucial" (variază!)
   - Expresii idiomatice academice: "a pune bazele", "a deschide calea", "a sublinia importanța"
   - Evită repetiții robotice - variază formulările

5. **RITM NARATIV UMAN**:
   - Paragraf scurt (2-3 propoziții) urmat de paragraf lung (5-7 propoziții)
   - Tranziții fluide între idei (nu bruște!)
   - Inserții explicative parentetice: "(ceea ce, evident, ridică întrebări semnificative)"

6. **ELIMINARE PATTERN-URI AI**:
   - NU folosi "în concluzie" la fiecare final de paragraf
   - NU lista mecanic: "1. X, 2. Y, 3. Z" - integrează organic în text
   - NU folosi "este esențial să" în exces - variază
   - NU termina fiecare paragraf cu o concluzie generalizată

**CE TREBUIE PĂSTRAT 100%**:
- Toate argumentele și ideile cheie
- Citatele și referințele (NU le modifica!)
- Datele numerice exacte
- Numele proprii, terminologia tehnică specifică

**CE TREBUIE SCHIMBAT**:
- Structura propozițiilor (ordine, lungime, complexitate)
- Marcatorii de discurs și conjuncțiile
- Formulările generice → formulări specifice contextului
- Vocabularul repetitiv → sinonime contextuale

**OUTPUT FINAL**:
- Returnează DOAR textul umanizat, fără comentarii meta
- NU adăuga "[textul umanizat]" sau alte marcaje
- NU explica ce ai făcut - doar livrează rezultatul final
- Textul trebuie să sune ca scris de un doctorand real, nu de un AI`;

    // FIX #17: Timeout 45s pentru API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    
    let response: Response;
    try {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.8, // Higher temperature for more variation
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Timeout: cererea a depășit 45 secunde' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limită de rate depășită. Încercați din nou peste câteva secunde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Credite insuficiente. Contactați administratorul.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Eroare la procesarea textului');
    }

    const data = await response.json();
    const humanizedText = data.choices?.[0]?.message?.content;

    if (!humanizedText) {
      throw new Error('Nu s-a primit răspuns de la AI');
    }

    // Calculate statistics
    const originalWords = text.split(/\s+/).length;
    const humanizedWords = humanizedText.split(/\s+/).length;
    const changesPercent = Math.round(
      ((text.length - humanizedText.length) / text.length) * 100
    );

    return new Response(
      JSON.stringify({
        humanizedText,
        statistics: {
          originalWordCount: originalWords,
          humanizedWordCount: humanizedWords,
          changesPercent: Math.abs(changesPercent),
          originalLength: text.length,
          humanizedLength: humanizedText.length,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in humanize-academic-text:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Eroare la procesarea textului'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
