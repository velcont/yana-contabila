import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

interface BalanceData {
  cui: string;
  companyName: string;
  accounts: Record<string, { debit: number; credit: number }>;
}

const accountExplanations: Record<string, { name: string; explanation: string; implications: string }> = {
  "1012": {
    name: "Capital social subscris și vărsat",
    explanation: "Reprezintă valoarea capitalului social pe care asociații/acționarii s-au angajat să-l aducă în societate și care a fost efectiv vărsat.",
    implications: "Capitalul social trebuie să corespundă cu cel înscris în actul constitutiv și în Registrul Comerțului. Un capital prea mic poate limita credibilitatea și capacitatea de creditare a firmei."
  },
  "21": {
    name: "Imobilizări corporale",
    explanation: "Bunuri tangibile pe care firma le deține și le folosește pe termen lung (clădiri, mașini, echipamente, mobilier).",
    implications: "Valoarea zero indică că firma nu deține active fixe proprii sau acestea au fost deja amortizate complet. Aceasta poate semnifica fie o afacere în fază incipientă, fie una bazată pe servicii care nu necesită echipamente costisitoare."
  },
  "371": {
    name: "Mărfuri în stoc",
    explanation: "Produse pe care firma le cumpără pentru revânzare, aflate în depozit la sfârșitul perioadei.",
    implications: "Dacă valoarea este zero, înseamnă că firma nu deține stocuri de mărfuri. Acest lucru poate fi normal pentru firmele de servicii sau poate indica o politică de vânzare imediată (just-in-time). Pentru firme de comerț, lipsa stocurilor poate semnala fie vânzări foarte rapide, fie probleme în aprovizionare."
  },
  "5311": {
    name: "Casa (numerar cash)",
    explanation: "Bani lichizi deținuți fizic în casieria firmei.",
    implications: "Valoarea trebuie să corespundă cu registrul de casă și cu realitatea. Este esențial să existe documente justificative pentru toate operațiunile de numerar. ANAF verifică cu atenție fluxurile de casă pentru a preveni evaziunea fiscală."
  },
  "5121": {
    name: "Conturi bancare",
    explanation: "Banii deținuți în conturile bancare ale firmei. Rulajul debitor reprezintă intrările de bani.",
    implications: "Rulajul arată activitatea financiară a companiei. Intrări mari indică venituri sănătoase. Este recomandat să se mențină un sold pozitiv pentru a acoperi cheltuielile curente și pentru a demonstra stabilitate financiară."
  },
  "401": {
    name: "Datorii către furnizori",
    explanation: "Sume pe care firma le datorează furnizorilor pentru bunuri/servicii primite dar neachitate încă.",
    implications: "Aceste datorii trebuie plătite la scadență. Întârzieri repetate pot afecta relațiile comerciale și pot atrage penalități. Este important să se monitorizeze termenii de plată și să se prioritizeze furnizorii strategici."
  },
  "4111": {
    name: "Creanțe de la clienți",
    explanation: "Sume pe care clienții le datorează firmei pentru bunuri/servicii livrate dar neîncasate încă.",
    implications: "Valoarea zero poate indica fie că toate facturile au fost încasate (semn pozitiv), fie că firma lucrează exclusiv pe bază de plată anticipată. Pentru sănătatea financiară, este ideal să se mențină termenele de încasare cât mai scurte."
  },
  "6022": {
    name: "Cheltuieli cu energia și apa",
    explanation: "Costuri cu electricitate, gaze naturale, apă pentru desfășurarea activității.",
    implications: "Aceste cheltuieli sunt deductibile fiscal dacă sunt justificate corespunzător. Rulajul debitor indică totalul cheltuielilor din perioada respectivă. Pentru optimizare, se pot analiza consumurile și căuta soluții de eficientizare energetică."
  },
  "707": {
    name: "Venituri din vânzări de mărfuri",
    explanation: "Încasări din vânzarea produselor către clienți. Rulajul creditor reprezintă totalul vânzărilor din perioada respectivă.",
    implications: "Veniturile trebuie să fie declarate corect la ANAF. Un rulaj sănătos indică o activitate comercială bună. Este esențial ca toate vânzările să fie însoțite de facturi fiscale și să fie raportate în declarațiile fiscale."
  },
  "121": {
    name: "Profit sau pierdere",
    explanation: "Rezultatul financiar al perioadei: diferența dintre venituri și cheltuieli.",
    implications: "Un profit pozitiv indică că firma generează venituri mai mari decât cheltuielile. Profitul este supus impozitării (16% impozit pe profit sau 1-3% impozit pe cifra de afaceri pentru microîntreprinderi). Pierderea poate fi reportată în anii următori pentru a reduce baza impozabilă."
  }
};

