import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { z } from 'https://esm.sh/zod@3.22.4';

/**
 * PARSER SAGA DEDICAT
 * 
 * Acest edge function procesează EXCLUSIV balanțe exportate din software-ul SAGA.
 * Caracteristici format SAGA:
 * - Header pe 3 rânduri (12-14)
 * - Coloane goale consecutive
 * - Structură: Cont | Denumire | Sold Inițial D/C | Rulaje D/C | Total Rulaje D/C | Solduri Finale D/C
 * 
 * IZOLAT de analyze-balance pentru a nu afecta SmartBill/alte formate.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🔒 VALIDARE INPUT SCHEMA
const AnalyzeBalanceSagaInputSchema = z.object({
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
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// SYSTEM PROMPT pentru AI (identic cu analyze-balance dar optimizat pentru Saga)
const SYSTEM_PROMPT = `Analizeaza balanta atasata urmand urmatoarele Instrucțiuni:

🔴 **REGULĂ CRITICĂ ABSOLUTĂ - ACURATEȚEA VALORILOR** 🔴

**INTERZIS ABSOLUT**: NU inventa, NU aproxima, NU rotunjește valori!
• Raportează EXACT valorile din balanță, CU TOATE ZECIMALELE
• Orice discrepanță între valorile din balanță și valorile din analiză = EROARE GRAVĂ
• Verifică de 3 ori înainte să scrii o valoare în alertă sau recomandare

🔴 **REGULĂ CRITICĂ - CONTUL 121 (Profit sau Pierdere)** 🔴

ATENȚIE MAXIMĂ LA INTERPRETAREA CONTULUI 121:
• Contul 121 se analizează EXCLUSIV pe coloana "SOLDURI FINALE"
• Sold final CREDITOR pe contul 121 = PROFIT (veniturile > cheltuielile)
• Sold final DEBITOR pe contul 121 = PIERDERE (cheltuielile > veniturile)

La inceputul anlizei vei scrie urmatorul mesaj:

**Acesta este o analiză managerială efectuată cu ajutorul inteligenței artificiale.**

**Notă importantă:** Această analiză a fost generată automat cu ajutorul unui sistem de inteligență artificială (AI), pe baza datelor contabile furnizate (balanță de verificare). Autorul aplicației nu își asumă responsabilitatea pentru corectitudinea interpretării contabile sau fiscale prezentate de AI. Recomandăm ca toate concluziile și observațiile generate să fie revizuite de un contabil autorizat sau expert contabil.

INDICATORI CHEIE CEO (Dashboard executiv):
• Cifra de afaceri (CA): calculată din conturile 70x (Total sume creditoare)
• Profitabilitate: din contul 121
• DSO (Days Sales Outstanding): dacă există cont 4111
• DPO (Days Payable Outstanding): dacă există cont 401
• Cash disponibil: conturi 5121 + 5311

CLASE 1-5: Analizează EXCLUSIV coloana "Solduri finale"
CLASE 6-7: Analizează EXCLUSIV coloana "Total sume" (Debit pentru cheltuieli, Credit pentru venituri)
`;

/**
 * PARSER SAGA SPECIALIZAT
 * 
 * Detectează și parsează formatul specific SAGA:
 * - Header pe 3 rânduri (tipic liniile 12-14)
 * - Coloane goale între grupuri de date
 * - Structură specifică: Cont, Denumire, Sold Inițial D/C, Rulaje D/C, Total Rulaje D/C, Solduri Finale D/C
 */
