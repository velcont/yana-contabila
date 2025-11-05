/**
 * Extrage numele companiei din numele fișierului de balanță
 * Format așteptat: "Balanta - NUME COMPANIE [DATA-DATA] CUI.xls"
 */
export const extractCompanyNameFromFileName = (fileName: string): string | null => {
  if (!fileName) return null;
  
  // Pattern 1: "Balanta - NUME COMPANIE [DATA]" sau "Balanta - NUME COMPANIE CUI.xls"
  const balantaMatch = fileName.match(/Balanta\s*-\s*([^[\d]+?)(?:\s*\[|\s*\d{8}\.xls)/i);
  if (balantaMatch) {
    return balantaMatch[1].trim();
  }
  
  // Pattern 2: Nume fără prefix "Balanta"
  const directMatch = fileName.match(/^([^[\d]+?)(?:\s*\[|\s*\d{8}\.xls)/i);
  if (directMatch) {
    return directMatch[1].trim();
  }
  
  return null;
};
