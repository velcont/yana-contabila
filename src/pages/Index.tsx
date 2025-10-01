import { useState } from "react";
import { Upload, FileText, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const nameOk = selectedFile.name?.toLowerCase().endsWith(".pdf");
      const typeOk = selectedFile.type === "application/pdf";
      if (!nameOk && !typeOk) {
        toast({
          title: "Format invalid",
          description: "Se acceptă DOAR fișiere PDF cu balanța de verificare.",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      setAnalysis("");
    }
  };

  const convertPDFToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast({
        title: "Niciun fișier selectat",
        description: "Te rog încarcă o balanță de verificare.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const pdfBase64 = await convertPDFToBase64(file);

      const { data, error } = await supabase.functions.invoke("analyze-balance", {
        body: { pdfBase64, fileName: file.name },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      toast({
        title: "Analiză completă!",
        description: "Analiza contabilă a fost generată cu succes.",
      });
    } catch (error) {
      console.error("Eroare la analiză:", error);
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "A apărut o eroare la generarea analizei.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPDF = () => {
    toast({
      title: "Export PDF",
      description: "Funcția de export PDF va fi disponibilă în curând.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Analiză Contabilă AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Încarcă balanța de verificare și primește o analiză managerială completă, 
            generată automat pentru antreprenorii tăi.
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Încarcă Balanța de Verificare
            </CardTitle>
            <CardDescription>
              Suportă doar format PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex-1 cursor-pointer"
                >
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    {file ? (
                      <p className="text-sm font-medium">{file.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Click pentru a selecta un fișier
                      </p>
                    )}
                  </div>
                </label>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!file || isAnalyzing}
                className="w-full"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizez...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generează Analiza
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Result */}
        {analysis && (
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Analiză Managerială</CardTitle>
              <Button onClick={handleExportPDF} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        {!analysis && (
          <Card className="mt-8 bg-accent/5 border-accent/20">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2 text-accent">Despre această aplicație</h3>
              <p className="text-sm text-muted-foreground">
                Această aplicație folosește inteligență artificială pentru a genera analize 
                contabile manageriale pe baza balanțelor de verificare. Analizele sunt 
                structurate și ușor de înțeles pentru antreprenori fără pregătire contabilă, 
                respectând regulile contabile și fiscale din România.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
