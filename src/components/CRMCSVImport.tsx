import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CSVImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedClient {
  company_name: string;
  contact_email?: string;
  phone?: string;
  contact_person?: string;
  notes?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; client: string; error: string }>;
}

export const CRMCSVImport = ({ open, onOpenChange, onSuccess }: CSVImportProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedClient[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = "Name,Email,Phone,First Name,Last Name,Tags\nCompany Example SRL,contact@example.com,0721234567,Ion,Popescu,client important";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_clienti_yana.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedClient[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const clients: ParsedClient[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      const firstName = row["first name"] || "";
      const lastName = row["last name"] || "";
      const contactPerson = firstName && lastName ? `${firstName} ${lastName}`.trim() : "";

      const client: ParsedClient = {
        company_name: row.name || "",
        contact_email: row.email || undefined,
        phone: row.phone || undefined,
        contact_person: contactPerson || undefined,
        notes: row.tags || undefined,
      };

      if (client.company_name) {
        clients.push(client);
      }
    }

    return clients;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast({
        title: "Format invalid",
        description: "Vă rugăm să încărcați un fișier CSV.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "Fișier prea mare",
        description: "Dimensiunea maximă este 5MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedClients = parseCSV(text);
      
      if (parsedClients.length === 0) {
        toast({
          title: "Fișier invalid",
          description: "Nu s-au găsit date valide în fișier.",
          variant: "destructive",
        });
        setFile(null);
        return;
      }

      if (parsedClients.length > 1000) {
        toast({
          title: "Prea mulți clienți",
          description: "Puteți importa maxim 1000 de clienți pe operațiune.",
          variant: "destructive",
        });
        setFile(null);
        return;
      }

      setPreview(parsedClients.slice(0, 5));
      toast({
        title: "Fișier încărcat",
        description: `${parsedClients.length} clienți detectați. Verificați preview-ul.`,
      });
    };

    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const clients = parseCSV(text);

        // Simulate progress for better UX
        setProgress(10);
        
        // Show progress toast
        toast({
          title: "Import în curs...",
          description: `Se importă ${clients.length} clienți...`,
        });

        // Progress updates
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 80));
        }, 500);

        const { data, error } = await supabase.functions.invoke("import-crm-clients", {
          body: { clients },
        });

        clearInterval(progressInterval);

        if (error) throw error;

        setResult(data);
        setProgress(100);

        if (data.failed === 0) {
          toast({
            title: "Import finalizat cu succes",
            description: `${data.success} clienți importați cu succes!`,
          });
          onSuccess();
          setTimeout(() => {
            onOpenChange(false);
            resetState();
          }, 3000);
        } else {
          toast({
            title: "Import finalizat cu erori",
            description: `${data.success} clienți importați, ${data.failed} erori.`,
            variant: "destructive",
          });
        }
      };

      reader.readAsText(file);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Eroare la import",
        description: error.message || "A apărut o eroare la importul clienților.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setProgress(0);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetState();
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Clienți din CSV</DialogTitle>
          <DialogDescription>
            Încărcați un fișier CSV cu clienții dvs. pentru a-i importa rapid în CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Pentru a importa clienții, fișierul CSV trebuie să conțină coloanele: <strong>Name, Email, Phone, First Name, Last Name, Tags</strong>
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Descarcă Template CSV
              </Button>
            </div>
          </div>

          {/* File Upload */}
          {!file && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Trageți fișierul CSV aici sau faceți click pentru a selecta
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <Button variant="outline" asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  Selectează Fișier CSV
                </label>
              </Button>
            </div>
          )}

          {/* Preview */}
          {file && preview.length > 0 && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Preview (primii 5 clienți)</h3>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  Schimbă fișier
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Nume Firmă</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Telefon</th>
                      <th className="px-3 py-2 text-left">Persoană Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((client, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">{client.company_name}</td>
                        <td className="px-3 py-2">{client.contact_email || "-"}</td>
                        <td className="px-3 py-2">{client.phone || "-"}</td>
                        <td className="px-3 py-2">{client.contact_person || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Import în progres...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {result.failed === 0 ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{result.success} clienți</strong> importați cu succes!
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{result.success} clienți</strong> importați cu succes, <strong>{result.failed} erori</strong>
                    </AlertDescription>
                  </Alert>
                  {result.errors.length > 0 && (
                    <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
                      <h4 className="font-semibold text-sm mb-2">Erori detectate:</h4>
                      <ul className="text-sm space-y-1">
                        {result.errors.map((err, index) => (
                          <li key={index} className="text-destructive">
                            Rând {err.row} ({err.client}): {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
              {result ? "Închide" : "Anulează"}
            </Button>
            {file && !result && (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importare...
                  </>
                ) : (
                  "Importă Clienți"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
