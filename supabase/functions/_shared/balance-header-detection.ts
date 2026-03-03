/**
 * Balance Header Detection
 * Module 2: Unified header detection for Romanian balance sheets
 * Extracted from analyze-balance/index.ts (Fix 2 - Modularizare)
 */

export interface HeaderIndices {
  headerRowIndex: number;
  contCol: number;
  denumireCol: number;
  soldFinalDebitCol: number;
  soldFinalCreditCol: number;
  totalSumeDebitCol: number;
  totalSumeCreditCol: number;
  parserVersion: string;
}

/**
 * R1: Unified header detection function
 * v2.1.0: Detection based on D/C pair ORDER in subheader
 * 
 * Layout order (left to right): SI, Rulaje, Total Sume, Solduri Finale
 * So: last pair = SF, second-to-last = Total Sume
 */
export const detectHeaderIndices = (data: any[][], parserVersion: string): HeaderIndices => {
  let headerRowIndex = -1;
  let mainHeaderRow = -1;
  let subHeaderRow = -1;
  let contCol = -1, denumireCol = -1;
  let soldFinalDebitCol = -1, soldFinalCreditCol = -1;
  let totalSumeDebitCol = -1, totalSumeCreditCol = -1;
  
  // STEP 1: Detect 2-row header
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const rowStr = data[i].join('|').toLowerCase();
    const hasSoldFinalPhrase = rowStr.includes('solduri finale') || rowStr.includes('sold final');
    const hasSoldAndFinalWords =
      (rowStr.includes('sold') && rowStr.includes('final')) ||
      (rowStr.includes('solduri') && rowStr.includes('finale'));

    if ((hasSoldFinalPhrase || hasSoldAndFinalWords) && mainHeaderRow < 0) {
      mainHeaderRow = i;
      subHeaderRow = i + 1;
      headerRowIndex = i;
      console.log(`📊 [HEADER-DETECT-UNIFIED v${parserVersion}] Header pe 2 rânduri: main=${mainHeaderRow}, sub=${subHeaderRow}`);
    }
    if (headerRowIndex < 0 && (rowStr.includes('sold') || (rowStr.includes('cont') && rowStr.includes('denumire')))) {
      headerRowIndex = i;
      console.log(`📊 [HEADER-DETECT-UNIFIED v${parserVersion}] Header simplu pe 1 rând: ${headerRowIndex}`);
    }
  }
  
  // STEP 2: Detect cont and denumire columns
  if (headerRowIndex >= 0) {
    const row = data[headerRowIndex];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j]).toLowerCase().trim();
      if ((cell.includes('cont') || cell.includes('simbol')) && contCol === -1) contCol = j;
      if ((cell.includes('denumire') || cell.includes('explicatii')) && denumireCol === -1) denumireCol = j;
    }
  }
  
  // STEP 3 (v2.1.0): Detect columns via D/C PAIRS
  if (mainHeaderRow >= 0 && subHeaderRow < data.length) {
    const subHeader = data[subHeaderRow];
    
    const debitCreditPairs: Array<{debitCol: number, creditCol: number}> = [];
    
    for (let j = 0; j < subHeader.length - 1; j++) {
      const cell = String(subHeader[j]).toLowerCase().trim();
      const nextCell = String(subHeader[j + 1]).toLowerCase().trim();
      
      const isDebit = cell.includes('debit') || cell === 'd' || cell.includes('debitoare');
      const isCredit = nextCell.includes('credit') || nextCell === 'c' || nextCell.includes('creditoare');
      
      if (isDebit && isCredit) {
        debitCreditPairs.push({ debitCol: j, creditCol: j + 1 });
        console.log(`📊 [HEADER-DETECT v${parserVersion}] Găsită pereche D/C la coloane ${j}/${j+1}`);
        j++;
      }
    }
    
    console.log(`📊 [HEADER-DETECT v${parserVersion}] Total perechi D/C găsite: ${debitCreditPairs.length}`);
    
    if (debitCreditPairs.length >= 2) {
      const sfPair = debitCreditPairs[debitCreditPairs.length - 1];
      const tsPair = debitCreditPairs[debitCreditPairs.length - 2];
      
      soldFinalDebitCol = sfPair.debitCol;
      soldFinalCreditCol = sfPair.creditCol;
      totalSumeDebitCol = tsPair.debitCol;
      totalSumeCreditCol = tsPair.creditCol;
      
      console.log(`📊 [HEADER-DETECT v${parserVersion}] PERECHI: SF=${sfPair.debitCol}/${sfPair.creditCol}, TS=${tsPair.debitCol}/${tsPair.creditCol}`);
    } else if (debitCreditPairs.length === 1) {
      const pair = debitCreditPairs[0];
      soldFinalDebitCol = pair.debitCol;
      soldFinalCreditCol = pair.creditCol;
      totalSumeDebitCol = pair.debitCol;
      totalSumeCreditCol = pair.creditCol;
      console.log(`📊 [HEADER-DETECT v${parserVersion}] FALLBACK: O singură pereche D/C, folosită pentru SF și TS`);
    }
  }
  
  // STEP 4: Fallback - single row header
  if ((soldFinalDebitCol < 0 || totalSumeDebitCol < 0) && headerRowIndex >= 0) {
    const row = data[headerRowIndex];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j]).toLowerCase().trim();
      if (cell.includes('sold') && cell.includes('final')) {
        if (cell.includes('debit') && soldFinalDebitCol < 0) soldFinalDebitCol = j;
        if (cell.includes('credit') && soldFinalCreditCol < 0) soldFinalCreditCol = j;
      }
      if ((cell.includes('total') && cell.includes('sume')) || cell.includes('rulaj')) {
        if (cell.includes('debit') && totalSumeDebitCol < 0) totalSumeDebitCol = j;
        if (cell.includes('credit') && totalSumeCreditCol < 0) totalSumeCreditCol = j;
      }
    }
  }
  
  console.log(`📊 [HEADER-DETECT-UNIFIED v${parserVersion}] REZULTAT FINAL:`, {
    headerRow: headerRowIndex,
    cont: contCol,
    denumire: denumireCol,
    soldFinalD: soldFinalDebitCol,
    soldFinalC: soldFinalCreditCol,
    totalSumeD: totalSumeDebitCol,
    totalSumeC: totalSumeCreditCol,
    parserVersion
  });
  
  return {
    headerRowIndex,
    contCol,
    denumireCol,
    soldFinalDebitCol,
    soldFinalCreditCol,
    totalSumeDebitCol,
    totalSumeCreditCol,
    parserVersion
  };
};
