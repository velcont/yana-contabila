// Structura conturilor pe clase pentru analiza completă a balanței

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
  isBalanced: boolean; // Pentru clasa 6-7, totalDebit === totalCredit
}

export interface FullBalanceMetadata {
  // Indicatori actuali (păstrăm compatibilitatea)
  profit?: number;
  revenue?: number;
  expenses?: number;
  dso?: number;
  dpo?: number;
  cashConversionCycle?: number;
  ebitda?: number;
  
  // Solduri cheie (păstrăm)
  soldBanca?: number;
  soldCasa?: number;
  soldClienti?: number;
  soldFurnizori?: number;
  
  // NOU: Structură completă pe clase
  class1_FixedAssets?: AccountBalance[];      // Imobilizări
  class2_CurrentAssets?: AccountBalance[];    // Stocuri
  class3_Inventory?: AccountBalance[];        // Cheltuieli în avans
  class4_ThirdParties?: AccountBalance[];     // Terți (clienți, furnizori, TVA, salarii)
  class5_Treasury?: AccountBalance[];         // Bancă, casă
  
  class6_Expenses?: AccountActivity[];        // Cheltuieli (doar rulaje)
  class7_Revenue?: AccountActivity[];         // Venituri (doar rulaje)
  
  // Validări automate
  anomalies?: string[];                       // Erori detectate (ex: cont 1-5 cu sold dublu)
  warnings?: string[];                        // Avertismente (ex: clasa 6-7 debalansată)
}
