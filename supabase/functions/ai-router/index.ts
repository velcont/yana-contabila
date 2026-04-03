import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RouterRequest {
  message: string;
  conversationId: string;
  fileData?: {
    fileName: string;
    fileContent: string;
    fileType: string;
  };
  balanceData?: unknown;
  companyName?: string;
  history?: Array<{ role: string; content: string }>;
  balanceContext?: unknown;
}

interface RouteDecision {
  route: 'analyze-balance' | 'analyze-balance-saga' | 'chat-ai' | 'strategic-advisor' | 'fiscal-chat' | 'calculate-resilience' | 'calculate-anaf-risk' | 'direct-response' | 'generate-document' | 'analyze-supplier';
  payload: Record<string, unknown>;
  reason: string;
}

// =============================================================================
// MEMORIE CROSS-CONVERSAȚII - Funcții noi
// =============================================================================

// Extrage CUI din numele fișierului balanță (format: DENUMIRE_CUI.xls)
function extractCUIFromFileName(fileName: string): string | null {
  if (!fileName) return null;
  // Pattern: 8 cifre înainte de .xls sau .xlsx
  const cuiMatch = fileName.match(/(\d{6,8})\.xls/i);
  return cuiMatch ? cuiMatch[1] : null;
}

// Găsește company_id pe baza CUI sau nume - CU FALLBACK-uri multiple
async function findCompanyByContext(
  supabase: any,
  userId: string,
  companyName?: string,
  cui?: string,
  conversationId?: string
): Promise<{ companyId: string | null; matchedName: string | null }> {
  // Prioritate 1: Match pe CUI (cel mai precis)
  if (cui) {
    const { data: cuiMatch } = await supabase
      .from('companies')
      .select('id, company_name')
      .or(`managed_by_accountant_id.eq.${userId},user_id.eq.${userId}`)
      .eq('cui', cui)
      .limit(1)
      .single();
    
    if (cuiMatch) {
      console.log(`[AI-Router] Company found by CUI ${cui}: ${cuiMatch.company_name}`);
      return { companyId: cuiMatch.id, matchedName: cuiMatch.company_name };
    }
  }
  
  // Prioritate 2: Match fuzzy pe nume (dacă avem companyName)
  if (companyName && companyName.length > 3) {
    const { data: nameMatches } = await supabase
      .from('companies')
      .select('id, company_name')
      .or(`managed_by_accountant_id.eq.${userId},user_id.eq.${userId}`)
      .ilike('company_name', `%${companyName}%`)
      .limit(1);
    
    if (nameMatches && nameMatches.length > 0) {
      console.log(`[AI-Router] Company found by name "${companyName}": ${nameMatches[0].company_name}`);
      return { companyId: nameMatches[0].id, matchedName: nameMatches[0].company_name };
    }
  }
  
  // 🆕 FIX Prioritate 3: Fallback din metadata conversație (balanceContext.company)
  if (conversationId) {
    try {
      const { data: convData } = await supabase
        .from('yana_conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();
      
      if (convData?.metadata) {
        const metadata = convData.metadata as { balanceContext?: { company?: string } };
        const savedCompanyName = metadata.balanceContext?.company;
        
        if (savedCompanyName && savedCompanyName.length > 3) {
          const { data: metaMatches } = await supabase
            .from('companies')
            .select('id, company_name')
            .or(`managed_by_accountant_id.eq.${userId},user_id.eq.${userId}`)
            .ilike('company_name', `%${savedCompanyName}%`)
            .limit(1);
          
          if (metaMatches && metaMatches.length > 0) {
            console.log(`[AI-Router] Company found via conversation metadata: ${metaMatches[0].company_name}`);
            return { companyId: metaMatches[0].id, matchedName: metaMatches[0].company_name };
          }
        }
      }
    } catch (err) {
      console.warn('[AI-Router] Failed to check conversation metadata for company:', err);
    }
  }
  
  console.log(`[AI-Router] No company found for CUI=${cui}, name=${companyName}, conversationId=${conversationId}`);
  return { companyId: null, matchedName: null };
}

// Caută conversații similare pentru această firmă
async function findSimilarConversations(
  supabase: any,
  userId: string,
  companyId: string | null,
  question: string,
  limit: number = 3
): Promise<Array<{ question: string; answer: string; created_at: string }>> {
  if (!companyId || !question || question.length < 10) {
    return [];
  }
  
  // Extrag keywords (filtrăm stop words românești)
  const stopWords = ['care', 'este', 'sunt', 'pentru', 'acest', 'aceasta', 'unde', 'când', 'cât', 'cum', 'ce', 'de', 'la', 'în', 'pe', 'cu', 'și', 'sau', 'dar', 'daca', 'dacă'];
  const keywords = question
    .toLowerCase()
    .replace(/[^\w\săîâșț]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.includes(w))
    .slice(0, 5); // Max 5 keywords
  
  if (keywords.length === 0) {
    return [];
  }
  
  console.log(`[AI-Router] Searching similar conversations for company ${companyId} with keywords: ${keywords.join(', ')}`);
  
  try {
    // Apelez funcția PostgreSQL
    const { data, error } = await supabase.rpc('find_similar_conversations', {
      p_company_id: companyId,
      p_question_keywords: keywords,
      p_limit: limit
    });
    
    if (error) {
      console.error('[AI-Router] Error finding similar conversations:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`[AI-Router] No similar conversations found for company ${companyId}`);
      // Diagnostic: verifică dacă există conversații pentru această firmă
      const { count } = await supabase
        .from('ai_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);
      console.log(`[AI-Router] 📊 Total ai_conversations for company ${companyId}: ${count || 0}`);
      return [];
    }
    
    console.log(`[AI-Router] Found ${data.length} similar conversations`);
    return data.map((conv: any) => ({
      question: conv.question,
      answer: conv.answer,
      created_at: conv.created_at
    }));
  } catch (err) {
    console.error('[AI-Router] Exception finding similar conversations:', err);
    return [];
  }
}

// Construiește context din conversații similare
function buildMemoryContext(conversations: Array<{ question: string; answer: string }>): string | null {
  if (!conversations || conversations.length === 0) {
    return null;
  }
  
  const contextLines = conversations.map((conv, i) => {
    const shortQuestion = conv.question.length > 100 ? conv.question.substring(0, 100) + '...' : conv.question;
    const shortAnswer = conv.answer.length > 300 ? conv.answer.substring(0, 300) + '...' : conv.answer;
    return `${i + 1}. Întrebare anterioară: "${shortQuestion}"\n   Răspuns util: "${shortAnswer}"`;
  }).join('\n\n');
  
  return `📚 CONTEXT DIN CONVERSAȚII ANTERIOARE CU ACEASTĂ FIRMĂ:

${contextLines}

⚠️ Folosește aceste informații pentru a personaliza răspunsul și a menține continuitatea, dar bazează-te pe datele actuale dacă sunt disponibile.

---

`;
}

// =============================================================================
// 🆕 v3.0.0: RĂSPUNSURI DETERMINISTE DIN CACHE - Fără AI pentru întrebări simple
// =============================================================================

interface BalanceAnalysisCache {
  company?: string;
  period?: string;
  claudeResponse?: string;
  extractedValues?: {
    totalClasa7?: number;
    totalClasa6?: number;
    sold121?: number;
    sold121IsProfit?: boolean;
    cifraAfaceri?: number;
    profit?: number;
    dso?: number;
    dpo?: number;
  };
  analyzedAt?: string;
}

// Detectează întrebări simple despre profit/pierdere/solduri
// 🆕 v3.1.0: Pattern-uri extinse pentru întrebări românești comune
function isSimpleNumericQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const patterns = [
    // Pattern-uri existente
    /c[aâ]t\s*(am|e|este|avem)\s*(profit|pierdere)/i,
    /care\s*(e|este)\s*(profitul|pierderea|rezultatul)/i,
    /sold(ul)?\s*121/i,
    /care\s*(e|sunt)\s*(veniturile|cheltuielile)/i,
    /total\s*(venituri|cheltuieli|clasa)/i,
    /am\s*(profit|pierdere)/i,
    /sunt\s*pe\s*(profit|pierdere)/i,
    /cifra\s*de\s*afaceri/i,
    
    // 🆕 Pattern-uri noi pentru variante românești comune
    /c[aâ]t\s*(am\s+avut|a\s+fost)\s*(profit|pierdere)/i,      // "cât am avut profit"
    /spune-mi\s*(profitul|pierderea|rezultatul)/i,             // "spune-mi profitul"
    /ar[aă]t[aă]-mi\s*(profitul|pierderea|rezultatul)/i,       // "arată-mi profitul"
    /d[aă]-mi\s*(profitul|pierderea|rezultatul|cifra)/i,       // "dă-mi profitul"
    /(profit|pierdere)\s*(pe\s*)?(lun[aă]|perioad[aă]|trimestrul?)/i,  // "profit pe luna"
    /rezultat(ul)?\s*(financiar|contabil|net|perioad[aă])/i,   // "rezultatul financiar"
    /c[aâ]t\s*(am\s+)?c[aâ][sș]tigat/i,                        // "cât am câștigat"
    /c[aâ]t\s*(am\s+)?pierdut/i,                               // "cât am pierdut"
    /pe\s+(minus|plus)/i,                                       // "sunt pe minus/plus"
    /venituri\s*totale/i,                                       // "venituri totale"
    /cheltuieli\s*totale/i,                                     // "cheltuieli totale"
    /sum[aă]\s*(venituri|cheltuieli)/i,                        // "suma veniturilor"
    /(profit|pierdere)\s+(sau|ori)\s+(pierdere|profit)/i,      // "profit sau pierdere"
    /ce\s+(profit|pierdere)\s+(am|avem)/i,                     // "ce profit am"
  ];
  
  const isMatch = patterns.some(p => p.test(lowerMessage));
  
  // 🆕 Log pentru debugging
  if (isMatch) {
    console.log(`[AI-Router] 🎯 isSimpleNumericQuestion MATCH: "${message.substring(0, 60)}..."`);
  }
  
  return isMatch;
}

// Formatează numărul în format românesc
function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Generează răspuns determinist din cache (fără AI call)
function buildDeterministicResponse(
  balanceAnalysis: BalanceAnalysisCache,
  message: string
): string | null {
  const { extractedValues, company, period } = balanceAnalysis;
  
  if (!extractedValues) return null;
  
  const lowerMessage = message.toLowerCase();
  let response = `📊 **Date din analiza balanței${company ? ` ${company}` : ''}**${period ? ` (${period})` : ''}:\n\n`;
  
  // Întrebare despre profit/pierdere/rezultat
  if (lowerMessage.includes('profit') || lowerMessage.includes('pierdere') || lowerMessage.includes('rezultat')) {
    const sold121 = extractedValues.sold121 || extractedValues.profit || 0;
    const isProfit = extractedValues.sold121IsProfit ?? (sold121 >= 0);
    const rezultatPerioadă = (extractedValues.totalClasa7 || 0) - (extractedValues.totalClasa6 || 0);
    
    if (isProfit) {
      response += `✅ **PROFIT**: ${formatNumber(Math.abs(sold121))} RON (sold cont 121)\n`;
    } else {
      response += `❌ **PIERDERE**: ${formatNumber(Math.abs(sold121))} RON (sold cont 121)\n`;
    }
    
    response += `\n📈 **Detalii:**\n`;
    response += `• Total Venituri (Clasa 7): ${formatNumber(extractedValues.totalClasa7)} RON\n`;
    response += `• Total Cheltuieli (Clasa 6): ${formatNumber(extractedValues.totalClasa6)} RON\n`;
    response += `• Rezultat pe perioadă (7-6): ${formatNumber(rezultatPerioadă)} RON\n`;
    
    // Explică diferența dacă există
    if (sold121 !== 0 && Math.abs(rezultatPerioadă - sold121) > 1) {
      response += `\n💡 *Diferența dintre rezultatul pe perioadă și soldul 121 provine din solduri inițiale reportate (cont 1171) sau ajustări contabile - aceasta este o situație normală pentru balanțe interimare.*`;
    }
    
    return response;
  }
  
  // Întrebare despre sold 121 specific
  if (lowerMessage.includes('121')) {
    const sold121 = extractedValues.sold121 || extractedValues.profit || 0;
    const isProfit = extractedValues.sold121IsProfit ?? (sold121 >= 0);
    
    response += `**Cont 121 - Profit și pierdere**:\n`;
    response += `• Sold final: ${formatNumber(Math.abs(sold121))} RON (${isProfit ? 'creditor = PROFIT' : 'debitor = PIERDERE'})\n`;
    return response;
  }
  
  // Întrebare despre venituri
  if (lowerMessage.includes('venituri') || lowerMessage.includes('clasa 7')) {
    response += `**Total Venituri (Clasa 7)**: ${formatNumber(extractedValues.totalClasa7)} RON\n`;
    if (extractedValues.cifraAfaceri) {
      response += `• Cifra de afaceri: ${formatNumber(extractedValues.cifraAfaceri)} RON\n`;
    }
    return response;
  }
  
  // Întrebare despre cheltuieli
  if (lowerMessage.includes('cheltuieli') || lowerMessage.includes('clasa 6')) {
    response += `**Total Cheltuieli (Clasa 6)**: ${formatNumber(extractedValues.totalClasa6)} RON\n`;
    return response;
  }
  
  // Întrebare despre cifra de afaceri
  if (lowerMessage.includes('cifra') && lowerMessage.includes('afaceri')) {
    const ca = extractedValues.cifraAfaceri || extractedValues.totalClasa7 || 0;
    response += `**Cifra de afaceri**: ${formatNumber(ca)} RON\n`;
    return response;
  }
  
  // Fallback: afișează toate datele disponibile
  response += `• Total Venituri (Clasa 7): ${formatNumber(extractedValues.totalClasa7)} RON\n`;
  response += `• Total Cheltuieli (Clasa 6): ${formatNumber(extractedValues.totalClasa6)} RON\n`;
  
  const sold121 = extractedValues.sold121 || extractedValues.profit || 0;
  const isProfit = extractedValues.sold121IsProfit ?? (sold121 >= 0);
  response += `• Rezultat (cont 121): ${isProfit ? 'PROFIT' : 'PIERDERE'} ${formatNumber(Math.abs(sold121))} RON\n`;
  
  return response;
}

// =============================================================================
// 🆕 EXTRACȚIE VALORI FINANCIARE DIN HISTORY (MEMORIE INTRA-SESIUNE)
// =============================================================================

interface UserMentionedFacts {
  cifraAfaceri?: string;
  profit?: string;
  angajati?: string;
  industrie?: string;
  cash?: string;
  datorii?: string;
  venituri?: string;
  cheltuieli?: string;
  capitalSocial?: string;
  investitie?: string;
}

function extractUserMentionedFacts(history: Array<{ role: string; content: string }>): UserMentionedFacts {
  const facts: UserMentionedFacts = {};
  
  // Scanăm doar mesajele utilizatorului (cele mai recente au prioritate)
  const userMessages = history
    .filter(m => m.role === 'user' && m.content)
    .map(m => m.content)
    .reverse(); // cele mai recente primele
  
  const allUserText = userMessages.join(' ');
  
  const extractFirst = (patterns: RegExp[]): string | undefined => {
    for (const p of patterns) {
      const m = allUserText.match(p);
      if (m && m[1]) return m[1].trim().replace(/\s+/g, '');
    }
    return undefined;
  };
  
  // CA / Cifră de afaceri
  facts.cifraAfaceri = extractFirst([
    /cifr[aă]\s*(?:de\s+)?afaceri\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([0-9][0-9.,\s]*)/i,
    /\bCA\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([0-9][0-9.,\s]*)/i,
    /(?:am|avem|e|este)\s+(?:o\s+)?(?:cifr[aă]\s*(?:de\s+)?afaceri|CA)\s+(?:de\s+)?([0-9][0-9.,\s]*)/i,
  ]);
  
  // Profit
  facts.profit = extractFirst([
    /profit\s*(?:net|brut)?\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([-]?[0-9][0-9.,\s]*)/i,
    /(?:am|avem|e|este)\s+(?:un\s+)?profit\s+(?:de\s+)?([-]?[0-9][0-9.,\s]*)/i,
  ]);
  
  // Angajați
  facts.angajati = extractFirst([
    /(\d+)\s*(?:de\s+)?angaja[tț]i/i,
    /angaja[tț]i\s*[:=\-–]?\s*(\d+)/i,
    /(?:am|avem)\s+(\d+)\s+(?:de\s+)?(?:oameni|persoane|angaja)/i,
  ]);
  
  // Industrie
  facts.industrie = extractFirst([
    /(?:industri[ea]|domeniu|sector|activitate)\s*[:=\-–]?\s*([a-zA-ZăîâșțĂÎÂȘȚ\s]+?)(?:\.|,|$)/i,
    /(?:lucr[aă]m?\s+[îi]n|activ[aă]m?\s+[îi]n|sunt?\s+[îi]n)\s+(?:domeniul?\s+)?([a-zA-ZăîâșțĂÎÂȘȚ\s]+?)(?:\.|,|$)/i,
  ]);
  
  // Cash / numerar disponibil
  facts.cash = extractFirst([
    /cash\s*(?:disponibil)?\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([0-9][0-9.,\s]*)/i,
    /numerar\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([0-9][0-9.,\s]*)/i,
    /(?:am|avem)\s+(?:în\s+)?(?:cont|bancă|banca)\s+([0-9][0-9.,\s]*)/i,
  ]);
  
  // Datorii
  facts.datorii = extractFirst([
    /datorii\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([0-9][0-9.,\s]*)/i,
    /(?:am|avem)\s+datorii\s+(?:de\s+)?([0-9][0-9.,\s]*)/i,
  ]);
  
  // Venituri
  facts.venituri = extractFirst([
    /venituri?\s*(?:totale?)?\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([0-9][0-9.,\s]*)/i,
    /(?:am|avem)\s+venituri\s+(?:de\s+)?([0-9][0-9.,\s]*)/i,
  ]);
  
  // Cheltuieli
  facts.cheltuieli = extractFirst([
    /cheltuieli\s*(?:totale?)?\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([0-9][0-9.,\s]*)/i,
    /(?:am|avem)\s+cheltuieli\s+(?:de\s+)?([0-9][0-9.,\s]*)/i,
  ]);
  
  // Capital social
  facts.capitalSocial = extractFirst([
    /capital\s*(?:social)?\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([0-9][0-9.,\s]*)/i,
  ]);
  
  // Investiție
  facts.investitie = extractFirst([
    /investi[tț]i[ea]\s*[:=\-–]?\s*(?:de\s+)?(?:RON\s*)?([0-9][0-9.,\s]*)/i,
    /(?:am\s+investit|investesc)\s+([0-9][0-9.,\s]*)/i,
  ]);
  
  // Curăță undefined
  for (const key of Object.keys(facts) as (keyof UserMentionedFacts)[]) {
    if (!facts[key]) delete facts[key];
  }
  
  return facts;
}

// =============================================================================
// ROUTING LOGIC (original)
// =============================================================================

// =============================================================================
// SAGA FORMAT DETECTION (server-side, fără dependință de frontend)
// =============================================================================
function detectSagaFromBase64(base64Content: string): boolean {
  try {
    let pure = base64Content;
    if (pure.includes(';base64,')) {
      pure = pure.split(';base64,')[1];
    }
    
    const bytes = Uint8Array.from(atob(pure), c => c.charCodeAt(0));
    
    // Dynamic import not available in Deno edge functions, use inline detection
    // We check raw bytes for SAGA-specific text patterns
    const decoder = new TextDecoder('utf-8', { fatal: false });
    // For .xls (BIFF) files, text extraction from raw bytes is unreliable,
    // so we use a simpler heuristic based on the file name + raw text scan
    const rawText = decoder.decode(bytes).toLowerCase();
    
    let sagaScore = 0;
    
    // Pattern 1: "balanta de verificare" in raw bytes
    if (rawText.includes('balanta de verificare') || rawText.includes('balan')) {
      sagaScore += 1;
    }
    
    // Pattern 2: "total sume" or "sume precedente" (SAGA-specific headers)
    if (rawText.includes('total sume') || rawText.includes('sume precedente')) {
      sagaScore += 2;
    }
    
    // Pattern 3: "SAGA" text in the file (footer/watermark)
    if (rawText.includes('saga c') || rawText.includes('saga ')) {
      sagaScore += 3;
    }
    
    // Pattern 4: Multiple "sold" + "rulaj" headers (multi-row header typical of SAGA)
    const soldCount = (rawText.match(/sold/g) || []).length;
    const rulajCount = (rawText.match(/rulaj/g) || []).length;
    if (soldCount >= 3 && rulajCount >= 2) {
      sagaScore += 2;
    }
    
    // Pattern 5: "sume precedente" is highly specific to SAGA
    if (rawText.includes('precedente')) {
      sagaScore += 2;
    }
    
    console.log(`[AI-Router] SAGA detection score: ${sagaScore} (threshold: 3)`);
    return sagaScore >= 3;
  } catch (err) {
    console.warn('[AI-Router] SAGA detection failed:', err);
    return false;
  }
}

function detectDocumentType(fileName: string): string {
  const extension = fileName.toLowerCase().split('.').pop();
  const lowerName = fileName.toLowerCase();
  
  // Check if it's a balance sheet Excel (contains keywords like balanta, balance, etc.)
  if (['xlsx', 'xls'].includes(extension || '')) {
    const isBalance = /balan[tț]|balance|sold|rulaj/i.test(lowerName);
    if (isBalance) return 'balance_excel';
    return 'general_excel'; // Non-balance Excel (e.g., bank statements, invoices)
  } else if (extension === 'pdf') {
    return 'pdf';
  } else if (['doc', 'docx'].includes(extension || '')) {
    return 'docx';
  } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension || '')) {
    return 'image';
  } else if (['pptx', 'ppt'].includes(extension || '')) {
    return 'pptx';
  }
  return 'other';
}

