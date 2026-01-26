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
  score: number; // 0-100
  description: string;
  recommendation: string;
  accounts?: string[];
  value?: number;
  threshold?: number;
}

interface ANAFRiskResult {
  overallScore: number; // 0-100, where 100 = maximum risk
  riskLevel: 'scăzut' | 'moderat' | 'ridicat' | 'critic';
  factors: RiskFactor[];
  summary: string;
  recommendations: string[];
}

// Helper: Get account value (finalDebit - finalCredit for classes 1-5, debit for classes 6-7)
function getAccountValue(account: Account): number {
  const code = account.code?.replace(/\D/g, '') || '';
  const classNum = parseInt(code[0]);
  
  if (classNum >= 6) {
    // Classes 6-7: use debit (cheltuieli) or credit (venituri)
    return (account.debit || 0) - (account.credit || 0);
  }
  // Classes 1-5: use final balances
  return (account.finalDebit || 0) - (account.finalCredit || 0);
}

// Helper: Find account by code pattern
function findAccount(accounts: Account[], pattern: string): Account | undefined {
  return accounts.find(acc => {
    const code = acc.code?.replace(/\D/g, '') || '';
    return code === pattern || code.startsWith(pattern);
  });
}

// Helper: Sum accounts matching patterns
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

  // =============================================================================
  // 1. RISC TVA - Fluctuații și Anomalii
  // =============================================================================
  
  const tvaColectat = findAccount(accounts, '4427'); // TVA colectată
  const tvaDeductibil = findAccount(accounts, '4426'); // TVA deductibilă
  const tvaDeDecont = findAccount(accounts, '4423'); // TVA de plată
  const tvaDeRecuperat = findAccount(accounts, '4424'); // TVA de recuperat
  
  const tvaColectatVal = tvaColectat ? Math.abs(getAccountValue(tvaColectat)) : 0;
  const tvaDeductibilVal = tvaDeductibil ? Math.abs(getAccountValue(tvaDeductibil)) : 0;
  const tvaPlata = tvaDeDecont ? (tvaDeDecont.finalCredit || 0) : 0;
  const tvaRecuperat = tvaDeRecuperat ? (tvaDeRecuperat.finalDebit || 0) : 0;

  // TVA de recuperat mare = risc de control
  if (tvaRecuperat > 50000) {
    const severity = tvaRecuperat > 200000 ? 'critical' : tvaRecuperat > 100000 ? 'high' : 'medium';
    factors.push({
      id: 'tva_recuperare_mare',
      name: 'TVA de Recuperat Semnificativ',
      category: 'fiscal',
      severity,
      score: severity === 'critical' ? 30 : severity === 'high' ? 20 : 10,
      description: `Sold TVA de recuperat de ${tvaRecuperat.toLocaleString('ro-RO')} RON. ANAF verifică îndeaproape cererile mari de rambursare.`,
      recommendation: 'Pregătește documente justificative complete pentru achiziții. Asigură-te că toate facturile sunt conforme.',
      accounts: ['4424'],
      value: tvaRecuperat,
      threshold: 50000
    });
  }

  // Raport TVA deductibil/colectat neobișnuit
  if (tvaColectatVal > 0 && tvaDeductibilVal > 0) {
    const ratio = tvaDeductibilVal / tvaColectatVal;
    if (ratio > 0.95) {
      factors.push({
        id: 'tva_ratio_anormal',
        name: 'Raport TVA Deductibil/Colectat Neobișnuit',
        category: 'fiscal',
        severity: ratio > 1 ? 'high' : 'medium',
        score: ratio > 1 ? 20 : 10,
        description: `TVA deductibil reprezintă ${(ratio * 100).toFixed(0)}% din TVA colectat. Rapoarte peste 95% atrag atenția ANAF.`,
        recommendation: 'Verifică dacă toate deducerile TVA au documente justificative valide.',
        accounts: ['4426', '4427'],
        value: ratio * 100,
        threshold: 95
      });
    }
  }

  // =============================================================================
  // 2. RISC PROFITABILITATE - Marje Anormale
  // =============================================================================
  
  const venituri = sumAccounts(accounts, ['70', '71', '72', '74', '75', '76', '78'], false);
  const cheltuieli = sumAccounts(accounts, ['60', '61', '62', '63', '64', '65', '66', '68'], true);
  
  if (venituri > 0) {
    const marjaBruta = ((venituri - cheltuieli) / venituri) * 100;
    
    // Marjă negativă sau foarte mică
    if (marjaBruta < 2 && venituri > 100000) {
      factors.push({
        id: 'marja_mica',
        name: 'Marjă de Profit Foarte Mică',
        category: 'financial',
        severity: marjaBruta < 0 ? 'high' : 'medium',
        score: marjaBruta < 0 ? 15 : 10,
        description: `Marja de profit este ${marjaBruta.toFixed(1)}%. Marjele foarte mici sau negative pot indica evaziune sau transfer de profit.`,
        recommendation: 'Documentează justificarea economică pentru marjele mici. Pregătește analiza comparativă cu industria.',
        value: marjaBruta,
        threshold: 2
      });
    }

    // Cheltuieli administrative disproporționate
    const cheltuieliAdmin = sumAccounts(accounts, ['62'], true);
    const ratioAdmin = (cheltuieliAdmin / venituri) * 100;
    
    if (ratioAdmin > 40) {
      factors.push({
        id: 'cheltuieli_admin_mari',
        name: 'Cheltuieli Administrative Disproporționate',
        category: 'operational',
        severity: ratioAdmin > 60 ? 'high' : 'medium',
        score: ratioAdmin > 60 ? 15 : 8,
        description: `Cheltuielile administrative reprezintă ${ratioAdmin.toFixed(0)}% din venituri. ANAF scrutinează deductibilitatea acestora.`,
        recommendation: 'Asigură documente justificative pentru toate cheltuielile administrative. Verifică limita de deductibilitate.',
        accounts: ['62'],
        value: ratioAdmin,
        threshold: 40
      });
    }
  }

  // =============================================================================
  // 3. RISC CONTURI DE REGULARIZARE
  // =============================================================================
  
  const cont471 = findAccount(accounts, '471'); // Cheltuieli în avans
  const cont472 = findAccount(accounts, '472'); // Venituri în avans
  const cont473 = findAccount(accounts, '473'); // Decontări din operațiuni în curs

  const val471 = cont471 ? (cont471.finalDebit || 0) : 0;
  const val473 = cont473 ? (cont473.finalDebit || cont473.finalCredit || 0) : 0;

  if (val471 > 50000) {
    factors.push({
      id: 'cheltuieli_avans_mari',
      name: 'Cheltuieli în Avans Semnificative',
      category: 'administrative',
      severity: val471 > 100000 ? 'medium' : 'low',
      score: val471 > 100000 ? 8 : 5,
      description: `Cont 471 cu sold ${val471.toLocaleString('ro-RO')} RON. Solduri mari pot indica amânarea recunoașterii cheltuielilor.`,
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
      description: `Cont 473 cu sold ${val473.toLocaleString('ro-RO')} RON. ANAF verifică operațiunile nefinalizate și natura lor.`,
      recommendation: 'Regularizează operațiunile în curs. Pregătește documente pentru fiecare operațiune.',
      accounts: ['473'],
      value: val473,
      threshold: 20000
    });
  }

  // =============================================================================
  // 4. RISC DATORII FISCALE
  // =============================================================================
  
  const impozitProfit = findAccount(accounts, '441'); // Impozit pe profit
  const impozitSalarii = findAccount(accounts, '444'); // Impozit pe salarii
  const contributii = findAccount(accounts, '436'); // Contribuții sociale
  const alteDatorii = findAccount(accounts, '446'); // Alte impozite și taxe

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
      description: `Total datorii fiscale: ${totalDatoriiFiscale.toLocaleString('ro-RO')} RON. Datoriile restante atrag controale prioritare.`,
      recommendation: 'Verifică termenele de plată. Solicită eșalonare dacă e cazul. Evită penalitățile.',
      accounts: ['441', '444', '436'],
      value: totalDatoriiFiscale,
      threshold: 100000
    });
  }

  // =============================================================================
  // 5. RISC STOCURI - Valoare Mare sau Fluctuații
  // =============================================================================
  
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
        description: `Stocurile (${stocuri.toLocaleString('ro-RO')} RON) reprezintă ${ratioStocuri.toFixed(0)}% din venituri. Poate indica nevânzabile sau supraevaluare.`,
        recommendation: 'Realizează inventar fizic. Pregătește analiză de vechime stocuri.',
        accounts: ['37', '35', '30'],
        value: ratioStocuri,
        threshold: 50
      });
    }
  }

  // =============================================================================
  // 6. RISC CREANȚE NEÎNCASATE
  // =============================================================================
  
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
        description: `DSO (Days Sales Outstanding) de ${dso.toFixed(0)} zile. Creanțele vechi pot necesita ajustări fiscale.`,
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
      description: `Clienți incerți de ${clientiIncerti.toLocaleString('ro-RO')} RON. ANAF verifică justificarea provizioanelor.`,
      recommendation: 'Pregătește documente pentru fiecare client incert: somații, acțiuni în instanță.',
      accounts: ['4118'],
      value: clientiIncerti,
      threshold: 50000
    });
  }

  // =============================================================================
  // 7. RISC TRANZACȚII CU PĂRȚI AFILIATE
  // =============================================================================
  
  const conturiGrup = sumAccounts(accounts, ['451', '452', '453', '455'], true);
  
  if (conturiGrup > 100000) {
    factors.push({
      id: 'tranzactii_afiliate',
      name: 'Tranzacții Semnificative cu Părți Afiliate',
      category: 'fiscal',
      severity: conturiGrup > 500000 ? 'high' : 'medium',
      score: conturiGrup > 500000 ? 15 : 8,
      description: `Solduri cu entități din grup: ${conturiGrup.toLocaleString('ro-RO')} RON. Prețurile de transfer sunt prioritate ANAF.`,
      recommendation: 'Pregătește documentație prețuri de transfer. Asigură-te că tranzacțiile sunt la valoare de piață.',
      accounts: ['451', '452', '453', '455'],
      value: conturiGrup,
      threshold: 100000
    });
  }

  // =============================================================================
  // CALCUL SCOR FINAL
  // =============================================================================
  
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

  // Sort factors by score (highest first)
  factors.sort((a, b) => b.score - a.score);

  // Generate summary
  const criticalFactors = factors.filter(f => f.severity === 'critical' || f.severity === 'high');
  const summary = criticalFactors.length > 0
    ? `Atenție: ${criticalFactors.length} factori de risc major identificați. Principalele zone de atenție: ${criticalFactors.slice(0, 3).map(f => f.name).join(', ')}.`
    : overallScore < 20
    ? 'Risc scăzut de control ANAF. Indicatorii financiari sunt în parametri normali.'
    : `Risc moderat de control ANAF. Recomandăm verificarea documentației pentru ${factors.slice(0, 2).map(f => f.name.toLowerCase()).join(' și ')}.`;

  // Generate recommendations
  const recommendations = factors
    .filter(f => f.severity !== 'low')
    .slice(0, 5)
    .map(f => f.recommendation);

  if (recommendations.length === 0) {
    recommendations.push('Menține documentația contabilă organizată și la zi.');
    recommendations.push('Verifică periodic conformitatea cu legislația fiscală în vigoare.');
  }

  return {
    overallScore,
    riskLevel,
    factors,
    summary,
    recommendations
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[ANAF-RISK][${requestId}] Request received`);

  try {
    const { balanceContext, generateReport } = await req.json();

    if (!balanceContext || !balanceContext.accounts || balanceContext.accounts.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Lipsesc datele balanței. Încarcă o balanță pentru a calcula riscul ANAF." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ANAF-RISK][${requestId}] Analyzing ${balanceContext.accounts.length} accounts for ${balanceContext.company || 'unknown company'}`);

    const result = calculateANAFRisk(balanceContext);

    console.log(`[ANAF-RISK][${requestId}] ✅ Analysis complete: Score ${result.overallScore}, Level ${result.riskLevel}, ${result.factors.length} factors`);

    // If generateReport is true, create a formatted text report
    let reportText = '';
    if (generateReport) {
      reportText = `
═══════════════════════════════════════════════════════════════
           RAPORT ANALIZĂ RISC CONTROL ANAF
═══════════════════════════════════════════════════════════════

COMPANIE: ${balanceContext.company || 'N/A'}
CUI: ${balanceContext.cui || 'N/A'}
PERIOADĂ: ${balanceContext.period || 'N/A'}
DATA ANALIZĂ: ${new Date().toLocaleDateString('ro-RO')}

───────────────────────────────────────────────────────────────
                    SCOR RISC GENERAL
───────────────────────────────────────────────────────────────

   ████████████████████████████████████████  ${result.overallScore}/100
   
   NIVEL RISC: ${result.riskLevel.toUpperCase()}

───────────────────────────────────────────────────────────────
                       SUMAR
───────────────────────────────────────────────────────────────

${result.summary}

───────────────────────────────────────────────────────────────
                 FACTORI DE RISC IDENTIFICAȚI
───────────────────────────────────────────────────────────────

${result.factors.map((f, i) => `
${i + 1}. ${f.name.toUpperCase()} [${f.severity.toUpperCase()}]
   Categorie: ${f.category}
   Puncte risc: ${f.score}
   ${f.description}
   ➤ Recomandare: ${f.recommendation}
`).join('\n')}

───────────────────────────────────────────────────────────────
                    RECOMANDĂRI PRIORITARE
───────────────────────────────────────────────────────────────

${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

═══════════════════════════════════════════════════════════════
NOTĂ: Această analiză este orientativă și nu înlocuiește 
consultanța unui expert fiscal autorizat.
═══════════════════════════════════════════════════════════════
`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        reportText: generateReport ? reportText : undefined,
        timestamp: new Date().toISOString(),
        requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[ANAF-RISK][${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Eroare la calculul riscului ANAF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
