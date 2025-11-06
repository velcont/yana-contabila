import * as XLSX from 'xlsx';

export const generateBibliographySpreadsheet = async (sources: Array<{
  index: number;
  author: string;
  year: number;
  title: string;
  journal: string;
  citedIn: string;
  conceptsUsed: string;
  readingTime: string;
  accessDate: string;
}>) => {
  const worksheet = XLSX.utils.json_to_sheet(sources.map(s => ({
    'Nr.': s.index,
    'Autor(i)': s.author,
    'An': s.year,
    'Titlu': s.title,
    'Revista/Carte': s.journal,
    'Citat în': s.citedIn,
    'Concepte folosite': s.conceptsUsed,
    'Timp lectură': s.readingTime,
    'Data acces': s.accessDate
  })));
  
  // Auto-width columns
  const cols = [
    { wch: 5 },  // Nr
    { wch: 35 }, // Autor
    { wch: 6 },  // An
    { wch: 50 }, // Titlu
    { wch: 40 }, // Revista
    { wch: 25 }, // Citat în
    { wch: 50 }, // Concepte
    { wch: 20 }, // Timp
    { wch: 12 }  // Data
  ];
  worksheet['!cols'] = cols;
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bibliografie Detaliată');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
