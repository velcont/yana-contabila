/**
 * Balance Structured Data Extraction
 * Module 3: Extract structured accounts, CUI, company from Excel
 * Extracted from analyze-balance/index.ts (Fix 2 - Modularizare)
 */
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { toNumber } from './balance-parser.ts';
import { detectHeaderIndices, type HeaderIndices } from './balance-header-detection.ts';

export interface AccountData {
  code: string;
  name: string;
  accountClass: number;
  debit: number;
  credit: number;
  finalDebit: number;
  finalCredit: number;
}

export interface StructuredData {
  cui: string;
  company: string;
  accounts: AccountData[];
  totalGeneralDebit: number;
  totalGeneralCredit: number;
  totalGeneralFound: boolean;
  indices: HeaderIndices;
}

export interface DeterministicMetadata {
  [key: string]: number;
}

const DEFAULT_PARSER_VERSION = '2.1.0';

/**
 * Extract CUI, company name, and all account balances from an Excel balance sheet.
 */
export function extractStructuredData(excelBase64: string, parserVersion: string = DEFAULT_PARSER_VERSION): StructuredData {
  const defaultIndices: HeaderIndices = {
    headerRowIndex: -1, contCol: -1, denumireCol: -1,
    soldFinalDebitCol: -1, soldFinalCreditCol: -1,
    totalSumeDebitCol: -1, totalSumeCreditCol: -1,
    parserVersion
  };

  try {
    const excelBytes = Uint8Array.from(atob(excelBase64), c => c.charCodeAt(0));
    const workbook = XLSX.read(excelBytes, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
    
    let cui = '';
    let company = '';
    const accounts: AccountData[] = [];
    
    // 1. Extract CUI and company from first rows
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const firstCell = String(data[i][0] || '');
      const cuiMatch = firstCell.match(/CUI:?\s*(\d{8,10})/i) || firstCell.match(/(\d{8,10})/);
      if (cuiMatch && !cui) cui = cuiMatch[1];
      const companyMatch = firstCell.split('|')[0].split(/CUI|CIF/i)[0].trim();
      if (companyMatch && companyMatch.length > 3 && !company) company = companyMatch;
    }
    
    console.log(`📊 [STRUCTURED-DATA] CUI detectat: ${cui}, Companie: ${company}`);
    
    // 2. Use unified header detection
    const indices = detectHeaderIndices(data, parserVersion);
    console.log(`📊 [STRUCTURED-DATA] Indici folosiți:`, indices);
    
    // 3. Parse data rows
    if (indices.headerRowIndex >= 0 && indices.contCol >= 0) {
      for (let i = indices.headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        const contCodeFull = String(row[indices.contCol] || '').trim();
        
        const contCodeMatch = contCodeFull.match(/^(\d{3,6})/);
        if (!contCodeMatch) continue;
        const contCodeFull6 = contCodeMatch[1];
        const contCode = contCodeFull6.substring(0, 3);
        const contCodeForStorage = contCodeFull6;
        
        if (contCode === '371') {
          console.log(`🔍 [DEBUG-371] Row ${i}: contCode=${contCode}, soldFinalDebitCol=${indices.soldFinalDebitCol}, rawValue=${row[indices.soldFinalDebitCol]}`);
        }
        
        const accountClass = parseInt(contCode[0]);
        const denumireFromCol = indices.denumireCol >= 0 ? String(row[indices.denumireCol] || '').trim() : '';
        const denumire = denumireFromCol || contCodeFull.replace(/^\d+\s*[-–]\s*/, '').trim();
        
        let debit = 0, credit = 0;
        
        // Classes 1-5: use final balances
        if (accountClass >= 1 && accountClass <= 5) {
          if (indices.soldFinalDebitCol >= 0) debit = toNumber(row[indices.soldFinalDebitCol]);
          if (indices.soldFinalCreditCol >= 0) credit = toNumber(row[indices.soldFinalCreditCol]);
        }
        // Class 6: Total debit amounts
        else if (accountClass === 6) {
          if (indices.totalSumeDebitCol >= 0) debit = toNumber(row[indices.totalSumeDebitCol]);
        }
        // Class 7: Total credit amounts
        else if (accountClass === 7) {
          if (indices.totalSumeCreditCol >= 0) credit = toNumber(row[indices.totalSumeCreditCol]);
        }
        
        if (debit > 0 || credit > 0) {
          const accountObj: AccountData = {
            code: contCodeForStorage,
            name: denumire,
            accountClass,
            debit: 0,
            credit: 0,
            finalDebit: 0,
            finalCredit: 0
          };
          
          if (accountClass >= 1 && accountClass <= 5) {
            accountObj.finalDebit = Math.round(debit * 100) / 100;
            accountObj.finalCredit = Math.round(credit * 100) / 100;
          } else {
            accountObj.debit = Math.round(debit * 100) / 100;
            accountObj.credit = Math.round(credit * 100) / 100;
          }
          
          accounts.push(accountObj);
          
          if (contCode === '371') {
            console.log(`🔍 [DEBUG-371] SALVAT: finalDebit=${accountObj.finalDebit}, finalCredit=${accountObj.finalCredit}`);
          }
          
          if (accountClass === 7 && accountObj.credit > 0) {
            console.log(`✅ [CL7] Cont ${contCode} (col ${indices.totalSumeCreditCol}): ${accountObj.credit} RON`);
          }
        }
      }
    }
    
    console.log(`📊 [STRUCTURED-DATA] Extrase ${accounts.length} conturi cu sold > 0`);
    if (accounts.length > 0) {
      console.log('📊 [STRUCTURED-DATA] Primele 3 conturi:', accounts.slice(0, 3).map(acc => ({
        code: acc.code, name: acc.name, debit: acc.debit, credit: acc.credit, class: acc.accountClass
      })));
    }
    
    // Extract TOTAL GENERAL row
    let totalGeneralDebit = 0;
    let totalGeneralCredit = 0;
    let totalGeneralFound = false;
    
    console.log("🔍 [TOTAL-GENERAL] Căutare rând Total general...");
    
    for (let i = data.length - 1; i >= Math.max(0, data.length - 20); i--) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const rowStr = row.map((cell: any) => String(cell || '').toLowerCase()).join(' ');
      
      if (
        rowStr.includes('total general') ||
        rowStr.includes('totaluri generale') ||
        (rowStr.includes('total') && !rowStr.match(/\d{3,}/))
      ) {
        if (indices.soldFinalDebitCol >= 0) {
          totalGeneralDebit = toNumber(row[indices.soldFinalDebitCol]);
        }
        if (indices.soldFinalCreditCol >= 0) {
          totalGeneralCredit = toNumber(row[indices.soldFinalCreditCol]);
        }
        
        if (totalGeneralDebit > 0 || totalGeneralCredit > 0) {
          totalGeneralFound = true;
          console.log(`✅ [TOTAL-GENERAL] GĂSIT la rândul ${i}: Debit=${totalGeneralDebit.toFixed(2)}, Credit=${totalGeneralCredit.toFixed(2)}`);
          break;
        }
      }
    }
    
    if (!totalGeneralFound) {
      console.log("⚠️ [TOTAL-GENERAL] Rând Total general NU a fost găsit");
    }
    
    return { cui, company, accounts, totalGeneralDebit, totalGeneralCredit, totalGeneralFound, indices };
  } catch (error) {
    console.error('📊 [STRUCTURED-DATA] Eroare extragere:', error);
    return { cui: '', company: '', accounts: [], totalGeneralDebit: 0, totalGeneralCredit: 0, totalGeneralFound: false, indices: defaultIndices };
  }
}

