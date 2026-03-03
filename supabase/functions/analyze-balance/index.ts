import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { z } from 'https://esm.sh/zod@3.22.4';
import { getFullAnalysisPrompt } from "../_shared/full-analysis-prompt.ts";
import { parseExcelWithXLSX } from "../_shared/balance-parser.ts";
import { extractStructuredData, calculateRevenueExpenses, calculateDeterministicMetadata } from "../_shared/balance-structured-extraction.ts";
import { extractAccountValue, extractAllAccounts, groupAccountsByClass, groupExpenseRevenueAccounts, extractMetadataFromAnalysis } from "../_shared/balance-validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🔒 VALIDARE INPUT SCHEMA
const AnalyzeBalanceInputSchema = z.object({
  excelBase64: z.string()
    .min(1, "Fișierul Excel este vid")
    .refine((val) => {
      try {
        if (val.includes(';base64,')) {
          const base64Part = val.split(';base64,')[1];
          return base64Part && base64Part.length > 0 && /^[A-Za-z0-9+/=]+$/.test(base64Part);
        }
        return /^[A-Za-z0-9+/=]+$/.test(val);
      } catch {
        return false;
      }
    }, "Format base64 invalid pentru fișierul Excel"),
  fileName: z.string()
    .min(1, "Nume fișier lipsește")
    .max(255, "Nume fișier prea lung")
    .refine((val) => val.endsWith('.xlsx') || val.endsWith('.xls'), "Fișierul trebuie să fie Excel (.xlsx sau .xls)"),
  forceReprocess: z.boolean().optional().default(false)
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// ✅ UNICA SURSĂ DE ADEVĂR - Import din fișierul partajat
const SYSTEM_PROMPT = getFullAnalysisPrompt();

// ✅ PARSER VERSION - incrementează la fiecare fix pentru invalidare automată cache
const PARSER_VERSION = '2.1.0';

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ✅ SECURITY: Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('❌ [AUTH] Missing Authorization header');
    return new Response(
      JSON.stringify({ error: 'Autentificare necesară' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  if (authError || !user) {
    console.error('❌ [AUTH] Invalid token:', authError?.message || 'User not found');
    return new Response(
      JSON.stringify({ error: 'Token invalid sau expirat' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`✅ [AUTH] User authenticated: ${user.id}`);

  try {
    const rawBody = await req.json();
    
    // 🔒 VALIDARE INPUT CU ZOD
    const validationResult = AnalyzeBalanceInputSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error("❌ Input invalid:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Date de intrare invalide", 
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { excelBase64: rawExcelBase64, fileName, forceReprocess = false } = validationResult.data;
    
    // ✅ CRITICAL FIX: Extract pure base64 content from data URL format
    let excelBase64 = rawExcelBase64;
    if (rawExcelBase64.includes(';base64,')) {
      excelBase64 = rawExcelBase64.split(';base64,')[1];
      console.log('✅ [BASE64] Extracted pure base64 from data URL format');
    } else {
      console.log('⚠️ [BASE64] Using raw value (no data URL prefix found)');
    }
    
    // Obiect pentru persistarea indexilor detectați (folosit în auditTrail)
    const detectedColumns = {
      soldDebit: -1,
      soldCredit: -1,
      totalDebit: -1,
      totalCredit: -1
    };
    
    // ✅ SECURITY FIX: Validate file presence
    if (!excelBase64) {
      return new Response(
        JSON.stringify({ error: "Lipsește fișierul Excel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FAZA 1: Validare denumire fișier
    console.log("🔍 Validare denumire fișier:", fileName);
    const hasDatePattern = 
      /\d{2}[-\/]\d{2}[-\/]\d{4}/.test(fileName) ||
      /\d{4}[-\/]\d{2}[-\/]\d{2}/.test(fileName) ||
      /\d{2}[-\/]\d{4}/.test(fileName) ||
      /\d{4}[-\/]\d{2}/.test(fileName) ||
      /\d{6,8}/.test(fileName) ||
      /(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s*\d{4}/i.test(fileName) ||
      /(IANUARIE|FEBRUARIE|MARTIE|APRILIE|MAI|IUNIE|IULIE|AUGUST|SEPTEMBRIE|OCTOMBRIE|NOIEMBRIE|DECEMBRIE)/i.test(fileName);

    if (!hasDatePattern) {
      console.warn("⚠️ Denumirea fișierului NU conține lună/an:", fileName);
      return new Response(
        JSON.stringify({ 
          error: "invalid_filename",
          message: "⚠️ Denumirea balanței trebuie să conțină luna și anul!\n\n" +
                   "✅ Exemple corecte:\n" +
                   "• Balanta octombrie 2025 - Compania Mea.xls\n" +
                   "• Balanta - COMPANIE [01-10-2025 31-10-2025] 12345678.xls\n" +
                   "• Balanta 10-2025.xls\n\n" +
                   "❌ Greșit:\n" +
                   "• Balanta.xls\n" +
                   "• export_balanta.xls\n\n" +
                   "👉 Redenumește fișierul și încearcă din nou!",
          fileName: fileName
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Denumire fișier validă (conține lună/an)");

    // ✅ File size validation (zip bomb protection)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (excelBase64.length > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Fișierul este prea mare. Maximum 7.5MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save original file to storage
    console.log("Salvare fișier original în storage...");
    const timestamp = new Date().getTime();
    const sanitizedFileName = fileName?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'balanta.xlsx';
    const storagePath = `${timestamp}_${sanitizedFileName}`;
    
    try {
      let base64ForStorage = excelBase64;
      if (excelBase64.includes(',')) {
        base64ForStorage = excelBase64.split(',')[1];
      }
      const fileBytes = Uint8Array.from(atob(base64ForStorage), c => c.charCodeAt(0));
      
      const { error: uploadError } = await supabaseClient
        .storage
        .from('balance-attachments')
        .upload(storagePath, fileBytes, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: false
        });

      if (uploadError) {
        console.error("Eroare salvare în storage:", uploadError);
      } else {
        console.log("Fișier salvat în storage:", storagePath);
      }
    } catch (storageError) {
      console.error("Eroare salvare fișier:", storageError);
    }

    console.log("Parsare Excel cu xlsx...");
    console.log("Nume fișier:", fileName);
    let balanceText: string;
    try {
      balanceText = await parseExcelWithXLSX(excelBase64);
    } catch (parseError) {
      console.error("❌ Eroare fatală la parsarea Excel:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "parse_failed",
          message: "⚠️ Nu am putut citi fișierul Excel.\n\n" +
                   "Acest lucru se întâmplă de obicei cu fișierele .xls vechi (format BIFF).\n\n" +
                   "**Soluție:** Deschide fișierul în Excel, apoi **Salvează ca → Excel Workbook (.xlsx)** și reîncarcă-l.\n\n" +
                   "Dacă problema persistă, contactează suportul.",
          fileName: fileName
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Text extras (primele 500 caractere):", balanceText.slice(0, 500));
    console.log("Lungime totală text extras:", balanceText.length);
    
    // ✅ POST-PARSE VALIDATION
    const lineCount = balanceText.split('\n').filter(l => l.trim().length > 0).length;
    const hasAccountNumbers = /\b\d{3,4}\b/.test(balanceText);
    const hasNumericValues = /\d+\.\d{2}/.test(balanceText);
    
    console.log(`📊 Post-parse stats: ${lineCount} linii, hasAccounts=${hasAccountNumbers}, hasNumbers=${hasNumericValues}`);
    
    if (lineCount < 5 || !hasAccountNumbers || !hasNumericValues) {
      console.error(`❌ Parsare incompletă: doar ${lineCount} linii, accounts=${hasAccountNumbers}, numbers=${hasNumericValues}`);
      return new Response(
        JSON.stringify({ 
          error: "incomplete_parse",
          message: "⚠️ Fișierul Excel a fost citit, dar datele extrase sunt incomplete sau goale.\n\n" +
                   "Acest lucru se întâmplă frecvent cu fișierele **.xls** (format vechi).\n\n" +
                   "**Soluție:**\n" +
                   "1. Deschide fișierul în Excel\n" +
                   "2. **File → Save As → Excel Workbook (.xlsx)**\n" +
                   "3. Reîncarcă fișierul .xlsx\n\n" +
                   "Formatul .xlsx este mult mai fiabil pentru procesare automată.",
          fileName: fileName,
          stats: { lineCount, hasAccountNumbers, hasNumericValues }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 📊 EXTRAGERE DATE STRUCTURATE (din modul partajat)
    console.log("📊 [STRUCTURED-DATA] START: Extragere CUI, companie și conturi...");
    const structuredData = extractStructuredData(excelBase64, PARSER_VERSION);
    console.log(`📊 [STRUCTURED-DATA] FINAL - CUI: ${structuredData.cui}, Companie: ${structuredData.company}, Conturi: ${structuredData.accounts.length}`);
    if (structuredData.accounts.length > 0) {
      console.log('📊 [STRUCTURED-DATA] Breakdown pe clase:', 
        [1,2,3,4,5,6,7].map(c => ({ 
          class: c, 
          count: structuredData.accounts.filter(a => a.accountClass === c).length 
        })).filter(x => x.count > 0)
      );
    }

    // ✅ R2: CALCUL revenue/expenses/profit din structuredData.accounts
    console.log("💰 [R2-PRIORITY] Calcul revenue/expenses din structuredData.accounts...");
    const { revenue: revenue_from_structured, expenses: expenses_from_structured, profit: profit_from_structured } = calculateRevenueExpenses(structuredData.accounts);

    // ✅ FIX 1: CALCUL DETERMINIST METADATA
    console.log("📊 [METADATA-CALC] START: Calcul determinist indicatori...");
    let deterministic_metadata: Record<string, number> = {};
    
    try {
      deterministic_metadata = calculateDeterministicMetadata(
        structuredData.accounts,
        revenue_from_structured,
        expenses_from_structured,
        profit_from_structured
      );
      
      // Populează detectedColumns din indicii returnați de extractStructuredData
      if (structuredData.indices) {
        detectedColumns.soldDebit = structuredData.indices.soldFinalDebitCol;
        detectedColumns.soldCredit = structuredData.indices.soldFinalCreditCol;
        detectedColumns.totalDebit = structuredData.indices.totalSumeDebitCol;
        detectedColumns.totalCredit = structuredData.indices.totalSumeCreditCol;
      }
      
      console.log("✅ [METADATA-CALC] detectedColumns:", detectedColumns);
    } catch (calcError) {
      console.error("❌ [METADATA-CALC] Eroare calcul determinist:", calcError);
      console.log("⚠️ Continuăm cu extragerea din text AI");
    }

    if (!balanceText || balanceText.length < 100) {
      return new Response(
        JSON.stringify({
          error: "Excel-ul nu conține suficient text lizibil. Exportă balanța completă (cu toate coloanele: Solduri inițiale, Rulaje/Total sume, Solduri finale) din programul de contabilitate."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validare structură și detecție format numeric incorect
    const hasRequiredColumns = 
      (balanceText.toLowerCase().includes('solduri') || balanceText.toLowerCase().includes('sold')) &&
      (balanceText.toLowerCase().includes('rulaje') || balanceText.toLowerCase().includes('total sume')) &&
      (balanceText.toLowerCase().includes('finale') || balanceText.toLowerCase().includes('final'));
    
    if (!hasRequiredColumns) {
      console.log("AVERTISMENT: Structură balanță incompletă - verificare coloane");
    }

    const romanianNumberPattern = /\d{1,3}(\.\d{3})+,\d{2}/g;
    const hasRomanianFormatting = romanianNumberPattern.test(balanceText);
    
    if (hasRomanianFormatting) {
      console.log("AVERTISMENT: Detectat format românesc de numere - se aplică conversie automată");
    }
    
    const hasValidNumbers = /\d+\.\d{2}/.test(balanceText);
    
    if (!hasValidNumbers) {
      console.log("EROARE CRITICĂ: Nu s-au detectat numere valide în format standard după parsare");
      return new Response(
        JSON.stringify({
          error: "Format numeric incorect detectat. Te rog exportă balanța din nou, asigurându-te că numerele sunt în format corect (ex: 1234.56)."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY nu este configurată");
      return new Response(
        JSON.stringify({ error: "Configurare incorectă a serviciului" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 5 analize/minut per user
    const { data: { user: rateLimitUser } } = await supabaseClient.auth.getUser();
    if (rateLimitUser) {
      const { data: canProceed } = await supabaseClient.rpc("check_rate_limit", {
        p_user_id: rateLimitUser.id,
        p_endpoint: "analyze-balance",
        p_max_requests: 5
      });

      if (!canProceed) {
        return new Response(
          JSON.stringify({ error: "Prea multe cereri de analiză. Te rog așteaptă un minut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ===================================
    // [VERIFICARE ACCES ABONAMENT]
    // ===================================
    console.log('[ACCESS-CHECK] Verificare drepturi de acces...');
    
    let validatedCount = 0;
    let userProfile: any = null;
    
    if (user) {
      const { count, error: countError } = await supabaseClient
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('council_validation', 'is', null);
      
      if (!countError) {
        validatedCount = count || 0;
      }
      
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('subscription_status, subscription_type, trial_ends_at')
        .eq('id', user.id)
        .single();
      
      if (!profileError && profile) {
        userProfile = profile;
      }
    }
    
    const hasFreeAnalysesLeft = validatedCount < 6;
    const isInTrial = userProfile?.trial_ends_at && new Date(userProfile.trial_ends_at) > new Date();
    const hasActiveSubscription = userProfile?.subscription_status === 'active' && 
                                   ['entrepreneur', 'accounting_firm'].includes(userProfile?.subscription_type);
    
    const canAnalyze = hasFreeAnalysesLeft || isInTrial || hasActiveSubscription;
    
    console.log('[ACCESS-CHECK] Stare acces:', {
      hasActiveSubscription, isInTrial, trialEndsAt: userProfile?.trial_ends_at,
      hasFreeAnalysesLeft, validatedCount, canAnalyze
    });
    
    if (user && !canAnalyze) {
      console.log('🚫 [ACCESS-DENIED] Utilizator fără abonament activ - analiză blocată');
      return new Response(
        JSON.stringify({
          error: 'subscription_required',
          message: 'Abonamentul tău a expirat',
          details: {
            freeAnalysesUsed: validatedCount,
            trialExpired: !isInTrial,
            needsSubscription: true,
            upgradeMessage: `🔒 **Abonamentul tău a expirat**\n\nAi utilizat cele 6 analize gratuite și perioada de probă de 30 de zile s-a încheiat.\n\n**Pentru a continua să analizezi balanțe:**\n\n💼 **YANA Strategic** - 49 RON/lună\n• Analize nelimitate cu validare Consiliu AI\n• Chat AI strategic pentru decizii financiare\n• War Room, Battle Plan, rapoarte 40+ pagini\n• Toate funcționalitățile platformei incluse\n\n➡️ [Upgrade acum pentru a continua](/subscription)`
          }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ [ACCESS-CHECK] Utilizator autorizat pentru analiză');

    // Check cache
    const textHash = balanceText.slice(0, 1000);
    const cacheKey = `balance_v${PARSER_VERSION}_${textHash.length}_${textHash.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)}`;
    
    if (user) {
      if (forceReprocess) {
        console.log(`🧹 [CACHE] Forțez re-procesarea. Șterg cache pentru key=${cacheKey}`);
        await supabaseClient.from("chat_cache").delete().eq("question_hash", cacheKey);
      } else {
        const { data: cachedAnalysis } = await supabaseClient
          .from("chat_cache")
          .select("answer_text")
          .eq("question_hash", cacheKey)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
  
        if (cachedAnalysis?.answer_text) {
          console.log("Folosesc analiză din cache");
          return new Response(
            JSON.stringify({ analysis: cachedAnalysis.answer_text }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    console.log("Trimit cerere către Lovable AI...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    
    let aiResponse: Response | undefined = undefined;
    try {
      // Deterministic Facts Block
      const deterministicFactsBlock = `
════════════════════════════════════════════════════════════════════════════════
🔒 DATE DETERMINISTE (UNICA SURSĂ DE ADEVĂR - FOLOSEȘTE OBLIGATORIU ACESTE VALORI!)
════════════════════════════════════════════════════════════════════════════════

ATENȚIE CRITICĂ: Valorile de mai jos au fost extrase DETERMINIST din coloana "Total sume" (NU din "Rulaje perioadă").
Dacă observi valori diferite în textul balanței, IGNORĂ-LE și folosește EXCLUSIV valorile de mai jos!

📊 TOTAL VENITURI (Clasa 7, coloana Total sume Creditoare): ${revenue_from_structured.toFixed(2)} RON
📊 TOTAL CHELTUIELI (Clasa 6, coloana Total sume Debitoare): ${expenses_from_structured.toFixed(2)} RON
📊 REZULTAT CALCULAT (Venituri - Cheltuieli): ${(revenue_from_structured - expenses_from_structured).toFixed(2)} RON
📊 CONT 121 (Sold final): ${Math.abs(deterministic_metadata.profit || 0).toFixed(2)} RON ${(deterministic_metadata.profit || 0) >= 0 ? '(PROFIT - sold creditor)' : '(PIERDERE - sold debitor)'}

🔧 Parser Version: ${PARSER_VERSION}
🔧 Coloane detectate: Total sume Credit = col ${detectedColumns.totalCredit >= 0 ? detectedColumns.totalCredit : 'N/A'}, Sold final Credit = col ${detectedColumns.soldCredit >= 0 ? detectedColumns.soldCredit : 'N/A'}

REGULI OBLIGATORII:
1. În secțiunea "Snapshot Strategic", CA = ${revenue_from_structured.toFixed(2)} RON (NU altă valoare!)
2. În secțiunea "Profit vs Cash", Total clasa 7 = ${revenue_from_structured.toFixed(2)} RON, Total clasa 6 = ${expenses_from_structured.toFixed(2)} RON
3. În secțiunea "=== INDICATORI FINANCIARI ===", CA: ${revenue_from_structured.toFixed(2)}, Cheltuieli: ${expenses_from_structured.toFixed(2)}
4. NU folosi niciodată valori din coloana "Rulaje perioadă" pentru totaluri anuale!

════════════════════════════════════════════════════════════════════════════════

`;

      console.log("✅ [GEMINI] Using Lovable AI Gateway (google/gemini-2.5-flash) for balance analysis");
      
      const MAX_RETRIES = 2;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`🔄 [GEMINI] Retry attempt ${attempt}/${MAX_RETRIES}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
          
          aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `${deterministicFactsBlock}\n\nAnalizeaza urmatoarea balanta de verificare:\n\n${balanceText}` }
              ],
              max_tokens: 8000,
            }),
            signal: controller.signal
          });
          
          if (aiResponse.ok) break;
          
          const errorText = await aiResponse.text();
          console.error(`[GEMINI] Attempt ${attempt + 1} failed:`, aiResponse.status, errorText);
          lastError = new Error(`AI Gateway error: ${aiResponse.status}`);
          
          if (aiResponse.status === 429 || aiResponse.status === 402) break;
        } catch (fetchErr: any) {
          console.error(`[GEMINI] Attempt ${attempt + 1} fetch error:`, fetchErr.message);
          lastError = fetchErr;
          if (fetchErr.name === 'AbortError') break;
        }
      }
      
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error("Timeout: API call a depășit 45 secunde");
        return new Response(
          JSON.stringify({ error: "Timpul de așteptare a expirat. Te rog încearcă din nou." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw fetchError;
    }

    if (!aiResponse || !aiResponse.ok) {
      const errorText = aiResponse ? await aiResponse.text().catch(() => 'Unknown error') : 'No response';
      console.error("Eroare AI Gateway după retry:", aiResponse?.status, errorText);
      
      if (aiResponse?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limită de utilizare depășită. Te rog încearcă din nou peste câteva minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse?.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credite insuficiente. Te rog adaugă credite în Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Eroare la serviciul de analiză AI. Te rog încearcă din nou." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let aiData;
    try {
      aiData = await aiResponse.json();
    } catch (parseError: any) {
      console.error("Eroare la parsarea răspunsului AI:", parseError.message);
      return new Response(
        JSON.stringify({ error: "Eroare la procesarea răspunsului AI. Te rog încearcă din nou." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let analysis: string | undefined;
    
    if (aiData.content && Array.isArray(aiData.content)) {
      analysis = aiData.content.find((c: { type: string; text?: string }) => c.type === 'text')?.text;
    } else if (aiData.choices?.[0]?.message?.content) {
      analysis = aiData.choices[0].message.content;
    }

    if (!analysis) {
      console.error("Răspuns AI invalid:", JSON.stringify(aiData).substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Răspuns invalid de la serviciul AI. Te rog încearcă din nou." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analiză generată cu succes!");
    
    // 🔍 VALIDARE CU CONSILIUL DE AI-URI
    let councilValidation = null;
    
    try {
      console.log(`📊 [AI-COUNCIL] User authenticated: ${!!user}`);
      console.log(`📊 [AI-COUNCIL] Validated analyses count: ${validatedCount}`);
      
      const statusMsg = validatedCount < 6 
        ? `analiză ${validatedCount + 1}/6 gratuită`
        : isInTrial 
          ? `în perioada de trial (până la ${new Date(userProfile?.trial_ends_at).toLocaleDateString('ro-RO')})`
          : `cu abonament ${userProfile?.subscription_type}`;
      
      console.log(`✅ [AI-COUNCIL] Validare inclusă - ${statusMsg}`);
      console.log("🔍 [AI-COUNCIL] Starting automatic validation...");
      
      const councilResponse = await supabaseClient.functions.invoke('validate-analysis-with-council', {
        body: {
          metadata: deterministic_metadata,
          analysisText: analysis,
          balanceText: balanceText.slice(0, 5000),
          userId: user?.id || 'anonymous'
        }
      });
      
      if (councilResponse.error) {
        console.error("❌ [AI-COUNCIL] Validation error:", councilResponse.error);
      } else {
        councilValidation = councilResponse.data;
        console.log(`✅ [AI-COUNCIL] Validation complete - Verdict: ${councilValidation?.consensus?.verdict}`);
      }
    } catch (councilError) {
      console.error('❌ [AI-COUNCIL] Validation failed:', councilError);
    }
    
    // Cache analiza pentru 6 ore
    if (user && analysis && analysis.length > 100) {
      await supabaseClient.from("chat_cache").insert({
        question_hash: cacheKey,
        question_text: balanceText.slice(0, 500),
        answer_text: analysis,
        expires_at: new Date(Date.now() + 21600000).toISOString()
      });
    }
    
    // ✅ Extragere structură completă și validare (din module partajate)
    console.log("🔍 Extragere structură completă balanță...");
    let { class1to5, class6to7, anomalies: structuralAnomalies } = extractAllAccounts(balanceText);

    // FAZA 2: Validare Plan Contabil General RO 2025
    const { validateAccountCode } = await import('../_shared/planContabilGeneral.ts');
    
    console.log("🔍 [VALIDATION LAYER] Verificare Plan Contabil General...");
    const invalidAccountsWarnings: string[] = [];

    for (const acc of class1to5) {
      const validation = validateAccountCode(acc.accountCode);
      if (!validation.valid) {
        invalidAccountsWarnings.push(`⚠️ Cont ${acc.accountCode}: ${validation.error}`);
      }
    }

    if (invalidAccountsWarnings.length > 0) {
      structuralAnomalies.push(
        `\n📋 **VERIFICARE PLAN CONTABIL:**\n` +
        invalidAccountsWarnings.slice(0, 5).join('\n') +
        (invalidAccountsWarnings.length > 5 ? `\n... și încă ${invalidAccountsWarnings.length - 5} conturi invalide` : '')
      );
    }

    // FALLBACK: Dacă extractAllAccounts nu găsește conturi, folosește structuredData
    if (class1to5.length === 0 && class6to7.length === 0 && structuredData.accounts.length > 0) {
      console.log("⚠️ [FALLBACK] extractAllAccounts nu a găsit conturi - folosesc structuredData.accounts");
      
      structuredData.accounts.forEach((acc: any) => {
        const accountClass = parseInt(acc.code.charAt(0));
        const finalDebit = acc.debit || 0;
        const finalCredit = acc.credit || 0;
        
        if (accountClass >= 1 && accountClass <= 5) {
          if (finalDebit > 0.10 || finalCredit > 0.10) {
            if (finalDebit > 0.10 && finalCredit > 0.10) {
              structuralAnomalies.push(
                `🔴 ANOMALIE CONT ${acc.code}: Sold final DEBIT (${finalDebit.toFixed(2)} RON) ` +
                `ȘI CREDIT (${finalCredit.toFixed(2)} RON) simultan!`
              );
            }
            
            class1to5.push({
              accountCode: acc.code,
              accountName: acc.name || `Cont ${acc.code}`,
              finalBalanceDebit: finalDebit,
              finalBalanceCredit: finalCredit,
              netBalance: finalDebit - finalCredit,
              balanceType: finalDebit > finalCredit ? 'debit' : 'credit'
            });
          }
        } else if (accountClass === 6 || accountClass === 7) {
          const totalDebit = acc.totalDebit || finalDebit || 0;
          const totalCredit = acc.totalCredit || finalCredit || 0;
          
          if (totalDebit > 0.10 || totalCredit > 0.10) {
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.10;
            
            if (!isBalanced) {
              structuralAnomalies.push(
                `⚠️ DEBALANSARE CONT ${acc.code}: Rulaje DEBIT (${totalDebit.toFixed(2)} RON) ` +
                `≠ CREDIT (${totalCredit.toFixed(2)} RON)`
              );
            }
            
            class6to7.push({
              accountCode: acc.code,
              accountName: acc.name || `Cont ${acc.code}`,
              totalDebit,
              totalCredit,
              isBalanced
            });
          }
        }
      });
      
      console.log(`✅ [FALLBACK] Importate ${class1to5.length} conturi clase 1-5, ${class6to7.length} conturi clase 6-7`);
    }

    const groupedBalance = groupAccountsByClass(class1to5);
    const groupedActivity = groupExpenseRevenueAccounts(class6to7);

    // Extrage metadata din textul analizei AI (din modul partajat)
    const aiMetadata = extractMetadataFromAnalysis(analysis);
    
    // Pornește cu metadata AI, apoi suprapune deterministic (prioritate)
    const metadata: Record<string, number> = { ...aiMetadata, ...deterministic_metadata };

    // Prioritizează metadata deterministă peste cea extrasă din text
    const finalMetadata: any = { 
      ...metadata,
      structuredData: {
        cui: structuredData.cui,
        company: structuredData.company,
        accounts: structuredData.accounts
      },
      class1_FixedAssets: groupedBalance.class1,
      class2_CurrentAssets: groupedBalance.class2,
      class3_Inventory: groupedBalance.class3,
      class4_ThirdParties: groupedBalance.class4,
      class5_Treasury: groupedBalance.class5,
      class6_Expenses: groupedActivity.class6,
      class7_Revenue: groupedActivity.class7,
      anomalies: structuralAnomalies.length > 0 ? structuralAnomalies : undefined
    };
    console.log("✅ Metadata final (prioritate determinist + structură completă):", Object.keys(finalMetadata).length, "chei");
    
    // VALIDARE CRITICĂ: Verifică că valorile din alertele AI corespund cu balanța reală
    const corrections: string[] = [];
    
    const accountAlertPattern = /contul?\s+(\d{3,4})[^0-9]*?(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})?)\s*RON/gi;
    let alertMatch;
    while ((alertMatch = accountAlertPattern.exec(analysis)) !== null) {
      const accountCode = alertMatch[1];
      const reportedValue = parseFloat(alertMatch[2].replace(/[,.]/g, ''));
      const accountData = extractAccountValue(balanceText, accountCode);
      
      if (!accountData.exists) {
        corrections.push(
          `🔴 **EROARE CRITICĂ**: Analiza AI menționează contul ${accountCode} cu ${reportedValue.toLocaleString('ro-RO')} RON, ` +
          `dar acest cont **NU APARE** în balanța pentru perioada curentă sau are sold final 0.00 RON!\n\n` +
          `**CONCLUZIE**: Contul ${accountCode} este INEXISTENT sau ÎNCHIS în această perioadă. ` +
          `AI-ul a inventat această informație! Ignoră orice alertă sau analiză legată de acest cont.`
        );
      } else if (accountData.finalBalance !== null && Math.abs(reportedValue - accountData.finalBalance) > 1) {
        corrections.push(
          `⚠️ **CORECȚIE AUTOMATĂ**: Analiza AI a raportat o valoare incorectă pentru contul ${accountCode}.\n` +
          `• Valoare GREȘITĂ raportată de AI: ${reportedValue.toLocaleString('ro-RO')} RON\n` +
          `• Valoare CORECTĂ din balanță (sold final): ${accountData.finalBalance.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON\n` +
          `**Te rugăm să folosești doar valoarea corectă din balanță!**`
        );
      }
    }
    
    let isAdmin = false;
    if (user) {
      const { data: adminCheck } = await supabaseClient.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      isAdmin = adminCheck === true;
    }
    
    if (corrections.length > 0) {
      console.log('⚠️ [CORRECTIONS] Detected', corrections.length, 'automatic corrections');
      corrections.forEach((corr, idx) => {
        console.log(`   Correction ${idx + 1}:`, corr.substring(0, 100));
      });
      
      if (isAdmin) {
        const correctionsSection = `\n\n🔴 **CORECȚII AUTOMATE - VALORI INCORECTE DETECTATE ÎN ANALIZĂ** (Vizibil doar pentru admin)\n\n${corrections.join('\n\n')}`;
        return new Response(
          JSON.stringify({ 
            analysis: analysis + correctionsSection,
            metadata: Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // FAZA 5: Feature flag pentru activare/dezactivare validări
    const enableAdvancedValidations = Deno.env.get('ENABLE_ADVANCED_VALIDATIONS') !== 'false';
    
    const validationWarnings: string[] = [];
    
    if (enableAdvancedValidations) {
      console.log("🔍 [VALIDATION LAYER] Validări avansate ACTIVE");
      
      // VALIDARE 1: Total Sold final Debitor = Total Sold final Creditor
      console.log("🔍 [VALIDATION LAYER] Verificare echilibru balanță...");

      let totalSoldFinalDebitor = 0;
      let totalSoldFinalCreditor = 0;
      let validationSource = 'calculated';
      
      if (structuredData.totalGeneralFound && 
          (structuredData.totalGeneralDebit > 0 || structuredData.totalGeneralCredit > 0)) {
        totalSoldFinalDebitor = structuredData.totalGeneralDebit;
        totalSoldFinalCreditor = structuredData.totalGeneralCredit;
        validationSource = 'total_general_row';
        console.log(`✅ [VALIDATION] Folosim TOTAL GENERAL din Excel: Debit=${totalSoldFinalDebitor.toFixed(2)}, Credit=${totalSoldFinalCreditor.toFixed(2)}`);
      } else {
        const accounts1to5 = structuredData.accounts.filter((acc: any) => 
          acc.accountClass >= 1 && acc.accountClass <= 5
        );
        
        console.log(`📊 [VALIDATION] Total general NU găsit - calculăm din ${accounts1to5.length} conturi clase 1-5`);
        
        totalSoldFinalDebitor = accounts1to5.reduce(
          (sum: number, acc: any) => sum + (Number(acc.finalDebit) || 0), 0
        );
        totalSoldFinalCreditor = accounts1to5.reduce(
          (sum: number, acc: any) => sum + (Number(acc.finalCredit) || 0), 0
        );
      }
      
      console.log(`📊 [VALIDATION] Sursă: ${validationSource} | Total SF Debitor: ${totalSoldFinalDebitor.toFixed(2)}, Total SF Creditor: ${totalSoldFinalCreditor.toFixed(2)}`);

      const diferentaSolduriFinale = Math.abs(totalSoldFinalDebitor - totalSoldFinalCreditor);

      if (diferentaSolduriFinale > 10) {
        const sourceLabel = validationSource === 'total_general_row' ? '(din Total general)' : '(calculat)';
        const bilantErrorWarning =
          `🔴 **EROARE CRITICĂ BALANȚĂ - SOLDURI FINALE NEECHILIBRATE!** ${sourceLabel}\n\n` +
          `• Total Sold final **DEBITOR**: ${totalSoldFinalDebitor.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON\n` +
          `• Total Sold final **CREDITOR**: ${totalSoldFinalCreditor.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON\n` +
          `• **DIFERENȚĂ: ${diferentaSolduriFinale.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON** ⚠️\n\n` +
          `**CAUZE POSIBILE:**\n` +
          `1. Export incomplet / coloană greșită (nu sunt „Solduri finale")\n` +
          `2. Note contabile neînchise / erori de postare\n` +
          `3. Balanță generată pe o perioadă neînchisă\n\n` +
          `**ACȚIUNE:** Re-exportați „Balanță de verificare" cu „Solduri finale (Debit/Credit)" și verificați totalurile de la final.`;

        validationWarnings.push(bilantErrorWarning);
        console.error(`🔴 [VALIDATION] SOLDURI FINALE NEECHILIBRATE! Diferență: ${diferentaSolduriFinale} RON (sursă: ${validationSource})`);
      } else {
        const sourceLabel = validationSource === 'total_general_row' ? '(din Total general)' : '(calculat)';
        console.log(`✅ [VALIDATION] Balanță echilibrată ${sourceLabel}! Diferență: ${diferentaSolduriFinale.toFixed(2)} RON`);
      }

      // VALIDARE 2: Profit = Venituri - Cheltuieli
      console.log("🔍 [VALIDATION LAYER] Verificare formulă Profit = Venituri - Cheltuieli...");

      const totalVenituri = groupedActivity.class7.reduce((sum: number, acc: any) => sum + acc.totalCredit, 0);
      const totalCheltuieli = groupedActivity.class6.reduce((sum: number, acc: any) => sum + acc.totalDebit, 0);
      const rezultatCalculat = totalVenituri - totalCheltuieli;
      const cont121Raw = groupedBalance.class1.find((a: any) => a.accountCode === '121');
      const rezultatCont121 = cont121Raw ? -(cont121Raw.netBalance) : 0;

      const revenueFinal = (typeof revenue_from_structured === 'number' && revenue_from_structured > 0)
        ? revenue_from_structured
        : (typeof deterministic_metadata.revenue === 'number' && deterministic_metadata.revenue > 0)
          ? deterministic_metadata.revenue
          : totalVenituri;
      const expensesFinal = (typeof expenses_from_structured === 'number' && expenses_from_structured > 0)
        ? expenses_from_structured
        : (typeof deterministic_metadata.expenses === 'number' && deterministic_metadata.expenses > 0)
          ? deterministic_metadata.expenses
          : totalCheltuieli;
      const rezultatCalculatFinal = revenueFinal - expensesFinal;
      const diferentaRezultat = Math.abs(rezultatCalculatFinal - rezultatCont121);

      if (diferentaRezultat > 10) {
        const cont121Data = structuredData.accounts.find((acc: any) => acc.code === '121');
        const cont1171Data = structuredData.accounts.find((acc: any) => acc.code === '1171' || acc.code === '117');
        
        let explanationNote = '';
        
        if (cont121Data) {
          const si121Debit = cont121Data.finalDebit || 0;
          const si121Credit = cont121Data.finalCredit || 0;
          
          if (si121Debit > 0 || si121Credit > 0) {
            explanationNote += `\n\n**Detalii cont 121:** Sold final Debitor: ${si121Debit.toFixed(2)} RON, Sold final Creditor: ${si121Credit.toFixed(2)} RON`;
          }
        }
        
        if (cont1171Data) {
          const rezultatReportat = (cont1171Data.finalCredit || 0) - (cont1171Data.finalDebit || 0);
          explanationNote += `\n**Rezultat reportat (cont 117/1171):** ${rezultatReportat.toFixed(2)} RON`;
          explanationNote += `\n\n💡 **NOTĂ:** Diferența poate fi cauzată de soldul inițial al contului 121 (profit/pierdere din exercițiul anterior) care nu a fost încă repartizat pe contul 117.`;
        }
        
        const profitWarning = 
          `⚠️ **VERIFICARE PROFIT - DIFERENȚĂ DETECTATĂ**\n\n` +
          `• Rezultat calculat (Cl.7 - Cl.6): ${rezultatCalculatFinal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON\n` +
          `  (Venituri: ${revenueFinal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} - Cheltuieli: ${expensesFinal.toLocaleString('ro-RO', { minimumFractionDigits: 2 })})\n` +
          `• Sold cont 121: ${Math.abs(rezultatCont121).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON ${rezultatCont121 >= 0 ? '(PROFIT)' : '(PIERDERE)'}\n` +
          `• Diferență: ${diferentaRezultat.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON` +
          explanationNote;
        
        validationWarnings.push(profitWarning);
        console.warn(`⚠️ [VALIDATION] Diferență profit: ${diferentaRezultat.toFixed(2)} RON (calculat=${rezultatCalculatFinal.toFixed(2)}, cont121=${rezultatCont121.toFixed(2)})`);
      } else {
        console.log(`✅ [VALIDATION] Formulă profit validă! Diferență: ${diferentaRezultat.toFixed(2)} RON`);
      }

      // VALIDARE 3: TVA
      console.log("🔍 [VALIDATION LAYER] Verificare TVA...");
      const tvColectata = groupedBalance.class4.find(a => a.accountCode === '4427')?.netBalance || 0;
      const tvDeductibila = groupedBalance.class4.find(a => a.accountCode === '4426')?.netBalance || 0;
      const tvDePlata = groupedBalance.class4.find(a => a.accountCode === '4423')?.netBalance || 0;
      
      if (tvColectata !== 0 || tvDeductibila !== 0) {
        const tvCalculat = Math.abs(tvColectata) - Math.abs(tvDeductibila);
        console.log(`📊 [VALIDATION] TVA: Colectata=${Math.abs(tvColectata).toFixed(2)}, Deductibila=${Math.abs(tvDeductibila).toFixed(2)}, Calculat=${tvCalculat.toFixed(2)}, DePlata=${Math.abs(tvDePlata).toFixed(2)}`);
      }

      // Add audit trail
      finalMetadata.auditTrail = {
        parserVersion: PARSER_VERSION,
        detectedColumns,
        accountsExtracted: structuredData.accounts.length,
        validationSource,
        balanceValidation: {
          totalSoldFinalDebitor,
          totalSoldFinalCreditor,
          diferenta: diferentaSolduriFinale,
          status: diferentaSolduriFinale <= 10 ? 'OK' : 'ERROR'
        },
        profitValidation: {
          totalVenituri: revenueFinal,
          totalCheltuieli: expensesFinal,
          rezultatCalculat: rezultatCalculatFinal,
          rezultatCont121,
          rezultatCont121Display: Math.abs(rezultatCont121),
          diferenta: diferentaRezultat,
          status: diferentaRezultat <= 10 ? 'OK' : 'WARNING'
        },
        tvaValidation: (tvColectata > 0 || tvDeductibila > 0) ? {
          tvColectata: Math.abs(tvColectata),
          tvDeductibila: Math.abs(tvDeductibila),
          tvDePlata: Math.abs(tvDePlata),
          tvCalculat: Math.abs(tvColectata) - Math.abs(tvDeductibila),
          status: 'VERIFICAT'
        } : null
      };
    } else {
      console.log("⏭️ [VALIDATION LAYER] Validări avansate DEZACTIVATE");
    }
    
    // Adaugă warnings în finalMetadata.anomalies
    if (validationWarnings.length > 0) {
      const existingAnomalies = finalMetadata.anomalies || [];
      finalMetadata.anomalies = [...existingAnomalies, ...validationWarnings];
    }
    
    // Validare DSO
    if (finalMetadata.dso && finalMetadata.dso > 90) {
      validationWarnings.push(`⚠️ ALERTĂ CRITICĂ: DSO extrem de ridicat (${finalMetadata.dso} zile) - Banii sunt blocați în creanțe prea mult timp`);
    }
    
    // Validare plafon casă
    if (finalMetadata.soldCasa && finalMetadata.soldCasa > 50000) {
      validationWarnings.push(`⛔ NELEGAL: Plafon casă depășit! Aveți ${finalMetadata.soldCasa.toLocaleString('ro-RO')} RON în casă. Maximum legal: 50.000 RON`);
    }
    
    // Validare CRITICĂ: profit vs cont 121
    if (finalMetadata.profit !== undefined && structuredData.accounts.length > 0) {
      const cont121 = structuredData.accounts.find((acc: any) => acc.code === '121');
      
      if (cont121) {
        const debit = cont121.finalDebit || 0;
        const credit = cont121.finalCredit || 0;
        const soldCont121 = (credit > debit) ? (credit - debit) : -(debit - credit);
        
        if (Math.abs(finalMetadata.profit - soldCont121) > 1) {
          console.warn(`⚠️ [VALIDATION] DISCREPANȚĂ PROFIT: metadata=${finalMetadata.profit}, cont 121=${soldCont121}`);
          finalMetadata.profit = soldCont121;
          console.log(`✅ [VALIDATION] Profitul CORECTAT la valoarea din cont 121: ${soldCont121} RON`);
          
          validationWarnings.push(
            `🔴 **CORECȚIE AUTOMATĂ**: Profitul a fost corectat de la ${finalMetadata.profit} RON la ${soldCont121} RON ` +
            `bazat pe soldul real al contului 121.`
          );
        }
      }
    }
    
    // Validare interpretare profit/pierdere
    if (finalMetadata.profit !== undefined) {
      const profitValue = finalMetadata.profit;
      const analysisLower = analysis.toLowerCase();
      
      if (profitValue < 0 && 
          (analysisLower.includes('profit de') || analysisLower.includes('profitul de')) && 
          !analysisLower.includes('pierdere')) {
        validationWarnings.push(
          `🔴 **CORECȚIE CRITICĂ**: Analiza menționează "profit" dar contul 121 are sold DEBITOR (${Math.abs(profitValue).toLocaleString('ro-RO')} RON), ` +
          `ceea ce înseamnă de fapt **PIERDERE**! În contabilitate:\n` +
          `• Sold DEBITOR pe contul 121 = PIERDERE ❌\n` +
          `• Sold CREDITOR pe contul 121 = PROFIT ✅\n\n` +
          `**Concluzie corectă**: Compania a înregistrat o **PIERDERE de ${Math.abs(profitValue).toLocaleString('ro-RO')} RON**, NU profit!`
        );
      } else if (profitValue > 0 && 
                 (analysisLower.includes('pierdere de') || analysisLower.includes('pierderea de')) && 
                 !analysisLower.includes('profit')) {
        validationWarnings.push(
          `🔴 **CORECȚIE CRITICĂ**: Analiza menționează "pierdere" dar contul 121 are sold CREDITOR (${profitValue.toLocaleString('ro-RO')} RON), ` +
          `ceea ce înseamnă de fapt **PROFIT**! În contabilitate:\n` +
          `• Sold CREDITOR pe contul 121 = PROFIT ✅\n` +
          `• Sold DEBITOR pe contul 121 = PIERDERE ❌\n\n` +
          `**Concluzie corectă**: Compania a înregistrat un **PROFIT de ${profitValue.toLocaleString('ro-RO')} RON**, NU pierdere!`
        );
      }
    }
    
    // Adaugă warnings la sfârșitul analizei dacă există
    if (validationWarnings.length > 0) {
      const warningsSection = `\n\n🚨 **ALERTE AUTOMATE DE VALIDARE**\n\n${validationWarnings.join('\n\n')}`;
      
      const metadataValues = Object.values(finalMetadata).filter(v => typeof v === 'number');
      const hasValidData = metadataValues.some(v => v > 0) || metadataValues.filter(v => v !== 0).length >= 3;
      
      let finalAnalysisWithWarnings = analysis + warningsSection;
      if (councilValidation) {
        if (councilValidation.validated && councilValidation.confidence >= 80) {
          finalAnalysisWithWarnings += `\n\n---\n✅ **Validat de Consiliul AI** (${councilValidation.confidence}%)\n`;
        } else if (councilValidation.consensus?.verdict === "REQUIRES_REVIEW") {
          finalAnalysisWithWarnings += `\n\n---\n⚠️ **Consiliul AI recomandă verificare suplimentară**\n`;
        }
      }
      
      const extractedValuesForCache = {
        totalClasa7: deterministic_metadata.revenue || finalMetadata.revenue || 0,
        totalClasa6: deterministic_metadata.expenses || finalMetadata.expenses || 0,
        sold121: finalMetadata.profit || 0,
        sold121IsProfit: (finalMetadata.profit || 0) >= 0,
        cifraAfaceri: deterministic_metadata.revenue || finalMetadata.revenue || 0,
        profit: finalMetadata.profit || 0,
        dso: finalMetadata.dso,
        dpo: finalMetadata.dpo,
      };
      
      const structuredDataWithCache = {
        ...structuredData,
        extractedValues: extractedValuesForCache,
      };
      
      return new Response(
        JSON.stringify({ 
          analysis: finalAnalysisWithWarnings,
          metadata: hasValidData ? finalMetadata : null,
          councilValidation: councilValidation,
          structuredData: structuredDataWithCache
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const metadataValues = Object.values(finalMetadata).filter(v => typeof v === 'number');
    const hasValidData = metadataValues.some(v => v > 0) || metadataValues.filter(v => v !== 0).length >= 3;
    
    let finalAnalysisText = analysis;
    if (councilValidation) {
      if (councilValidation.validated && councilValidation.confidence >= 80) {
        finalAnalysisText += `\n\n---\n✅ **Validat de Consiliul AI** (${councilValidation.consensus.total}/3 AI-uri, Confidence: ${councilValidation.confidence}%)\n`;
        finalAnalysisText += `Această analiză a fost verificată de ${councilValidation.aiResponses.map((r: any) => r.provider).join(', ').toUpperCase()}.\n`;
        
        if (councilValidation.agreements) {
          const consensusCount = councilValidation.consensus.indicatorsWithConsensus || 0;
          finalAnalysisText += `\n📊 Consens pe ${consensusCount}/10 indicatori financiari\n`;
        }
        
        if (councilValidation.recommendations && councilValidation.recommendations.length > 0) {
          finalAnalysisText += `\n**Recomandări consiliu:**\n${councilValidation.recommendations.slice(0, 3).map((r: string) => `• ${r}`).join('\n')}\n`;
        }
      } else if (councilValidation.consensus?.verdict === "REQUIRES_REVIEW") {
        finalAnalysisText += `\n\n---\n⚠️ **Necesită Verificare**: Consiliul AI a detectat discrepanțe (${councilValidation.discrepancies?.length || 0} indicatori în dezacord).\n`;
        
        if (councilValidation.discrepancies && councilValidation.discrepancies.length > 0) {
          finalAnalysisText += `\n**Discrepanțe detectate:**\n`;
          councilValidation.discrepancies.slice(0, 3).forEach((d: any) => {
            finalAnalysisText += `• ${d.field}: ${d.reason}\n`;
          });
        }
        
        if (councilValidation.alerts && councilValidation.alerts.length > 0) {
          finalAnalysisText += `\n**Alerte consiliu:**\n${councilValidation.alerts.slice(0, 3).map((a: string) => `• ${a}`).join('\n')}\n`;
        }
      } else {
        finalAnalysisText += `\n\n---\n⚡ **Validare Consiliu AI** (${councilValidation.consensus.total}/3 AI-uri, Confidence: ${councilValidation.confidence}%)\n`;
        finalAnalysisText += `Analiză verificată de consiliul AI cu consens parțial.\n`;
        
        if (councilValidation.discrepancies && councilValidation.discrepancies.length > 0) {
          finalAnalysisText += `\n⚠️ Atenție: ${councilValidation.discrepancies.length} indicatori fără consens clar.\n`;
        }
      }
    }
    
    const extractedValuesForCache = {
      totalClasa7: deterministic_metadata.revenue || 0,
      totalClasa6: deterministic_metadata.expenses || 0,
      sold121: finalMetadata.profit || 0,
      sold121IsProfit: (finalMetadata.profit || 0) >= 0,
      cifraAfaceri: deterministic_metadata.revenue || 0,
      profit: finalMetadata.profit || 0,
      dso: finalMetadata.dso,
      dpo: finalMetadata.dpo,
    };
    
    const structuredDataWithCache = {
      ...structuredData,
      extractedValues: extractedValuesForCache,
    };
    
    return new Response(
      JSON.stringify({ 
        analysis: finalAnalysisText,
        metadata: hasValidData ? finalMetadata : null,
        councilValidation: councilValidation,
        structuredData: structuredDataWithCache
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Eroare în analyze-balance:", error);
    return new Response(
      JSON.stringify({
        error: "A apărut o eroare tehnică la procesarea fișierului. Te rog verifică formatul și încearcă din nou."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