function parseSagaExcel(excelBase64: string): {
  csvText: string;
  structuredData: {
    cui: string;
    company: string;
    accounts: Array<{
      code: string;
      name: string;
      debit: number;
      credit: number;
      accountClass: number;
    }>;
  };
} {
  console.log('[SAGA-PARSER] START: Parsare Excel format SAGA');
  
  const excelBytes = Uint8Array.from(atob(excelBase64), c => c.charCodeAt(0));
  const workbook = XLSX.read(excelBytes, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
  
  console.log(`[SAGA-PARSER] Total rânduri în sheet: ${data.length}`);
  
  // 1. EXTRAGE CUI și COMPANIE din primele rânduri
  let cui = '';
  let company = '';
  
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const rowStr = data[i].map(c => String(c)).join(' ');
    
    // Detectează CUI
    const cuiMatch = rowStr.match(/CUI[:\s]*(\d{8,10})/i) || rowStr.match(/(\d{8,10})/);
    if (cuiMatch && !cui && cuiMatch[1].length >= 8) {
      cui = cuiMatch[1];
      console.log(`[SAGA-PARSER] CUI detectat: ${cui} (rând ${i})`);
    }
    
    // Detectează nume companie (prima celulă negoală care nu e CUI)
    const firstCell = String(data[i][0] || '').trim();
    if (firstCell && firstCell.length > 5 && !firstCell.match(/^\d+$/) && !firstCell.toLowerCase().includes('balanta') && !company) {
      company = firstCell.split(/CUI|CIF/i)[0].trim();
      if (company.length > 3) {
        console.log(`[SAGA-PARSER] Companie detectată: ${company} (rând ${i})`);
      }
    }
  }
  
  // 2. DETECTEAZĂ HEADER-UL SAGA (pe 3 rânduri, tipic 12-14)
  let mainHeaderRow = -1;
  let subHeaderRow1 = -1;
  let subHeaderRow2 = -1;
  let dataStartRow = -1;
  
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const rowStr = data[i].map(c => String(c).toLowerCase()).join('|');
    
    // Căutăm pattern-ul tipic SAGA: "Cont" sau "Simbol" în prima coloană + alte headere
    if (rowStr.includes('sold') || rowStr.includes('rulaj') || rowStr.includes('total sume')) {
      if (mainHeaderRow < 0) {
        mainHeaderRow = i;
        console.log(`[SAGA-PARSER] Header principal găsit la rând ${i}: ${rowStr.slice(0, 100)}`);
      }
    }
    
    // Sub-header cu Debit/Credit
    if (mainHeaderRow >= 0 && subHeaderRow1 < 0) {
      if (rowStr.includes('debit') || rowStr.includes('credit') || rowStr.includes(' d ') || rowStr.includes(' c ')) {
        subHeaderRow1 = i;
        console.log(`[SAGA-PARSER] Sub-header 1 (D/C) găsit la rând ${i}`);
      }
    }
    
    // Al doilea sub-header (opțional) - DOAR în următoarele 2 rânduri după primul sub-header
    // (previne detectarea falsă a "debitori" din denumirea contului 4092)
    if (subHeaderRow1 >= 0 && subHeaderRow2 < 0 && i > subHeaderRow1 && i <= subHeaderRow1 + 2) {
      if (rowStr.includes('debit') || rowStr.includes('credit')) {
        subHeaderRow2 = i;
        console.log(`[SAGA-PARSER] Sub-header 2 găsit la rând ${i}`);
      }
    }
  }
  
  // Calculăm rândul de start pentru date
  dataStartRow = Math.max(mainHeaderRow, subHeaderRow1, subHeaderRow2) + 1;
  console.log(`[SAGA-PARSER] Date încep de la rândul ${dataStartRow}`);
  
  // 3. DETECTEAZĂ INDEXII COLOANELOR (eliminând coloanele goale)
  // SAGA tipic: Cont | Denumire | || Sold Inițial D | Sold Inițial C | || Rulaje D | Rulaje C | || Total D | Total C | || Sold Final D | Sold Final C
  
  // Mai întâi, identificăm coloanele care conțin efectiv date
  const nonEmptyColumns: number[] = [];
  const headerRows = [mainHeaderRow, subHeaderRow1, subHeaderRow2].filter(r => r >= 0);
  
  // Verificăm coloanele bazat pe primele rânduri de date
  for (let j = 0; j < (data[dataStartRow]?.length || 0); j++) {
    let hasData = false;
    // Verificăm primele 10 rânduri de date
    for (let i = dataStartRow; i < Math.min(dataStartRow + 10, data.length); i++) {
      if (data[i] && data[i][j] !== undefined && String(data[i][j]).trim() !== '') {
        hasData = true;
        break;
      }
    }
    if (hasData) {
      nonEmptyColumns.push(j);
    }
  }
  
  console.log(`[SAGA-PARSER] Coloane cu date: ${nonEmptyColumns.length} din ${data[dataStartRow]?.length || 0}`);
  console.log(`[SAGA-PARSER] Indexi coloane: ${nonEmptyColumns.slice(0, 15).join(', ')}`);
  
  // Mapare logică pentru SAGA (bazat pe poziție relativă în coloanele non-empty)
  // Tipic: [0]=Cont, [1]=Denumire, [2-3]=Sold Inițial D/C, [4-5]=Rulaje D/C, [6-7]=Total D/C, [8-9]=Sold Final D/C
  let contCol = nonEmptyColumns[0] ?? 0;
  let denumireCol = nonEmptyColumns[1] ?? 1;
  
  // Solduri finale sunt ultimele 2 coloane cu date
  const len = nonEmptyColumns.length;
  let soldFinalDebitCol = nonEmptyColumns[len - 2] ?? -1;
  let soldFinalCreditCol = nonEmptyColumns[len - 1] ?? -1;
  
  // Total sume sunt coloanele 6-7 (sau len-4 și len-3)
  let totalSumeDebitCol = nonEmptyColumns[len - 4] ?? -1;
  let totalSumeCreditCol = nonEmptyColumns[len - 3] ?? -1;
  
  console.log(`[SAGA-PARSER] Mapare coloane: Cont=${contCol}, Denumire=${denumireCol}, SoldFinalD=${soldFinalDebitCol}, SoldFinalC=${soldFinalCreditCol}, TotalD=${totalSumeDebitCol}, TotalC=${totalSumeCreditCol}`);
  
  // 4. PARSĂM CONTURILE
  const accounts: Array<{
    code: string;
    name: string;
    debit: number;
    credit: number;
    finalDebit?: number;
    finalCredit?: number;
    accountClass: number;
  }> = [];
  
  // Helper pentru parsare numere românești
  const toNumber = (val: any): number => {
    if (val === null || val === undefined) return 0;
    let str = String(val).trim();
    if (!str) return 0;
    
    // Elimină spații și caractere non-numerice (exceptând . , -)
    str = str.replace(/\s/g, '');
    
    // Format românesc: 1.234,56 -> 1234.56
    // Format internațional: 1,234.56 -> 1234.56
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    
    if (lastComma > lastDot) {
      // Format românesc: virgula e separator zecimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Format internațional: punctul e separator zecimal
      str = str.replace(/,/g, '');
    }
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };
  
  // Construim CSV curat
  let csvLines: string[] = [];
  csvLines.push('Cont,Denumire,SoldFinalDebit,SoldFinalCredit,TotalSumeDebit,TotalSumeCredit');
  
  for (let i = dataStartRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const contCode = String(row[contCol] || '').trim();
    
    // Validare: trebuie să fie cod de cont valid (începe cu cifră, minim 3 caractere)
    if (!contCode || !/^\d/.test(contCode) || contCode.length < 3) continue;
    
    // Skip subtotaluri și totaluri
    if (contCode.toLowerCase().includes('total') || contCode.toLowerCase().includes('clasa')) continue;
    
    const denumire = String(row[denumireCol] || '').trim();
    const accountClass = parseInt(contCode[0]);
    
    let soldFinalDebit = 0;
    let soldFinalCredit = 0;
    let totalSumeDebit = 0;
    let totalSumeCredit = 0;
    
    if (soldFinalDebitCol >= 0) soldFinalDebit = toNumber(row[soldFinalDebitCol]);
    if (soldFinalCreditCol >= 0) soldFinalCredit = toNumber(row[soldFinalCreditCol]);
    if (totalSumeDebitCol >= 0) totalSumeDebit = toNumber(row[totalSumeDebitCol]);
    if (totalSumeCreditCol >= 0) totalSumeCredit = toNumber(row[totalSumeCreditCol]);
    
    // Determinăm debit/credit în funcție de clasă
    let debit = 0;
    let credit = 0;
    
    if (accountClass >= 1 && accountClass <= 5) {
      // Clase 1-5: folosim solduri finale
      debit = soldFinalDebit;
      credit = soldFinalCredit;
    } else if (accountClass === 6) {
      // Clasa 6 (Cheltuieli): folosim Total sume debitoare
      debit = totalSumeDebit;
    } else if (accountClass === 7) {
      // Clasa 7 (Venituri): folosim Total sume creditoare
      credit = totalSumeCredit;
    }
    
    // Adăugăm doar conturile cu valori > 0
    if (debit > 0 || credit > 0) {
      // ✅ Clase 1-5: salvează ca finalDebit/finalCredit (solduri finale)
      // ✅ Clase 6-7: salvează ca debit/credit (rulaje)
      if (accountClass >= 1 && accountClass <= 5) {
        accounts.push({
          code: contCode,
          name: denumire,
          debit: 0,
          credit: 0,
          finalDebit: Math.round(debit * 100) / 100,
          finalCredit: Math.round(credit * 100) / 100,
          accountClass
        });
      } else {
        accounts.push({
          code: contCode,
          name: denumire,
          debit: Math.round(debit * 100) / 100,
          credit: Math.round(credit * 100) / 100,
          finalDebit: 0,
          finalCredit: 0,
          accountClass
        });
      }
      
      csvLines.push(`${contCode},"${denumire.replace(/"/g, '""')}",${soldFinalDebit.toFixed(2)},${soldFinalCredit.toFixed(2)},${totalSumeDebit.toFixed(2)},${totalSumeCredit.toFixed(2)}`);
    }
  }
  
  console.log(`[SAGA-PARSER] Total conturi extrase: ${accounts.length}`);
  
  // Log câteva conturi pentru verificare (inclusiv 371 Mărfuri)
  const criticalAccounts = accounts.filter(a => 
    ['121', '5121', '5311', '4111', '401', '371'].some(code => a.code.startsWith(code))
  );
  console.log('[SAGA-PARSER] Conturi critice:', criticalAccounts.map(a => 
    `${a.code}: D=${a.debit} C=${a.credit} FD=${a.finalDebit || 0} FC=${a.finalCredit || 0}`
  ).join(' | '));
  
  return {
    csvText: csvLines.join('\n'),
    structuredData: {
      cui,
      company,
      accounts
    }
  };
}

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
    const validationResult = AnalyzeBalanceSagaInputSchema.safeParse(rawBody);
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
    
    const { excelBase64: rawExcelBase64, fileName } = validationResult.data;
    
    // Extract pure base64
    let excelBase64 = rawExcelBase64;
    if (rawExcelBase64.includes(';base64,')) {
      excelBase64 = rawExcelBase64.split(';base64,')[1];
      console.log('✅ [BASE64] Extracted pure base64 from data URL format');
    }

    // Validare denumire fișier
    console.log("[SAGA] 🔍 Validare denumire fișier:", fileName);
    const hasDatePattern = 
      /\d{2}[-\/]\d{2}[-\/]\d{4}/.test(fileName) ||
      /\d{4}[-\/]\d{2}[-\/]\d{2}/.test(fileName) ||
      /\d{2}[-\/]\d{4}/.test(fileName) ||
      /\d{4}[-\/]\d{2}/.test(fileName) ||
      /(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s*\d{4}/i.test(fileName);

    if (!hasDatePattern) {
      console.warn("⚠️ [SAGA] Denumirea fișierului NU conține lună/an:", fileName);
      return new Response(
        JSON.stringify({ 
          error: "invalid_filename",
          message: "⚠️ Denumirea balanței trebuie să conțină luna și anul!\n\n" +
                   "✅ Exemple corecte:\n" +
                   "• Balanta octombrie 2025 - Compania Mea.xls\n" +
                   "• Balanta 10-2025.xls\n\n" +
                   "👉 Redenumește fișierul și încearcă din nou!",
          fileName: fileName
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // File size validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (excelBase64.length > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Fișierul este prea mare. Maximum 7.5MB." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SAGA] 📊 Parsare Excel cu parser SAGA dedicat...");
    
    // PARSARE SAGA
    const { csvText, structuredData } = parseSagaExcel(excelBase64);
    
    console.log(`[SAGA] ✅ Parsare completă: ${structuredData.accounts.length} conturi, CUI: ${structuredData.cui}, Companie: ${structuredData.company}`);
    console.log(`[SAGA] CSV generat: ${csvText.length} caractere`);

    // Salvare fișier în storage
    const timestamp = new Date().getTime();
    const sanitizedFileName = fileName?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'balanta_saga.xlsx';
    const storagePath = `saga/${timestamp}_${sanitizedFileName}`;
    
    try {
      const fileBytes = Uint8Array.from(atob(excelBase64), c => c.charCodeAt(0));
      await supabaseClient.storage
        .from('balance-attachments')
        .upload(storagePath, fileBytes, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: false
        });
      console.log("[SAGA] Fișier salvat în storage:", storagePath);
    } catch (storageError) {
      console.error("[SAGA] Eroare salvare fișier:", storageError);
    }

    // APEL AI PENTRU ANALIZĂ
    console.log("[SAGA] 🤖 Apel Lovable AI pentru analiză...");
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY nu este configurat");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analizează această balanță de verificare exportată din SAGA:\n\n${csvText}` }
        ],
        max_completion_tokens: 8192,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[SAGA] ❌ AI error:", aiResponse.status, errorText);
      throw new Error(`Eroare AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || "Nu s-a putut genera analiza.";
    
    console.log(`[SAGA] ✅ Analiză generată: ${analysisText.length} caractere`);

    // Construim metadata din datele structurate
    const metadata: Record<string, any> = {};
    
    // Helper: pentru clase 1-5 folosim finalDebit/finalCredit, pentru 6-7 folosim debit/credit
    const getDebitValue = (acc: any | undefined) => {
      if (!acc) return 0;
      return acc.accountClass >= 1 && acc.accountClass <= 5 
        ? (acc.finalDebit || 0) 
        : (acc.debit || 0);
    };
    const getCreditValue = (acc: any | undefined) => {
      if (!acc) return 0;
      return acc.accountClass >= 1 && acc.accountClass <= 5 
        ? (acc.finalCredit || 0) 
        : (acc.credit || 0);
    };
    
    // Extrage indicatori cheie
    const account121 = structuredData.accounts.find(a => a.code === '121' || a.code.startsWith('121'));
    if (account121) {
      // Sold creditor = profit, sold debitor = pierdere
      const creditVal = getCreditValue(account121);
      const debitVal = getDebitValue(account121);
      metadata.profit = creditVal > 0 ? creditVal : -debitVal;
    }
    
    const account5121 = structuredData.accounts.find(a => a.code.startsWith('5121'));
    const account5311 = structuredData.accounts.find(a => a.code.startsWith('5311'));
    metadata.banca = getDebitValue(account5121);
    metadata.casa = getDebitValue(account5311);
    
    const account4111 = structuredData.accounts.find(a => a.code.startsWith('4111'));
    metadata.clienti = getDebitValue(account4111);
    
    const account401 = structuredData.accounts.find(a => a.code.startsWith('401'));
    metadata.furnizori = getCreditValue(account401);
    
    // Cifra de afaceri din conturile 70x (clasa 7 - folosesc credit normal)
    const revenueAccounts = structuredData.accounts.filter(a => a.code.startsWith('70'));
    metadata.ca = revenueAccounts.reduce((sum, a) => sum + getCreditValue(a), 0);
    
    // Total cheltuieli (clasa 6 - folosesc debit normal)
    const expenseAccounts = structuredData.accounts.filter(a => a.accountClass === 6);
    metadata.cheltuieli = expenseAccounts.reduce((sum, a) => sum + getDebitValue(a), 0);

    console.log("[SAGA] 📊 Metadata calculată:", metadata);

    return new Response(
      JSON.stringify({
        analysis: analysisText,
        structuredData,
        metadata,
        company_name: structuredData.company,
        source: 'saga-parser',
        fileName
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[SAGA] ❌ Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Eroare la procesarea balanței SAGA" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
