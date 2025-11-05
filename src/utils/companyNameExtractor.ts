/**
 * Extrage numele companiei din numele fișierului de balanță
 * Suportă multiple formate pentru toți utilizatorii:
 * - "Balanta - NUME COMPANIE [DATA-DATA] CUI.xls"
 * - "S.C. NUME S.R.L. Balanta..."
 * - "Balanta de verificare NUME srl..."
 * - "Balanta LUNA ANUL NUME srl..."
 */
export const extractCompanyNameFromFileName = (fileName: string): string | null => {
  if (!fileName) return null;
  
  // PATTERN 1: Format standard "Balanta - NUME COMPANIE [DATA] CUI.xls"
  const standardMatch = fileName.match(/Balanta\s*-\s*([^[\d]+?)(?:\s*\[|\s*\d{8}\.xls)/i);
  if (standardMatch) {
    return standardMatch[1].trim();
  }
  
  // PATTERN 2: Nume la început "S.C. NUME S.R.L. Balanta..."
  const prefixMatch = fileName.match(/^(S\.C\.\s+.+?\s+S\.R\.L\.|.+?\s+S\.R\.L\.|.+?\s+SRL)\s+Balanta/i);
  if (prefixMatch) {
    return prefixMatch[1].trim();
  }
  
  // PATTERN 3: "Balanta de verificare NUME srl/SRL..."
  const verificareMatch = fileName.match(/Balanta\s+de\s+verificare\s+([a-zA-Z\s]+(?:srl|S\.R\.L\.))/i);
  if (verificareMatch) {
    return verificareMatch[1].trim();
  }
  
  // PATTERN 4: "Balanta LUNA ANUL NUME srl CIFRE"
  const middleMatch = fileName.match(/Balanta\s+(?:ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)\s+\d{4}\s+([a-zA-Z\s]+(?:srl|S\.R\.L\.))/i);
  if (middleMatch) {
    return middleMatch[1].trim();
  }
  
  // FALLBACK: Caută orice text urmat de "srl", "S.R.L.", "SRL"
  const srlFallback = fileName.match(/([A-Z][a-zA-Z\s&]+(?:srl|S\.R\.L\.|SRL))/i);
  if (srlFallback) {
    return srlFallback[1].trim();
  }
  
  return null;
};
