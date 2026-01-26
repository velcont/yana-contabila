import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Account {
  code: string;
  name: string;
  initialDebit?: number;
  initialCredit?: number;
  debit?: number;
  credit?: number;
  finalDebit?: number;
  finalCredit?: number;
}

interface BalanceContext {
  company?: string;
  cui?: string;
  period?: string;
  accounts?: Account[];
}

interface RiskFactor {
  id: string;
  name: string;
  category: 'fiscal' | 'financial' | 'operational' | 'administrative';
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  recommendation: string;
  accounts?: string[];
  value?: number;
  threshold?: number;
}

interface ANAFRiskResult {
  overallScore: number;
  riskLevel: 'scăzut' | 'moderat' | 'ridicat' | 'critic';
  factors: RiskFactor[];
  summary: string;
  recommendations: string[];
}

// Helper functions (same as calculate-anaf-risk)
function getAccountValue(account: Account): number {
  const code = account.code?.replace(/\D/g, '') || '';
  const classNum = parseInt(code[0]);
  if (classNum >= 6) {
    return (account.debit || 0) - (account.credit || 0);
  }
  return (account.finalDebit || 0) - (account.finalCredit || 0);
}

function findAccount(accounts: Account[], pattern: string): Account | undefined {
  return accounts.find(acc => {
    const code = acc.code?.replace(/\D/g, '') || '';
    return code === pattern || code.startsWith(pattern);
  });
}

function sumAccounts(accounts: Account[], patterns: string[], useDebit: boolean = true): number {
  let sum = 0;
  for (const acc of accounts) {
    const code = acc.code?.replace(/\D/g, '') || '';
    if (patterns.some(p => code === p || code.startsWith(p))) {
      if (useDebit) {
        sum += (acc.finalDebit || acc.debit || 0);
      } else {
        sum += (acc.finalCredit || acc.credit || 0);
      }
    }
  }
  return sum;
}

