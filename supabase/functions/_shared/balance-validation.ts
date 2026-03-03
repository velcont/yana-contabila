/**
 * Balance Validation Utilities
 * Module 4: Account extraction, grouping, and validation
 * Extracted from analyze-balance/index.ts (Fix 2 - Modularizare)
 */

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  finalBalanceDebit: number;
  finalBalanceCredit: number;
  netBalance: number;
  balanceType: 'debit' | 'credit';
}

export interface AccountActivity {
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface GroupedBalance {
  class1: AccountBalance[];
  class2: AccountBalance[];
  class3: AccountBalance[];
  class4: AccountBalance[];
  class5: AccountBalance[];
}

export interface GroupedActivity {
  class6: AccountActivity[];
  class7: AccountActivity[];
}

/**
 * Extract account value from parsed balance text by account code.
 */
export function extractAccountValue(balanceText: string, accountCode: string): { finalBalance: number | null; exists: boolean } {
  const lineRegex = new RegExp(`^.*${accountCode}[^\\n]*$`, 'gim');
  const lines = balanceText.match(lineRegex);
  
  if (!lines || lines.length === 0) {
    return { finalBalance: null, exists: false };
  }
  
  const accountLine = lines[lines.length - 1];
  const numbers = accountLine.match(/\d+\.\d{2}/g);
  
  if (!numbers || numbers.length === 0) {
    return { finalBalance: null, exists: false };
  }
  
  const lastTwo = numbers.slice(-2).map(n => parseFloat(n));
  const finalBalance = Math.max(...lastTwo);
  const exists = finalBalance > 0.10;
  
  return { finalBalance: exists ? finalBalance : null, exists };
}

/**
 * Extract ALL accounts from balance text, grouped by class type.
 */
export function extractAllAccounts(balanceText: string): {
  class1to5: AccountBalance[];
  class6to7: AccountActivity[];
  anomalies: string[];
} {
  const class1to5: AccountBalance[] = [];
  const class6to7: AccountActivity[] = [];
  const anomalies: string[] = [];
  
  const lines = balanceText.split('\n');
  
  for (const line of lines) {
    if (!line.trim() || line.includes('Simbol') || line.includes('CLASE') || line.includes('===')) continue;
    
    const codeMatch = line.match(/^\s*(\d{3,4})[^\d]/);
    if (!codeMatch) continue;
    
    const accountCode = codeMatch[1];
    const accountClass = parseInt(accountCode.charAt(0));
    
    const nameMatch = line.match(/^\s*\d{3,4}[,|\s]+([^0-9,|]+)/);
    const accountName = nameMatch ? nameMatch[1].trim() : 'Cont necunoscut';
    
    const numbers = line.match(/\d+\.\d{2}/g)?.map(v => parseFloat(v)) || [];
    
    if (numbers.length === 0) continue;
    
    if (accountClass >= 1 && accountClass <= 5) {
      if (numbers.length >= 2) {
        const finalDebit = numbers[numbers.length - 2] || 0;
        const finalCredit = numbers[numbers.length - 1] || 0;
        
        if (finalDebit < 0.10 && finalCredit < 0.10) continue;
        
        if (finalDebit > 0.10 && finalCredit > 0.10) {
          anomalies.push(
            `🔴 ANOMALIE CONT ${accountCode}: Sold final DEBIT (${finalDebit.toFixed(2)} RON) ` +
            `ȘI CREDIT (${finalCredit.toFixed(2)} RON) simultan! Conturile 1-5 trebuie să aibă DOAR un sold.`
          );
        }
        
        const netBalance = finalDebit - finalCredit;
        const balanceType: 'debit' | 'credit' = Math.abs(finalDebit) > Math.abs(finalCredit) ? 'debit' : 'credit';
        
        class1to5.push({ accountCode, accountName, finalBalanceDebit: finalDebit, finalBalanceCredit: finalCredit, netBalance, balanceType });
      }
    } else if (accountClass === 6 || accountClass === 7) {
      if (numbers.length >= 4) {
        const totalDebit = numbers.length === 6 ? numbers[2] : numbers[0];
        const totalCredit = numbers.length === 6 ? numbers[3] : numbers[1];
        
        if (totalDebit < 0.10 && totalCredit < 0.10) continue;
        
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.10;
        
        if (!isBalanced) {
          anomalies.push(
            `⚠️ DEBALANSARE CONT ${accountCode} (${accountName}): Rulaje DEBIT (${totalDebit.toFixed(2)} RON) ` +
            `≠ CREDIT (${totalCredit.toFixed(2)} RON). Diferență: ${Math.abs(totalDebit - totalCredit).toFixed(2)} RON`
          );
        }
        
        class6to7.push({ accountCode, accountName, totalDebit, totalCredit, isBalanced });
      }
    }
  }
  
  console.log(`✅ Extrase ${class1to5.length} conturi din clasele 1-5`);
  console.log(`✅ Extrase ${class6to7.length} conturi din clasele 6-7`);
  console.log(`⚠️ Detectate ${anomalies.length} anomalii`);
  
  return { class1to5, class6to7, anomalies };
}

/**
 * Group balance accounts by class (1-5).
 */
export function groupAccountsByClass(accounts: AccountBalance[]): GroupedBalance {
  return {
    class1: accounts.filter(a => a.accountCode.startsWith('1')),
    class2: accounts.filter(a => a.accountCode.startsWith('2')),
    class3: accounts.filter(a => a.accountCode.startsWith('3')),
    class4: accounts.filter(a => a.accountCode.startsWith('4')),
    class5: accounts.filter(a => a.accountCode.startsWith('5'))
  };
}

/**
 * Group expense/revenue accounts by class (6-7).
 */
export function groupExpenseRevenueAccounts(accounts: AccountActivity[]): GroupedActivity {
  return {
    class6: accounts.filter(a => a.accountCode.startsWith('6')),
    class7: accounts.filter(a => a.accountCode.startsWith('7'))
  };
}

/**
 * Extract metadata indicators from AI analysis text.
 */
export function extractMetadataFromAnalysis(analysis: string): Record<string, number> {
  const metadata: Record<string, number> = {};
  
  // Try multiple formatting variants for the indicators section
  let indicatorsMatch = analysis.match(/===\s*INDICATORI\s+FINANCIARI\s*===([\s\S]*?)(?=\n\n|===|$)/i);
  if (!indicatorsMatch) indicatorsMatch = analysis.match(/===INDICATORI FINANCIARI===([\s\S]*?)(?=\n\n|===|$)/i);
  if (!indicatorsMatch) indicatorsMatch = analysis.match(/\*\*\*\s*INDICATORI\s+FINANCIARI\s*\*\*\*([\s\S]*?)(?=\n\n|\*\*\*|$)/i);
  
  const parseValue = (val: string) => parseFloat(val.replace(/,/g, ''));
  
  if (indicatorsMatch) {
    console.log("✅ Sectiune INDICATORI FINANCIARI gasita!");
    const indicators = indicatorsMatch[1];
    
    const extract = (regex: RegExp) => {
      const match = indicators.match(regex);
      return match ? parseValue(match[1]) : undefined;
    };
    
    const dso = extract(/DSO[:\s]+(\d+(?:[.,]\d+)?)/i);
    const dpo = extract(/DPO[:\s]+(\d+(?:[.,]\d+)?)/i);
    const ccc = extract(/CCC[:\s]+(-?\d+(?:[.,]\d+)?)/i);
    const ebitda = extract(/EBITDA[:\s]+(-?\d+(?:[.,]\d+)?)/i);
    const ca = extract(/CA[:\s]+(\d+(?:[.,]\d+)?)/i);
    const cheltuieli = extract(/Cheltuieli[:\s]+(\d+(?:[.,]\d+)?)/i);
    const profit = extract(/Profit[:\s]+(-?\d+(?:[.,]\d+)?)/i);
    const furnizori = extract(/Sold\s+Furnizori[:\s]+(\d+(?:[.,]\d+)?)/i);
    const clienti = extract(/Sold\s+Clienti[:\s]+(\d+(?:[.,]\d+)?)/i);
    const banca = extract(/Sold\s+Banca[:\s]+(\d+(?:[.,]\d+)?)/i);
    const casa = extract(/Sold\s+Casa[:\s]+(\d+(?:[.,]\d+)?)/i);
    
    if (dso !== undefined) metadata.dso = dso;
    if (dpo !== undefined) metadata.dpo = dpo;
    if (ccc !== undefined) metadata.cashConversionCycle = ccc;
    if (ebitda !== undefined) metadata.ebitda = ebitda;
    if (ca !== undefined) metadata.revenue = ca;
    if (cheltuieli !== undefined) metadata.expenses = cheltuieli;
    if (profit !== undefined) metadata.profit = profit;
    if (furnizori !== undefined) metadata.soldFurnizori = furnizori;
    if (clienti !== undefined) metadata.soldClienti = clienti;
    if (banca !== undefined) metadata.soldBanca = banca;
    if (casa !== undefined) metadata.soldCasa = casa;
    
    console.log("📈 Metadata extrase:", Object.keys(metadata).length, "indicatori");
  } else {
    console.warn("⚠️ Sectiune INDICATORI FINANCIARI NU a fost gasita in analiza!");
    
    // FALLBACK: Extract from full text
    const parseFromText = (regex: RegExp) => {
      const match = analysis.match(regex);
      return match ? parseFloat(match[1].replace(/[,\s]/g, '')) : undefined;
    };
    
    const dso = parseFromText(/DSO[:\s]+(\d+(?:[.,]\d+)?)/i);
    const dpo = parseFromText(/DPO[:\s]+(\d+(?:[.,]\d+)?)/i);
    const ccc = parseFromText(/CCC[:\s]+(-?\d+(?:[.,]\d+)?)/i);
    const ebitda = parseFromText(/EBITDA[:\s]+(-?\d+(?:[.,]\d+)?)/i);
    const revenue = parseFromText(/(?:CA|Cifra de afaceri)[:\s]+(\d+(?:[.,]\d+)?)/i);
    const expenses = parseFromText(/Cheltuieli[:\s]+(\d+(?:[.,]\d+)?)/i);
    const profit = parseFromText(/Profit[:\s]+(-?\d+(?:[.,]\d+)?)/i);
    const soldFurnizori = parseFromText(/Sold\s+Furnizori[:\s]+(\d+(?:[.,]\d+)?)/i);
    const soldClienti = parseFromText(/Sold\s+(?:Clienti|Clienți)[:\s]+(\d+(?:[.,]\d+)?)/i);
    const soldBanca = parseFromText(/Sold\s+Banca[:\s]+(\d+(?:[.,]\d+)?)/i);
    const soldCasa = parseFromText(/Sold\s+Casa[:\s]+(\d+(?:[.,]\d+)?)/i);
    
    if (dso !== undefined) metadata.dso = dso;
    if (dpo !== undefined) metadata.dpo = dpo;
    if (ccc !== undefined) metadata.cashConversionCycle = ccc;
    if (ebitda !== undefined) metadata.ebitda = ebitda;
    if (revenue !== undefined) metadata.revenue = revenue;
    if (expenses !== undefined) metadata.expenses = expenses;
    if (profit !== undefined) metadata.profit = profit;
    if (soldFurnizori !== undefined) metadata.soldFurnizori = soldFurnizori;
    if (soldClienti !== undefined) metadata.soldClienti = soldClienti;
    if (soldBanca !== undefined) metadata.soldBanca = soldBanca;
    if (soldCasa !== undefined) metadata.soldCasa = soldCasa;
    
    console.log("📊 Metadata fallback extrase:", Object.keys(metadata).length, "indicatori");
  }
  
  return metadata;
}
