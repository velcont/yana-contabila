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

export const parseStatisticsExcel = async (file: File): Promise<StatisticsData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Presupunem că datele sunt în primul sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertim la JSON - presupunem că prima linie este header
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Găsim coloanele pentru Perioada, Șomaj și PIB
        const headerRow = jsonData[0];
        
        // Funcție helper pentru căutare mai flexibilă
        const findColumn = (keywords: string[]) => {
          return headerRow.findIndex((h: any) => {
            if (!h) return false;
            const cellValue = h.toString().toLowerCase()
              .replace(/ș/g, 's')
              .replace(/ț/g, 't')
              .replace(/ă/g, 'a')
              .replace(/î/g, 'i')
              .replace(/â/g, 'a')
              .trim();
            return keywords.some(keyword => cellValue.includes(keyword));
          });
        };
        
        const periodCol = findColumn(['perioad', 'trimest', 'data', 'an', 'luna']);
        const somajCol = findColumn(['somaj', 'unemployment', 'rata somaj', 'x']);
        const pibCol = findColumn(['pib', 'gdp', 'produs intern brut', 'y']);
        
        if (periodCol === -1 || somajCol === -1 || pibCol === -1) {
          const foundColumns = headerRow.map((h: any, i: number) => `${i}: "${h}"`).join(', ');
          throw new Error(
            `Nu s-au găsit coloanele necesare.\n\n` +
            `Coloanele găsite în Excel: ${foundColumns}\n\n` +
            `Te rog asigură-te că Excel-ul conține:\n` +
            `- O coloană pentru perioadă/dată (ex: "Perioada", "Trimestrul")\n` +
            `- O coloană pentru șomaj (ex: "Somaj", "Rata șomajului", "X")\n` +
            `- O coloană pentru PIB (ex: "PIB", "Y")`
          );
        }
        
        // Extragem observațiile (skip header)
        const observations = jsonData.slice(1)
          .filter(row => row[periodCol] && row[somajCol] && row[pibCol])
          .map(row => ({
            period: row[periodCol].toString(),
            somaj: parseFloat(row[somajCol].toString()),
            pib: parseFloat(row[pibCol].toString())
          }));
        
        if (observations.length === 0) {
          throw new Error('Nu s-au găsit date valide în fișierul Excel');
        }
        
        // Calculăm indicatorii statistici
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
