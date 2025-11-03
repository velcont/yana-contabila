import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { generateLiteratureReviewDocument } from "@/utils/generateLiteratureReview";
import { toast } from "sonner";

const GenerateLiteratureReview = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateLiteratureReviewDocument();
      setIsGenerated(true);
      toast.success("Document Literature Review generat cu succes!");
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Eroare la generarea documentului. Încearcă din nou.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Auto-generate on page load
    handleGenerate();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <FileText className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground">
            Literature Review pentru Profesor
          </h1>
          
          <p className="text-muted-foreground text-lg">
            Document academic corectat conform feedback-ului profesorului
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6 space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Corecții implementate:
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✅ 12 expresii stilistice simplificate (academic, nu elegant)</li>
            <li>✅ Notă despre structura tematică adăugată în Introducere</li>
            <li>✅ Link Teece et al. (1997) corectat → https://www.jstor.org/stable/2486815</li>
            <li>✅ Diacritice corectate (conotație cu ț)</li>
            <li>✅ Bibliografie uniformizată (link-uri fără bold)</li>
            <li>✅ Format academic standard: Times New Roman 12pt, spații 1.5, margini 1 inch</li>
            <li>✅ Text justificat și structurat profesional</li>
          </ul>
        </div>

        {isGenerating && (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">
              Generez documentul Word corectat...
            </p>
          </div>
        )}

        {isGenerated && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-4 px-6 bg-success/10 border border-success/20 rounded-lg">
              <Download className="w-6 h-6 text-success" />
              <p className="text-lg font-medium text-success">
                Document generat cu succes!
              </p>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              Fișierul <strong>Literature_Review_Rezilienta_Organizational_CORECTAT.docx</strong> a fost descărcat automat.
              <br />
              Dacă descărcarea nu a pornit automat, apasă butonul de mai jos.
            </p>

            <Button
              onClick={handleGenerate}
              className="w-full"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Descarcă din nou documentul Word
            </Button>
          </div>
        )}

        <div className="border-t pt-6 mt-6">
          <h3 className="font-semibold text-foreground mb-3">
            📝 Detalii corecții stilistice:
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><span className="text-destructive">❌ "migrație disciplinară"</span> → <span className="text-success">✅ "extindere disciplinară"</span></p>
            <p><span className="text-destructive">❌ "preluând doar structura logică"</span> → <span className="text-success">✅ "adaptând cadrul conceptual"</span></p>
            <p><span className="text-destructive">❌ "a supraviețui perturbațiilor"</span> → <span className="text-success">✅ "să supraviețuiască perturbărilor"</span></p>
            <p><span className="text-destructive">❌ "capacitatea de recuperare"</span> → <span className="text-success">✅ "capacitatea de redresare"</span></p>
            <p className="text-xs italic pt-2">...și alte 8 corecții similare în tot documentul</p>
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            📚 Document pregătit pentru întâlnirea cu profesorul
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Powered by Yana AI • Academic Assistant
          </p>
        </div>
      </Card>
    </div>
  );
};

export default GenerateLiteratureReview;