// =============================================================================
// 🆕 v3.0: SMART DOCUMENT CLASSIFICATION — Read & Understand uploads
// =============================================================================
function classifyDocumentFromName(fileName: string): { type: string; description: string } {
  const lower = fileName.toLowerCase();
  
  // Bank statements
  if (/extras|bancar|statement|tranzac[tț]i|brd|banca|bt\b|ing\b|raiffeisen|bcr|unicredit/i.test(lower)) {
    return { type: 'bank_statement', description: 'extras bancar' };
  }
  // Invoices
  if (/factur[aă]|invoice|fact_|proforma/i.test(lower)) {
    return { type: 'invoice', description: 'factură' };
  }
  // Contracts
  if (/contract|acord|nda|confiden[tț]ial/i.test(lower)) {
    return { type: 'contract', description: 'contract' };
  }
  // Registry / ledger
  if (/registr|jurnal|fisa_cont|fi[sș]a/i.test(lower)) {
    return { type: 'ledger', description: 'registru contabil' };
  }
  // Tax forms
  if (/d[0-9]{3}|declar|anaf|fiscal/i.test(lower)) {
    return { type: 'tax_form', description: 'declarație fiscală' };
  }
  // Reports
  if (/raport|report|bilan[tț]|situati/i.test(lower)) {
    return { type: 'report', description: 'raport' };
  }
  // Receipts
  if (/bon|chitan[tț][aă]|receipt/i.test(lower)) {
    return { type: 'receipt', description: 'bon/chitanță' };
  }
  
  return { type: 'document', description: 'document' };
}

