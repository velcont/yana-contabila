import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, FileText, BookOpen, Download, AlertCircle, Sparkles, Youtube, ExternalLink, FileText as TranscriptIcon, GraduationCap, Database, Users } from "lucide-react";
import { ResearchDataImport } from "./ResearchDataImport";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";

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
  const [generatingDoctorate, setGeneratingDoctorate] = useState(false);
  const { isAdmin } = useUserRole();

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
          message: `Generează o structură detaliată pentru o TEZĂ DE DOCTORAT de 80.000-100.000 cuvinte pe tema:

"Inovație digitală și modele de afaceri sustenabile – transformarea rezilienței în avantaj competitiv"

CERINȚE ACADEMICE STRICTE:

📚 CADRU TEORETIC (20.000-25.000 cuvinte):
- Definește: inovație digitală (AI, blockchain, IoT), modele de afaceri sustenabile (economie circulară, platforme), reziliență organizațională
- Teorii: Avantaj competitiv Porter, Resource-Based View (RBV), Triple Bottom Line (TBL)
- Analiză comparativă: impact inovație digitală pe sustenabilitate și reziliență

📖 EXEMPLU FICȚIONAL:
- Integrează o companie fictivă inspirată dintr-un univers SF (ex: Dune, Neuromancer)
- Descrie: context, provocări, soluții digitale implementate, impact pe sustenabilitate și avantaj competitiv
- Asigură coerentă narativă între exemple fictive și reale

🔬 METODOLOGIE MIXTĂ (10.000-15.000 cuvinte):
- Review literatură pentru ipoteze
- Studii de caz reale (Tesla, Patagonia, Airbnb) + studiul de caz ficțional
- Model conceptual: relația inovație digitală - sustenabilitate - avantaj competitiv
- Metode colectare date: interviuri, chestionare, analiză econometrică

📊 ANALIZĂ ȘI REZULTATE (30.000-35.000 cuvinte):
- Cum contribuie inovația digitală la modele de afaceri sustenabile
- Evaluează transformarea rezilienței în avantaj competitiv prin tehnologii digitale
- Exemple practice și ipotetice (compania fictivă)
- KPI-uri pentru măsurarea succesului modelelor sustenabile

💡 ABORDARE INOVATOARE:
- Perspectivă futuristă: AI, quantum computing în modele sustenabile
- Provocări etice și sociale: echitate, acces la tehnologie, impact forță de muncă

STRUCTURĂ TEZEI:
1. Introducere (5.000-7.000 cuvinte): Context, relevanță, obiective, întrebări cercetare
2. Cadru Teoretic (20.000-25.000 cuvinte): Definiții, teorii, review literatură, model conceptual
3. Metodologie (10.000-15.000 cuvinte): Design cercetare, metode, studii de caz (reale + fictive)
4. Analiză și Rezultate (30.000-35.000 cuvinte): Prezentare date, interpretare, integrare companie fictivă
5. Discuții (15.000-20.000 cuvinte): Implicații, comparații teorie-practică, limitări
6. Concluzii și Recomandări (5.000-10.000 cuvinte): Sinteză, recomandări practice, direcții viitoare

DATE DISPONIBILE PENTRU ANALIZĂ:
${researchData.map(rd => `
- Temă: ${rd.research_theme}
- Cadre teoretice: ${Array.isArray(rd.theoretical_frameworks) ? rd.theoretical_frameworks.length : 0}
- Studii de caz: ${Array.isArray(rd.case_studies) ? rd.case_studies.length : 0}
- Metrici: ${JSON.stringify(rd.metrics_collected)}
`).join('\n')}

FORMAT:
- Limbaj academic, citări APA
- Abstract, bibliografie extensivă, anexe
- Coerentă narativă între exemple fictive și reale

IMPORTANT: 
- Marchează cu [DRAFT - NECESITĂ EDITARE + CERCETARE PROPRIE] secțiunile care necesită input original
- Integrează linkuri către sursele științifice disponibile
- Propune exemple concrete pentru compania fictivă (nume, context, soluții, rezultate)
- NU inventa date, folosește doar ce este disponibil din cercetare`,
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

    // Determină numărul capitolului din marker (ex. "CAPITOL 4")
    const numMatch = chapterMarker.match(/\d+/);
    const chapNum = numMatch ? numMatch[0] : '1';

    // Găsește începutul: acceptă "CAPITOL 1", "CAPITOLUL 1", "Capitolul 1", cu/ fără ":"
    const startRegex = new RegExp(`^\\s*CAPITOL(UL)?\\s+${chapNum}\\b`, 'i');
    const startIdx = lines.findIndex(line => startRegex.test(line));
    
    if (startIdx === -1) {
      console.log(`Nu am găsit capitol: ${chapterMarker}`);
      return "[DRAFT - NECESITĂ EDITARE]\n\nSecțiune incompletă. Adăugați conținut bazat pe cercetarea dvs.";
    }
    
    // Următorul capitol (orice număr)
    const nextRegex = /^(.*)?CAPITOL(UL)?\s+\d\b/i;
    const nextChapterIdx = lines.findIndex((line, idx) => idx > startIdx + 1 && nextRegex.test(line));
    
    const endIdx = nextChapterIdx === -1 ? lines.length : nextChapterIdx;
    const content = lines.slice(startIdx + 1, endIdx).join('\n').trim();
    
    return content || "[DRAFT - NECESITĂ EDITARE]\n\nSecțiune incompletă. Adăugați conținut bazat pe cercetarea dvs.";
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

    const hasRealContent = thesisSections.some(s => s.content && !s.content.startsWith("[DRAFT"));
    if (!hasRealContent) {
      toast.error("Draftul nu conține conținut generat. Apasă ‘Generează Draft Doctorat (Admin)’ și așteaptă confirmarea, apoi exportă.");
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

  // Funcție specială pentru generare draft doctorat (DOAR admin)
  const generateDoctorateThesis = async () => {
    if (!isAdmin) {
      toast.error("Această funcție este disponibilă doar pentru admin");
      return;
    }

    setGeneratingDoctorate(true);
    try {
      // 1. Fetch TOATE analizele din sistem (admin are acces)
      const { data: allAnalyses, error: analysesError } = await supabase
        .from('analyses')
        .select('*');

      if (analysesError) throw analysesError;

      // 2. Calculează statistici globale
      const totalAnalyses = allAnalyses?.length || 0;
      const companies = new Set(allAnalyses?.map(a => a.company_name).filter(Boolean)).size;
      
      const profits = (allAnalyses || []).map(a => {
        const metadata = a.metadata as any;
        return metadata?.profit || 0;
      }).filter(p => p !== 0);
      const avgProfit = profits.reduce((sum, p) => sum + p, 0) / profits.length;
      
      const margins = (allAnalyses || []).map(a => {
        const metadata = a.metadata as any;
        const profit = metadata?.profit || 0;
        const revenue = metadata?.ca || 1;
        return (profit / revenue) * 100;
      }).filter(m => !isNaN(m));
      const avgMargin = margins.reduce((sum, m) => sum + m, 0) / margins.length;

      const highPerformers = margins.filter(m => m > 15).length;
      const mediumPerformers = margins.filter(m => m >= 10 && m <= 15).length;
      const lowPerformers = margins.filter(m => m < 10).length;

      // 3. Prompt concis și eficient pentru teză doctorală
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: {
          stream: false,
          message: `Generează conținut detaliat pentru TEZĂ DOCTORAT (6 capitole) cu DATE REALE:

📊 SAMPLE: ${companies} companii, ${totalAnalyses} balanțe lunare (Ian-Oct 2025)
💰 STATISTICI: Profit mediu ${avgProfit.toFixed(0)} RON, Marjă ${avgMargin.toFixed(1)}%
📈 DISTRIBUȚIE: ${highPerformers} (${((highPerformers/margins.length)*100).toFixed(0)}%) performanță ridicată, ${lowPerformers} (${((lowPerformers/margins.length)*100).toFixed(0)}%) scăzută

TEMA: "Inovație digitală și reziliență financiară - transformarea rezilienței în avantaj competitiv"

Generează TEXT COMPLET pentru fiecare capitol:

CAPITOL 1: INTRODUCERE (2000 cuvinte)
Context: Post-pandemie, digitalizare România
Problemă: Cum digitalizarea îmbunătățește reziliența?
Obiective: Măsurare reziliență, factori critici, model conceptual
Ipoteze: H1 (digitalizare → reziliență), H2 (DSO <45 → profit mare)
Relevanță: Sample real ${companies} companii românești

CAPITOL 2: FUNDAMENTARE TEORETICĂ (3000 cuvinte)
Definiții: Reziliență organizațională, inovație digitală, AI/analytics
Teorii: Resource-Based View, Dynamic Capabilities
Review: Studii 2020-2025 pe reziliență în criză
Model: Digitalizare → Resilință → Avantaj competitiv

CAPITOL 3: METODOLOGIE (2000 cuvinte)
Design: Studiu cantitativ + studii caz
Sample REAL: ${companies} companii, ${totalAnalyses} balanțe
Metrici: DSO, DPO, profit, EBITDA, cash flow
Colectare: Platformă automată
Analiză: Corelații, regresie
Etică: Anonimizare, GDPR

CAPITOL 4: REZULTATE (4000 cuvinte)
STATISTICI REALE:
- Profit: ${avgProfit.toFixed(0)} RON (calculează σ)
- Marjă: ${avgMargin.toFixed(1)}%
- ${((highPerformers/margins.length)*100).toFixed(0)}% performanță ridicată (>15%)

CORELAȚII:
- DSO vs Profit (negativă)
- Digitalizare vs Reziliență (pozitivă)
- Managementul cash → profitabilitate

STUDII CAZ ANONIMIZATE:
Compania A: Marjă 18%, DSO 35, digitalizare avansată
Compania B: Marjă 12%, DSO 58, tranziție digitală
Compania C: Marjă 6%, DSO 75, digitalizare minimă

CAPITOL 5: DISCUȚII (2000 cuvinte)
Interpretare: Validare ipoteze vs literatură
Implicații teoretice: Contribuție teorie reziliență
Implicații practice: Recomandări manageri
Limitări: Sample România, 10 luni
Viitor: Studii multi-an, extindere

CAPITOL 6: CONCLUZII (1500 cuvinte)
Sinteză: Reziliența = predictor avantaj competitiv
Contribuție: Primul studiu ${companies} companii românești cu date lunare reale
Recomandări: Digitalizare, optimizare DSO, monitorizare
Impact: Model replicabil

FORMAT: Limbaj academic, paragraf detaliate, fără bullet points. 
ANONIMIZARE: Fără nume companii reale.`,
        },
      });

      if (error) throw error;

      const generatedText = data?.response || data?.message || data;
      
      if (!generatedText || typeof generatedText !== 'string') {
        throw new Error("Răspuns invalid de la AI");
      }
      
      // Log pentru debug
      console.log("📄 Răspuns AI (primele 500 caractere):", generatedText.substring(0, 500));
      
      // Parse raspunsul in sectiuni
      const sections: ThesisSection[] = [
        {
          chapter: "capitol-1",
          title: "Introducere",
          content: extractSection(generatedText, "CAPITOL 1"),
          sources: extractSources(researchData, 0, 3),
        },
        {
          chapter: "capitol-2",
          title: "Fundamentare Teoretică",
          content: extractSection(generatedText, "CAPITOL 2"),
          sources: extractSources(researchData, 0, 5),
        },
        {
          chapter: "capitol-3",
          title: "Metodologie",
          content: extractSection(generatedText, "CAPITOL 3"),
          sources: extractSources(researchData, 0, 3),
        },
        {
          chapter: "capitol-4",
          title: "Rezultate și Analiză",
          content: extractSection(generatedText, "CAPITOL 4"),
          sources: extractSources(researchData, 0, 5),
        },
        {
          chapter: "capitol-5",
          title: "Discuții și Implicații",
          content: extractSection(generatedText, "CAPITOL 5"),
          sources: extractSources(researchData, 0, 3),
        },
        {
          chapter: "capitol-6",
          title: "Concluzii",
          content: extractSection(generatedText, "CAPITOL 6"),
          sources: extractSources(researchData, 0, 2),
        },
      ];

      setThesisSections(sections);
      toast.success(`🎓 Draft doctorat generat cu succes! Sample: ${companies} companii, ${totalAnalyses} analize.`);
    } catch (error) {
      console.error("Error generating doctorate thesis:", error);
      toast.error("Eroare la generarea draft-ului doctorat");
    } finally {
      setGeneratingDoctorate(false);
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

          {/* Buton special pentru Draft Doctorat (DOAR admin) */}
          {isAdmin && (
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Generare Draft Doctorat (Admin)</CardTitle>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Date Agregate
                  </Badge>
                </div>
                <CardDescription>
                  Generează draft academic cu date agregate de la toți utilizatorii
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={generateDoctorateThesis}
                  disabled={generatingDoctorate}
                  className="w-full"
                  size="lg"
                >
                  {generatingDoctorate ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Generare în curs...
                    </>
                  ) : (
                    <>
                      <Database className="h-5 w-5 mr-2" />
                      Generează Draft Doctorat cu Date Agregate
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Include statistici de la toți utilizatorii (anonimizate)
                </p>
              </CardContent>
            </Card>
          )}

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
