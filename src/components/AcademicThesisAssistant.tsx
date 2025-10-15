import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, FileText, BookOpen, Download, AlertCircle, Sparkles, Youtube, ExternalLink, FileText as TranscriptIcon } from "lucide-react";
import { ResearchDataImport } from "./ResearchDataImport";

interface ResearchData {
  id: string;
  research_theme: string;
  course_name: string;
  theoretical_frameworks: any;
  case_studies: any;
  metrics_collected: any;
  data_collection_date: string;
  research_notes: string | null;
}

interface ThesisSection {
  chapter: string;
  title: string;
  content: string;
  sources: Array<{text: string, links: Array<{title: string, url: string}>}>;
}

export default function AcademicThesisAssistant() {
  const [researchData, setResearchData] = useState<ResearchData[]>([]);
  const [thesisSections, setThesisSections] = useState<ThesisSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  useEffect(() => {
    loadResearchData();
  }, []);

  const loadResearchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("research_data")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResearchData(data || []);
    } catch (error) {
      console.error("Error loading research data:", error);
      toast.error("Eroare la încărcarea datelor de cercetare");
    } finally {
      setLoading(false);
    }
  };

  const generateThesisStructure = async () => {
    if (researchData.length === 0) {
      toast.error("Nu există date de cercetare disponibile. Folosiți 'Caută literatură științifică' sau 'Import date de cercetare'.");
      return;
    }

    setGeneratingDraft(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: {
          stream: false,
          message: `Analizează următoarele date de cercetare și generează o structură preliminară pentru o teză de doctorat despre inovare digitală și modele de business sustenabile în România:

Date disponibile:
${researchData.map(rd => `
- Temă: ${rd.research_theme}
- Cadre teoretice: ${Array.isArray(rd.theoretical_frameworks) ? rd.theoretical_frameworks.length : 0}
- Studii de caz: ${Array.isArray(rd.case_studies) ? rd.case_studies.length : 0}
- Metrici: ${JSON.stringify(rd.metrics_collected)}
`).join('\n')}

Generează:
1. Capitolul 1: Introducere (scop, importanță, întrebări de cercetare)
2. Capitolul 2: Fundamentare teoretică (sinteza cadrelor teoretice identificate)
3. Capitolul 3: Metodologie (bazată pe metrici și studii de caz existente)
4. Capitolul 4: Analiză și rezultate (gap-uri de completat de către doctorand)
5. Capitolul 5: Concluzii și contribuții (schița contribuției originale)

IMPORTANT: Marchează clar cu [DRAFT - NECESITĂ EDITARE] secțiunile care necesită input original de la doctorand. Nu inventa date, folosește doar ce este disponibil.`,
        },
      });

      if (error) throw error;

      const generatedText = data?.response || data?.message || data;
      
      if (!generatedText || typeof generatedText !== 'string') {
        throw new Error("Răspuns invalid de la AI");
      }
      
      // Parse raspunsul in sectiuni
      const sections: ThesisSection[] = [
        {
          chapter: "capitol-1",
          title: "Introducere",
          content: extractSection(generatedText, "Capitolul 1"),
          sources: extractSources(researchData, 0, 3),
        },
        {
          chapter: "capitol-2",
          title: "Fundamentare Teoretică",
          content: extractSection(generatedText, "Capitolul 2"),
          sources: extractSources(researchData, 0, 5),
        },
        {
          chapter: "capitol-3",
          title: "Metodologie",
          content: extractSection(generatedText, "Capitolul 3"),
          sources: extractSources(researchData, 0, 3),
        },
        {
          chapter: "capitol-4",
          title: "Analiză și Rezultate",
          content: extractSection(generatedText, "Capitolul 4"),
          sources: extractSources(researchData, 0, 5),
        },
        {
          chapter: "capitol-5",
          title: "Concluzii",
          content: extractSection(generatedText, "Capitolul 5"),
          sources: extractSources(researchData, 0, 3),
        },
      ];

      setThesisSections(sections);
      toast.success("Structură teză generată! Revizuiți și editați fiecare secțiune.");
    } catch (error) {
      console.error("Error generating thesis:", error);
      toast.error("Eroare la generarea structurii tezei");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const extractSection = (text: string | undefined, chapterMarker: string): string => {
    if (!text) return "[DRAFT - NECESITĂ EDITARE]\n\nSecțiune incompletă. Adăugați conținut bazat pe cercetarea dvs.";
    
    const lines = text.split('\n');
    const startIdx = lines.findIndex(line => line.includes(chapterMarker));
    if (startIdx === -1) return "[DRAFT - NECESITĂ EDITARE]\n\nSecțiune incompletă. Adăugați conținut bazat pe cercetarea dvs.";
    
    const nextChapterIdx = lines.findIndex((line, idx) => 
      idx > startIdx + 1 && line.match(/Capitolul \d/)
    );
    
    const endIdx = nextChapterIdx === -1 ? lines.length : nextChapterIdx;
    return lines.slice(startIdx + 1, endIdx).join('\n').trim();
  };

  const extractSources = (data: ResearchData[], start: number, count: number): Array<{text: string, links: Array<{title: string, url: string}>}> => {
    return data.slice(start, start + count).map(rd => {
      const links: Array<{title: string, url: string}> = [];
      
      // Extrage linkuri din theoretical_frameworks
      if (Array.isArray(rd.theoretical_frameworks)) {
        rd.theoretical_frameworks.forEach((framework: any) => {
          if (framework.source_url) {
            links.push({ title: framework.title || 'Articol științific', url: framework.source_url });
          }
        });
      }
      
      // Extrage linkuri din video_resources
      if (rd.metrics_collected?.video_resources) {
        rd.metrics_collected.video_resources.forEach((video: any) => {
          if (video.url) {
            links.push({ title: video.title || 'Video YouTube', url: video.url });
          }
        });
      }
      
      return {
        text: `${rd.research_theme} - ${rd.course_name} (${rd.data_collection_date})`,
        links
      };
    });
  };

  const exportThesisDraft = () => {
    if (thesisSections.length === 0) {
      toast.error("Generați mai întâi structura tezei");
      return;
    }

    const fullText = `
TEZĂ DE DOCTORAT - DRAFT PRELIMINAR
=====================================
[IMPORTANT: Acest document este un DRAFT generat automat care necesită EDITARE MASIVĂ și VALIDARE ACADEMICĂ]

${thesisSections.map(section => `
${section.title.toUpperCase()}
${'='.repeat(section.title.length)}

${section.content}

SURSE UTILIZATE (Citește aceste resurse):
${section.sources.map((s, i) => `[${i + 1}] ${s.text}\n   Linkuri: ${s.links.map(l => `\n   - ${l.title}: ${l.url}`).join('')}`).join('\n\n')}

---
`).join('\n')}

NOTĂ IMPORTANTĂ:
================
Acest draft a fost generat automat pe baza datelor colectate din literatură științifică.
Necesită:
1. Validare academică de la conducător de doctorat
2. Adăugare contribuție originală (cercetare proprie, chestionare, analize)
3. Editare pentru stil academic și coerentă
4. Verificare anti-plagiat
5. Conformitate cu cerințele universității

Nu trimiteți acest document fără editare substanțială!
`;

    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `teza-draft-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Draft exportat! Revizuiți și editați înainte de utilizare.");
  };

  const fetchScientificLiterature = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-research-data");
      
      if (error) throw error;
      
      toast.success("Date științifice actualizate!");
      await loadResearchData();
    } catch (error) {
      console.error("Error fetching research:", error);
      toast.error("Eroare la căutarea literaturii științifice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle>Asistent Academic pentru Doctorat</CardTitle>
          </div>
          <CardDescription>
            Organizează cercetarea și generează draft-uri preliminare pentru teză
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Etică academică:</strong> Acest asistent organizează datele și generează schițe care necesită editare masivă din partea ta. 
              TU rămâi autorul tezei. AI-ul este un instrument organizațional, nu un înlocuitor al gândirii critice.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={fetchScientificLiterature} 
              disabled={loading}
              variant="outline"
              className="h-auto py-4 flex-col items-start"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <BookOpen className="h-5 w-5 mb-2" />
              )}
              <span className="font-semibold">Caută Literatură</span>
              <span className="text-xs text-muted-foreground">Actualizează baza de date</span>
            </Button>

            <ResearchDataImport onImportSuccess={loadResearchData} />

            <Button 
              onClick={generateThesisStructure} 
              disabled={generatingDraft || researchData.length === 0}
              className="h-auto py-4 flex-col items-start"
            >
              {generatingDraft ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileText className="h-5 w-5 mb-2" />
              )}
              <span className="font-semibold">Generează Structură</span>
              <span className="text-xs">Creează draft teză</span>
            </Button>
          </div>

          <div className="text-sm text-muted-foreground text-center py-2">
            Date disponibile: {researchData.length} surse științifice
          </div>
        </CardContent>
      </Card>

      {/* Resurse Video YouTube */}
      {researchData.length > 0 && researchData.some(rd => rd.metrics_collected?.video_resources?.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              <CardTitle>Resurse Video YouTube</CardTitle>
            </div>
            <CardDescription>
              Videoclipuri educaționale relevante pentru cercetarea ta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {researchData
                .flatMap(rd => rd.metrics_collected?.video_resources || [])
                .slice(0, 9)
                .map((video: any, idx: number) => (
                  <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {video.thumbnail && (
                      <div className="relative aspect-video bg-muted">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Youtube className="h-12 w-12 text-white" />
                        </div>
                        {video.transcript_summary && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <TranscriptIcon className="h-3 w-3" />
                            Transcript
                          </div>
                        )}
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm mb-2 line-clamp-2">
                        {video.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {video.channel}
                      </p>
                      {video.transcript_summary && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 italic">
                          "{video.transcript_summary}"
                        </p>
                      )}
                      {video.key_topics && video.key_topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {video.key_topics.slice(0, 3).map((topic: string, i: number) => (
                            <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.open(video.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Vezi pe YouTube
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {thesisSections.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Draft Teză Generată</CardTitle>
              <Button onClick={exportThesisDraft} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportă Draft (TXT)
              </Button>
            </div>
            <CardDescription>
              Revizuiți și editați fiecare secțiune înainte de utilizare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="capitol-1">
              <TabsList className="grid w-full grid-cols-5">
                {thesisSections.map((section) => (
                  <TabsTrigger key={section.chapter} value={section.chapter}>
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {thesisSections.map((section) => (
                <TabsContent key={section.chapter} value={section.chapter}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                          <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap text-sm font-sans">
                            {section.content}
                          </pre>
                          <div className="mt-6 pt-4 border-t">
                            <h4 className="font-semibold mb-3">Surse Utilizate (Citește aici):</h4>
                            <div className="space-y-4">
                              {section.sources.map((source, idx) => (
                                <div key={idx} className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-sm font-medium mb-2">[{idx + 1}] {source.text}</p>
                                  {source.links.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {source.links.map((link, linkIdx) => (
                                        <Button
                                          key={linkIdx}
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(link.url, '_blank')}
                                          className="text-xs"
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          {link.title.substring(0, 50)}{link.title.length > 50 ? '...' : ''}
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                      <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Acțiuni necesare:</strong> Editați această secțiune, adăugați cercetare proprie, 
                          validați cu conducătorul de doctorat și verificați originalitatea.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