function calculateANAFRisk(balanceContext: BalanceContext): ANAFRiskResult {
  const factors: RiskFactor[] = [];
  const accounts = balanceContext.accounts || [];
  
  if (accounts.length === 0) {
    return {
      overallScore: 0,
      riskLevel: 'scăzut',
      factors: [],
      summary: 'Nu există date suficiente pentru analiza riscului ANAF.',
      recommendations: ['Încarcă o balanță de verificare pentru a calcula scorul de risc.']
    };
  }

  // TVA Analysis
  const tvaColectat = findAccount(accounts, '4427');
  const tvaDeductibil = findAccount(accounts, '4426');
  const tvaDeDecont = findAccount(accounts, '4423');
  const tvaDeRecuperat = findAccount(accounts, '4424');
  
  const tvaColectatVal = tvaColectat ? Math.abs(getAccountValue(tvaColectat)) : 0;
  const tvaDeductibilVal = tvaDeductibil ? Math.abs(getAccountValue(tvaDeductibil)) : 0;
  const tvaPlata = tvaDeDecont ? (tvaDeDecont.finalCredit || 0) : 0;
  const tvaRecuperat = tvaDeRecuperat ? (tvaDeRecuperat.finalDebit || 0) : 0;

  if (tvaRecuperat > 50000) {
    const severity = tvaRecuperat > 200000 ? 'critical' : tvaRecuperat > 100000 ? 'high' : 'medium';
    factors.push({
      id: 'tva_recuperare_mare',
      name: 'TVA de Recuperat Semnificativ',
      category: 'fiscal',
      severity,
      score: severity === 'critical' ? 30 : severity === 'high' ? 20 : 10,
      description: `Sold TVA de recuperat de ${tvaRecuperat.toLocaleString('ro-RO')} RON.`,
      recommendation: 'Pregătește documente justificative complete pentru achiziții.',
      accounts: ['4424'],
      value: tvaRecuperat,
      threshold: 50000
    });
  }

  if (tvaColectatVal > 0 && tvaDeductibilVal > 0) {
    const ratio = tvaDeductibilVal / tvaColectatVal;
    if (ratio > 0.95) {
      factors.push({
        id: 'tva_ratio_anormal',
        name: 'Raport TVA Deductibil/Colectat Neobișnuit',
        category: 'fiscal',
        severity: ratio > 1 ? 'high' : 'medium',
        score: ratio > 1 ? 20 : 10,
        description: `TVA deductibil reprezintă ${(ratio * 100).toFixed(0)}% din TVA colectat.`,
        recommendation: 'Verifică dacă toate deducerile TVA au documente justificative valide.',
        accounts: ['4426', '4427'],
        value: ratio * 100,
        threshold: 95
      });
    }
  }

  // Profitability Analysis
  const venituri = sumAccounts(accounts, ['70', '71', '72', '74', '75', '76', '78'], false);
  const cheltuieli = sumAccounts(accounts, ['60', '61', '62', '63', '64', '65', '66', '68'], true);
  
  if (venituri > 0) {
    const marjaBruta = ((venituri - cheltuieli) / venituri) * 100;
    
    if (marjaBruta < 2 && venituri > 100000) {
      factors.push({
        id: 'marja_mica',
        name: 'Marjă de Profit Foarte Mică',
        category: 'financial',
        severity: marjaBruta < 0 ? 'high' : 'medium',
        score: marjaBruta < 0 ? 15 : 10,
        description: `Marja de profit este ${marjaBruta.toFixed(1)}%.`,
        recommendation: 'Documentează justificarea economică pentru marjele mici.',
        value: marjaBruta,
        threshold: 2
      });
    }

    const cheltuieliAdmin = sumAccounts(accounts, ['62'], true);
    const ratioAdmin = (cheltuieliAdmin / venituri) * 100;
    
    if (ratioAdmin > 40) {
      factors.push({
        id: 'cheltuieli_admin_mari',
        name: 'Cheltuieli Administrative Disproporționate',
        category: 'operational',
        severity: ratioAdmin > 60 ? 'high' : 'medium',
        score: ratioAdmin > 60 ? 15 : 8,
        description: `Cheltuielile administrative reprezintă ${ratioAdmin.toFixed(0)}% din venituri.`,
        recommendation: 'Asigură documente justificative pentru toate cheltuielile administrative.',
        accounts: ['62'],
        value: ratioAdmin,
        threshold: 40
      });
    }
  }

  // Regularization accounts
  const cont471 = findAccount(accounts, '471');
  const cont473 = findAccount(accounts, '473');

  const val471 = cont471 ? (cont471.finalDebit || 0) : 0;
  const val473 = cont473 ? (cont473.finalDebit || cont473.finalCredit || 0) : 0;

  if (val471 > 50000) {
    factors.push({
      id: 'cheltuieli_avans_mari',
      name: 'Cheltuieli în Avans Semnificative',
      category: 'administrative',
      severity: val471 > 100000 ? 'medium' : 'low',
      score: val471 > 100000 ? 8 : 5,
      description: `Cont 471 cu sold ${val471.toLocaleString('ro-RO')} RON.`,
      recommendation: 'Verifică natura și documentația cheltuielilor înregistrate în avans.',
      accounts: ['471'],
      value: val471,
      threshold: 50000
    });
  }

  if (val473 > 20000) {
    factors.push({
      id: 'cont_473_sold',
      name: 'Decontări Operațiuni în Curs',
      category: 'administrative',
      severity: val473 > 50000 ? 'high' : 'medium',
      score: val473 > 50000 ? 15 : 8,
      description: `Cont 473 cu sold ${val473.toLocaleString('ro-RO')} RON.`,
      recommendation: 'Regularizează operațiunile în curs.',
      accounts: ['473'],
      value: val473,
      threshold: 20000
    });
  }

  // Tax debts
  const impozitProfit = findAccount(accounts, '441');
  const impozitSalarii = findAccount(accounts, '444');
  const contributii = findAccount(accounts, '436');

  const datoriiImpozitProfit = impozitProfit ? (impozitProfit.finalCredit || 0) : 0;
  const datoriiSalarii = impozitSalarii ? (impozitSalarii.finalCredit || 0) : 0;
  const datoriiContributii = contributii ? (contributii.finalCredit || 0) : 0;

  const totalDatoriiFiscale = datoriiImpozitProfit + datoriiSalarii + datoriiContributii;
  
  if (totalDatoriiFiscale > 100000) {
    factors.push({
      id: 'datorii_fiscale_mari',
      name: 'Datorii Fiscale Semnificative',
      category: 'fiscal',
      severity: totalDatoriiFiscale > 500000 ? 'critical' : totalDatoriiFiscale > 200000 ? 'high' : 'medium',
      score: totalDatoriiFiscale > 500000 ? 25 : totalDatoriiFiscale > 200000 ? 15 : 8,
      description: `Total datorii fiscale: ${totalDatoriiFiscale.toLocaleString('ro-RO')} RON.`,
      recommendation: 'Verifică termenele de plată. Solicită eșalonare dacă e cazul.',
      accounts: ['441', '444', '436'],
      value: totalDatoriiFiscale,
      threshold: 100000
    });
  }

  // Inventory
  const stocuri = sumAccounts(accounts, ['30', '33', '34', '35', '36', '37', '38'], true);
  
  if (stocuri > 500000 && venituri > 0) {
    const ratioStocuri = (stocuri / venituri) * 100;
    if (ratioStocuri > 50) {
      factors.push({
        id: 'stocuri_mari',
        name: 'Stocuri Disproporționate față de Venituri',
        category: 'operational',
        severity: ratioStocuri > 100 ? 'high' : 'medium',
        score: ratioStocuri > 100 ? 12 : 6,
        description: `Stocurile reprezintă ${ratioStocuri.toFixed(0)}% din venituri.`,
        recommendation: 'Realizează inventar fizic. Pregătește analiză de vechime stocuri.',
        accounts: ['37', '35', '30'],
        value: ratioStocuri,
        threshold: 50
      });
    }
  }

  // Receivables
  const clienti = sumAccounts(accounts, ['411', '4111'], true);
  const clientiIncerti = sumAccounts(accounts, ['4118'], true);
  
  if (clienti > 0 && venituri > 0) {
    const dso = (clienti / venituri) * 365;
    if (dso > 90) {
      factors.push({
        id: 'dso_mare',
        name: 'Termen Încasare Creanțe Lung',
        category: 'financial',
        severity: dso > 180 ? 'high' : 'medium',
        score: dso > 180 ? 10 : 5,
        description: `DSO de ${dso.toFixed(0)} zile.`,
        recommendation: 'Analizează vechimea creanțelor. Constituie provizioane conform regulilor fiscale.',
        accounts: ['4111'],
        value: dso,
        threshold: 90
      });
    }
  }

  if (clientiIncerti > 50000) {
    factors.push({
      id: 'clienti_incerti',
      name: 'Clienți Incerți Semnificativi',
      category: 'financial',
      severity: 'medium',
      score: 8,
      description: `Clienți incerți de ${clientiIncerti.toLocaleString('ro-RO')} RON.`,
      recommendation: 'Pregătește documente pentru fiecare client incert.',
      accounts: ['4118'],
      value: clientiIncerti,
      threshold: 50000
    });
  }

  // Related party transactions
  const conturiGrup = sumAccounts(accounts, ['451', '452', '453', '455'], true);
  
  if (conturiGrup > 100000) {
    factors.push({
      id: 'tranzactii_afiliate',
      name: 'Tranzacții Semnificative cu Părți Afiliate',
      category: 'fiscal',
      severity: conturiGrup > 500000 ? 'high' : 'medium',
      score: conturiGrup > 500000 ? 15 : 8,
      description: `Solduri cu entități din grup: ${conturiGrup.toLocaleString('ro-RO')} RON.`,
      recommendation: 'Pregătește documentație prețuri de transfer.',
      accounts: ['451', '452', '453', '455'],
      value: conturiGrup,
      threshold: 100000
    });
  }

  // Calculate final score
  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const overallScore = Math.min(100, totalScore);
  
  let riskLevel: ANAFRiskResult['riskLevel'];
  if (overallScore >= 70) {
    riskLevel = 'critic';
  } else if (overallScore >= 45) {
    riskLevel = 'ridicat';
  } else if (overallScore >= 20) {
    riskLevel = 'moderat';
  } else {
    riskLevel = 'scăzut';
  }

  factors.sort((a, b) => b.score - a.score);

  const criticalFactors = factors.filter(f => f.severity === 'critical' || f.severity === 'high');
  const summary = criticalFactors.length > 0
    ? `${criticalFactors.length} factori de risc major identificați: ${criticalFactors.slice(0, 3).map(f => f.name).join(', ')}.`
    : overallScore < 20
    ? 'Risc scăzut de control ANAF.'
    : `Risc moderat. Verifică: ${factors.slice(0, 2).map(f => f.name.toLowerCase()).join(' și ')}.`;

  const recommendations = factors
    .filter(f => f.severity !== 'low')
    .slice(0, 5)
    .map(f => f.recommendation);

  if (recommendations.length === 0) {
    recommendations.push('Menține documentația contabilă organizată și la zi.');
  }

  return {
    overallScore,
    riskLevel,
    factors,
    summary,
    recommendations
  };
}

