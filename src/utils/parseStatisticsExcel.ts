import * as XLSX from 'xlsx';

export interface StatisticsData {
  // Date brute
  observations: Array<{
    period: string;
    somaj: number; // X - Rata șomajului
    pib: number;   // Y - PIB
  }>;
  
  // Indicatori calculați pentru Șomaj (X)
  somajIndicators: {
    media: number;
    mediana: number;
    stdDev: number;
    cv: number;
    asimetrie: number;
    boltire: number;
  };
  
  // Indicatori calculați pentru PIB (Y)
  pibIndicators: {
    media: number;
    mediana: number;
    stdDev: number;
    cv: number;
    asimetrie: number;
    boltire: number;
  };
  
  // Metadata
  startPeriod: string;
  endPeriod: string;
  totalObservations: number;
}

export const parseStatisticsExcel = async (
  file: File,
  manualMapping?: {
    sheetName: string;
    headerRow: number;
    periodCol: number;
    somajCol: number;
    pibCol: number;
  }
): Promise<StatisticsData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Helper pentru normalizare diacritice
        const normalize = (text: string) => {
          return text.toString().toLowerCase()
            .replace(/ș/g, 's')
            .replace(/ț/g, 't')
            .replace(/ă/g, 'a')
            .replace(/î/g, 'i')
            .replace(/â/g, 'a')
            .trim();
        };
        
        // Helper pentru conversie numerică tolerantă
        const parseNumber = (val: any): number => {
          if (typeof val === 'number') return val;
          const str = val.toString().replace(/,/g, '.');
          const num = parseFloat(str);
          return isNaN(num) ? 0 : num;
        };
        
        // Dacă avem mapping manual, folosim asta
        if (manualMapping) {
          const worksheet = workbook.Sheets[manualMapping.sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          const observations = jsonData
            .slice(manualMapping.headerRow + 1)
            .filter(row => row[manualMapping.periodCol] && row[manualMapping.somajCol] && row[manualMapping.pibCol])
            .map(row => ({
              period: row[manualMapping.periodCol].toString(),
              somaj: parseNumber(row[manualMapping.somajCol]),
              pib: parseNumber(row[manualMapping.pibCol])
            }))
            .filter(o => !isNaN(o.somaj) && !isNaN(o.pib));
          
          if (observations.length === 0) {
            throw new Error('Nu s-au găsit date valide cu mapping-ul specificat');
          }
          
          const somajValues = observations.map(o => o.somaj);
          const pibValues = observations.map(o => o.pib);
          
          const somajIndicators = calculateIndicators(somajValues);
          const pibIndicators = calculateIndicators(pibValues);
          
          return resolve({
            observations,
            somajIndicators,
            pibIndicators,
            startPeriod: observations[0].period,
            endPeriod: observations[observations.length - 1].period,
            totalObservations: observations.length
          });
        }
        
        // Auto-detect: Scanăm toate sheet-urile
        let bestMatch: {
          sheetName: string;
          headerRowIdx: number;
          periodCol: number;
          somajCol: number;
          pibCol: number;
          score: number;
        } | null = null;
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          // Căutăm header în primele 50 de rânduri
          for (let rowIdx = 0; rowIdx < Math.min(50, jsonData.length); rowIdx++) {
            const row = jsonData[rowIdx];
            if (!row || row.length < 3) continue;
            
            // Funcție pentru a găsi coloana
            const findColumn = (keywords: string[]) => {
              return row.findIndex((h: any) => {
                if (!h) return false;
                const cellValue = normalize(h.toString());
                return keywords.some(keyword => cellValue.includes(keyword));
              });
            };
            
            const periodCol = findColumn(['perioad', 'trimest', 'data', 'an', 'luna']);
            const somajCol = findColumn(['somaj', 'unemployment', 'rata somaj', 'x']);
            const pibCol = findColumn(['pib', 'gdp', 'produs intern brut', 'y']);
            
            // Calculăm scor: câte coloane am găsit
            let score = 0;
            if (periodCol !== -1) score++;
            if (somajCol !== -1) score++;
            if (pibCol !== -1) score++;
            
            // Verificăm și că avem suficiente date după header
            if (score === 3) {
              const dataRows = jsonData.slice(rowIdx + 1).filter(r => 
                r[periodCol] && r[somajCol] && r[pibCol]
              );
              score += Math.min(dataRows.length / 10, 5); // Bonus pentru date suficiente
              
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = {
                  sheetName,
                  headerRowIdx: rowIdx,
                  periodCol,
                  somajCol,
                  pibCol,
                  score
                };
              }
            }
          }
        }
        
        if (!bestMatch) {
          // Nu am găsit nimic - aruncăm eroare detaliată
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          const sampleHeaders = jsonData.slice(0, 5).map((row: any[], idx) => 
            `Rând ${idx}: ${row.slice(0, 10).map(h => `"${h}"`).join(', ')}`
          ).join('\n');
          
          throw new Error(
            `Nu s-au detectat automat coloanele necesare.\n\n` +
            `Primele rânduri din sheet "${firstSheet}":\n${sampleHeaders}\n\n` +
            `Cauze posibile:\n` +
            `- Header-ul nu este în primele 50 de rânduri\n` +
            `- Coloanele au nume neașteptate\n` +
            `- Date lipsă sau format incorect\n\n` +
            `Vei putea selecta manual coloanele.`
          );
        }
        
        // Am găsit match - procesăm datele
        const worksheet = workbook.Sheets[bestMatch.sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        const observations = jsonData
          .slice(bestMatch.headerRowIdx + 1)
          .filter(row => row[bestMatch.periodCol] && row[bestMatch.somajCol] && row[bestMatch.pibCol])
          .map(row => ({
            period: row[bestMatch.periodCol].toString(),
            somaj: parseNumber(row[bestMatch.somajCol]),
            pib: parseNumber(row[bestMatch.pibCol])
          }))
          .filter(o => !isNaN(o.somaj) && !isNaN(o.pib));
        
        if (observations.length === 0) {
          throw new Error('Nu s-au găsit date valide în fișierul Excel');
        }
        
        const somajValues = observations.map(o => o.somaj);
        const pibValues = observations.map(o => o.pib);
        
        const somajIndicators = calculateIndicators(somajValues);
        const pibIndicators = calculateIndicators(pibValues);
        
        resolve({
          observations,
          somajIndicators,
          pibIndicators,
          startPeriod: observations[0].period,
          endPeriod: observations[observations.length - 1].period,
          totalObservations: observations.length
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Eroare la citirea fișierului'));
    reader.readAsBinaryString(file);
  });
};

function calculateIndicators(values: number[]) {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  
  // Media
  const media = values.reduce((sum, v) => sum + v, 0) / n;
  
  // Mediana
  const mediana = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  // Abaterea standard
  const variance = values.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  // Coeficient de variație
  const cv = (stdDev / media) * 100;
  
  // Asimetrie (Skewness) - Fisher-Pearson
  const m3 = values.reduce((sum, v) => sum + Math.pow(v - media, 3), 0) / n;
  const asimetrie = m3 / Math.pow(stdDev, 3);
  
  // Boltire (Kurtosis) - Excess kurtosis
  const m4 = values.reduce((sum, v) => sum + Math.pow(v - media, 4), 0) / n;
  const boltire = (m4 / Math.pow(stdDev, 4)) - 3;
  
  return {
    media: parseFloat(media.toFixed(3)),
    mediana: parseFloat(mediana.toFixed(3)),
    stdDev: parseFloat(stdDev.toFixed(3)),
    cv: parseFloat(cv.toFixed(2)),
    asimetrie: parseFloat(asimetrie.toFixed(3)),
    boltire: parseFloat(boltire.toFixed(3))
  };
}
