import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Sparkles, Download, Copy, AlertTriangle, RefreshCw, FileText, History, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface HumanizedResult {
  humanizedText: string;
  statistics: {
    originalWordCount: number;
    humanizedWordCount: number;
    changesPercent: number;
    originalLength: number;
    humanizedLength: number;
  };
}

interface SavedHumanization {
  id: string;
  original_text: string;
  humanized_text: string;
  humanization_level: string;
  tone_style: string;
  word_count_original: number;
  word_count_humanized: number;
  changes_percent: number;
  created_at: string;
}

export default function HumanizeText() {
  const [originalText, setOriginalText] = useState("");
  const [humanizedText, setHumanizedText] = useState("");
  const [humanizationLevel, setHumanizationLevel] = useState("moderate");
  const [toneStyle, setToneStyle] = useState("academic_formal");
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<HumanizedResult['statistics'] | null>(null);
  const [savedTexts, setSavedTexts] = useState<SavedHumanization[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (fileExtension === 'txt') {
        // Handle plain text files
        const text = await file.text();
        setOriginalText(text);
        toast.success("Fișier text încărcat!");
      } else if (fileExtension === 'docx' || fileExtension === 'doc') {
        // Handle Word documents - dynamic import
        const mammoth = (await import('mammoth')).default;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setOriginalText(result.value);
        toast.success("Fișier Word încărcat!");
      } else {
        toast.error("Format nesuportat. Folosește .txt, .doc sau .docx");
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      toast.error("Eroare la încărcarea fișierului");
    }

    // Reset input so same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleHumanize = async () => {
    if (!originalText.trim()) {
      toast.error("Introduceți text pentru a fi umanizat");
      return;
    }

    if (originalText.length < 100) {
      toast.error("Textul este prea scurt (minim 100 caractere)");
      return;
    }

    if (originalText.length > 50000) {
      toast.error("Textul este prea lung (maxim 50.000 caractere)");
      return;
    }

    setLoading(true);
    setHumanizedText("");
    setStatistics(null);

    try {
      const { data, error } = await supabase.functions.invoke('humanize-academic-text', {
        body: {
          text: originalText,
          humanizationLevel,
          toneStyle,
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setHumanizedText(data.humanizedText);
      setStatistics(data.statistics);
      toast.success("✅ Text umanizat cu succes!");

    } catch (error: any) {
      console.error('Humanization error:', error);
      toast.error(error.message || "Eroare la umanizarea textului");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!humanizedText) {
      toast.error("Nu există text umanizat de salvat");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu sunteți autentificat');

      const { error } = await supabase.from('humanized_texts').insert({
        user_id: user.id,
        original_text: originalText,
        humanized_text: humanizedText,
        humanization_level: humanizationLevel,
        tone_style: toneStyle,
        word_count_original: statistics?.originalWordCount,
        word_count_humanized: statistics?.humanizedWordCount,
        changes_percent: statistics?.changesPercent,
        statistics: statistics,
      });

      if (error) throw error;

      toast.success("Salvat în istoric!");
      loadHistory();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || "Eroare la salvare");
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('humanized_texts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSavedTexts(data || []);
    } catch (error: any) {
      console.error('Load history error:', error);
      toast.error("Eroare la încărcarea istoricului");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(humanizedText);
    toast.success("Copiat în clipboard!");
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([humanizedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-umanizat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Descărcare TXT inițiată!");
  };

  const handleDownloadWord = async () => {
    try {
      // Dynamic import for docx library
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      
      // Create Word document with humanized text
      const doc = new Document({
        sections: [{
          properties: {},
          children: humanizedText.split('\n').map(paragraph => 
            new Paragraph({
              children: [new TextRun({
                text: paragraph,
                font: "Times New Roman",
                size: 24, // 12pt (size is in half-points)
              })],
              spacing: { 
                line: 360, // 1.5 line spacing (240 = single, 360 = 1.5, 480 = double)
                after: 200 
              }
            })
          )
        }]
      });

      // Generate and download
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `text-umanizat-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Descărcare Word inițiată!");
    } catch (error) {
      console.error('Word download error:', error);
      toast.error("Eroare la descărcarea Word");
    }
  };

  const loadSavedText = (saved: SavedHumanization) => {
    setOriginalText(saved.original_text);
    setHumanizedText(saved.humanized_text);
    setHumanizationLevel(saved.humanization_level);
    setToneStyle(saved.tone_style);
    setStatistics({
      originalWordCount: saved.word_count_original,
      humanizedWordCount: saved.word_count_humanized,
      changesPercent: saved.changes_percent,
      originalLength: saved.original_text.length,
      humanizedLength: saved.humanized_text.length,
    });
    toast.success("Text încărcat din istoric");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-3xl">AI Text Humanizer</CardTitle>
              <CardDescription>
                Transformă textele generate de AI în texte care sună naturale și umane
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertDescription className="text-sm">
          <strong>⚠️ IMPORTANT:</strong> Acest tool <strong>ASISTĂ</strong> procesul de scriere academică, 
          <strong> NU garantează trecerea de detectoarele AI</strong>. Pentru rezultate optime:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Folosește ca punct de plecare</li>
            <li>Editează manual secțiunile importante</li>
            <li>Adaugă cercetarea și experiențele tale personale</li>
            <li>Verifică cu detectoare înainte de submission</li>
          </ul>
          <p className="mt-2 font-semibold">Integritatea academică este responsabilitatea ta.</p>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="humanize" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="humanize">
            <Sparkles className="h-4 w-4 mr-2" />
            Umanizează Text
          </TabsTrigger>
          <TabsTrigger value="history" onClick={loadHistory}>
            <History className="h-4 w-4 mr-2" />
            Istoric ({savedTexts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="humanize" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Setări Umanizare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nivel Umanizare</Label>
                  <Select value={humanizationLevel} onValueChange={setHumanizationLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">
                        <div className="flex flex-col">
                          <span className="font-semibold">Subtil</span>
                          <span className="text-xs text-muted-foreground">Ajustări minore, păstrează 90% structură</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="moderate">
                        <div className="flex flex-col">
                          <span className="font-semibold">Moderat ⭐</span>
                          <span className="text-xs text-muted-foreground">Restructurări clare, variație stilistică</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="aggressive">
                        <div className="flex flex-col">
                          <span className="font-semibold">Agresiv</span>
                          <span className="text-xs text-muted-foreground">Transformare completă, maxim naturalețe</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ton</Label>
                  <Select value={toneStyle} onValueChange={setToneStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic_formal">
                        <div className="flex flex-col">
                          <span className="font-semibold">Academic Formal</span>
                          <span className="text-xs text-muted-foreground">Limbaj tehnic, structură logică strictă</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="academic_conversational">
                        <div className="flex flex-col">
                          <span className="font-semibold">Academic Conversațional</span>
                          <span className="text-xs text-muted-foreground">Mai accesibil, cu exemple practice</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="simple_accessible">
                        <div className="flex flex-col">
                          <span className="font-semibold">Simplu și Accesibil</span>
                          <span className="text-xs text-muted-foreground">Fără jargon, pentru public larg</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {statistics && (
                  <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm">📊 Statistici</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Cuvinte original:</p>
                        <p className="font-semibold">{statistics.originalWordCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cuvinte umanizat:</p>
                        <p className="font-semibold">{statistics.humanizedWordCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Modificări:</p>
                        <Badge variant="secondary">{statistics.changesPercent}%</Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Caractere:</p>
                        <p className="font-semibold">{statistics.humanizedLength}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Input Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Text Original</CardTitle>
                <CardDescription>
                  Încarcă un fișier sau introduce textul manual (100 - 50.000 caractere)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* File Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    📄 Încarcă Fișier (.txt, .doc, .docx)
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground font-semibold">
                        SAU
                      </span>
                    </div>
                  </div>

                  {/* Manual Text Input */}
                  <Textarea
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    placeholder="Lipește aici textul generat de AI..."
                    className="min-h-[280px] font-mono text-sm"
                    disabled={loading}
                  />
                </div>

                <div className="flex justify-between items-center mt-4">
                  <p className="text-xs text-muted-foreground">
                    {originalText.length.toLocaleString()} / 50,000 caractere
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setOriginalText("")}
                      variant="outline"
                      size="sm"
                      disabled={!originalText || loading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resetează
                    </Button>
                    <Button
                      onClick={handleHumanize}
                      disabled={loading || !originalText.trim()}
                      size="sm"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Procesez...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Umanizează
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Result Panel */}
          {humanizedText && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">Text Umanizat</CardTitle>
                    <CardDescription>
                      Rezultatul poate fi editat manual pentru rezultate optime
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCopy} variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      Copiază
                    </Button>
                    <Button onClick={handleDownloadTxt} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      TXT
                    </Button>
                    <Button onClick={handleDownloadWord} variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Word
                    </Button>
                    <Button onClick={handleSave} size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Salvează
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {humanizedText}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Istoric Texte Umanizate</CardTitle>
              <CardDescription>
                Ultimele 10 texte procesate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : savedTexts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nu există texte salvate încă</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedTexts.map((saved) => (
                    <Card key={saved.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardContent className="pt-6" onClick={() => loadSavedText(saved)}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2">
                            <Badge variant="secondary">{saved.humanization_level}</Badge>
                            <Badge variant="outline">{saved.tone_style}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(saved.created_at).toLocaleDateString('ro-RO')}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {saved.original_text.substring(0, 150)}...
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{saved.word_count_original} cuvinte original</span>
                          <span>→</span>
                          <span>{saved.word_count_humanized} cuvinte umanizat</span>
                          <span>({saved.changes_percent}% modificări)</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
