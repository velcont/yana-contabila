import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        console.log(`[VALIDATOR] Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Generate cache key from message
async function generateCacheKey(message: string, conversationId: string): Promise<string> {
  const normalized = message.toLowerCase().trim().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(`${conversationId}:${normalized}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validator prompt embedded directly (no external file dependency)
const VALIDATOR_PROMPT = `# AI VALIDATOR - Strategic Advisor Fact Extraction

**ROLUL TĂU:** Ești un agent AI specializat în **extragere și validare de date financiare**. 
**NU GENERI STRATEGII!** Rolul tău este DOAR să:
1. Extragi fapte concrete din mesajele utilizatorului
2. Validezi coerența datelor
3. Detectezi conflicte sau date lipsă
4. Returnezi JSON structurat

---

## CATEGORII DE FAPTE

### 1. FINANCIAL (obligatoriu pentru strategii)
- cifra_afaceri_YYYY (ex: cifra_afaceri_2024)
- profit_net_YYYY
- pierdere_YYYY (dacă profit negativ)
- cash_disponibil
- datorii_furnizori
- creante_clienti
- stocuri_valoare
- investitii_planificate
- dso (Days Sales Outstanding - zile)
- dpo (Days Payable Outstanding - zile)
- dio (Days Inventory Outstanding - zile)

### 2. COMPANY (context)
- nume_companie
- industrie (retail/servicii/productie/horeca/it/medical)
- angajati_numar
- vechime_ani
- locatie_primara
- caen_code

### 3. MARKET (obligatoriu pentru strategii competitive)
- dimensiune_piata_RON
- cota_piata_proprie_percent
- crestere_piata_anual_percent
- sezonalitate (da/nu + detalii)

### 4. COMPETITION (obligatoriu - minim 2 concurenți)
- concurent_N_nume
- concurent_N_pret_mediu
- concurent_N_cota_piata
- concurent_N_forte
- concurent_N_slabiciuni

---

## PROCES DE VALIDARE (OBLIGATORIU)

### STEP 1: EXTRACȚIE
Din mesajul utilizatorului, identifică:
- Cifre exacte (ex: "CA 2024: 500.000 RON" → fact_key="cifra_afaceri_2024", fact_value="500000", fact_unit="RON")
- Context implicit (ex: "suntem în retail" → fact_key="industrie", fact_value="retail")
- Date comparative (ex: "concurentul X vinde cu 50 RON mai scump")

### STEP 2: VALIDARE INTERNĂ
Verifică:
1. **Coerență matematică:**
   - Profit + Cheltuieli = Cifră afaceri?
   - DSO = (Creanțe / CA) * 365?
   - Marjă netă = (Profit / CA) * 100 în range realist 0-40%?

2. **Coerență temporală:**
   - Dacă avem CA 2023 și CA 2024 → verifică creștere realistă (-50% la +200%)
   - Dacă cash disponibil > CA anual → ALERTĂ suspicion

3. **Coerență per industrie:**
   - Retail: marjă netă 2-15%
   - IT/SaaS: marjă netă 15-40%
   - Producție: marjă netă 8-20%
   - HoReCa: marjă netă 5-15%

### STEP 3: DETECȚIE CONFLICTE
Compară cu faptele existente din conversație:
- Dacă utilizator a spus înainte "CA 2024: 500k" și acum zice "CA 2024: 700k" → CONFLICT
- Dacă profit anterior 50k, acum -30k fără explicație → ALERTĂ schimbare majoră

### STEP 4: IDENTIFICARE LIPSURI
Pentru generare strategie, sunt **OBLIGATORII:**
- Cifra afaceri (ultimul an disponibil)
- Profit net sau pierdere
- Cash disponibil pentru investiții
- Industrie
- Minim 2 concurenți cu prețuri

Dacă lipsesc → status="data_missing", returnează lista câmpuri lipsă

---

## FORMAT RĂSPUNS (JSON STRICT)

\`\`\`json
{
  "validation_status": "approved" | "data_missing" | "conflict_detected",
  
  "extracted_facts": [
    {
      "fact_category": "financial",
      "fact_key": "cifra_afaceri_2024",
      "fact_value": "500000",
      "fact_unit": "RON",
      "confidence": 0.95,
      "source": "user_direct",
      "context": "User a spus explicit: 'CA 2024 a fost 500k'"
    }
  ],
  
  "conflicts": [
    {
      "field": "cifra_afaceri_2024",
      "old_value": "500000",
      "new_value": "700000",
      "severity": "high",
      "resolution_needed": "Cere utilizatorului clarificare: care e cifra corectă?"
    }
  ],
  
  "missing_critical_fields": [
    "profit_net_2024",
    "cash_disponibil",
    "concurent_1_pret_mediu"
  ],
  
  "validation_notes": [
    "✅ Cifră afaceri validată: 500k RON în range normal pentru retail",
    "⚠️ DSO 120 zile pare ridicat pentru industria declarată (retail)",
    "❌ Profit net lipsește - OBLIGATORIU pentru strategii"
  ],
  
  "ready_for_strategy": false,
  "reason_not_ready": "Date lipsă: profit_net_2024, cash_disponibil, concurenți"
}
\`\`\`

---

## EXEMPLE DE VALIDARE

### Exemplu 1: Date Complete ✅
**User:** "Avem CA 2024 de 1.2 milioane RON, profit net 150k, cash 80k. Industrie: retail. Concurenta: Kaufland (preturi cu 20% mai mici), Carrefour (similar)."

**Validator Response:**
\`\`\`json
{
  "validation_status": "approved",
  "extracted_facts": [
    {"fact_key": "cifra_afaceri_2024", "fact_value": "1200000", "fact_unit": "RON", "confidence": 1.0},
    {"fact_key": "profit_net_2024", "fact_value": "150000", "fact_unit": "RON", "confidence": 1.0},
    {"fact_key": "cash_disponibil", "fact_value": "80000", "fact_unit": "RON", "confidence": 1.0},
    {"fact_key": "industrie", "fact_value": "retail", "confidence": 1.0},
    {"fact_key": "concurent_1_nume", "fact_value": "Kaufland", "confidence": 1.0},
    {"fact_key": "concurent_1_diferenta_pret", "fact_value": "-20", "fact_unit": "%", "confidence": 0.9},
    {"fact_key": "concurent_2_nume", "fact_value": "Carrefour", "confidence": 1.0}
  ],
  "conflicts": [],
  "missing_critical_fields": [],
  "validation_notes": [
    "✅ Marjă netă: 12.5% (150k/1.2M) - excelentă pentru retail",
    "✅ Date complete pentru strategie competitivă",
    "💡 Cash runway: ~0.8 luni (80k / 100k lunar burn) - recomandat minim 3 luni"
  ],
  "ready_for_strategy": true
}
\`\`\`

### Exemplu 2: Conflict Detectat ⚠️
**Context:** User a spus înainte "CA 2024: 500k"
**User acum:** "Avem CA anul asta de 700k"

**Validator Response:**
\`\`\`json
{
  "validation_status": "conflict_detected",
  "extracted_facts": [
    {"fact_key": "cifra_afaceri_2024", "fact_value": "700000", "fact_unit": "RON", "confidence": 0.6}
  ],
  "conflicts": [
    {
      "field": "cifra_afaceri_2024",
      "old_value": "500000",
      "new_value": "700000",
      "severity": "high",
      "resolution_needed": "Diferență +40% între declarații. Cere clarificare: 500k sau 700k?"
    }
  ],
  "ready_for_strategy": false,
  "reason_not_ready": "Conflict nerezolvat pe cifră afaceri 2024"
}
\`\`\`

### Exemplu 3: Date Lipsă ❌
**User:** "Vreau să intru agresiv pe piață"

**Validator Response:**
\`\`\`json
{
  "validation_status": "data_missing",
  "extracted_facts": [],
  "missing_critical_fields": [
    "cifra_afaceri_2024",
    "profit_net_2024",
    "cash_disponibil",
    "industrie",
    "concurent_1_nume",
    "concurent_2_nume"
  ],
  "validation_notes": [
    "❌ Nu pot genera strategii fără date financiare de bază",
    "💡 Ai nevoie: CA ultimul an, profit/pierdere, cash disponibil, industrie, minim 2 concurenți"
  ],
  "ready_for_strategy": false,
  "reason_not_ready": "Lipsesc toate datele financiare critice"
}
\`\`\`

---

## REGULI OBLIGATORII

1. **NICIODATĂ** nu inventa cifre sau estimări
2. **ÎNTOTDEAUNA** extrage confidence score (0.0-1.0):
   - 1.0 = cifră exactă spusă explicit ("CA 2024: 500k")
   - 0.8 = cifră dedusă din context ("anul trecut 500k" când discutăm 2024)
   - 0.5 = cifră estimată vag ("cam 500k")
   - 0.0 = lipsește complet

3. **DETECTEAZĂ** conflicte automat comparând cu fapte anterioare
4. **RETURNEAZĂ** JSON valid ÎNTOTDEAUNA (nu text liber!)
5. **SETEAZĂ** ready_for_strategy=true DOAR dacă AI TOATE câmpurile obligatorii

---

**Dată curentă:** ${new Date().toISOString().split('T')[0]}
**Monedă locală:** RON (Leu românesc)
**Context:** România 2025`.trim();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { userMessage, conversationId } = await req.json();

    console.log("[VALIDATOR] Processing message for conversation:", conversationId);

    // ============================================================================
    // CACHE CHECK - reduce cost pentru mesaje similare
    // ============================================================================
    const cacheKey = generateCacheKey(userMessage, conversationId);
    
    const { data: cachedResponse } = await supabaseClient
      .from("ai_response_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .eq("cache_type", "validation")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cachedResponse) {
      console.log("[VALIDATOR] 🎯 Cache HIT - reusing previous validation");
      
      // Update cache stats
      await supabaseClient
        .from("ai_response_cache")
        .update({
          hit_count: cachedResponse.hit_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq("id", cachedResponse.id);

      return new Response(
        JSON.stringify({
          ...cachedResponse.response_data,
          cached: true,
          cost_saved_ron: 0.25
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    console.log("[VALIDATOR] Cache MISS - calling AI");

    // 1. Fetch existing facts from DB
    const { data: existingFacts, error: factsError } = await supabaseClient
      .from("strategic_advisor_facts")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("status", "validated")
      .order("created_at", { ascending: false });

    if (factsError) {
      console.error("[VALIDATOR] Error fetching existing facts:", factsError);
    }

    // 2. Build context with existing facts
    let factsContext = "\n\n📊 FAPTE EXISTENTE ÎN CONVERSAȚIE:\n";
    if (existingFacts && existingFacts.length > 0) {
      const grouped = existingFacts.reduce((acc: Record<string, any[]>, fact: any) => {
        if (!acc[fact.fact_category]) acc[fact.fact_category] = [];
        acc[fact.fact_category].push(fact);
        return acc;
      }, {});

      Object.entries(grouped).forEach(([category, facts]) => {
        factsContext += `\n**${category.toUpperCase()}:**\n`;
        (facts as any[]).forEach(f => {
          factsContext += `- ${f.fact_key}: ${f.fact_value} ${f.fact_unit || ''} (confidence: ${f.confidence}, source: ${f.source})\n`;
        });
      });
    } else {
      factsContext += "Nu există fapte validate anterior în această conversație.\n";
    }

    // 3. Call Lovable AI (Validator Agent - Gemini 2.5 Flash) with RETRY
    const aiData = await retryWithBackoff(async () => {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: VALIDATOR_PROMPT + factsContext },
            { role: "user", content: userMessage }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("[VALIDATOR] AI API error:", aiResponse.status, errorText);
        
        // Don't retry on 4xx errors (client errors)
        if (aiResponse.status >= 400 && aiResponse.status < 500) {
          throw new Error(`AI API client error: ${aiResponse.statusText}`);
        }
        
        throw new Error(`AI API error: ${aiResponse.statusText}`);
      }

      return aiResponse.json();
    }, 3, 1000);

    const validationResult = JSON.parse(aiData.choices[0].message.content);

    console.log("[VALIDATOR] Validation result:", validationResult.validation_status);

    // 4. Save new facts to DB (if any)
    if (validationResult.extracted_facts && validationResult.extracted_facts.length > 0) {
      for (const fact of validationResult.extracted_facts) {
        // Upsert: update if exists (same conversation + key), insert if new
        const { error: upsertError } = await supabaseClient
          .from("strategic_advisor_facts")
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
            fact_category: fact.fact_category,
            fact_key: fact.fact_key,
            fact_value: fact.fact_value,
            fact_unit: fact.fact_unit || null,
            confidence: fact.confidence || 1.0,
            source: fact.source || 'ai_extraction',
            status: 'validated',
            metadata: { context: fact.context || '', extracted_at: new Date().toISOString() },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'conversation_id,fact_key',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error("[VALIDATOR] Error saving fact:", upsertError);
        }
      }
      console.log(`[VALIDATOR] Saved ${validationResult.extracted_facts.length} facts to DB`);
    }

    // 5. Save validation log
    const { error: logError } = await supabaseClient
      .from("strategic_advisor_validations")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        user_message: userMessage,
        validator_response: validationResult,
        validator_model: "google/gemini-2.5-flash",
        validator_tokens_used: aiData.usage?.total_tokens || 0,
        validation_status: validationResult.validation_status,
        missing_fields: validationResult.missing_critical_fields || [],
        conflicts: validationResult.conflicts || [],
        total_cost_cents: Math.ceil((aiData.usage?.total_tokens || 0) / 2000 * 25) // ~0.25 RON
      });

    if (logError) {
      console.error("[VALIDATOR] Error saving validation log:", logError);
    }

    // 6. Save to cache for future reuse
    const costCents = Math.ceil((aiData.usage?.total_tokens || 0) / 2000 * 25);
    await supabaseClient
      .from("ai_response_cache")
      .insert({
        cache_key: cacheKey,
        cache_type: "validation",
        request_hash: cacheKey,
        response_data: validationResult,
        model_used: "google/gemini-2.5-flash",
        tokens_used: aiData.usage?.total_tokens || 0,
        cost_cents: costCents,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

    console.log(`[VALIDATOR] ✅ Response cached for future use`);

    // 7. Return validation result
    return new Response(
      JSON.stringify({
        ...validationResult,
        cached: false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("[VALIDATOR] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Eroare necunoscută";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
