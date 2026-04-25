/**
 * Balance Parser Utilities
 * Module 1: Excel parsing and number formatting
 * Extracted from analyze-balance/index.ts (Fix 2 - Modularizare)
 */
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

/**
 * Universal number parser for Romanian/English number formats
 * Handles: 1.234.567,89 (RO) | 1,234,567.89 (EN) | 1234.56 | plain integers
 */
export const toNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  let str = String(val).trim();
  if (!str) return 0;
  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');
  const lastSep = Math.max(lastDot, lastComma);
  if (lastSep !== -1) {
    let integerPart = str.substring(0, lastSep).replace(/[.,\s]/g, '').replace(/[^\d-]/g, '');
    let decimalPart = str.substring(lastSep + 1).replace(/[^\d]/g, '');
    const standard = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
    const num = parseFloat(standard);
    return isNaN(num) ? 0 : num;
  }
  str = str.replace(/[^\d-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

/**
 * Parse Excel file with proper number formatting
 * v2.2.0: Enhanced .xls BIFF support with multiple fallback strategies
 */
export async function parseExcelWithXLSX(excelBase64: string): Promise<string> {
  try {
    // Extract base64 content from data URL if present
    let base64Content = excelBase64;
    if (excelBase64.includes(',')) {
      base64Content = excelBase64.split(',')[1];
    }
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // v2.2.0: Try multiple parse strategies for .xls compatibility
    const parseStrategies: any[] = [
      { type: 'array', cellDates: false, cellNF: false, cellText: false, raw: true },
      { type: 'array', cellDates: false, cellNF: true, cellText: true, raw: false },
      { type: 'array' },
    ];

    let workbook: any = null;
    let strategyUsed = 0;

    for (let i = 0; i < parseStrategies.length; i++) {
      try {
        workbook = XLSX.read(bytes, parseStrategies[i]);
        
        if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const testData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
          
          const nonEmptyRows = (testData as any[][]).filter(
            (row: any[]) => row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined)
          ).length;
          
          if (nonEmptyRows >= 5) {
            strategyUsed = i;
            console.log(`✅ [XLSX] Strategy ${i} succeeded: ${nonEmptyRows} non-empty rows, ${workbook.SheetNames.length} sheets`);
            break;
          } else {
            console.warn(`⚠️ [XLSX] Strategy ${i} parsed but only ${nonEmptyRows} non-empty rows, trying next...`);
            workbook = null;
          }
        }
      } catch (strategyError) {
        console.warn(`⚠️ [XLSX] Strategy ${i} failed:`, strategyError);
        workbook = null;
      }
    }

    if (!workbook) {
      throw new Error("Toate strategiile de parsare au eșuat - fișierul .xls nu poate fi citit");
    }

    let fullText = "";
    const useRawNumbers = strategyUsed === 0;
    
    workbook.SheetNames.forEach((sheetName: string) => {
      const sheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(sheet, { 
        header: 1,
        raw: useRawNumbers,
        defval: '' 
      });
      
      let csvText = '';
      (jsonData as any[][]).forEach((row: any[]) => {
        const formattedRow = row.map((cell: any) => {
          if (typeof cell === 'number') {
            return cell.toFixed(2);
          }
          if (typeof cell === 'string') {
            const trimmed = cell.trim();
            
            if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(trimmed)) {
              const cleaned = trimmed.replace(/\./g, '').replace(',', '.');
              const parsed = parseFloat(cleaned);
              if (!isNaN(parsed)) return parsed.toFixed(2);
            }
            
            if (/^\d+(,\d+)$/.test(trimmed)) {
              const cleaned = trimmed.replace(',', '.');
              const parsed = parseFloat(cleaned);
              if (!isNaN(parsed)) return parsed.toFixed(2);
            }
            
            if (/^\d+(\.\d+)?$/.test(trimmed)) {
              const parsed = parseFloat(trimmed);
              if (!isNaN(parsed)) return parsed.toFixed(2);
            }
          }
          return cell;
        });
        csvText += formattedRow.join(',') + '\n';
      });
      
      fullText += `\n=== Sheet: ${sheetName} ===\n${csvText}\n`;
    });
    
    console.log(`✅ [XLSX] Excel parsed with strategy ${strategyUsed}, text length: ${fullText.length}`);
    return fullText.trim();
  } catch (error) {
    console.error("❌ [XLSX] Error parsing Excel:", error);
    throw new Error(`Nu s-a putut extrage textul din Excel: ${error instanceof Error ? error.message : 'eroare necunoscută'}`);
  }
}