function detectIntent(message: string): RouteDecision {
  const lowerMessage = message.toLowerCase();

  // =============================================================================
  // ⚡ PRIORITY 0: GRAPH / VISUALIZATION REQUESTS (MUST OVERRIDE ALL strategic detection)
  // =============================================================================
  // If user explicitly asks for a chart/graph/table visualization, we MUST route to
  // chat-ai so it can return ```artifact ...``` blocks rendered in-chat.
  // This MUST be the first check, before anything else!
  const graphKeywords = ['grafic', 'grafice', 'chart', 'diagrama', 'diagramă', 'vizualiz', 'tabel', 'tabele'];
  const isGraphRequest = graphKeywords.some(kw => lowerMessage.includes(kw));
  
  if (isGraphRequest) {
    console.log(`[AI-Router] ⚡ GRAPH REQUEST DETECTED - forcing chat-ai route for: "${message.substring(0, 50)}..."`);
    return {
      route: 'chat-ai',
      payload: {
        message,
        graphRequest: true,
      },
      reason: 'User requested a chart/visualization (graph request - priority override)'
    };
  }
  
  // ANAF Risk detection - MUST BE BEFORE general fiscal detection
  if (
    lowerMessage.includes('risc anaf') ||
    lowerMessage.includes('risc de control') ||
    lowerMessage.includes('control anaf') ||
    lowerMessage.includes('inspecție anaf') ||
    lowerMessage.includes('inspectie anaf') ||
    lowerMessage.includes('risc fiscal') ||
    lowerMessage.includes('probabilitate control') ||
    lowerMessage.includes('șanse control') ||
    lowerMessage.includes('sanse control') ||
    lowerMessage.includes('risc de inspecție') ||
    lowerMessage.includes('risc de inspectie') ||
    lowerMessage.includes('scor risc anaf') ||
    (lowerMessage.includes('anaf') && (lowerMessage.includes('risc') || lowerMessage.includes('control') || lowerMessage.includes('verificare')))
  ) {
    return {
      route: 'calculate-anaf-risk',
      payload: { message },
      reason: 'User requested ANAF risk analysis'
    };
  }
  
  // Resilience detection
  if (
    lowerMessage.includes('reziliență') || 
    lowerMessage.includes('rezilienta') ||
    lowerMessage.includes('scor de reziliență') ||
    lowerMessage.includes('analiza rezilienta')
  ) {
    return {
      route: 'calculate-resilience',
      payload: { query: message },
      reason: 'User requested resilience analysis'
    };
  }
  
  // =============================================================================
  // ⚡ SUPPLIER AUDIT DETECTION — Analyze/search suppliers from chat
  // =============================================================================
  const supplierPatterns = [
    /(?:caut[aă]|g[aă]se[sș]te|verific[aă]|analizeaz[aă]|evalueaz[aă])(?:-mi|-ne)?\s+(?:un\s+)?(?:furnizor|supplier|provider)/i,
    /(?:cel\s+mai\s+(?:ieftin|bun|fiabil))\s+(?:furnizor|supplier|provider)/i,
    /(?:furnizor|supplier)\s+(?:pentru|de|ieftin|bun|fiabil|nou)/i,
    /(?:compar[aă]|compara[tț]ie)\s+(?:furnizor|supplier|ofert[eă])/i,
    /(?:scor|rating|evaluare|audit)\s+(?:furnizor|supplier)/i,
    /(?:risc|fiabilitate|reputa[tț]ie)\s+(?:furnizor|supplier|firm[aă])/i,
    /(?:ofert[aă]|pre[tț])\s+(?:de\s+la|furnizor)/i,
    /(?:verific[aă]|caut[aă]|analizeaz[aă])(?:-mi)?\s+(?:firma|compania)\s+["„]?[A-Z]/i,
    /(?:ce\s+[sș]ti[ie]\s+despre|informa[tț]ii\s+despre)\s+(?:firma|furnizor|compania)\s+/i,
    /(?:caut[aă]|g[aă]se[sș]te)(?:-mi)?\s+(?:cel\s+mai\s+)?(?:ieftin|bun)\s+(?:pre[tț]|produs)/i,
  ];
  
  const isSupplierRequest = supplierPatterns.some(p => p.test(lowerMessage));
  
  if (isSupplierRequest) {
    // Common Romanian prepositions/articles to exclude from supplier name extraction
    const stopWords = ['de', 'din', 'un', 'o', 'la', 'pe', 'cu', 'în', 'si', 'și', 'sau', 'cel', 'mai', 'pentru', 'care', 'nr', 'al', 'ale'];
    
    // Extract supplier name — look for quoted names or "firma X" patterns
    const nameMatch = message.match(/["„]([^"„""]{2,})[""]/) 
      || message.match(/(?:firma|compania)\s+([A-Z][A-Za-zăîâșțĂÎÂȘȚ\s&.-]{2,}?)(?:\s*[,.\?!]|\s+(?:din|cu|care|pentru|și|si|este|e\s))/i)
      || message.match(/(?:despre|evalueaz[aă]|verific[aă]|analizeaz[aă])\s+(?:firma|compania|furnizorul)?\s*([A-Z][A-Za-zăîâșțĂÎÂȘȚ\s&.-]{2,}?)(?:\s*[,.\?!]|\s+(?:din|cu|care|pentru|și|si))/i);
    
    let supplierName = nameMatch ? nameMatch[1].trim() : null;
    
    // Reject if extracted name is just a stop word or too short
    if (supplierName && (stopWords.includes(supplierName.toLowerCase()) || supplierName.length < 3)) {
      supplierName = null;
    }
    
    // Extract product/service description  
    const productMatch = message.match(/(?:furnizor|supplier|provider)\s+(?:de\s+)?([a-zA-ZăîâșțĂÎÂȘȚ\s]+?)(?:\s+din\s+|\.|,|$|\?)/i)
      || message.match(/(?:servicii|produse|materiale)\s+([a-zA-ZăîâșțĂÎÂȘȚ\s]+?)(?:\s+din\s+|\.|,|$|\?)/i)
      || message.match(/(?:de)\s+([a-zA-ZăîâșțĂÎÂȘȚ\s]{4,}?)(?:\s+din\s+|\.|,|$|\?)/i);
    const productDescription = productMatch ? productMatch[1].trim() : null;
    
    // Extract location if present
    const locationMatch = message.match(/(?:din|în|la)\s+([A-ZĂÎÂȘȚ][a-zA-ZăîâșțĂÎÂȘȚ\s,]+?)(?:\.|,?\s*$|\?|!)/i);
    const location = locationMatch ? locationMatch[1].trim() : null;
    
    // Determine if this is a search (no specific supplier) or an audit (specific supplier)
    const isSearchMode = !supplierName;
    
    console.log(`[AI-Router] 🏭 SUPPLIER ${isSearchMode ? 'SEARCH' : 'AUDIT'} DETECTED: supplier="${supplierName || 'N/A'}", product="${productDescription || 'general'}", location="${location || 'N/A'}"`);
    return {
      route: 'analyze-supplier',
      payload: { 
        message,
        supplier_name: supplierName,
        product_description: productDescription,
        location,
        search_mode: isSearchMode,
      },
      reason: isSearchMode 
        ? `User searching for suppliers: ${productDescription || 'general'}${location ? ` in ${location}` : ''}`
        : `User requested supplier analysis for "${supplierName}"`
    };
  }

  // Fiscal questions - EXTENDED keywords pentru legislația 2026
  // Include forme articulate și variante pentru detecție robustă
  if (
    lowerMessage.includes('impozit') ||
    lowerMessage.includes('impozitul') ||
    lowerMessage.includes('tva') ||
    lowerMessage.includes('fiscal') ||
    lowerMessage.includes('anaf') ||
    lowerMessage.includes('declarație') ||
    lowerMessage.includes('declaratie') ||
    lowerMessage.includes('taxe') ||
    lowerMessage.includes('taxa') ||
    // Keywords pentru legislația 2026
    lowerMessage.includes('cass') ||
    lowerMessage.includes('cas ') ||
    lowerMessage.includes('dividend') ||
    lowerMessage.includes('dividende') ||
    lowerMessage.includes('contribuți') ||
    lowerMessage.includes('contributii') ||
    lowerMessage.includes('contribuția') ||
    lowerMessage.includes('contributia') ||
    // Salariu - toate variantele
    lowerMessage.includes('salariu') ||
    lowerMessage.includes('salariul') ||
    lowerMessage.includes('salarii') ||
    lowerMessage.includes('brut') ||
    lowerMessage.includes('minim') ||
    // Declarații
    lowerMessage.includes('d700') ||
    lowerMessage.includes('d107') ||
    lowerMessage.includes('d205') ||
    lowerMessage.includes('d112') ||
    lowerMessage.includes('d300') ||
    lowerMessage.includes('d212') ||
    lowerMessage.includes('duf') ||
    lowerMessage.includes('declarația unică') ||
    lowerMessage.includes('declaratia unica') ||
    // Micro și regimuri
    lowerMessage.includes('microîntreprindere') ||
    lowerMessage.includes('microintreprindere') ||
    lowerMessage.includes('micro') ||
    lowerMessage.includes('plafon') ||
    lowerMessage.includes('cotă unică') ||
    lowerMessage.includes('cota unica') ||
    lowerMessage.includes('legislație') ||
    lowerMessage.includes('legislatie') ||
    lowerMessage.includes('cod fiscal') ||
    // An și termeni temporali fiscali
    lowerMessage.includes('2026') ||
    lowerMessage.includes('2025')
  ) {
    return {
      route: 'fiscal-chat',
      payload: { message },
      reason: 'User asked a fiscal/tax question'
    };
  }
  
  // =============================================================================
  // ⚡ DOCUMENT GENERATION DETECTION — MUST BE BEFORE Velcont and Strategic checks
  // =============================================================================
  const docGenPatterns = [
    // Direct creation requests - flexible: handles -mi/-ne/-le suffixes and extra words like "draft de"
    /(?:creeaz[aă]|genereaz[aă]|f[aă]|scrie|redacteaz[aă]|preg[aă]te[sș]te)(?:-mi|-ne|-le|-i)?\s+(?:un|o|un\s+fi[sș]ier|document)(?:\s+\w+){0,3}\s+(?:contract|acord|nda|proces\s*verbal|decizie|propunere|ofert[aă]|raport|prezentare|factur[aă]|scrisoare|cerere|adres[aă]|not[aă]|minute|protocol|regulament|procedur[aă]|stat\s*de\s*plat[aă]|chestionar|formular|plan|brief)/i,
    /(?:creeaz[aă]|genereaz[aă]|f[aă])(?:-mi|-ne|-le|-i)?\s+(?:un\s+)?(?:word|excel|powerpoint|pptx?|docx?|xlsx?|pdf|spreadsheet|prezentare|tabel)/i,
    /(?:vreau|am\s+nevoie\s+de|trebuie|d[aă]-mi|f[aă]-mi)(?:\s+\w+){0,2}\s+(?:un|o)\s+(?:\w+\s+){0,2}(?:contract|nda|acord|prezentare|raport|propunere|ofert[aă]|tabel|spreadsheet|document)/i,
    // Editing requests
    /(?:editeaz[aă]|modific[aă]|actualizeaz[aă]|completeaz[aă])(?:-mi|-ne|-le|-i)?\s+(?:documentul|contractul|raportul|prezentarea|tabelul|fi[sș]ierul)/i,
    // Email + document
    /(?:trimite|trimite-mi|expediaz[aă]|d[aă]-mi)\s+(?:pe\s+email|prin\s+email)?\s*(?:un|o)?\s*(?:contract|document|raport|prezentare|ofert[aă]|propunere)/i,
    // Specific document types
    /(?:contract\s+de\s+(?:prest[aă]ri|munc[aă]|servicii|colaborare|v[aâ]nzare|[îi]nchiriere|consultan[tț][aă])|act\s+adi[tț]ional|proces\s*verbal|decizie\s+aga|hot[aă]r[aâ]re\s+aga)/i,
    // Catch-all: "contract" + context words suggesting generation intent
    /(?:draft|model|[sș]ablon|template)\s+(?:de\s+)?(?:contract|acord|nda|propunere|ofert[aă]|raport)/i,
  ];
  
  const isDocumentRequest = docGenPatterns.some(p => p.test(lowerMessage));
  
  if (isDocumentRequest) {
    // Detect document type from message
    let docType: 'docx' | 'xlsx' | 'pptx' | 'pdf' = 'docx'; // default Word
    if (/excel|xlsx?|spreadsheet|tabel|calcul/i.test(lowerMessage)) docType = 'xlsx';
    else if (/power\s*point|pptx?|prezentare|slide/i.test(lowerMessage)) docType = 'pptx';
    else if (/pdf/i.test(lowerMessage)) docType = 'pdf';
    
    // Detect template type
    let templateType = 'general';
    if (/contract/i.test(lowerMessage)) templateType = 'contract';
    else if (/nda|confiden[tț]ialitate/i.test(lowerMessage)) templateType = 'nda';
    else if (/propunere|ofert[aă]/i.test(lowerMessage)) templateType = 'propunere';
    else if (/raport/i.test(lowerMessage)) templateType = 'raport';
    else if (/prezentare|pitch/i.test(lowerMessage)) templateType = 'prezentare';
    else if (/factur[aă]/i.test(lowerMessage)) templateType = 'factura';
    else if (/proces\s*verbal/i.test(lowerMessage)) templateType = 'proces-verbal';
    else if (/decizie|hot[aă]r[aâ]re/i.test(lowerMessage)) templateType = 'decizie';
    else if (/plan/i.test(lowerMessage)) templateType = 'plan';
    
    console.log(`[AI-Router] 📄 DOCUMENT GENERATION DETECTED: type=${docType}, template=${templateType}`);
    return {
      route: 'generate-document',
      payload: { 
        message,
        documentType: docType,
        templateType,
        description: message,
      },
      reason: `User requested document generation (${docType}, ${templateType})`
    };
  }

  // ⚡ VELCONT ADMIN OVERRIDE - întrebări despre servicii/prețuri/programare Velcont
  // Trebuie să ajungă în chat-ai (nu strategic) pentru a folosi blocul VELCONT din prompt
  const velcontKeywords = ['velcont', 'contabilitate', 'contabil', 'smartbill', 'zoom', 'servicii contabilitate'];
  const velcontAdminTriggers = [
    'cât cost', 'cat cost', 'cât e', 'cat e', 'preț', 'pret', 'tarif', 'cost',
    'program', 'evaluare', 'întâlnire', 'intalnire', 'call',
    'vreau contabilitate', 'vreau sa incep', 'colaborare', 'ofertă', 'oferta',
    'cum încep', 'cum incep', 'cum fac', 'să lucrez', 'sa lucrez'
  ];
  
  const hasVelcontContext = velcontKeywords.some(kw => lowerMessage.includes(kw));
  const hasAdminTrigger = velcontAdminTriggers.some(trigger => lowerMessage.includes(trigger));
  
  if (hasVelcontContext && hasAdminTrigger) {
    console.log('[AI-Router] VELCONT OVERRIDE: Admin question detected, routing to chat-ai');
    return {
      route: 'chat-ai',
      payload: { message, velcontIntent: true },
      reason: 'Velcont admin question override - pricing/scheduling/collaboration'
    };
  }

  // Strategic questions - EXPANDED for better detection
  if (
    lowerMessage.includes('strategi') ||
    lowerMessage.includes('war room') ||
    lowerMessage.includes('battle plan') ||
    lowerMessage.includes('simulare') ||
    lowerMessage.includes('scenariu') ||
    lowerMessage.includes('costuri') ||
    lowerMessage.includes('cost') ||
    lowerMessage.includes('optimiz') ||
    lowerMessage.includes('reduc') ||
    lowerMessage.includes('cresc') ||
    lowerMessage.includes('eficientiz') ||
    lowerMessage.includes('recomand') ||
    lowerMessage.includes('pe baza') ||
    lowerMessage.includes('plan de acțiune') ||
    lowerMessage.includes('plan de actiune') ||
    lowerMessage.includes('pași') ||
    lowerMessage.includes('pasi') ||
    lowerMessage.includes('următoarele') ||
    lowerMessage.includes('urmatoarele') ||
    lowerMessage.includes('ce ar trebui') ||
    lowerMessage.includes('cum să') ||
    lowerMessage.includes('cum sa') ||
    lowerMessage.includes('tai') ||
    lowerMessage.includes('taie') ||
    lowerMessage.includes('categor') ||
    lowerMessage.includes('cheltuieli') ||
    lowerMessage.includes('venituri') ||
    lowerMessage.includes('profit') ||
    lowerMessage.includes('pierdere') ||  // 🆕 FIX: Adaugă "pierdere" pentru rutare corectă
    lowerMessage.includes('marja') ||
    lowerMessage.includes('buget')
  ) {
    return {
      route: 'strategic-advisor',
      payload: { message, needsBalanceContext: true },  // 🆕 Flag pentru ai-router să știe să injecteze balanceContext
      reason: 'User asked about strategic planning or optimization'
    };
  }
  
  // Default to chat-ai for general questions
  return {
    route: 'chat-ai',
    payload: { message },
    reason: 'General financial question'
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const requestData: RouterRequest = await req.json();
    const { message, conversationId, fileData, companyName, history, balanceContext } = requestData;

    // =============================================================================
    // MEMORIE: Detectez firma și caut conversații similare
    // =============================================================================
    let detectedCompanyId: string | null = null;
    let detectedCompanyName: string | null = companyName || null;
    let memoryContext: string | null = null;
    
    // Dacă avem fileData (balanță încărcată), extrag CUI și caut firma
    if (fileData && fileData.fileName) {
      const extractedCUI = extractCUIFromFileName(fileData.fileName);
      const companyResult = await findCompanyByContext(
        supabase, 
        user.id, 
        companyName || undefined, 
        extractedCUI || undefined,
        conversationId || undefined // 🆕 FIX: Adaugă conversationId pentru fallback
      );
      detectedCompanyId = companyResult.companyId;
      detectedCompanyName = companyResult.matchedName || companyName || null;
    } else if (conversationId) {
      // 🆕 FIX: Dacă nu avem fișier dar avem conversație, încearcă din metadata
      const companyResult = await findCompanyByContext(
        supabase, 
        user.id, 
        companyName || undefined, 
        undefined,
        conversationId
      );
      detectedCompanyId = companyResult.companyId;
      detectedCompanyName = companyResult.matchedName || companyName || null;
    }
    
    // Caut conversații similare doar dacă am identificat firma
    if (detectedCompanyId && message) {
      const similarConversations = await findSimilarConversations(
        supabase,
        user.id,
        detectedCompanyId,
        message,
        3
      );
      memoryContext = buildMemoryContext(similarConversations);
      
      if (memoryContext) {
        console.log(`[AI-Router] Memory context built from ${similarConversations.length} conversations`);
      }
    }

    let routeDecision: RouteDecision;
    let response: Response;

    // If file data is provided, route based on file type
    if (fileData && fileData.fileContent) {
      const docType = detectDocumentType(fileData.fileName);
      
      if (docType === 'balance_excel') {
        // 🆕 Detectare automată format SAGA
        const isSaga = detectSagaFromBase64(fileData.fileContent);
        const targetRoute = isSaga ? 'analyze-balance-saga' : 'analyze-balance';
        console.log(`[AI-Router] Balance Excel routing: ${targetRoute} (SAGA=${isSaga})`);
        
        routeDecision = {
          route: targetRoute,
          payload: {
            excelBase64: fileData.fileContent,
            companyName: detectedCompanyName || undefined,
            fileName: fileData.fileName,
            memoryContext,
            forceReprocess: true
          },
          reason: `Excel balance sheet uploaded - ${isSaga ? 'SAGA format detected' : 'standard format'} (forceReprocess=true)`
        };
      } else if (docType === 'general_excel') {
        // 🆕 v3.0: SMART CLASSIFICATION for non-balance Excel files
        const classification = classifyDocumentFromName(fileData.fileName);
        console.log(`[AI-Router] 📊 Non-balance Excel uploaded: ${fileData.fileName} → classified as ${classification.type}`);
        
        routeDecision = {
          route: 'chat-ai',
          payload: {
            message: message || `Am primit un fișier Excel: ${fileData.fileName}. Analizează-l.`,
            documentClassification: classification,
            documentName: fileData.fileName,
            documentContent: fileData.fileContent,
            memoryContext,
            history,
            balanceContext,
          },
          reason: `Non-balance Excel uploaded (${classification.type}: ${classification.description})`
        };
      } else if (docType === 'pdf' || docType === 'docx' || docType === 'pptx') {
        // 🆕 v3.0: SMART CLASSIFICATION for PDF/Word/PPTX documents
        const classification = classifyDocumentFromName(fileData.fileName);
        console.log(`[AI-Router] 📄 Document uploaded: ${fileData.fileName} → classified as ${classification.type}`);
        
        routeDecision = {
          route: 'strategic-advisor',
          payload: {
            message: message || `Am primit un ${classification.description}: ${fileData.fileName}. Analizează-l.`,
            documentContent: fileData.fileContent,
            documentName: fileData.fileName,
            documentClassification: classification,
            conversationId: conversationId,
            memoryContext
          },
          reason: `${classification.description} uploaded for analysis (${classification.type})`
        };
      } else if (docType === 'image') {
        // 🆕 IMAGE ANALYSIS: Route images to chat-ai with multimodal support
        console.log(`[AI-Router] 🖼️ Image uploaded: ${fileData.fileName} - routing to chat-ai with imageData`);
        routeDecision = {
          route: 'chat-ai',
          payload: {
            message: message || `Analizează această captură de ecran: ${fileData.fileName}`,
            imageData: {
              base64: fileData.fileContent,
              fileName: fileData.fileName,
              mimeType: fileData.fileType || `image/${fileData.fileName.toLowerCase().split('.').pop()}`
            },
            memoryContext,
            history,
            balanceContext,
          },
          reason: 'Image uploaded for multimodal analysis'
        };
      } else {
        // 🆕 v3.0: Generic classification for unknown file types
        const classification = classifyDocumentFromName(fileData.fileName);
        console.log(`[AI-Router] 📎 Unknown file type uploaded: ${fileData.fileName} → ${classification.type}`);
        
        routeDecision = {
          route: 'chat-ai',
          payload: {
            message: `Am primit un ${classification.description}: ${fileData.fileName}. ${message || 'Analizează-l te rog.'}`,
            documentClassification: classification,
            memoryContext,
            history,
            balanceContext,
          },
          reason: `Document uploaded (${classification.type})`
        };
      }
    } else {
      // =============================================================================
      // 🆕 v3.1.0: PRIORITY CHECK - Răspuns determinist ÎNAINTE de routing AI
      // Verificăm întâi cache-ul ÎNAINTE de detectIntent() pentru întrebări simple
      // =============================================================================
      
      // Fetch balanceContext from DB FIRST (before any routing decision)
      let effectiveBalanceContext: unknown = null;
      
      if (conversationId) {
        try {
          console.log(`[AI-Router] 🔍 Fetching balanceContext from DB for conversation ${conversationId}`);
          const { data: convData } = await supabase
            .from('yana_conversations')
            .select('metadata')
            .eq('id', conversationId)
            .single();
          
          if (convData?.metadata) {
            const metadata = convData.metadata as { balanceContext?: unknown };
            if (metadata.balanceContext) {
              effectiveBalanceContext = metadata.balanceContext;
              const company = (metadata.balanceContext as { company?: string })?.company || 'unknown';
              console.log(`[AI-Router] ✅ Loaded balanceContext from DB: ${company}`);
            } else {
              console.log(`[AI-Router] ⚠️ No balanceContext in conversation metadata`);
            }
          }
        } catch (err) {
          console.warn('[AI-Router] Failed to fetch balanceContext from DB:', err);
        }
      }
      
      // 🆕 v3.1.0: PRIORITY CHECK - Check deterministic response BEFORE detectIntent()
      // This ensures simple questions about profit/loss get instant answers from cache
      const balanceCtx = effectiveBalanceContext as BalanceAnalysisCache | null;
      
      console.log(`[AI-Router] Priority check for deterministic response:`, {
        hasBalanceCtx: !!balanceCtx,
        hasExtractedValues: !!balanceCtx?.extractedValues,
        messagePreview: message?.substring(0, 60) || 'no message'
      });
      
      if (message && balanceCtx?.extractedValues && isSimpleNumericQuestion(message)) {
        console.log(`[AI-Router] 🚀 DETERMINISTIC RESPONSE: Bypassing detectIntent(), using cache directly`);
        
        const deterministicResponse = buildDeterministicResponse(balanceCtx, message);
        
        if (deterministicResponse) {
          console.log(`[AI-Router] ✅ Returning cached response ($0 cost, instant)`);
          
          // Salvează mesajul assistant în DB
          if (conversationId) {
            await supabase.from('yana_messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: deterministicResponse,
              artifacts: [],
              ends_with_question: false,
              question_responded: null,
            });
          }
          
          return new Response(
            JSON.stringify({
              success: true,
              response: deterministicResponse,
              route: 'direct-response',
              source: 'cached_balance_analysis',
              cost: 0
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // No deterministic response available - proceed with normal AI routing
      routeDecision = detectIntent(message);
      
      // =============================================================================
      // 🆕 v3.2.0: FISCAL + BALANCE OVERRIDE
      // Dacă ruta e fiscal-chat DAR utilizatorul are balanță încărcată cu date,
      // redirecționăm la chat-ai care știe să calculeze cu cifrele concrete.
      // fiscal-chat e un Q&A generic fără acces la balanceContext.
      // =============================================================================
      const hasBalanceData = !!(effectiveBalanceContext || balanceContext);
      if (routeDecision.route === 'fiscal-chat' && hasBalanceData) {
        console.log(`[AI-Router] 🔄 FISCAL+BALANCE OVERRIDE: Redirecting fiscal-chat → chat-ai (balance data present)`);
        routeDecision = {
          route: 'chat-ai',
          payload: {
            message,
            fiscalQuestionWithBalance: true,
          },
          reason: 'Fiscal question with balance data loaded - redirected to chat-ai for concrete calculations'
        };
      }
      
      // Adaug memoryContext, history, balanceContext la payload
      routeDecision.payload.memoryContext = memoryContext;
      routeDecision.payload.history = history;
      
      // 🆕 MEMORIE INTRA-SESIUNE: Extrage valori financiare menționate de utilizator în conversație
      if (history && Array.isArray(history) && history.length > 0) {
        const userMentionedFacts = extractUserMentionedFacts(history);
        if (Object.keys(userMentionedFacts).length > 0) {
          routeDecision.payload.userMentionedFacts = userMentionedFacts;
          console.log(`[AI-Router] 📝 Extracted userMentionedFacts:`, userMentionedFacts);
        }
      }
      
      // 🆕 FIX COMPANY CONFUSION: Detectează dacă mesajul menționează o altă firmă decât cea din balanceContext
      const finalBalanceContext = effectiveBalanceContext || balanceContext || null;
      if (finalBalanceContext && message) {
        const bcCompany = ((finalBalanceContext as { company?: string })?.company || '').toLowerCase().trim();
        
        if (bcCompany && bcCompany.length > 3) {
          // Verifică dacă utilizatorul menționează explicit o altă firmă
          const userCompanies = await supabase
            .from('companies')
            .select('company_name')
            .or(`managed_by_accountant_id.eq.${user.id},user_id.eq.${user.id}`);
          
          const mentionedOtherCompany = (userCompanies.data || []).find(c => {
            const cn = c.company_name.toLowerCase().trim();
            // Verifică dacă mesajul menționează o altă firmă (nu cea curentă)
            return cn !== bcCompany && 
                   cn.length > 3 && 
                   message.toLowerCase().includes(cn);
          });
          
          if (mentionedOtherCompany) {
            console.log(`[AI-Router] ⚠️ COMPANY MISMATCH: Balance is for "${bcCompany}" but user mentions "${mentionedOtherCompany.company_name}"`);
            // Injectează un warning explicit în payload pentru AI
            routeDecision.payload.companyMismatchWarning = 
              `⚠️ ATENȚIE CRITICĂ: Datele financiare încărcate sunt pentru firma "${bcCompany.toUpperCase()}", ` +
              `dar utilizatorul întreabă despre "${mentionedOtherCompany.company_name}". ` +
              `NU AMESTECA datele! Spune-i utilizatorului că datele pe care le ai sunt pentru ${bcCompany.toUpperCase()} ` +
              `și că trebuie să încarce balanța firmei ${mentionedOtherCompany.company_name} pentru a primi date corecte.`;
          }
        }
      }
      
      routeDecision.payload.balanceContext = finalBalanceContext;
    }

    // Add conversationId for routes that require it
    if (routeDecision.route === 'strategic-advisor' || routeDecision.route === 'fiscal-chat' || routeDecision.route === 'chat-ai' || routeDecision.route === 'calculate-anaf-risk') {
      routeDecision.payload.conversationId = conversationId;
    }
    
    // 🆕 Special handling for ANAF risk - needs balanceContext from DB first
    if (routeDecision.route === 'calculate-anaf-risk') {
      // Priority: DB value (effectiveBalanceContext) > frontend value (balanceContext)
      // This ensures we always use persisted balance data for ANAF risk calculation
      const anafBalanceContext = routeDecision.payload.balanceContext;
      if (!anafBalanceContext) {
        console.log('[AI-Router] ⚠️ ANAF Risk requested but no balanceContext - user will receive friendly message');
      } else {
        const company = (anafBalanceContext as { company?: string })?.company || 'unknown';
        console.log(`[AI-Router] ✅ ANAF Risk calculation with balance for: ${company}`);
      }
      routeDecision.payload.generateReport = true;
    }
    
    // 🆕 FIX CRITICAL: Transmite balanceContext și către strategic-advisor pentru întrebări despre profit/pierdere
    if (routeDecision.route === 'strategic-advisor') {
      const strategicBalanceContext = routeDecision.payload.balanceContext;
      if (strategicBalanceContext) {
        const company = (strategicBalanceContext as { company?: string })?.company || 'unknown';
        console.log(`[AI-Router] ✅ Strategic Advisor with balance context for: ${company}`);
      } else {
        console.log('[AI-Router] ⚠️ Strategic Advisor without balanceContext - will provide conceptual response');
      }
    }

    // =============================================================================
    // CONSCIOUSNESS ENGINE: Încărcare context conștiință ÎNAINTE de apelul AI
    // =============================================================================
    let consciousnessContext: Record<string, unknown> | null = null;
    
    if (message && user.id && (routeDecision.route === 'chat-ai' || routeDecision.route === 'strategic-advisor')) {
      try {
        const consciousnessUrl = `${supabaseUrl}/functions/v1/consciousness-engine`;
        const consciousnessPromise = fetch(consciousnessUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            userId: user.id,
            message: message,
            conversationId,
            companyId: detectedCompanyId,
            history: history, // 🆕 FIX: Trimitem history pentru detectarea primului mesaj și topic
          }),
        });
        
        // Race cu timeout de 3 secunde
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 3000)
        );
        
        const consciousnessResponse = await Promise.race([consciousnessPromise, timeoutPromise]) as Response;
        
        if (consciousnessResponse.ok) {
          consciousnessContext = await consciousnessResponse.json();
          console.log('[AI-Router] Consciousness context loaded BEFORE AI call:', {
            success: consciousnessContext?.success,
            hasPromptInjection: !!(consciousnessContext?.context as Record<string, unknown>)?.promptInjection,
            emotionalMode: (consciousnessContext?.context as Record<string, unknown>)?.emotionalMode,
          });
          
          // Injectează consciousness context în payload
          routeDecision.payload.consciousnessContext = consciousnessContext;
        }
      } catch (err) {
        console.warn('[AI-Router] Consciousness engine timeout/error, proceeding without context:', err);
        // Nu aruncăm eroare - conștiința e opțională
      }
    }

    console.log(`AI Router: Routing to ${routeDecision.route} - ${routeDecision.reason}${memoryContext ? ' (with memory context)' : ''}${consciousnessContext ? ' (with consciousness)' : ''}`);

    // =============================================================================
    // SPECIAL ROUTE: DOCUMENT GENERATION
    // =============================================================================
    if (routeDecision.route === 'generate-document') {
      console.log('[AI-Router] 📄 Handling document generation route');
      
      const docPayload = routeDecision.payload as {
        message: string;
        documentType: string;
        templateType: string;
        description: string;
        balanceContext?: Record<string, unknown>;
      };
      
      // Check if user provided email in message
      const emailMatch = (docPayload.message || '').match(/[\w.-]+@[\w.-]+\.\w+/);
      const recipientEmail = emailMatch ? emailMatch[0] : null;
      
      // 🆕 v3.0: Pass balanceContext to document generation for data-driven reports
      const docBalanceContext = docPayload.balanceContext || routeDecision.payload.balanceContext || null;
      
      try {
        const docResponse = await fetch(`${supabaseUrl}/functions/v1/generate-office-document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            userId: user.id,
            documentType: docPayload.documentType,
            title: '',
            description: docPayload.description,
            templateType: docPayload.templateType,
            template: docPayload.templateType, // Also set as template for DOCX rendering
            recipientEmail,
            balanceContext: docBalanceContext,
          }),
        });
        
        if (!docResponse.ok) {
          const errorText = await docResponse.text();
          throw new Error(`Document generation failed: ${errorText}`);
        }
        
        const docResult = await docResponse.json();
        
        // Build response message
        let responseText = `✅ **Am generat documentul "${docResult.documentTitle}"** (${docResult.documentType.toUpperCase()})\n\n`;
        responseText += `📥 **[Descarcă documentul](${docResult.downloadUrl})**\n`;
        responseText += `📊 Dimensiune: ${(docResult.fileSize / 1024).toFixed(1)} KB\n\n`;
        
        if (docResult.emailSent && recipientEmail) {
          responseText += `📧 Am trimis documentul și pe email la **${recipientEmail}**.\n\n`;
        } else if (!recipientEmail) {
          responseText += `💡 *Dacă vrei să-ți trimit documentul pe email, spune-mi adresa ta de email.*\n\n`;
        }
        
        responseText += `---\n*Link-ul de descărcare este valabil 7 zile.*`;
        
        // Build artifact for download button
        const docFileName = `${docResult.documentTitle}.${docResult.documentType}`;
        const artifacts = [{
          type: 'download',
          title: docResult.documentTitle,
          downloadUrl: docResult.downloadUrl,
          fileName: docFileName,
          data: {
            downloadUrl: docResult.downloadUrl,
            documentType: docResult.documentType,
            fileSize: docResult.fileSize,
            fileName: docFileName,
          },
        }];
        
        // Save to yana_messages
        await supabase.from('yana_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: responseText,
          artifacts,
          ends_with_question: responseText.trim().endsWith('?'),
        });
        
        return new Response(
          JSON.stringify({
            success: true,
            response: responseText,
            route: 'generate-document',
            artifacts,
            documentGenerated: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (docErr) {
        console.error('[AI-Router] ❌ Document generation error:', docErr);
        const errorResponse = `❌ Nu am putut genera documentul. Eroare: ${docErr.message}\n\nÎncearcă din nou sau reformulează cererea.`;
        
        await supabase.from('yana_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: errorResponse,
        });
        
        return new Response(
          JSON.stringify({ success: true, response: errorResponse, route: 'generate-document' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // =============================================================================
    // SPECIAL ROUTE: SUPPLIER ANALYSIS (inline from chat)
    // =============================================================================
    if (routeDecision.route === 'analyze-supplier') {
      console.log('[AI-Router] 🏭 Handling supplier analysis route from chat');
      
      const supplierPayload = routeDecision.payload as {
        message: string;
        supplier_name?: string;
        product_description?: string;
      };
      
      // If no supplier name extracted, ask the user
      if (!supplierPayload.supplier_name) {
        const askResponse = `🏭 **Audit Furnizor**\n\nPentru a analiza un furnizor, am nevoie de câteva detalii:\n\n1. **Numele furnizorului** (obligatoriu)\n2. **CUI** (opțional, dar ajută la verificarea ANAF)\n3. **Ce produs/serviciu ofertează?**\n4. **Prețul din ofertă** (opțional, pentru comparație)\n\nExemplu: *"Verifică furnizorul MEGA DISTRIBUTION SRL cu CUI 12345678 pentru hârtie de birou la 25 RON/top"*`;
        
        await supabase.from('yana_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: askResponse,
          artifacts: [],
          ends_with_question: true,
        });
        
        return new Response(
          JSON.stringify({ success: true, response: askResponse, route: 'analyze-supplier' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Call analyze-supplier edge function
      try {
        // Extract CUI if mentioned
        const cuiMatch = supplierPayload.message.match(/(?:CUI|cui|C\.U\.I\.?)\s*[:=]?\s*(\d{6,10})/i);
        const cui = cuiMatch ? cuiMatch[1] : null;
        
        // Extract price if mentioned
        const priceMatch = supplierPayload.message.match(/(\d+(?:[.,]\d+)?)\s*(?:RON|EUR|USD|lei|euro)/i);
        const offerPrice = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;
        const currencyMatch = supplierPayload.message.match(/\d+(?:[.,]\d+)?\s*(RON|EUR|USD|lei|euro)/i);
        const currency = currencyMatch ? (currencyMatch[1] === 'lei' ? 'RON' : currencyMatch[1] === 'euro' ? 'EUR' : currencyMatch[1].toUpperCase()) : 'RON';
        
        const supplierResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-supplier`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            supplier_name: supplierPayload.supplier_name,
            cui,
            product_description: supplierPayload.product_description,
            offer_price: offerPrice,
            currency,
          }),
        });
        
        if (!supplierResponse.ok) {
          const errText = await supplierResponse.text();
          throw new Error(`Supplier analysis failed: ${errText}`);
        }
        
        const supplierResult = await supplierResponse.json();
        
        // Format response for chat display
        const scores = supplierResult.scores || { price: 50, reliability: 50, risk: 50, overall: 50 };
        const recEmoji = supplierResult.recommendation === 'APROBAT' ? '✅' : supplierResult.recommendation === 'RESPINS' ? '❌' : '⚠️';
        const recText = supplierResult.recommendation === 'APROBAT' ? 'APROBAT' : supplierResult.recommendation === 'RESPINS' ? 'RESPINS' : 'DE REVIZUIT';
        
        let chatResponse = `🏭 **Audit Furnizor: ${supplierPayload.supplier_name}**\n\n`;
        chatResponse += `${recEmoji} **Recomandare: ${recText}** (Încredere: ${Math.round((supplierResult.confidence || 0.5) * 100)}%)\n\n`;
        chatResponse += `---\n\n`;
        chatResponse += `📊 **Scoruri:**\n`;
        chatResponse += `• 💰 Preț competitiv: **${scores.price}/100**\n`;
        chatResponse += `• 🤝 Fiabilitate: **${scores.reliability}/100**\n`;
        chatResponse += `• 🛡️ Risc scăzut: **${scores.risk}/100**\n`;
        chatResponse += `• ⭐ **Scor general: ${scores.overall}/100**\n\n`;
        
        if (supplierResult.reasoning) {
          chatResponse += `💡 **Analiză:** ${supplierResult.reasoning}\n\n`;
        }
        
        if (supplierResult.strengths && supplierResult.strengths.length > 0) {
          chatResponse += `✅ **Puncte forte:**\n`;
          supplierResult.strengths.forEach((s: string) => { chatResponse += `• ${s}\n`; });
          chatResponse += `\n`;
        }
        
        if (supplierResult.risk_factors && supplierResult.risk_factors.length > 0) {
          chatResponse += `⚠️ **Factori de risc:**\n`;
          supplierResult.risk_factors.forEach((r: string) => { chatResponse += `• ${r}\n`; });
          chatResponse += `\n`;
        }
        
        if (supplierResult.market_prices && supplierResult.market_prices.length > 0) {
          chatResponse += `💲 **Prețuri de piață găsite:**\n`;
          supplierResult.market_prices.forEach((p: { source: string; price: number; currency: string }) => {
            chatResponse += `• ${p.source}: ${p.price} ${p.currency}\n`;
          });
          chatResponse += `\n`;
        }
        
        if (supplierResult.web_sources && supplierResult.web_sources.length > 0) {
          chatResponse += `🔗 **Surse:** ${supplierResult.web_sources.slice(0, 3).join(', ')}\n\n`;
        }
        
        chatResponse += `---\n*Poți verifica mai mulți furnizori pentru a compara scorurile.*`;
        
        // Save to yana_messages
        await supabase.from('yana_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: chatResponse,
          artifacts: [],
          ends_with_question: false,
        });
        
        return new Response(
          JSON.stringify({ success: true, response: chatResponse, route: 'analyze-supplier' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (supplierErr) {
        console.error('[AI-Router] ❌ Supplier analysis error:', supplierErr);
        const errorResponse = `❌ Nu am putut analiza furnizorul. Eroare: ${supplierErr.message}\n\nÎncearcă din nou cu mai multe detalii (nume, CUI, produs).`;
        
        await supabase.from('yana_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: errorResponse,
        });
        
        return new Response(
          JSON.stringify({ success: true, response: errorResponse, route: 'analyze-supplier' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // =============================================================================
    // STANDARD ROUTES
    // =============================================================================

    // Call the appropriate edge function
    // Use enhanced ANAF risk analysis with Claude AI
    const effectiveRoute = routeDecision.route === 'calculate-anaf-risk' 
      ? 'calculate-anaf-risk-enhanced' 
      : routeDecision.route;
    const targetUrl = `${supabaseUrl}/functions/v1/${effectiveRoute}`;
    
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'x-called-from-router': 'true',
      },
      body: JSON.stringify(routeDecision.payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Special handling for balance analysis errors - return user-friendly messages
      if ((routeDecision.route === 'analyze-balance' || routeDecision.route === 'analyze-balance-saga') && response.status === 400) {
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            console.log(`[AI-Router] Balance analysis error (${errorData.error}): returning friendly message`);
            return new Response(
              JSON.stringify({
                success: true,
                response: errorData.message,
                route: routeDecision.route,
                error: errorData.error
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch {
          // Not JSON, fall through
        }
      }
      
      // Special handling for ANAF risk without balance - return friendly message
      if (routeDecision.route === 'calculate-anaf-risk' && response.status === 400) {
        console.log('[AI-Router] ANAF risk requested without balance - returning friendly message');
        return new Response(
          JSON.stringify({
            success: true,
            response: "Pentru a calcula riscul de control ANAF, am nevoie să încarci mai întâi o balanță de verificare.\n\nApasă pe butonul **Analiză financiară** și încarcă fișierul Excel cu balanța ta. Apoi voi putea analiza:\n- Riscuri TVA (solduri mari de recuperat, raporturi anormale)\n- Marje de profit și cheltuieli administrative\n- Datorii fiscale restante\n- Stocuri și creanțe neîncasate\n- Tranzacții cu părți afiliate",
            route: 'calculate-anaf-risk',
            requiresBalance: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Route ${routeDecision.route} failed: ${errorText}`);
    }

    // Handle SSE stream or regular JSON response
    const contentType = response.headers.get('content-type') || '';
    let result: Record<string, unknown>;

    // Special handling for ANAF risk response (Enhanced with Claude AI)
    if (routeDecision.route === 'calculate-anaf-risk') {
      result = await response.json();
      
      // Format the response for chat display
      if (result.success) {
        const riskData = result as {
          overallScore: number;
          riskLevel: string;
          factors: Array<{ name: string; severity: string; description: string; recommendation: string }>;
          summary: string;
          recommendations: string[];
          reportText?: string;
          // AI Enhanced fields
          aiEnhanced?: boolean;
          contextualInterpretation?: string;
          personalizedRecommendations?: string[];
          anomaliesDetected?: string[];
          aiInsights?: string;
        };
        
        // Build a human-readable response with AI enhancement
        let formattedResponse = `**🧠 ANALIZĂ AVANSATĂ RISC CONTROL ANAF**\n`;
        formattedResponse += `*Îmbunătățită cu Inteligență Artificială*\n\n`;
        formattedResponse += `📊 **Scor risc: ${riskData.overallScore}/100** - Nivel: **${riskData.riskLevel.toUpperCase()}**\n\n`;
        
        // AI Insights first (most important)
        if (riskData.aiInsights) {
          formattedResponse += `💡 **Insight cheie:** ${riskData.aiInsights}\n\n`;
        }
        
        // Contextual interpretation from Claude
        if (riskData.contextualInterpretation) {
          formattedResponse += `---\n\n**🔍 Interpretare contextuală:**\n${riskData.contextualInterpretation}\n\n`;
        }
        
        // Anomalies detected by AI
        if (riskData.anomaliesDetected && riskData.anomaliesDetected.length > 0) {
          formattedResponse += `---\n\n**⚠️ Anomalii detectate de AI:**\n`;
          riskData.anomaliesDetected.forEach((a, i) => {
            formattedResponse += `${i + 1}. ${a}\n`;
          });
          formattedResponse += `\n`;
        }
        
        // Risk factors
        if (riskData.factors && riskData.factors.length > 0) {
          formattedResponse += `---\n\n**📋 Factori de risc identificați:**\n`;
          riskData.factors.slice(0, 5).forEach((f, i) => {
            const severityEmoji = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : f.severity === 'medium' ? '🟡' : '🟢';
            formattedResponse += `${i + 1}. ${severityEmoji} **${f.name}** - ${f.description}\n`;
          });
          formattedResponse += `\n`;
        }
        
        // Personalized AI recommendations (priority) or fallback to original
        const recommendations = riskData.personalizedRecommendations?.length 
          ? riskData.personalizedRecommendations 
          : riskData.recommendations;
        
        if (recommendations && recommendations.length > 0) {
          formattedResponse += `---\n\n**✅ Recomandări personalizate:**\n`;
          recommendations.forEach((r, i) => {
            formattedResponse += `${i + 1}. ${r}\n`;
          });
        }
        
        result.response = formattedResponse;
        result.route = 'calculate-anaf-risk';
      } else {
        result.response = result.error || 'Nu am putut calcula riscul ANAF. Asigură-te că ai încărcat o balanță.';
      }
    } else if (contentType.includes('text/event-stream') || routeDecision.route === 'chat-ai') {
      const text = await response.text();
      const lines = text.split('\n');
      let accumulatedContent = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content' && data.content) {
              accumulatedContent += data.content;
            } else if (data.response) {
              accumulatedContent += data.response;
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
      
      // 🆕 Parse artifacts from response (format: ```artifact ... ```)
      const parsedArtifacts: Array<{type: string; title?: string; data: unknown; downloadUrl?: string; fileName?: string}> = [];
      const artifactRegex = /```artifact\s*\n?([\s\S]*?)```/g;
      let match;
      let cleanedContent = accumulatedContent;
      
      while ((match = artifactRegex.exec(accumulatedContent)) !== null) {
        try {
          const artifactJson = match[1].trim();
          const artifact = JSON.parse(artifactJson);
          if (artifact.type && artifact.data) {
            parsedArtifacts.push(artifact);
            console.log(`[AI-Router] Parsed artifact: ${artifact.type} - ${artifact.title || 'no title'}`);
          }
        } catch (parseErr) {
          console.warn('[AI-Router] Failed to parse artifact JSON:', parseErr);
        }
      }
      
      // Remove artifact blocks from visible content (they will be rendered as charts)
      if (parsedArtifacts.length > 0) {
        cleanedContent = accumulatedContent.replace(artifactRegex, '').trim();
        console.log(`[AI-Router] Extracted ${parsedArtifacts.length} artifacts from response`);
      }
      
      result = { 
        response: cleanedContent || text,
        artifacts: parsedArtifacts.length > 0 ? parsedArtifacts : undefined
      };
      console.log('AI Router: Parsed SSE stream, content length:', cleanedContent.length, 'artifacts:', parsedArtifacts.length);
    } else {
      result = await response.json();
    }

    // =============================================================================
    // 🆕 FIX: SALVARE AUTOMATĂ ÎN ANALYSES TABLE + CONFIRMARE CLARĂ
    // =============================================================================
    if (
      (routeDecision.route === 'analyze-balance' || routeDecision.route === 'analyze-balance-saga') &&
      result.analysis
    ) {
      const analysisText = result.analysis as string;
      const structuredData = result.structuredData as {
        company?: string;
        period?: string;
        accounts?: Array<unknown>;
        extractedValues?: Record<string, unknown>;
      } | null;
      const metadata = result.metadata as Record<string, unknown> | null;
      const councilValidation = result.councilValidation as Record<string, unknown> | null;

      const companyFromAnalysis = structuredData?.company || detectedCompanyName || 'Firmă neidentificată';
      const periodFromAnalysis = structuredData?.period || '';
      const accountsCount = structuredData?.accounts?.length || 0;

      // Sfat SAGA pentru redenumire fișier
      const sagaTip = routeDecision.route === 'analyze-balance-saga'
        ? `\n\n💡 **Sfat pentru data viitoare:** Salvează balanța din SAGA cu numele:\n\`Balanta_DenumireFirma_Luna_An.xlsx\`\n(exemplu: \`Balanta_DEMO_SRL_Ianuarie_2026.xlsx\`)\nAstfel pot extrage automat firma și perioada.\n\n`
        : '';

      // Build confirmation prefix
      const confirmationPrefix = `✅ **Am primit și analizat balanța${companyFromAnalysis !== 'Firmă neidentificată' ? ` pentru ${companyFromAnalysis}` : ''}**${periodFromAnalysis ? ` (${periodFromAnalysis})` : ''}${accountsCount > 0 ? ` — ${accountsCount} conturi detectate` : ''}.${sagaTip}\n\n---\n\n`;

      // Prepend confirmation to the analysis
      result.analysis = confirmationPrefix + analysisText;
      result.response = confirmationPrefix + analysisText;

      // Save to analyses table
      try {
        const { data: savedAnalysis, error: saveAnalysisError } = await supabase
          .from('analyses')
          .insert({
            user_id: user.id,
            company_id: detectedCompanyId,
            company_name: companyFromAnalysis,
            file_name: fileData?.fileName || 'balanta.xlsx',
            analysis_text: analysisText.substring(0, 50000),
            metadata: {
              ...metadata,
              period: periodFromAnalysis,
              accountsCount,
              route: routeDecision.route,
              conversationId,
              extractedValues: structuredData?.extractedValues || null,
              analyzedAt: new Date().toISOString(),
            },
            council_validation: councilValidation || null,
          })
          .select('id')
          .single();

        if (saveAnalysisError) {
          console.error('[AI-Router] ❌ Failed to save analysis:', saveAnalysisError);
        } else {
          console.log(`[AI-Router] ✅ Analysis saved to analyses table (id: ${savedAnalysis?.id}) for company: ${companyFromAnalysis}`);
          result.analysisId = savedAnalysis?.id;
        }
      } catch (err) {
        console.error('[AI-Router] ❌ Exception saving analysis:', err);
      }
    }

    // Save routing decision to yana_messages with ends_with_question tracking
    const assistantContent = (result.response as string) || (result.analysis as string) || (result.message as string) || 'Răspuns primit.';
    const endsWithQuestion = assistantContent.trim().endsWith('?');
    
    await supabase.from('yana_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantContent,
      artifacts: result.artifacts || [],
      ends_with_question: endsWithQuestion,
      question_responded: null,
    });
    
    if (endsWithQuestion) {
      console.log(`[AI-Router] Response ends with question - engagement tracking enabled`);
    }

    // =============================================================================
    // 🆕 FAZA 2 + 4: CONSECVENȚĂ CONVERSAȚII - Salvare context + Update titlu
    // =============================================================================
    if (conversationId && message) {
      try {
        // Preluăm metadata existentă
        const { data: existingConv } = await supabase
          .from('yana_conversations')
          .select('metadata, title')
          .eq('id', conversationId)
          .single();
        
        const existingMetadata = (existingConv?.metadata || {}) as {
          lastTopic?: string;
          messageCount?: number;
          lastInteraction?: string;
        };
        
        // FAZA 2: Extragere topic din mesajul utilizatorului
        const extractTopicFromMessage = (msg: string): string | null => {
          const topicPatterns = [
            /(?:despre|legat de|referitor la|întreb despre|vreau să știu despre)\s+([^,.!?]+)/i,
            /(?:ce|cât|care|cum)\s+(?:este|sunt|e)\s+([^,.!?]+)/i,
            /(?:analizează|verifică|arată-mi|spune-mi despre)\s+([^,.!?]+)/i,
          ];
          
          for (const pattern of topicPatterns) {
            const match = msg.match(pattern);
            if (match && match[1]) {
              return match[1].trim().substring(0, 100); // Max 100 chars
            }
          }
          
          // Fallback: primele 50 caractere din mesaj ca topic generic
          if (msg.length > 10) {
            return msg.substring(0, 50).replace(/[?!.]+$/, '').trim();
          }
          
          return null;
        };
        
        const detectedTopic = extractTopicFromMessage(message);
        
        // Construim metadata actualizată
        const updatedMetadata = {
          ...existingMetadata,
          lastTopic: detectedTopic || existingMetadata.lastTopic || 'conversație generală',
          lastInteraction: new Date().toISOString(),
          messageCount: (existingMetadata.messageCount || 0) + 2, // +2 pentru user + assistant
        };
        
        // FAZA 4: Update titlu dacă e generic și avem topic
        let newTitle = existingConv?.title;
        if (existingConv?.title === 'Conversație nouă' && detectedTopic) {
          // Creăm un titlu mai descriptiv
          const truncatedTopic = detectedTopic.length > 40 
            ? detectedTopic.substring(0, 40) + '...' 
            : detectedTopic;
          newTitle = `Discuție: ${truncatedTopic}`;
        }
        
        // Salvăm în baza de date
        const updatePayload: Record<string, unknown> = {
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        };
        
        if (newTitle && newTitle !== existingConv?.title) {
          updatePayload.title = newTitle;
          console.log(`[AI-Router] Faza 4: Updated conversation title to "${newTitle}"`);
        }
        
        await supabase
          .from('yana_conversations')
          .update(updatePayload)
          .eq('id', conversationId);
        
        console.log(`[AI-Router] Faza 2: Saved conversation context - topic: "${updatedMetadata.lastTopic}", messageCount: ${updatedMetadata.messageCount}`);
        
      } catch (err) {
        console.warn('[AI-Router] Failed to update conversation context (non-blocking):', err);
        // Nu blocăm - contextul e opțional
      }
    }
    // =============================================================================
    // END CONSECVENȚĂ CONVERSAȚII
    // =============================================================================

    // =============================================================================
    // MEMORIE: Salvez conversația în ai_conversations pentru memorie viitoare
    // =============================================================================
    const assistantMessage = (result.response as string) || (result.analysis as string) || '';
    let savedAiConversationId: string | null = null;
    
    if (message && assistantMessage && assistantMessage.length > 20) {
      try {
        const { data: savedConv, error: saveError } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            company_id: detectedCompanyId, // Poate fi NULL - safeguard #1
            question: message.substring(0, 2000),
            answer: assistantMessage.substring(0, 5000),
            context: {
              route: routeDecision.route,
              companyName: detectedCompanyName, // Backup în metadata - safeguard #8
              conversationId: conversationId
            },
            was_helpful: null // Va fi setat de feedback utilizator
          })
          .select('id')
          .single();
        
        if (saveError) {
          console.error('[AI-Router] Failed to save conversation for memory:', saveError);
        } else {
          savedAiConversationId = savedConv?.id || null;
          console.log(`[AI-Router] Saved conversation to ai_conversations (id: ${savedAiConversationId})${detectedCompanyId ? ` for company: ${detectedCompanyId}` : ''}`);
        }
      } catch (saveError) {
        console.error('[AI-Router] Failed to save conversation for memory:', saveError);
        // Nu aruncăm eroare - memoria e opțională
      }
    }

    // =============================================================================
    // SELF-REFLECTION + CONSCIOUSNESS ASYNC TASKS
    // =============================================================================
    if (message && assistantMessage && assistantMessage.length > 50) {
      // Folosim EdgeRuntime.waitUntil pentru a garanta că reflecția se finalizează
      // chiar dacă răspunsul principal a fost deja trimis
      const selfReflectTask = async () => {
        try {
          const selfReflectUrl = `${supabaseUrl}/functions/v1/self-reflect`;
          const reflectResponse = await fetch(selfReflectUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              conversationId,
              userId: user.id,
              question: message,
              answer: assistantMessage,
              route: routeDecision.route,
            }),
          });
          
          if (!reflectResponse.ok) {
            console.error('[AI-Router] Self-reflect failed:', await reflectResponse.text());
          } else {
            const reflectResult = await reflectResponse.json();
            console.log(`[AI-Router] Self-reflection completed: score=${reflectResult.score}/10`);
          }
        } catch (err) {
          console.error('[AI-Router] Self-reflect error (non-blocking):', err);
        }
      };
      
      // Task pentru surprise-detector (detectează contradicții)
      const surpriseDetectorTask = async () => {
        try {
          const surpriseUrl = `${supabaseUrl}/functions/v1/surprise-detector`;
          await fetch(surpriseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              conversationId,
              userMessage: message,
              assistantResponse: assistantMessage,
            }),
          });
          console.log('[AI-Router] Surprise detector completed');
        } catch (err) {
          console.error('[AI-Router] Surprise detector error (non-blocking):', err);
        }
      };
      
      // Task pentru experiment-tracker (evaluează experimente YANA)
      const experimentTrackerTask = async () => {
        try {
          const experimentUrl = `${supabaseUrl}/functions/v1/experiment-tracker`;
          await fetch(experimentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              conversationId,
              userMessage: message,
              assistantResponse: assistantMessage,
              emotionalMode: consciousnessContext?.emotionalMode || null,
            }),
          });
          console.log('[AI-Router] Experiment tracker completed');
        } catch (err) {
          console.error('[AI-Router] Experiment tracker error (non-blocking):', err);
        }
      };
      
      // Task pentru actualizare user_journey - FOLOSIM RPC pentru increment atomic
      const journeyUpdaterTask = async () => {
        console.log(`[AI-Router] 🎯 CALLING increment_user_interactions for user: ${user.id}`);
        try {
          // 🆕 FIX: Apelăm funcția PostgreSQL pentru increment atomic
          const { error, data } = await supabase.rpc('increment_user_interactions', {
            p_user_id: user.id
          });
          
          if (error) {
            console.error(`[AI-Router] ❌ increment_user_interactions RPC error for ${user.id}:`, error);
          } else {
            console.log(`[AI-Router] ✅ User journey interaction incremented for ${user.id}. Result:`, data);
          }
        } catch (err) {
          console.error(`[AI-Router] ❌ Journey updater exception for ${user.id}:`, err);
        }
      };
      
      // 🆕 Task pentru capture-soul-state - salvează last_topic în yana_relationships
      const captureSoulStateTask = async () => {
        try {
          const captureSoulUrl = `${supabaseUrl}/functions/v1/capture-soul-state`;
          const response = await fetch(captureSoulUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              userId: user.id,
              conversationId,
              lastMessage: message.substring(0, 200),
              lastResponse: assistantMessage.substring(0, 200),
              emotionalTone: consciousnessContext?.emotionalMode || null,
            }),
          });
          
          if (!response.ok) {
            console.error('[AI-Router] capture-soul-state failed:', await response.text());
          } else {
            console.log('[AI-Router] ✅ Soul state captured - last_topic saved to yana_relationships');
          }
        } catch (err) {
          console.error('[AI-Router] capture-soul-state error (non-blocking):', err);
        }
      };
      
      // 🆕 Task pentru extract-learnings - sistem de auto-învățare YANA
      const extractLearningsTask = async () => {
        try {
          const learningsUrl = `${supabaseUrl}/functions/v1/extract-learnings`;
          const response = await fetch(learningsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              conversationId,
              userId: user.id,
              userMessage: message,
              aiResponse: assistantMessage,
              emotionalState: consciousnessContext?.emotionalMode || null,
              balanceContext: balanceContext || null,
            }),
          });
          
          if (!response.ok) {
            console.error('[AI-Router] extract-learnings failed:', await response.text());
          } else {
            const result = await response.json();
            console.log('[AI-Router] ✅ Learning extraction completed:', result.extracted);
          }
        } catch (err) {
          console.error('[AI-Router] extract-learnings error (non-blocking):', err);
        }
      };
      
      // 🆕 Task pentru update-client-profile (o dată la 5 conversații)
      const updateClientProfileTask = async () => {
        try {
          // Check if we should run (every 5th conversation)
          const { count } = await supabase
            .from('yana_learning_log')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          const totalConvs = count || 0;
          if (totalConvs % 5 !== 0 && totalConvs > 0) {
            console.log(`[AI-Router] Skipping profile update (conv #${totalConvs}, runs every 5th)`);
            return;
          }
          
          const profileUrl = `${supabaseUrl}/functions/v1/update-client-profile`;
          const response = await fetch(profileUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              userId: user.id,
              conversationId,
            }),
          });
          
          if (!response.ok) {
            console.error('[AI-Router] update-client-profile failed:', await response.text());
          } else {
            const result = await response.json();
            console.log('[AI-Router] ✅ Client profile updated:', result.profile);
          }
        } catch (err) {
          console.error('[AI-Router] update-client-profile error (non-blocking):', err);
        }
      };
      
      // 🧠 OBSERVER TASK — Sistem 1 al Creierului Autonom
      const observerTask = async () => {
        try {
          const observerResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/yana-observer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              userId,
              conversationId,
              question: message,
              answer: result.response || result.answer || "",
              selfScore: undefined, // will be filled by self-reflect
              wasCorrected: false,
              processingTimeMs: 0, // approximate, real timing in self-reflect
              modelUsed: result.modelUsed || "unknown",
              route: routeDecision.route,
            }),
          });
          if (observerResp.ok) {
            const obsResult = await observerResp.json();
            console.log(`[AI-Router] 🧠 Observer: ${obsResult.observations_count} observations logged`);
          }
        } catch (err) {
          console.error('[AI-Router] Observer error (non-blocking):', err);
        }
      };

      // 🎯 Action Engine — extrage acțiuni din conversație
      const extractActionsTask = async () => {
        try {
          const extractResp = await fetch(`${supabaseUrl}/functions/v1/extract-actions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              userId: userId,
              conversationId: body.conversationId,
              userMessage: body.message,
              assistantResponse: result.response || result.answer || "",
            }),
          });
          if (extractResp.ok) {
            const extractResult = await extractResp.json();
            console.log(`[AI-Router] 🎯 Action Engine: ${extractResult.actions_saved} actions extracted`);
          }
        } catch (err) {
          console.error('[AI-Router] Action Engine error (non-blocking):', err);
        }
      };

      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(Promise.all([
          selfReflectTask(),
          surpriseDetectorTask(),
          experimentTrackerTask(),
          journeyUpdaterTask(),
          captureSoulStateTask(),
          extractLearningsTask(),
          updateClientProfileTask(),
          observerTask(), // 🧠 Creier Autonom — Sistem 1
          extractActionsTask(), // 🎯 Action Engine
        ]));
        console.log('[AI-Router] All async tasks queued with EdgeRuntime.waitUntil() (incl. Brain Observer + Action Engine)');
      } else {
        // Fallback pentru medii unde EdgeRuntime nu e disponibil
        Promise.all([
          selfReflectTask(),
          surpriseDetectorTask(),
          experimentTrackerTask(),
          journeyUpdaterTask(),
          captureSoulStateTask(),
          extractLearningsTask(),
          updateClientProfileTask(),
          observerTask(), // 🧠 Creier Autonom — Sistem 1
          extractActionsTask(), // 🎯 Action Engine
        ]).catch(console.error);
        console.log('[AI-Router] All async tasks triggered (fallback mode, incl. Brain Observer + Action Engine)');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        route: routeDecision.route,
        reason: routeDecision.reason,
        structuredData: result.structuredData || null,
        grokValidation: result.grokValidation || null,
        companyName: (result.structuredData as Record<string, unknown>)?.company || result.companyName || detectedCompanyName || null,
        hasMemoryContext: !!memoryContext,
        aiConversationId: savedAiConversationId, // NOU: pentru feedback din UI
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Router error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});