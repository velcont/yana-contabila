import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { generateCFOPresentation } from "@/utils/cfoPresentationGenerator";
import { toast } from "sonner";

const GenerateCFOPresentation = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateCFOPresentation();
      setIsGenerated(true);
      toast.success("Prezentare PowerPoint generată cu succes!");
    } catch (error) {
      console.error("Error generating presentation:", error);
      toast.error("Eroare la generarea prezentării. Încearcă din nou.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Auto-generate on page load
    handleGenerate();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <FileText className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground">
            Prezentare CFO Dashboard Yana
          </h1>
          
          <p className="text-muted-foreground text-lg">
            Generare automată PowerPoint cu 11 slides profesionale
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Conținut prezentare:
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✅ Slide cover cu branding Yana</li>
            <li>✅ 8 beneficii CFO Dashboard (fiecare pe slide separat)</li>
            <li>✅ Tabel comparativ: Excel vs CFO Consultant vs Yana</li>
            <li>✅ Call to Action cu contact și link</li>
            <li>✅ Design profesional 16:9 optimizat pentru Synthesia.io</li>
            <li>✅ Text mare și lizibil pentru video</li>
          </ul>
        </div>

        {isGenerating && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">
              Generez prezentarea PowerPoint...
            </p>
          </div>
        )}

        {isGenerated && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-4 px-6 bg-success/10 border border-success/20 rounded-lg">
              <Download className="w-6 h-6 text-success" />
              <p className="text-lg font-medium text-success">
                Prezentare generată cu succes!
              </p>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              Fișierul <strong>CFO_Dashboard_Yana_Prezentare.pptx</strong> a fost descărcat automat.
              <br />
              Dacă descărcarea nu a pornit automat, apasă butonul de mai jos.
            </p>

            <Button
              onClick={handleGenerate}
              className="w-full"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Descarcă din nou PowerPoint-ul
            </Button>
          </div>
        )}

        <div className="border-t pt-6 mt-6">
          <h3 className="font-semibold text-foreground mb-3">
            Cum folosești prezentarea în Synthesia.io:
          </h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Accesează <a href="https://synthesia.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">synthesia.io</a> și autentifică-te</li>
            <li>Creează un video nou și alege "Import PowerPoint"</li>
            <li>Încarcă fișierul <strong>CFO_Dashboard_Yana_Prezentare.pptx</strong></li>
            <li>Selectează avatarul AI preferat și vocea în limba română</li>
            <li>Generează videoul și descarcă-l când e gata!</li>
          </ol>
        </div>

        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            Powered by Yana AI • app.yana.ro
          </p>
        </div>
      </Card>
    </div>
  );
};

export default GenerateCFOPresentation;
