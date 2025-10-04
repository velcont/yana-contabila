import { z } from 'zod';

/**
 * Schema de validare pentru datele financiare din analiză
 * Verifică conformitatea valorilor înainte de procesare
 */
export const financialDataSchema = z.object({
  venituri: z.number()
    .min(0, "Veniturile nu pot fi negative")
    .refine(val => val < 1000000000, "Venituri suspicioase - verificați valoarea"),
  
  cheltuieli: z.number()
    .min(0, "Cheltuielile nu pot fi negative")
    .refine(val => val < 1000000000, "Cheltuieli suspicioase - verificați valoarea"),
  
  tva_colectata: z.number()
    .min(0, "TVA colectată nu poate fi negativă")
    .optional(),
  
  tva_deductibila: z.number()
    .min(0, "TVA deductibilă nu poate fi negativă")
    .optional(),
  
  profit: z.number()
    .refine(val => Math.abs(val) < 1000000000, "Profit/pierdere suspicioasă"),
  
  profit_margin: z.number()
    .min(-100, "Marja de profit invalidă (min -100%)")
    .max(100, "Marja de profit invalidă (max 100%)")
    .optional(),
  
  dso: z.number()
    .min(0, "DSO nu poate fi negativ")
    .max(365, "DSO peste 365 zile este neobișnuit")
    .optional(),
  
  dpo: z.number()
    .min(0, "DPO nu poate fi negativ")
    .max(365, "DPO peste 365 zile este neobișnuit")
    .optional(),
  
  dio: z.number()
    .min(0, "DIO nu poate fi negativ")
    .max(730, "DIO peste 2 ani indică stocuri cu probleme")
    .optional(),
  
  casa: z.number()
    .min(0, "Banii din casă nu pot fi negativi")
    .max(50000, "⚠️ ATENȚIE: Plafon casă depășit! Maximum legal: 50.000 lei")
    .optional(),
  
  stocuri: z.number()
    .min(0, "Stocurile nu pot fi negative")
    .optional(),
  
  clienti: z.number()
    .min(0, "Creanțe clienți nu pot fi negative")
    .optional(),
  
  furnizori: z.number()
    .min(0, "Datorii furnizori nu pot fi negative")
    .optional(),
  
  salarii_neplatite: z.number()
    .min(0, "Salarii neplatite nu pot fi negative")
    .optional(),
});

export type FinancialData = z.infer<typeof financialDataSchema>;

/**
 * Validări avansate post-procesare
 * Detectează anomalii și situații critice
 */
export const advancedFinancialValidation = (data: Partial<FinancialData>) => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const criticalAlerts: string[] = [];

  // 1. Cheltuieli > Venituri (pierdere garantată)
  if (data.venituri !== undefined && data.cheltuieli !== undefined) {
    if (data.cheltuieli > data.venituri) {
      const pierdere = data.cheltuieli - data.venituri;
      criticalAlerts.push(
        `🔴 Pierdere de ${pierdere.toLocaleString('ro-RO')} RON - Cheltuielile depășesc veniturile`
      );
    }
  }

  // 2. Cash flow negativ potențial
  if (data.clienti !== undefined && data.furnizori !== undefined) {
    if (data.clienti < data.furnizori) {
      warnings.push(
        `⚠️ Creanțe clienți (${data.clienti.toLocaleString('ro-RO')} RON) < Datorii furnizori (${data.furnizori.toLocaleString('ro-RO')} RON) - Risc cash flow`
      );
    }
  }

  // 3. DSO prea ridicat
  if (data.dso !== undefined && data.dso > 90) {
    criticalAlerts.push(
      `🔴 DSO extrem de ridicat: ${data.dso} zile - Banii sunt blocați în creanțe. Normal: 30-60 zile`
    );
  } else if (data.dso !== undefined && data.dso > 60) {
    warnings.push(
      `⚠️ DSO ridicat: ${data.dso} zile - Încasările sunt prea lente`
    );
  }

  // 4. DPO prea scăzut (plătim prea repede)
  if (data.dpo !== undefined && data.dpo < 30) {
    warnings.push(
      `💡 DPO scăzut: ${data.dpo} zile - Plătiți furnizorii prea repede? Negociați termene mai lungi`
    );
  }

  // 5. Stocuri cu rotație anormală (DIO ridicat)
  if (data.dio !== undefined && data.dio > 180) {
    criticalAlerts.push(
      `🔴 Stocuri cu mișcare lentă: ${data.dio} zile - Risc de depreciere, costuri mari de depozitare`
    );
  } else if (data.dio !== undefined && data.dio > 90) {
    warnings.push(
      `⚠️ Rotație stocuri lentă: ${data.dio} zile - Optimizați gestionarea stocurilor`
    );
  }

  // 6. Marja de profit negativă sau prea mică
  if (data.profit_margin !== undefined) {
    if (data.profit_margin < 0) {
      criticalAlerts.push(
        `🔴 Marja de profit negativă: ${data.profit_margin.toFixed(2)}% - Compania pierde bani`
      );
    } else if (data.profit_margin < 5) {
      warnings.push(
        `⚠️ Marja de profit foarte mică: ${data.profit_margin.toFixed(2)}% - Riscul de pierdere este ridicat`
      );
    }
  }

  // 7. Salarii neplatite
  if (data.salarii_neplatite !== undefined && data.salarii_neplatite > 0) {
    criticalAlerts.push(
      `🔴 URGENT: Salarii neplatite: ${data.salarii_neplatite.toLocaleString('ro-RO')} RON - Risc amenzi și litigii`
    );
  }

  // 8. Plafonul casei depășit
  if (data.casa !== undefined && data.casa > 50000) {
    errors.push(
      `⛔ NELEGAL: Plafon casă depășit - ${data.casa.toLocaleString('ro-RO')} RON (max legal: 50.000 RON)`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    criticalAlerts,
    summary: {
      totalIssues: errors.length + warnings.length + criticalAlerts.length,
      criticalCount: errors.length + criticalAlerts.length,
      warningCount: warnings.length,
    }
  };
};

/**
 * Validare simplă pentru formatul balanței
 */
export const validateBalanceStructure = (data: any): { isValid: boolean; message?: string } => {
  const requiredColumns = [
    'solduri_initiale_debit',
    'solduri_initiale_credit',
    'solduri_finale_debit',
    'solduri_finale_credit'
  ];

  const hasRulaje = data.some((row: any) => 
    'rulaje_debit' in row || 'rulaje_credit' in row
  );
  
  const hasTotalSume = data.some((row: any) => 
    'total_sume_debit' in row || 'total_sume_credit' in row
  );

  if (!hasRulaje && !hasTotalSume) {
    return {
      isValid: false,
      message: '⚠️ Format neconform. Balanța trebuie să conțină: Solduri inițiale an, Rulaje perioadă SAU Total sume, și Solduri finale.'
    };
  }

  return { isValid: true };
};
