import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, Download, AlertTriangle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

const MAX_CHARACTERS = 10000;

type HumanizationLevel = "subtle" | "moderate" | "aggressive";

interface HumanizedText {
  id: string;
  original_text: string;
  humanized_text: string;
  humanization_level: string;
  changes_percent: number;
  created_at: string;
}

export function TextHumanizer() {
  const [originalText, setOriginalText] = useState("");
  const [humanizedText, setHumanizedText] = useState("");
  const [level, setLevel] = useState<HumanizationLevel>("moderate");
  const [isProcessing, setIsProcessing] = useState(false);
  const [modificationPercent, setModificationPercent] = useState<number | null>(null);
  const [history, setHistory] = useState<HumanizedText[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("humanized_texts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleHumanize = async () => {
    if (!originalText.trim()) {
      toast.error("Introdu textul pe care vrei să-l umanizezi");
      return;
    }

    if (originalText.length > MAX_CHARACTERS) {
      toast.error(`Textul depășește limita de ${MAX_CHARACTERS.toLocaleString()} caractere`);
      return;
    }

    setIsProcessing(true);
    setHumanizedText("");
    setModificationPercent(null);

    try {
      const { data, error } = await supabase.functions.invoke("humanize-text", {
        body: {
          text: originalText,
          level,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setHumanizedText(data.humanizedText);
      setModificationPercent(data.modificationPercent);
      
      toast.success("Text umanizat cu succes!", {
        description: `${data.modificationPercent}% din text a fost modificat`
      });

      // Reload history to show new entry
      loadHistory();
    } catch (error: any) {
      console.error("Error humanizing text:", error);
      toast.error("Eroare la umanizarea textului", {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(humanizedText);
      toast.success("Text copiat în clipboard!");
    } catch (error) {
      toast.error("Eroare la copierea textului");
    }
  };

  const handleDownloadDocx = async () => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Text Umanizat",
                  bold: true,
                  size: 28
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generat: ${format(new Date(), "dd MMMM yyyy, HH:mm", { locale: ro })}`,
                  size: 20,
                  color: "666666"
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Nivel umanizare: ${getLevelLabel(level)} | Modificat: ${modificationPercent}%`,
                  size: 20,
                  color: "666666"
                })
              ]
            }),
            new Paragraph({ children: [] }),
            ...humanizedText.split("\n").map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 24
                  })
                ]
              })
            )
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `text-umanizat-${format(new Date(), "yyyy-MM-dd-HHmm")}.docx`);
      toast.success("Document descărcat!");
    } catch (error) {
      console.error("Error generating docx:", error);
      toast.error("Eroare la generarea documentului");
    }
  };

  const getLevelLabel = (lvl: HumanizationLevel) => {
    switch (lvl) {
      case "subtle": return "Subtil";
      case "moderate": return "Moderat";
      case "aggressive": return "Agresiv";
    }
  };

  const getLevelDescription = (lvl: HumanizationLevel) => {
    switch (lvl) {
      case "subtle": return "Modificări minime, păstrează structura originală";
      case "moderate": return "Echilibru între naturalețe și fidelitate";
      case "aggressive": return "Rescriere substanțială pentru maxim naturalețe";
    }
  };

  const charCount = originalText.length;
  const charPercentage = (charCount / MAX_CHARACTERS) * 100;

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          <strong>Atenție:</strong> Acest instrument îmbunătățește stilul textului tău original pentru a suna mai natural și uman. 
          Nu este destinat pentru mascarea plagiatului sau a conținutului generat de AI.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Text Original
            </CardTitle>
            <CardDescription>
              Introdu textul pe care vrei să-l umanizezi (max {MAX_CHARACTERS.toLocaleString()} caractere)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="Lipește aici textul academic sau generat de AI pe care vrei să-l umanizezi..."
                className="min-h-[300px] resize-none"
                maxLength={MAX_CHARACTERS}
              />
              <div className="flex justify-between items-center text-sm">
                <span className={charCount > MAX_CHARACTERS * 0.9 ? "text-destructive" : "text-muted-foreground"}>
                  {charCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} caractere
                </span>
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${charPercentage > 90 ? 'bg-destructive' : charPercentage > 70 ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(charPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nivel de umanizare</Label>
              <div className="flex gap-2">
                {(["subtle", "moderate", "aggressive"] as HumanizationLevel[]).map((lvl) => (
                  <Button
                    key={lvl}
                    variant={level === lvl ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLevel(lvl)}
                    className="flex-1"
                  >
                    {getLevelLabel(lvl)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{getLevelDescription(level)}</p>
            </div>

            <Button 
              onClick={handleHumanize} 
              disabled={isProcessing || !originalText.trim()}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se procesează...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Umanizează Textul
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Text Umanizat
              </span>
              {modificationPercent !== null && (
                <Badge variant="secondary" className="text-sm">
                  {modificationPercent}% modificat
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Rezultatul procesării - text cu stil mai natural și uman
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {humanizedText ? (
              <>
                <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/50">
                  <p className="whitespace-pre-wrap text-sm">{humanizedText}</p>
                </ScrollArea>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopy} className="flex-1">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiază
                  </Button>
                  <Button variant="outline" onClick={handleDownloadDocx} className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Descarcă .docx
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-[300px] border rounded-md p-4 bg-muted/30 flex items-center justify-center">
                <p className="text-muted-foreground text-center">
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Se procesează textul...
                    </span>
                  ) : (
                    "Rezultatul va apărea aici după procesare"
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Istoric Transformări
          </CardTitle>
          <CardDescription>
            Ultimele 20 de texte umanizate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nu ai încă texte umanizate în istoric.
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getLevelLabel(item.humanization_level as HumanizationLevel)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.changes_percent}% modificat
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "dd MMM yyyy, HH:mm", { locale: ro })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.original_text.substring(0, 150)}...
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setOriginalText(item.original_text);
                        setHumanizedText(item.humanized_text);
                        setModificationPercent(item.changes_percent);
                        setLevel(item.humanization_level as HumanizationLevel);
                      }}
                    >
                      Încarcă în editor
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TextHumanizer;
