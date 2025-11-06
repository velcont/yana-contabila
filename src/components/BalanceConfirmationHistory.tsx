import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2, Calendar, Building2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BalanceConfirmation {
  id: string;
  cui: string | null;
  company_name: string;
  accounts_data: Record<string, { debit: number; credit: number }>;
  created_at: string;
}

const accountExplanations: Record<string, { name: string; explanation: string; implications: string }> = {
  "1012": {
    name: "Capital social subscris și vărsat",
    explanation: "Reprezintă valoarea capitalului social pe care asociații/acționarii s-au angajat să-l aducă în societate și care a fost efectiv vărsat.",
    implications: "Capitalul social trebuie să corespundă cu cel înscris în actul constitutiv și în Registrul Comerțului."
  },
  "21": {
    name: "Imobilizări corporale",
    explanation: "Bunuri tangibile pe care firma le deține și le folosește pe termen lung (clădiri, mașini, echipamente, mobilier).",
    implications: "Valoarea zero indică că firma nu deține active fixe proprii sau acestea au fost deja amortizate complet."
  },
  "371": {
    name: "Mărfuri în stoc",
    explanation: "Produse pe care firma le cumpără pentru revânzare, aflate în depozit la sfârșitul perioadei.",
    implications: "Dacă valoarea este zero, înseamnă că firma nu deține stocuri de mărfuri la momentul respectiv."
  },
  "5311": {
    name: "Casa (numerar cash)",
    explanation: "Bani lichizi deținuți fizic în casieria firmei.",
    implications: "Valoarea trebuie să corespundă cu registrul de casă și cu realitatea. ANAF verifică cu atenție fluxurile de casă."
  },
  "5121": {
    name: "Conturi bancare",
    explanation: "Banii deținuți în conturile bancare ale firmei. Rulajul debitor reprezintă intrările de bani.",
    implications: "Rulajul arată activitatea financiară a companiei. Intrări mari indică venituri sănătoase."
  },
  "401": {
    name: "Datorii către furnizori",
    explanation: "Sume pe care firma le datorează furnizorilor pentru bunuri/servicii primite dar neachitate încă.",
    implications: "Aceste datorii trebuie plătite la scadență. Întârzieri pot afecta relațiile comerciale."
  },
  "4111": {
    name: "Creanțe de la clienți",
    explanation: "Sume pe care clienții le datorează firmei pentru bunuri/servicii livrate dar neîncasate încă.",
    implications: "Pentru sănătatea financiară, este ideal să se mențină termenele de încasare cât mai scurte."
  },
  "6022": {
    name: "Cheltuieli cu combustibil și carburanți",
    explanation: "Costuri cu combustibil pentru vehiculele firmei în perioada respectivă (pe total rulaje).",
    implications: "Aceste cheltuieli sunt deductibile fiscal dacă sunt justificate corespunzător."
  },
  "707": {
    name: "Venituri din vânzări de mărfuri",
    explanation: "Încasări din vânzarea produselor către clienți. Rulajul creditor reprezintă totalul vânzărilor.",
    implications: "Veniturile trebuie să fie declarate corect la ANAF. Toate vânzările necesită facturi fiscale."
  },
  "121": {
    name: "Profit sau pierdere",
    explanation: "Rezultatul financiar al perioadei: diferența dintre venituri și cheltuieli.",
    implications: "Un profit pozitiv este supus impozitării (16% impozit pe profit sau 1-3% pentru micro)."
  }
};

export const BalanceConfirmationHistory = () => {
  const [confirmations, setConfirmations] = useState<BalanceConfirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfirmations();
  }, []);

  const fetchConfirmations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('balance_confirmations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfirmations((data || []).map(item => ({
        ...item,
        accounts_data: item.accounts_data as Record<string, { debit: number; credit: number }>
      })));
    } catch (error) {
      console.error('Error fetching confirmations:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca confirmările.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateWordFromHistory = async (confirmation: BalanceConfirmation) => {
    try {
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
                new TextRun(confirmation.company_name),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "CUI: ", bold: true }),
                new TextRun(confirmation.cui || "N/A"),
              ],
              spacing: { after: 400 },
            }),

            // Generate sections for each account
            ...Object.entries(confirmation.accounts_data).flatMap(([code, values]) => {
              const accountClass = parseInt(code[0]);
              const shortCode = code.substring(0, 4);
              const explanation = accountExplanations[shortCode] || accountExplanations[code.substring(0, 2)];
              
              if (!explanation) return [];

              let displayValue = 0;
              let valueType = "";

              // Logica în funcție de clasa contului
              if (accountClass >= 1 && accountClass <= 5) {
                // Clasa 1-5: Solduri finale
                displayValue = values.debit || values.credit || 0;
                valueType = values.debit ? "(sold final debitor)" : values.credit ? "(sold final creditor)" : "";
              } else if (accountClass === 6) {
                // Clasa 6: Rulaje debitoare
                displayValue = values.debit || 0;
                valueType = "(total rulaje cheltuieli)";
              } else if (accountClass === 7) {
                // Clasa 7: Rulaje creditoare
                displayValue = values.credit || 0;
                valueType = "(total rulaje venituri)";
              }

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
      saveAs(blob, `Confirmare_Balanta_${confirmation.company_name}_${new Date(confirmation.created_at).toISOString().split('T')[0]}.docx`);
      
      toast({
        title: "Document generat",
        description: "Documentul Word a fost descărcat cu succes.",
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut genera documentul.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('balance_confirmations')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setConfirmations(prev => prev.filter(c => c.id !== deleteId));
      toast({
        title: "Șters cu succes",
        description: "Confirmarea a fost ștearsă.",
      });
    } catch (error) {
      console.error('Error deleting confirmation:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge confirmarea.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Istoric Confirmări Balanță</strong><br />
          Aici găsești toate confirmările generate din ChatAI. Poți regenera documentul Word oricând.
        </AlertDescription>
      </Alert>

      {confirmations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nu există confirmări în istoric.<br />
              Generează prima confirmare din <strong>ChatAI</strong> → Încarcă balanță Excel → Generează Word.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {confirmations.map((confirmation) => (
              <Card key={confirmation.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {confirmation.company_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          CUI: {confirmation.cui || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(confirmation.created_at).toLocaleDateString('ro-RO')}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => generateWordFromHistory(confirmation)}
                        className="btn-hover-lift"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descarcă Word
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteId(confirmation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>📊 Conturi detectate: <strong>{Object.keys(confirmation.accounts_data).length}</strong></span>
                    <span>💰 Total sold final: <strong>
                      {Object.values(confirmation.accounts_data)
                        .reduce((sum, acc) => sum + (acc.debit || 0) + (acc.credit || 0), 0)
                        .toFixed(2)} RON
                    </strong></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi această confirmare?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Confirmarea va fi ștearsă permanent din istoricul tău.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