/**
 * Calculate revenue, expenses, and profit from structured accounts.
 */
export function calculateRevenueExpenses(accounts: AccountData[]): {
  revenue: number;
  expenses: number;
  profit: number;
} {
  let revenue = 0;
  let expenses = 0;
  
  accounts.forEach((acc) => {
    if (acc.accountClass === 7 && acc.code !== '709') {
      revenue += acc.credit || 0;
      if (acc.credit > 0) {
        console.log(`  ✅ [R2] CL7 ${acc.code}: +${acc.credit} RON → Total: ${revenue}`);
      }
    }
    if (acc.code === '709') {
      revenue -= acc.credit || 0;
    }
    if (acc.accountClass === 6) {
      expenses += acc.debit || 0;
    }
  });
  
  // Find account 121 for profit
  const cont121 = accounts.find((acc) => acc.code === '121');
  let profit = 0;
  if (cont121) {
    const debit = cont121.finalDebit || 0;
    const credit = cont121.finalCredit || 0;
    profit = (credit > debit) ? (credit - debit) : -(debit - credit);
    console.log(`💰 [R2-PRIORITY] Profit din 121: ${profit} RON`);
  } else {
    profit = revenue - expenses;
    console.log(`⚠️ [R2-PRIORITY] Cont 121 lipsă - calculat: ${profit} RON`);
  }
  
  console.log(`💰 [R2-PRIORITY] REZULTAT: revenue=${revenue}, expenses=${expenses}`);
  return { revenue, expenses, profit };
}

