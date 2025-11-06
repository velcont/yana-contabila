import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2 } from "lucide-react";
import { generateCompressedLiteratureReview } from "@/utils/generateCompressedLiteratureReview";
import { generateDefenseScript } from "@/utils/generateDefenseScript";
import { processDocumenter } from "@/lib/processDocumenter";
import { toast } from "sonner";

const GenerateConferencePaper = () => {
  const [authorName, setAuthorName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [thesisTopic, setThesisTopic] = useState("");
  const [requirements, setRequirements] = useState("");
  const [keywords, setKeywords] = useState("");
  const [academicStyle, setAcademicStyle] = useState("literature_review");
  const [pageCount, setPageCount] = useState(4);
  const [geographicFocus, setGeographicFocus] = useState("romania");
  const [apaVersion, setApaVersion] = useState("7th");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!authorName || !affiliation || !thesisTopic) {
      toast.error("Completează numele, afilierea și tema lucrării!");
      return;
    }
    
    // START SESSION
    processDocumenter.startSession(authorName, thesisTopic);
    
    // LOG INPUT
    processDocumenter.logAction(
      'USER_INPUT',
      `Autor: ${authorName}, Afiliere: ${affiliation}, Tema: ${thesisTopic}`,
      true
    );
    
    setIsGenerating(true);
    try {
      processDocumenter.logAction('START_GENERATION', 'Început generare document + ghid pedagogic', false);
      
      await generateCompressedLiteratureReview({
        authorName,
        affiliation,
        thesisTopic,
        requirements,
        keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        academicStyle,
        pageCount,
        geographicFocus,
        apaVersion
      });
      
      processDocumenter.logAction('SUCCESS', 'Pachet complet generat: Document + Ghid + Bibliografie', false);
      toast.success("Pachet complet generat! Verifică ZIP-ul descărcat (Document + Ghid + Bibliografie)");
    } catch (error) {
      processDocumenter.logAction('ERROR', String(error), false);
      console.error("Error:", error);
      toast.error("Eroare la generare. Încearcă din nou.");
    } finally {
      processDocumenter.endSession();
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
            <Label htmlFor="author">Nume autor *</Label>
            <Input
              id="author"
              placeholder="Nume Prenume"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="affiliation">Afiliere *</Label>
            <Input
              id="affiliation"
              placeholder="Universitatea X, Facultatea Y, Doctorand"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="topic">Tema Lucrării *</Label>
            <Textarea
              id="topic"
              placeholder="Ex: Reziliența organizațională în contextul IMM-urilor din România: o sinteză a literaturii"
              value={thesisTopic}
              onChange={(e) => setThesisTopic(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="requirements">Cerințe Profesor (opțional)</Label>
            <Textarea
              id="requirements"
              placeholder="Ex: 4 pagini maxim, minimum 10 surse din ultimii 5 ani, focus pe România, format APA 7th"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="keywords">Cuvinte Cheie Obligatorii (separate prin virgulă)</Label>
            <Input
              id="keywords"
              placeholder="Ex: reziliență organizațională, IMM, capacități dinamice"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="style">Stil Academic</Label>
              <Select value={academicStyle} onValueChange={setAcademicStyle}>
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="literature_review">Literature Review</SelectItem>
                  <SelectItem value="empirical">Articol Empiric</SelectItem>
                  <SelectItem value="case_study">Studiu de Caz</SelectItem>
                  <SelectItem value="meta_analysis">Meta-analiză</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="pages">Număr Pagini</Label>
              <Input
                id="pages"
                type="number"
                min={2}
                max={10}
                value={pageCount}
                onChange={(e) => setPageCount(parseInt(e.target.value) || 4)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="focus">Focus Geografic</Label>
              <Select value={geographicFocus} onValueChange={setGeographicFocus}>
                <SelectTrigger id="focus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="romania">România</SelectItem>
                  <SelectItem value="europa">Europa</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="comparat">Comparat (România + alte țări)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="apa">Format Bibliografie</Label>
              <Select value={apaVersion} onValueChange={setApaVersion}>
                <SelectTrigger id="apa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7th">APA 7th Edition</SelectItem>
                  <SelectItem value="6th">APA 6th Edition</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-success/10 border border-success/20 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-success">✅ Ce primești în pachetul complet:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>📄 <strong>Document Word</strong> - lucrarea ta academică finală</li>
            <li>📚 <strong>Ghid de Susținere PDF</strong> - scripturi cu răspunsuri pentru profesor</li>
            <li>📊 <strong>Bibliografie Excel</strong> - surse detaliate cu concepte și timp lectură</li>
            <li>📋 <strong>README</strong> - instrucțiuni complete pentru pregătirea susținerii</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2 italic">
            * Toate fișierele sunt împachetate într-un singur ZIP
          </p>
        </div>

        <div className="grid gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !authorName || !affiliation || !thesisTopic}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generez pachetul complet...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Generează pachet complet (Document + Ghid + Bibliografie)
              </>
            )}
          </Button>

          <Button
            onClick={async () => {
              await generateDefenseScript({
                thesisTopic,
                authorName,
                affiliation
              });
              toast.success("✅ Script de susținere generat!");
            }}
            disabled={!authorName || !affiliation || !thesisTopic}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <FileText className="w-5 h-5 mr-2" />
            📋 Generează doar Script Susținere pentru Zoom
          </Button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            📦 Vei primi un ZIP cu: Document Word + Ghid PDF + Bibliografie Excel + README
          </p>
          <p className="text-xs text-muted-foreground font-semibold">
            📝 Citește GHIDUL înainte de susținere pentru a ști ce să răspunzi profesorului!
          </p>
        </div>
      </Card>
    </div>
  );
};

export default GenerateConferencePaper;
