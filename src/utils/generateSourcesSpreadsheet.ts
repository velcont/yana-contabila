import * as XLSX from 'xlsx';

export interface SourceEntry {
  index: number;
  source: string;
  author: string;
  year: number;
  type: 'Articol' | 'Carte' | 'Studiu' | 'Video' | 'Website' | 'Raport';
  citedPages: string;
  conceptsUsed: string;
  readingTime?: string;
  accessDate: string;
  url?: string;
  notes?: string;
}

export const generateSourcesSpreadsheet = async (
  sources: SourceEntry[],
  chapterNumber: number
): Promise<Blob> => {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data for main sheet
  const mainData = [
    ['BIBLIOGRAFIE DETALIATĂ - CAPITOL ' + chapterNumber],
    [''],
    ['#', 'Sursă', 'Autor', 'An', 'Tip', 'Citată în', 'Concepte folosite', 'Timp lectură', 'Data accesare', 'URL', 'Note'],
    ...sources.map(s => [
      s.index,
      s.source,
      s.author,
      s.year,
      s.type,
      s.citedPages,
      s.conceptsUsed,
      s.readingTime || 'N/A',
      s.accessDate,
      s.url || '',
      s.notes || ''
    ])
  ];
  
  const ws1 = XLSX.utils.aoa_to_sheet(mainData);
  
  // Set column widths
  ws1['!cols'] = [
    { wch: 5 },  // #
    { wch: 40 }, // Sursă
    { wch: 20 }, // Autor
    { wch: 6 },  // An
    { wch: 10 }, // Tip
    { wch: 15 }, // Citată în
    { wch: 30 }, // Concepte
    { wch: 12 }, // Timp
    { wch: 15 }, // Data
    { wch: 40 }, // URL
    { wch: 30 }  // Note
  ];
  
  // Style header rows
  if (ws1['A1']) ws1['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } };
  
  XLSX.utils.book_append_sheet(wb, ws1, 'Bibliografie');
  
  // Add statistics sheet
  const totalSources = sources.length;
  const byType = sources.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const statsData = [
    ['STATISTICI SURSE'],
    [''],
    ['Total surse:', totalSources],
    [''],
    ['Distribuție pe tipuri:'],
    ...Object.entries(byType).map(([type, count]) => [type, count]),
    [''],
    ['Perioada acoperită:'],
    ['Cel mai vechi:', Math.min(...sources.map(s => s.year))],
    ['Cel mai recent:', Math.max(...sources.map(s => s.year))],
    [''],
    ['Total timp lectură estimat:'],
    [sources.filter(s => s.readingTime).length + ' surse cu timp înregistrat']
  ];
  
  const ws2 = XLSX.utils.aoa_to_sheet(statsData);
  ws2['!cols'] = [{ wch: 30 }, { wch: 15 }];
  
  XLSX.utils.book_append_sheet(wb, ws2, 'Statistici');
  
  // Add concepts index sheet
  const conceptsMap = new Map<string, SourceEntry[]>();
  sources.forEach(source => {
    const concepts = source.conceptsUsed.split(',').map(c => c.trim());
    concepts.forEach(concept => {
      if (!conceptsMap.has(concept)) {
        conceptsMap.set(concept, []);
      }
      conceptsMap.get(concept)!.push(source);
    });
  });
  
  const conceptsData = [
    ['INDEX CONCEPTE'],
    [''],
    ['Concept', 'Număr surse', 'Surse'],
    ...Array.from(conceptsMap.entries()).map(([concept, sources]) => [
      concept,
      sources.length,
      sources.map(s => `${s.author} (${s.year})`).join('; ')
    ])
  ];
  
  const ws3 = XLSX.utils.aoa_to_sheet(conceptsData);
  ws3['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 60 }];
  
  XLSX.utils.book_append_sheet(wb, ws3, 'Index Concepte');
  
  // Convert to blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

// Helper function to extract sources from chapter content
export const extractSourcesFromContent = (
  content: string,
  chapterNumber: number
): SourceEntry[] => {
  const sources: SourceEntry[] = [];
  
  // This is a simplified version - in reality, you'd parse citations more carefully
  const citationPattern = /\(([^,]+),\s*(\d{4})\)/g;
  const citations = content.match(citationPattern);
  
  if (citations) {
    const uniqueCitations = new Set(citations);
    let index = 1;
    
    uniqueCitations.forEach(citation => {
      const match = citation.match(/\(([^,]+),\s*(\d{4})\)/);
      if (match) {
        sources.push({
          index: index++,
          source: `Sursă detectată automat din text`,
          author: match[1],
          year: parseInt(match[2]),
          type: 'Articol',
          citedPages: `Capitol ${chapterNumber}`,
          conceptsUsed: 'Detectare automată',
          accessDate: new Date().toLocaleDateString('ro-RO')
        });
      }
    });
  }
  
  return sources;
};