export const BalanceConfirmation = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [previewData, setPreviewData] = useState<Array<{code: string, name: string, debit: number, credit: number}>>([]);
  const [columnsDetected, setColumnsDetected] = useState<{debit: number, credit: number} | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'xls' || fileExtension === 'xlsx') {
        setFile(selectedFile);
        toast({
          title: "Fișier încărcat",
          description: `${selectedFile.name} a fost selectat.`,
        });
      } else {
        toast({
          title: "Format invalid",
          description: "Vă rugăm să încărcați un fișier Excel (.xls sau .xlsx)",
          variant: "destructive",
        });
      }
    }
  };

  const parseExcelFile = async (file: File): Promise<BalanceData | null> => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      let cui = "";
      let companyName = "";
      const accounts: Record<string, { debit: number; credit: number }> = {};

      // Step 1: Detect column indices for "Solduri finale"
      let finalDebitColIndex = -1;
      let finalCreditColIndex = -1;
      
      for (let i = 0; i < Math.min(15, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;

        for (let j = 0; j < row.length; j++) {
          const cellValue = row[j]?.toString().toLowerCase() || "";
          
          // Search for "Solduri finale" or "Sold final" headers
          if (cellValue.includes("solduri finale") || cellValue.includes("sold final")) {
            if (cellValue.includes("debitor")) finalDebitColIndex = j;
            if (cellValue.includes("creditor")) finalCreditColIndex = j;
          }
        }
        
        // If both columns found, stop searching
        if (finalDebitColIndex !== -1 && finalCreditColIndex !== -1) break;
      }
      
      // Fallback to columns 8-9 if headers not found
      if (finalDebitColIndex === -1) finalDebitColIndex = 8;
      if (finalCreditColIndex === -1) finalCreditColIndex = 9;

      console.log(`📊 Coloane detectate - Debit: ${finalDebitColIndex}, Credit: ${finalCreditColIndex}`);
      setColumnsDetected({ debit: finalDebitColIndex, credit: finalCreditColIndex });

      // Extract CUI and Company Name
      for (let i = 0; i < Math.min(20, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;

        // Extract CUI
        for (let j = 0; j < row.length; j++) {
          const cell = row[j]?.toString() || "";
          if (cell.includes("CUI") || cell.includes("C.U.I")) {
            const cuiMatch = cell.match(/\d{8,}/);
            if (cuiMatch) cui = cuiMatch[0];
          }
        }

        // Extract Company Name
        if (row[0]?.toString().includes("BALANTA") || row[0]?.toString().includes("Denumire")) {
          const match = row[0].toString().match(/BALANTA\s+(.+?)\s+\d/);
          if (match) {
            companyName = match[1].trim();
          } else if (row[0]?.toString().includes("Denumire")) {
            companyName = row[1]?.toString() || "";
          }
        }
      }

      // Parse accounts data
      const preview: Array<{code: string, name: string, debit: number, credit: number}> = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row) continue;

        // Skip header rows
        if (row[0]?.toString().toLowerCase().includes("cont")) continue;
        
        if (row.some((cell) => cell?.toString().toLowerCase().includes("total"))) {
          break;
        }

        if (row.length > 1) {
          // Look for account numbers (starting with digits)
          if (row[0] && /^\d+/.test(row[0].toString())) {
            const accountCode = row[0].toString();
            const accountName = row[1]?.toString() || "";
            const debit = parseFloat(row[finalDebitColIndex]?.toString() || "0") || 0;
            const credit = parseFloat(row[finalCreditColIndex]?.toString() || "0") || 0;
            
            accounts[accountCode] = { debit, credit };
            
            // Add to preview (first 5 accounts only)
            if (preview.length < 5 && (debit > 0 || credit > 0)) {
              preview.push({ code: accountCode, name: accountName, debit, credit });
            }
          }
        }
      }

      setPreviewData(preview);
      return { cui, companyName, accounts };
    } catch (error) {
      console.error("Error parsing Excel:", error);
      return null;
    }
  };

  const generateWordDocument = async () => {
    if (!balanceData) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "CONFIRMARE DATE FINANCIARE",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Companie: ", bold: true }),
              new TextRun(balanceData.companyName),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CUI: ", bold: true }),
              new TextRun(balanceData.cui),
            ],
            spacing: { after: 400 },
          }),

          // Generate sections for each account
          ...Object.entries(balanceData.accounts).flatMap(([code, values]) => {
            const shortCode = code.substring(0, 4);
            const explanation = accountExplanations[shortCode] || accountExplanations[code.substring(0, 2)];
            
            if (!explanation) return [];

            const displayValue = values.debit || values.credit || 0;
            const valueType = values.debit ? "(sold final debitor)" : values.credit ? "(sold final creditor)" : "";

            return [
              new Paragraph({
                text: explanation.name,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Valoare (cont ${code}): `, bold: true }),
                  new TextRun(`${displayValue.toFixed(2)} RON ${valueType}`),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Ce înseamnă: ", bold: true }),
                  new TextRun(explanation.explanation),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Implicații și recomandări: ", bold: true }),
                  new TextRun(explanation.implications),
                ],
                spacing: { after: 400 },
              }),
            ];
          }),

          new Paragraph({
            text: "DECLARAȚIE DE CONFIRMARE",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 600, after: 300 },
          }),
          new Paragraph({
            text: "Subsemnatul/Subsemnata, în calitate de administrator/asociat al societății menționate mai sus, declar că:",
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: "✓ Am înțeles explicațiile furnizate pentru fiecare cont din balanța contabilă",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "✓ Confirm că datele financiare prezentate sunt corecte și complete",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "✓ Înțeleg implicațiile fiscale și comerciale ale acestor cifre",
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: "✓ Îmi asum responsabilitatea pentru orice date neprecizate contabilului",
            spacing: { after: 400 },
          }),

          // ========== NOTĂ JURIDICĂ ȘI CONFIRMARE ==========
          new Paragraph({
            text: "",
            spacing: { before: 600, after: 400 },
            border: {
              top: {
                color: "CCCCCC",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6
              }
            }
          }),
          new Paragraph({
            text: "NOTĂ JURIDICĂ ȘI CONFIRMARE",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Prin prezentul document, cabinetul de contabilitate vă informează oficial cu privire la situația contabilă a societății dumneavoastră pentru perioada menționată.",
                size: 20,
              })
            ],
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "În conformitate cu prevederile contractului de prestări servicii de contabilitate și cu legislația în vigoare, vă rugăm să analizați cu atenție informațiile prezentate în acest raport.",
                size: 20,
              })
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "TERMEN DE RĂSPUNS: ", size: 20, bold: true }),
              new TextRun({
                text: "Aveți la dispoziție 5 (cinci) zile lucrătoare de la primirea acestui document pentru a transmite eventuale obiecțiuni, completări sau solicitări de clarificări referitoare la datele prezentate.",
                size: 20,
              })
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CONFIRMARE TACITĂ: ", size: 20, bold: true }),
              new TextRun({
                text: "În absența oricărei comunicări scrise din partea dumneavoastră în termenul menționat mai sus, se consideră că:",
                size: 20,
              })
            ],
            spacing: { after: 100 },
            alignment: AlignmentType.JUSTIFIED
          }),
          new Paragraph({
            children: [ new TextRun({ text: "  • Ați luat la cunoștință situația contabilă prezentată", size: 20 }) ],
            spacing: { after: 100 },
            indent: { left: 400 }
          }),
          new Paragraph({
            children: [ new TextRun({ text: "  • Confirmați corectitudinea datelor din punct de vedere al activității societății", size: 20 }) ],
            spacing: { after: 100 },
            indent: { left: 400 }
          }),
          new Paragraph({
            children: [ new TextRun({ text: "  • Luna/Perioada contabilă este încheiată și validată din punct de vedere contabil", size: 20 }) ],
            spacing: { after: 300 },
            indent: { left: 400 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "RESPONSABILITATE: ", size: 20, bold: true }),
              new TextRun({
                text: "Vă reamintim că documentele justificative (facturi, chitanțe, extrase bancare) trebuie să fie transmise cabinetului nostru în termenele stabilite contractual. Orice documente transmise după încheierea perioadei vor fi înregistrate în luna/trimestrul următor, conform prevederilor legale.",
                size: 20,
              })
            ],
            spacing: { after: 300 },
            alignment: AlignmentType.JUSTIFIED
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "OBIECȚIUNI: ", size: 20, bold: true }),
              new TextRun({
                text: "Eventualele obiecțiuni trebuie comunicate în scris (email sau scrisoare) la datele de contact menționate în contractul de prestări servicii.",
                size: 20,
              })
            ],
            spacing: { after: 400 },
            alignment: AlignmentType.JUSTIFIED
          }),
          new Paragraph({
            children: [ new TextRun({ text: `Data generării documentului: ${new Date().toLocaleDateString('ro-RO')}`, size: 18, italics: true }) ],
            spacing: { after: 100 },
          }),

          // Semnătură la final
          new Paragraph({
            text: "Semnătura: _________________________     Data: _________________",
            spacing: { before: 400 },
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Confirmare_Balanta_${balanceData.companyName}_${new Date().toISOString().split('T')[0]}.docx`);
    
    toast({
      title: "Document generat",
      description: "Documentul Word a fost descărcat cu succes.",
    });
  };

  const handleProcess = async () => {
    if (!file) {
      toast({
        title: "Eroare",
        description: "Vă rugăm să selectați un fișier Excel.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const data = await parseExcelFile(file);
      if (data) {
        setBalanceData(data);
        toast({
          title: "Fișier procesat",
          description: "Verifică datele detectate înainte de generare.",
        });
      } else {
        toast({
          title: "Eroare",
          description: "Nu s-au putut extrage datele din fișier. Verificați formatul.",
          variant: "destructive",
        });
        setPreviewData([]);
        setColumnsDetected(null);
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description: "A apărut o eroare la procesarea fișierului.",
        variant: "destructive",
      });
      setPreviewData([]);
      setColumnsDetected(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generare Document de Confirmare Balanță</CardTitle>
          <CardDescription>
            Încărcați fișierul Excel cu balanța contabilă pentru a genera un document Word cu explicații detaliate pentru client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="balance-file">Fișier Excel Balanță (.xls, .xlsx)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="balance-file"
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="flex-1"
              />
              <Button
                onClick={handleProcess}
                disabled={!file || isProcessing}
                className="btn-hover-lift"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesare...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Procesează
                  </>
                )}
              </Button>
            </div>
          </div>

          {balanceData && (
            <div className="space-y-6">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold">Companie: </span>
                      <span>{balanceData.companyName}</span>
                    </div>
                    <div>
                      <span className="font-semibold">CUI: </span>
                      <span>{balanceData.cui}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Conturi extrase: </span>
                      <span>{Object.keys(balanceData.accounts).length}</span>
                    </div>
                  </div>
                  <FileText className="h-12 w-12 text-primary" />
                </div>
              </div>

              {columnsDetected && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">✓ Coloane detectate automat:</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Sold Debitor: Coloana {columnsDetected.debit + 1} | Sold Creditor: Coloana {columnsDetected.credit + 1}
                  </p>
                </div>
              )}

              {previewData.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <h3 className="font-semibold text-sm p-3 bg-muted">Preview date detectate (primele 5 conturi):</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left">Cont</th>
                          <th className="p-2 text-left">Denumire</th>
                          <th className="p-2 text-right">Sold Debitor</th>
                          <th className="p-2 text-right">Sold Creditor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 font-mono">{item.code}</td>
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 text-right font-mono">{item.debit.toFixed(2)}</td>
                            <td className="p-2 text-right font-mono">{item.credit.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <Button
                onClick={generateWordDocument}
                className="w-full btn-hover-lift"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Confirmă și Generează Document Word
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