/**
 * Calculate deterministic metadata from structured accounts.
 * Fix 1: Replaces the redundant METADATA-EXTRACT block.
 */
export function calculateDeterministicMetadata(
  accounts: AccountData[],
  revenue: number,
  expenses: number,
  profit: number
): DeterministicMetadata {
  const metadata: DeterministicMetadata = {};
  
  const findAccountBalance = (prefix: string, field: 'finalDebit' | 'finalCredit' | 'debit' | 'credit'): number => {
    return accounts
      .filter((acc) => acc.code === prefix || acc.code.startsWith(prefix))
      .reduce((sum, acc) => sum + ((acc as any)[field] || 0), 0);
  };
  
  const soldClienti = findAccountBalance('4111', 'finalDebit') || findAccountBalance('411', 'finalDebit');
  const soldFurnizori = findAccountBalance('401', 'finalCredit');
  const soldBanca = findAccountBalance('5121', 'finalDebit') + findAccountBalance('5124', 'finalDebit') + findAccountBalance('5125', 'finalDebit');
  const soldCasa = findAccountBalance('5311', 'finalDebit') || findAccountBalance('531', 'finalDebit');
  const soldStocuri = findAccountBalance('371', 'finalDebit');
  const soldMateriiPrime = findAccountBalance('301', 'finalDebit');
  const soldMateriale = findAccountBalance('302', 'finalDebit');
  const costMarfaVanduta = findAccountBalance('607', 'debit');
  
  if (soldClienti > 0) metadata.soldClienti = Math.round(soldClienti * 100) / 100;
  if (soldFurnizori > 0) metadata.soldFurnizori = Math.round(soldFurnizori * 100) / 100;
  if (soldBanca > 0) metadata.soldBanca = Math.round(soldBanca * 100) / 100;
  if (soldCasa > 0) metadata.soldCasa = Math.round(soldCasa * 100) / 100;
  if (soldStocuri > 0) metadata.soldStocuri = Math.round(soldStocuri * 100) / 100;
  if (soldMateriiPrime > 0) metadata.soldMateriiPrime = Math.round(soldMateriiPrime * 100) / 100;
  if (soldMateriale > 0) metadata.soldMateriale = Math.round(soldMateriale * 100) / 100;
  if (costMarfaVanduta > 0) metadata.costMarfaVanduta = Math.round(costMarfaVanduta * 100) / 100;
  
  metadata.revenue = Math.round(revenue * 100) / 100;
  metadata.expenses = Math.round(expenses * 100) / 100;
  metadata.profit = Math.round(profit * 100) / 100;
  
  // Derived indicators
  if (revenue > 0 && soldClienti > 0) {
    metadata.dso = Math.round((soldClienti / revenue) * 365);
  }
  if (expenses > 0 && soldFurnizori > 0) {
    metadata.dpo = Math.round((soldFurnizori / expenses) * 365);
  }
  const totalStocuri = soldStocuri + soldMateriiPrime + soldMateriale;
  if (costMarfaVanduta > 0 && totalStocuri > 0) {
    metadata.dio = Math.round((totalStocuri / costMarfaVanduta) * 365);
  }
  if (metadata.dso && metadata.dpo) {
    metadata.cashConversionCycle = metadata.dso + (metadata.dio || 0) - metadata.dpo;
  }
  
  console.log("✅ [METADATA-CALC] METADATA FINALĂ:", metadata);
  return metadata;
}
