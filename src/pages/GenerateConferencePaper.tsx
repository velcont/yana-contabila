import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Loader2 } from "lucide-react";
import { generateCompressedLiteratureReview } from "@/utils/generateCompressedLiteratureReview";
import { toast } from "sonner";

const GenerateConferencePaper = () => {
  const [authorName, setAuthorName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!authorName || !affiliation) {
      toast.error("Completează numele și afilierea înainte de a genera documentul!");
      return;
    }
    
    setIsGenerating(true);
    try {
      await generateCompressedLiteratureReview(authorName, affiliation);
      toast.success("Document pentru conferință generat cu succes! (4 pagini)");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Eroare la generare. Încearcă din nou.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <FileText className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold">
            Literature Review pentru Conferința Doctoranzi Oradea
          </h1>
          
          <p className="text-muted-foreground">
            Versiune comprimată 4 pagini conform feedback profesor
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="author">Nume autor (ex: Nume Prenume)</Label>
            <Input
              id="author"
              placeholder="Nume Prenume"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="affiliation">Afiliere (ex: Universitatea X, Facultatea Y)</Label>
            <Input
              id="affiliation"
              placeholder="Universitatea X, Facultatea Y, Doctorand"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-success/10 border border-success/20 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-success">✅ Îmbunătățiri implementate:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Comprimare text la 4 pagini (inclusiv abstract + bibliografie)</li>
            <li>• Grupare autori pe idei (NU autor cu autor)</li>
            <li>• Reducere paragrafe introductive la esențial</li>
            <li>• Abstract RO (150-200 cuvinte)</li>
            <li>• Bibliografie comprimată (doar 11 referințe esențiale)</li>
            <li>• Format academic matur conform feedback profesor</li>
          </ul>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generez documentul...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Generează document 4 pagini
            </>
          )}
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          📝 Verifică înainte de trimitere: Abstract (EN), format APA, diacritice
        </div>
      </Card>
    </div>
  );
};

export default GenerateConferencePaper;
