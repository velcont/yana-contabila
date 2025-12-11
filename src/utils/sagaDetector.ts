/**
 * SAGA FORMAT DETECTOR
 * 
 * Detectează dacă un fișier Excel este exportat din software-ul SAGA
 * bazat pe caracteristicile specifice ale formatului:
 * - Header pe multiple rânduri
 * - Coloane goale consecutive
 * - Pattern-uri specifice de text
 */

/**
 * Verifică dacă un ArrayBuffer/Uint8Array conține un Excel în format SAGA
 * Această funcție poate fi apelată înainte de upload pentru a decide ce parser să folosim
 */
export async function detectSagaFormat(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        
        // Import XLSX dinamic pentru a evita bundle size
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][];
        
        const isSaga = checkSagaPatterns(data);
        console.log(`[SAGA-DETECTOR] Format detectat: ${isSaga ? 'SAGA' : 'Standard'}`);
        resolve(isSaga);
      } catch (error) {
        console.error('[SAGA-DETECTOR] Error parsing file:', error);
        resolve(false); // În caz de eroare, folosim parser-ul standard
      }
    };
    
    reader.onerror = () => {
      console.error('[SAGA-DETECTOR] Error reading file');
      resolve(false);
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Verifică pattern-urile specifice SAGA în datele Excel
 */
function checkSagaPatterns(data: any[][]): boolean {
  if (!data || data.length < 10) return false;
  
  let sagaScore = 0;
  
  // 1. Verifică dacă există "Balanta de verificare" în primele rânduri
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const rowStr = data[i].map(c => String(c).toLowerCase()).join(' ');
    if (rowStr.includes('balanta de verificare') || rowStr.includes('balanța de verificare')) {
      sagaScore += 2;
      console.log('[SAGA-DETECTOR] Pattern găsit: "Balanta de verificare"');
    }
  }
  
  // 2. Verifică coloane goale consecutive (caracteristică SAGA)
  // SAGA are grupuri de coloane separate de coloane goale
  let consecutiveEmptyColumns = 0;
  let maxConsecutiveEmpty = 0;
  
  // Verificăm pe primele 15 rânduri care par să aibă date
  for (let i = 10; i < Math.min(20, data.length); i++) {
    if (!data[i] || data[i].length < 5) continue;
    
    consecutiveEmptyColumns = 0;
    for (let j = 0; j < data[i].length; j++) {
      const cell = String(data[i][j] || '').trim();
      if (cell === '' || cell === '0' || cell === '0.00') {
        consecutiveEmptyColumns++;
        maxConsecutiveEmpty = Math.max(maxConsecutiveEmpty, consecutiveEmptyColumns);
      } else {
        consecutiveEmptyColumns = 0;
      }
    }
  }
  
  if (maxConsecutiveEmpty >= 2) {
    sagaScore += 1;
    console.log(`[SAGA-DETECTOR] Coloane goale consecutive găsite: ${maxConsecutiveEmpty}`);
  }
  
  // 3. Verifică header pe multiple rânduri (caracteristică SAGA)
  // SAGA are header-ul împărțit pe 2-3 rânduri
  let headerRowsCount = 0;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const rowStr = data[i].map(c => String(c).toLowerCase()).join('|');
    
    // Rânduri care par a fi header
    if (
      (rowStr.includes('sold') && !rowStr.match(/^\d/)) ||
      (rowStr.includes('rulaj') && !rowStr.match(/^\d/)) ||
      (rowStr.includes('debit') && rowStr.includes('credit')) ||
      (rowStr.includes('total sume'))
    ) {
      headerRowsCount++;
    }
  }
  
  if (headerRowsCount >= 2) {
    sagaScore += 2;
    console.log(`[SAGA-DETECTOR] Header pe multiple rânduri: ${headerRowsCount}`);
  }
  
  // 4. Verifică dacă există "Total sume" ca header (specific SAGA)
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const rowStr = data[i].map(c => String(c).toLowerCase()).join(' ');
    if (rowStr.includes('total sume') || rowStr.includes('total rulaje')) {
      sagaScore += 1;
      console.log('[SAGA-DETECTOR] Pattern găsit: "Total sume/rulaje"');
      break;
    }
  }
  
  // 5. Verifică structura tipică SAGA: "Sold inițial" urmat de "Rulaje" urmat de "Total"
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const rowStr = data[i].map(c => String(c).toLowerCase()).join('|');
    if (rowStr.includes('sold') && rowStr.includes('rulaj') && rowStr.includes('total')) {
      sagaScore += 2;
      console.log('[SAGA-DETECTOR] Structură SAGA completă găsită pe un rând');
      break;
    }
  }
  
  console.log(`[SAGA-DETECTOR] Scor total SAGA: ${sagaScore}/8`);
  
  // Pragul pentru a considera fișierul ca SAGA
  return sagaScore >= 3;
}

/**
 * Verifică rapid doar bazat pe conținutul primelor celule
 * Folosit pentru o verificare inițială rapidă
 */
export function quickSagaCheck(firstRowsText: string): boolean {
  const lowerText = firstRowsText.toLowerCase();
  
  // Pattern-uri rapide care indică SAGA
  const sagaPatterns = [
    'balanta de verificare',
    'balanța de verificare',
    'sold initial||',  // Coloane goale consecutive
    '||debit||credit',
    'total sume debitoare',
    'total sume creditoare'
  ];
  
  return sagaPatterns.some(pattern => lowerText.includes(pattern));
}