// Claude AI Enhancement
async function enhanceWithClaude(
  balanceContext: BalanceContext,
  riskResult: ANAFRiskResult,
  anthropicKey: string
): Promise<{
  contextualInterpretation: string;
  personalizedRecommendations: string[];
  anomaliesDetected: string[];
  aiInsights: string;
}> {
  
  // Prepare key financial data for Claude
  const accounts = balanceContext.accounts || [];
  const venituri = sumAccounts(accounts, ['70', '71', '72', '74', '75', '76', '78'], false);
  const cheltuieli = sumAccounts(accounts, ['60', '61', '62', '63', '64', '65', '66', '68'], true);
  const clienti = sumAccounts(accounts, ['411', '4111'], true);
  const furnizori = sumAccounts(accounts, ['401'], false);
  const stocuri = sumAccounts(accounts, ['30', '33', '34', '35', '36', '37', '38'], true);
  const disponibilitati = sumAccounts(accounts, ['512', '5121', '5124', '531', '5311'], true);

  const prompt = `Ești un expert fiscal și auditor ANAF cu 20+ ani experiență în controale fiscale la firme românești.

CONTEXT COMPANIE:
- Nume: ${balanceContext.company || 'Companie nedefinită'}
- CUI: ${balanceContext.cui || 'N/A'}
- Perioadă: ${balanceContext.period || 'N/A'}

DATE FINANCIARE CHEIE:
- Venituri totale: ${venituri.toLocaleString('ro-RO')} RON
- Cheltuieli totale: ${cheltuieli.toLocaleString('ro-RO')} RON
- Rezultat brut: ${(venituri - cheltuieli).toLocaleString('ro-RO')} RON
- Creanțe clienți (411): ${clienti.toLocaleString('ro-RO')} RON
- Datorii furnizori (401): ${furnizori.toLocaleString('ro-RO')} RON
- Stocuri: ${stocuri.toLocaleString('ro-RO')} RON
- Disponibilități: ${disponibilitati.toLocaleString('ro-RO')} RON

SCOR RISC CALCULAT: ${riskResult.overallScore}/100 (${riskResult.riskLevel})

FACTORI DE RISC IDENTIFICAȚI:
${riskResult.factors.map(f => `• ${f.name} [${f.severity.toUpperCase()}] - ${f.description}`).join('\n')}

CONTURI SEMNIFICATIVE (top 15 după valoare):
${accounts
  .map(acc => ({
    code: acc.code,
    name: acc.name,
    value: Math.abs((acc.finalDebit || 0) - (acc.finalCredit || 0))
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 15)
  .map(acc => `• ${acc.code} ${acc.name}: ${acc.value.toLocaleString('ro-RO')} RON`)
  .join('\n')}

ANALIZEAZĂ ȘI RĂSPUNDE ÎN URMĂTORUL FORMAT JSON:

{
  "contextualInterpretation": "Explicație de 3-4 paragrafe despre CE înseamnă aceste riscuri pentru firma specifică. De ce sunt periculoase în contextul lor? Ce ar căuta inspectorii ANAF?",
  
  "personalizedRecommendations": [
    "Recomandare 1: specifică, acționabilă, cu deadline sugerat",
    "Recomandare 2: specifică, acționabilă, cu deadline sugerat",
    "Recomandare 3: specifică, acționabilă, cu deadline sugerat",
    "Recomandare 4: specifică, acționabilă, cu deadline sugerat",
    "Recomandare 5: specifică, acționabilă, cu deadline sugerat"
  ],
  
  "anomaliesDetected": [
    "Anomalie 1: pattern neobișnuit detectat (ex: combinații de conturi suspecte)",
    "Anomalie 2: alt pattern care nu poate fi detectat doar prin formule"
  ],
  
  "aiInsights": "Gând final: cel mai important lucru pe care firma trebuie să-l știe ACUM despre riscul de control ANAF. Maxim 2 propoziții, direct și clar."
}

IMPORTANT:
- Răspunde DOAR cu JSON valid, fără text înainte sau după
- Fii specific pentru această firmă, nu generic
- Folosește limba română
- Menționează conturi specifice din balanță când faci recomandări
- Detectează anomalii care NU sunt în lista de factori (ex: combinații neobișnuite)`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ANAF-RISK-ENHANCED] Claude API error:', response.status, errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const claudeResult = await response.json();
  const content = claudeResult.content?.[0]?.text || '';
  
  // Parse JSON from response
  try {
    // Clean potential markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      contextualInterpretation: parsed.contextualInterpretation || '',
      personalizedRecommendations: parsed.personalizedRecommendations || [],
      anomaliesDetected: parsed.anomaliesDetected || [],
      aiInsights: parsed.aiInsights || ''
    };
  } catch (parseError) {
    console.error('[ANAF-RISK-ENHANCED] Failed to parse Claude response:', parseError);
    // Return fallback
    return {
      contextualInterpretation: content,
      personalizedRecommendations: riskResult.recommendations,
      anomaliesDetected: [],
      aiInsights: riskResult.summary
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[ANAF-RISK-ENHANCED][${requestId}] Request received`);

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error(`[ANAF-RISK-ENHANCED][${requestId}] ANTHROPIC_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY nu este configurat" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { balanceContext, generateReport } = await req.json();

    if (!balanceContext || !balanceContext.accounts || balanceContext.accounts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Lipsesc datele balanței. Încarcă o balanță pentru a calcula riscul ANAF." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ANAF-RISK-ENHANCED][${requestId}] Analyzing ${balanceContext.accounts.length} accounts for ${balanceContext.company || 'unknown company'}`);

    // Step 1: Calculate base risk
    const baseResult = calculateANAFRisk(balanceContext);
    console.log(`[ANAF-RISK-ENHANCED][${requestId}] Base risk: ${baseResult.overallScore}/100`);

    // Step 2: Enhance with Claude AI
    console.log(`[ANAF-RISK-ENHANCED][${requestId}] Calling Claude for AI enhancement...`);
    const aiEnhancement = await enhanceWithClaude(balanceContext, baseResult, anthropicKey);
    console.log(`[ANAF-RISK-ENHANCED][${requestId}] Claude enhancement complete`);

    // Combine results
    const enhancedResult = {
      ...baseResult,
      aiEnhanced: true,
      contextualInterpretation: aiEnhancement.contextualInterpretation,
      personalizedRecommendations: aiEnhancement.personalizedRecommendations,
      anomaliesDetected: aiEnhancement.anomaliesDetected,
      aiInsights: aiEnhancement.aiInsights,
      // Keep original recommendations as fallback
      originalRecommendations: baseResult.recommendations
    };

    console.log(`[ANAF-RISK-ENHANCED][${requestId}] ✅ Analysis complete with AI enhancement`);

    // Generate enhanced report if requested
    let reportText = '';
    if (generateReport) {
      reportText = `
═══════════════════════════════════════════════════════════════
       RAPORT AVANSAT ANALIZĂ RISC CONTROL ANAF
           (Îmbunătățit cu Inteligență Artificială)
═══════════════════════════════════════════════════════════════

COMPANIE: ${balanceContext.company || 'N/A'}
CUI: ${balanceContext.cui || 'N/A'}
PERIOADĂ: ${balanceContext.period || 'N/A'}
DATA ANALIZĂ: ${new Date().toLocaleDateString('ro-RO')}

───────────────────────────────────────────────────────────────
                    SCOR RISC GENERAL
───────────────────────────────────────────────────────────────

   ████████████████████████████████████████  ${enhancedResult.overallScore}/100
   
   NIVEL RISC: ${enhancedResult.riskLevel.toUpperCase()}

───────────────────────────────────────────────────────────────
                 🧠 INTERPRETARE AI CONTEXTUALĂ
───────────────────────────────────────────────────────────────

${enhancedResult.contextualInterpretation}

───────────────────────────────────────────────────────────────
                 ⚠️ ANOMALII DETECTATE DE AI
───────────────────────────────────────────────────────────────

${enhancedResult.anomaliesDetected.length > 0 
  ? enhancedResult.anomaliesDetected.map((a, i) => `${i + 1}. ${a}`).join('\n\n')
  : 'Nu au fost detectate anomalii suplimentare.'}

───────────────────────────────────────────────────────────────
              📋 RECOMANDĂRI PERSONALIZATE AI
───────────────────────────────────────────────────────────────

${enhancedResult.personalizedRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n\n')}

───────────────────────────────────────────────────────────────
                 FACTORI DE RISC IDENTIFICAȚI
───────────────────────────────────────────────────────────────

${enhancedResult.factors.map((f, i) => `
${i + 1}. ${f.name.toUpperCase()} [${f.severity.toUpperCase()}]
   Categorie: ${f.category}
   Puncte risc: ${f.score}
   ${f.description}
   ➤ Recomandare: ${f.recommendation}
`).join('\n')}

───────────────────────────────────────────────────────────────
                    💡 INSIGHT CHEIE
───────────────────────────────────────────────────────────────

${enhancedResult.aiInsights}

═══════════════════════════════════════════════════════════════
NOTĂ: Această analiză combină calcule algoritmice cu 
inteligență artificială pentru o evaluare comprehensivă.
Nu înlocuiește consultanța unui expert fiscal autorizat.
═══════════════════════════════════════════════════════════════
`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...enhancedResult,
        reportText: generateReport ? reportText : undefined,
        timestamp: new Date().toISOString(),
        requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[ANAF-RISK-ENHANCED][${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Eroare la calculul riscului ANAF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
