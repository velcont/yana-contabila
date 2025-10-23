import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, BookOpen, Download, AlertCircle, Sparkles, Youtube, ExternalLink, FileText as TranscriptIcon, GraduationCap, Database, Users, Plus, Trash2 } from "lucide-react";
import { ResearchDataImport } from "./ResearchDataImport";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';

interface ResearchData {
  id: string;
  research_theme: string;
  course_name: string;
  theoretical_frameworks: any;
  case_studies: any;
  metrics_collected: any;
  data_collection_date: string;
  research_notes: string | null;
  content: string | null;
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
  
  // State for adding individual research resources
  const [newResourceTitle, setNewResourceTitle] = useState("");
  const [newResourceLink, setNewResourceLink] = useState("");
  const [newResourceContent, setNewResourceContent] = useState("");

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

  const handleAddResource = async () => {
    if (!newResourceTitle.trim()) {
      toast.error("Adaugă un titlu pentru resursă!");
      return;
    }

    if (!newResourceContent.trim() || newResourceContent.length < 50) {
      toast.error("Adaugă un rezumat mai detaliat (minim 50 caractere)!");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');

      const { error } = await supabase
        .from('research_data')
        .insert({
          user_id: user.id,
          data_collection_date: new Date().toISOString().split('T')[0],
          course_name: newResourceTitle,
          research_theme: 'Inovație Digitală și Reziliență',
          content: newResourceContent,
          case_studies: [],
          theoretical_frameworks: [],
          metrics_collected: {},
          research_notes: newResourceLink || null,
        });

      if (error) throw error;

      toast.success("✅ Resursă adăugată cu succes!");

      setNewResourceTitle("");
      setNewResourceLink("");
      setNewResourceContent("");
      loadResearchData();
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error(error instanceof Error ? error.message : "Nu s-a putut adăuga resursa");
    }
  };

  const deleteResource = async (id: string) => {
    try {
      const { error } = await supabase
        .from('research_data')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Resursă ștearsă cu succes");
      loadResearchData();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error("Nu s-a putut șterge resursa");
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
    const placeholder = "[DRAFT - NECESITĂ EDITARE]\n\nSecțiune incompletă. Adăugați conținut bazat pe cercetarea dvs.";
    if (!text) return placeholder;

    const lines = text.split('\n');

    // Determină numărul capitolului din marker (ex. "CAPITOL 4")
    const numMatch = chapterMarker.match(/\d+/);
    const chapNum = numMatch ? numMatch[0] : '1';

    // 1) Primul criteriu: capete de capitol tip "CAPITOL 1" / "CAPITOLUL 1" (cu/ fără ":")
    const startRegex = new RegExp(`^\\s*CAPITOL(UL)?\\s+${chapNum}\\b`, 'i');
    let startIdx = lines.findIndex(line => startRegex.test(line));

    // 2) Fallback: dacă nu găsim "CAPITOL N", încearcă titluri uzuale RO per capitol
    if (startIdx === -1) {
      const altHeadersByChapter: Record<string, RegExp[]> = {
        '1': [/^\s*INTRODUCERE\b/i],
        '2': [/^\s*(FUNDAMENTARE|CADRU\s+TEORETIC)\b/i],
        '3': [/^\s*METODOLOGIE\b/i],
        '4': [/^\s*(REZULTATE|ANALIZ[ĂA])\b/i],
        '5': [/^\s*(DISCU[TȚ]II|IMPLICA[TȚ]II)\b/i],
        '6': [/^\s*CONCLUZII\b/i],
      };

      const candidates = altHeadersByChapter[chapNum] || [];
      startIdx = lines.findIndex(line => candidates.some(rx => rx.test(line)));

      if (startIdx === -1) {
        console.log(`Nu am găsit capitol: ${chapterMarker} (nici fallback)`);
        return placeholder;
      } else {
        console.log(`✳️ Folosesc fallback header pentru capitolul ${chapNum} la linia ${startIdx}`);
      }
    }

    // 3) Determină următorul capăt de capitol (poate fi "CAPITOL M" sau un alt header alternativ)
    const nextCapRegex = /^(.*)?CAPITOL(UL)?\s+\d\b/i;
    const altAnyHeaderRegex = /^\s*(INTRODUCERE|FUNDAMENTARE|CADRU\s+TEORETIC|METODOLOGIE|REZULTATE|ANALIZ[ĂA]|DISCU[TȚ]II|IMPLICA[TȚ]II|CONCLUZII)\b/i;

    const nextChapterIdx = lines.findIndex((line, idx) => idx > startIdx + 1 && (nextCapRegex.test(line) || altAnyHeaderRegex.test(line)));

    const endIdx = nextChapterIdx === -1 ? lines.length : nextChapterIdx;
    const content = lines.slice(startIdx + 1, endIdx).join('\n').trim();

    return content || placeholder;
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

  // Funcție helper pentru convertirea textului în paragrafe formatate
  const convertTextToParagraphs = (text: string): Paragraph[] => {
    if (!text) return [];

    // Împarte textul în paragrafe (la \n\n sau \n)
    const paragraphs = text
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return paragraphs.flatMap(paraText => {
      // Detectează dacă e subtitlu (începe cu cifră urmat de punct: "4.1", "4.2")
      const isSubheading = /^\d+\.\d+/.test(paraText);

      if (isSubheading) {
        return new Paragraph({
          text: paraText,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        });
      }

      // Split paragraf cu \n (linii separate în același paragraf logic)
      const lines = paraText.split('\n').filter(l => l.trim());
      
      return lines.map(line => 
        new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: "Times New Roman",
              size: 24, // 12pt
            }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            line: 360, // 1.5 line spacing
            after: 120,
          },
          indent: {
            firstLine: 720, // 1.27cm
          },
        })
      );
    });
  };

  const exportThesisToWord = async () => {
    if (thesisSections.length === 0) {
      toast.error("Generați mai întâi structura tezei");
      return;
    }

    const hasRealContent = thesisSections.some(s => s.content && !s.content.startsWith("[DRAFT"));
    if (!hasRealContent) {
      toast.error("Draftul nu conține conținut generat. Apasă 'Generează Draft Doctorat (Admin)' și așteaptă confirmarea, apoi exportă.");
      return;
    }

    try {
      // Creează documentul Word
      const children: Paragraph[] = [
        // Titlu principal
        new Paragraph({
          text: "TEZĂ DE DOCTORAT - DRAFT PRELIMINAR",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // Warning
        new Paragraph({
          children: [
            new TextRun({
              text: "[IMPORTANT: Acest document este un DRAFT generat automat care necesită EDITARE MASIVĂ și VALIDARE ACADEMICĂ]",
              italics: true,
              size: 20, // 10pt
              font: "Times New Roman",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
      ];

      // Adaugă fiecare secțiune
      thesisSections.forEach((section) => {
        // Titlu capitol
        children.push(
          new Paragraph({
            text: section.title.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 240 },
          })
        );

        // Conținut capitol
        children.push(...convertTextToParagraphs(section.content));

        // Surse
        if (section.sources.length > 0) {
          children.push(
            new Paragraph({
              text: "SURSE UTILIZATE:",
              spacing: { before: 240, after: 120 },
              children: [
                new TextRun({
                  text: "SURSE UTILIZATE:",
                  bold: true,
                  font: "Times New Roman",
                  size: 24,
                }),
              ],
            })
          );

          section.sources.forEach((source, idx) => {
            children.push(
              new Paragraph({
                text: `[${idx + 1}] ${source.text}`,
                spacing: { after: 60 },
                indent: { left: 360 },
              })
            );

            source.links.forEach(link => {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `   - ${link.title}: `,
                      font: "Times New Roman",
                      size: 20,
                    }),
                    new TextRun({
                      text: link.url,
                      font: "Times New Roman",
                      size: 20,
                      color: "0000FF",
                      underline: {},
                    }),
                  ],
                  spacing: { after: 60 },
                  indent: { left: 720 },
                })
              );
            });
          });
        }
      });

      // Notă finală
      children.push(
        new Paragraph({
          text: "",
          spacing: { before: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "NOTĂ IMPORTANTĂ:",
              bold: true,
              font: "Times New Roman",
              size: 24,
            }),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          text: "Acest draft a fost generat automat pe baza datelor colectate din literatura științifică și din aplicația Yana Contabila. Necesită validare academică de la conducător de doctorat, adăugare contribuție originală, editare pentru stil academic și verificare anti-plagiat. Nu trimiteți acest document fără editare substanțială!",
          spacing: { after: 200 },
        })
      );

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1417,    // 2.5cm în twips (1cm = 567 twips)
                right: 1417,
                bottom: 1417,
                left: 1417,
              },
            },
          },
          children,
        }],
        styles: {
          default: {
            document: {
              run: {
                font: "Times New Roman",
                size: 24, // 12pt (size e în half-points, deci 24 = 12pt)
              },
              paragraph: {
                spacing: {
                  line: 360, // 1.5 line spacing (240 = single, 360 = 1.5, 480 = double)
                  after: 120,
                },
                alignment: AlignmentType.JUSTIFIED,
                indent: {
                  firstLine: 720, // 1.27cm indent (720 twips)
                },
              },
            },
          },
          paragraphStyles: [
            {
              id: "Title",
              name: "Title",
              basedOn: "Normal",
              run: {
                font: "Times New Roman",
                size: 32, // 16pt
                bold: true,
              },
              paragraph: {
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 },
              },
            },
            {
              id: "Heading1",
              name: "Heading 1",
              basedOn: "Normal",
              run: {
                font: "Times New Roman",
                size: 28, // 14pt
                bold: true,
              },
              paragraph: {
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 120 },
              },
            },
            {
              id: "Heading2",
              name: "Heading 2",
              basedOn: "Normal",
              run: {
                font: "Times New Roman",
                size: 24, // 12pt
                bold: true,
              },
              paragraph: {
                spacing: { before: 120, after: 120 },
              },
            },
          ],
        },
      });

      // Generează blob-ul Word
      const blob = await Packer.toBlob(doc);

      // Descarcă fișierul
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teza-draft-${new Date().toISOString().split('T')[0]}.docx`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Draft exportat cu succes în format Word!");
    } catch (error) {
      console.error("Eroare export Word:", error);
      toast.error("Eroare la exportul în Word. Verifică consola.");
    }
  };

  const exportThesisDraft = exportThesisToWord; // Alias pentru compatibilitate


  const fetchScientificLiterature = async () => {
    setLoading(true);
    try {
      const { batchFetchTranscripts, isYouTubeUrl } = await import('@/lib/youtubeTranscript');
      
      toast.info("🔍 Căutare literatură științifică...");
      
      // 1. Apelează edge function-ul pentru căutare
      const { data, error } = await supabase.functions.invoke("fetch-research-data");
      
      if (error) throw error;
      
      toast.success(`✓ Găsite ${data.papers_analyzed || 0} articole și ${data.videos_analyzed || 0} video-uri!`);
      
      // 2. Reload data pentru a obține înregistrările noi
      await loadResearchData();
      
      // 3. Obține toate resursele recent adăugate care conțin link-uri YouTube
      const { data: recentResources } = await supabase
        .from('research_data')
        .select('id, research_notes, content')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!recentResources || recentResources.length === 0) {
        return;
      }
      
      // 4. Identifică resursele cu link-uri YouTube care nu au transcript
      const youtubeResources = recentResources.filter(r => 
        r.research_notes && 
        isYouTubeUrl(r.research_notes) && 
        (!r.content || r.content.length < 100)
      );
      
      if (youtubeResources.length === 0) {
        console.log("✓ Nu există video-uri YouTube noi fără transcript");
        return;
      }
      
      console.log(`📝 Găsite ${youtubeResources.length} video-uri YouTube pentru extragere transcript...`);
      toast.info(`📝 Extragere transcripturi pentru ${youtubeResources.length} video-uri...`);
      
      // 5. Extrage transcripturile în batch
      const urls = youtubeResources.map(r => r.research_notes!);
      const transcripts = await batchFetchTranscripts(urls);
      
      // 6. Actualizează resursele cu transcripturile extrase
      let successCount = 0;
      for (const resource of youtubeResources) {
        const transcript = transcripts.get(resource.research_notes!);
        if (transcript) {
          const { error: updateError } = await supabase
            .from('research_data')
            .update({ content: transcript })
            .eq('id', resource.id);
          
          if (!updateError) {
            successCount++;
            console.log(`✓ Transcript actualizat pentru resursa ${resource.id}`);
          }
        }
      }
      
      if (successCount > 0) {
        toast.success(`🎉 ${successCount}/${youtubeResources.length} transcripturi extrase cu succes!`);
        await loadResearchData();
      } else {
        toast.warning("⚠️ Nu s-au putut extrage transcripturi (video-uri fără subtitle sau private)");
      }
      
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
        return Number(metadata?.profit) || 0;
      }).filter(p => p !== 0);
      const avgProfit = profits.length > 0
        ? Math.round(profits.reduce((sum, p) => sum + p, 0) / profits.length)
        : 0;
      
      const margins = (allAnalyses || []).map(a => {
        const md = a.metadata as any;
        const profit = Number(md?.profit) || 0;
        const revenue = Number(md?.ca) || 0;
        return revenue > 0 ? (profit / revenue) * 100 : 0;
      }).filter(m => !isNaN(m) && isFinite(m));
      const avgMargin = margins.length > 0
        ? Math.round((margins.reduce((sum, m) => sum + m, 0) / margins.length) * 10) / 10
        : 0;

      const highPerformers = margins.filter(m => m > 15).length;
      const mediumPerformers = margins.filter(m => m >= 10 && m <= 15).length;
      const lowPerformers = margins.filter(m => m < 10).length;

      // Calculează statistici suplimentare pentru marje
      const excellentCount = margins.filter(m => m > 15).length;
      const goodCount = margins.filter(m => m >= 10 && m <= 15).length;
      const averageCount = margins.filter(m => m >= 5 && m < 10).length;
      const poorCount = margins.filter(m => m < 5).length;

      // 2.1. Calculează scorul de reziliență pe companie și distribuția
      type Analysis = { created_at: string; metadata: any; company_name?: string };
      const byCompany = new Map<string, Analysis[]>();
      (allAnalyses as Analysis[] | null | undefined)?.forEach(a => {
        const key = a.company_name || 'N/A';
        if (!byCompany.has(key)) byCompany.set(key, []);
        byCompany.get(key)!.push(a);
      });

      const computeResilienceScore = (arr: Analysis[]) => {
        if (!arr || arr.length < 2) return null;
        const sorted = [...arr].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        // 1) Profit stability
        const profs = sorted.map(a => Number(a.metadata?.profit) || 0);
        const avgP = profs.reduce((s, p) => s + p, 0) / profs.length;
        const varP = profs.reduce((s, p) => s + Math.pow(p - avgP, 2), 0) / profs.length;
        const profitStability = avgP !== 0 ? Math.max(0, 100 - (Math.sqrt(varP) / Math.abs(avgP)) * 50) : 0;
        // 2) Liquidity
        const latest = sorted[sorted.length - 1];
        const liquid = (Number(latest.metadata?.casa) || 0) + (Number(latest.metadata?.banca) || 0);
        const obligations = Number(latest.metadata?.furnizori) || 1;
        const liquidityScore = Math.min(100, (liquid / obligations) * 100);
        // 3) Efficiency (EBITDA margin)
        const ebitda = Number(latest.metadata?.ebitda) || 0;
        const revenue = Number(latest.metadata?.ca) || 1;
        const efficiencyScore = Math.max(0, Math.min(100, 50 + ((ebitda / revenue) * 100) * 2));
        // 4) Cost flexibility
        const expenseRatios = sorted.map(a => {
          const expenses = Number(a.metadata?.cheltuieli) || 0;
          const rev = Number(a.metadata?.ca) || 1;
          return (expenses / rev) * 100;
        });
        const avgExp = expenseRatios.reduce((s, r) => s + r, 0) / expenseRatios.length;
        const varExp = expenseRatios.reduce((s, r) => s + Math.pow(r - avgExp, 2), 0) / expenseRatios.length;
        const costFlexibility = Math.max(0, 100 - Math.sqrt(varExp) * 10);
        const overall = profitStability * 0.3 + liquidityScore * 0.3 + efficiencyScore * 0.2 + costFlexibility * 0.2;
        return Math.round(overall);
      };

      const scores: number[] = [];
      for (const [, arr] of byCompany) {
        const s = computeResilienceScore(arr);
        if (s !== null) scores.push(s);
      }
      const totalScores = scores.length || 0;
      const avgResilienceScore = totalScores > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / totalScores) : 0;
      const lowRisk = scores.filter(s => s >= 75).length;
      const mediumRisk = scores.filter(s => s >= 50 && s < 75).length;
      const highRisk = scores.filter(s => s < 50).length;
      const distLow = totalScores ? Math.round((lowRisk / totalScores) * 100) : 0;
      const distMed = totalScores ? Math.round((mediumRisk / totalScores) * 100) : 0;
      const distHigh = totalScores ? Math.round((highRisk / totalScores) * 100) : 0;

      // 2.2. Perioadă și sectoare
      const dates = (allAnalyses || []).map(a => new Date(a.created_at));
      const minYear = dates.length ? Math.min(...dates.map(d => d.getFullYear())) : 2020;
      const maxYear = dates.length ? Math.max(...dates.map(d => d.getFullYear())) : new Date().getFullYear();
      const period = `${minYear}-${maxYear}`;
      const sectors = "tehnologie, servicii, retail"; // fallback până avem clasificare sectorială

      // 2.3. Încarcă resursele de cercetare cu conținut
      const { data: researchDataWithContent, error: researchError } = await supabase
        .from('research_data')
        .select('*')
        .not('content', 'is', null) // Doar resurse cu conținut
        .order('created_at', { ascending: false });

      const researchResources = (researchDataWithContent || []).map((r, index) => ({
        index: index + 1,
        title: r.course_name || r.research_theme || 'Untitled',
        link: r.research_notes || '',
        content: r.content || '[Fără conținut]'
      }));

      console.log("📚 Resurse cercetare încărcate:", researchResources.length);

      // 3. Apel edge function dedicat pentru draft doctorat
      console.log("📊 Statistici pentru draft:", {
        totalAnalyses,
        companies,
        avgProfit,
        avgMargin,
        highPerformers,
        lowPerformers,
        margins: { excellent: excellentCount, good: goodCount, average: averageCount, poor: poorCount },
        avgResilienceScore,
        resilienceDistribution: { low: distLow, medium: distMed, high: distHigh, totalScores },
        period,
        sectors,
      });

      const { data, error } = await supabase.functions.invoke("generate-doctorate-draft", {
        body: {
          totalAnalyses,
          companies,
          avgProfit,
          avgMargin,
          highPerformers,
          lowPerformers,
          margins: {
            excellent: excellentCount,
            good: goodCount,
            average: averageCount,
            poor: poorCount
          },
          avgResilienceScore,
          resilienceDistribution: { low: distLow, medium: distMed, high: distHigh, totalScores },
          period,
          sectors,
          researchResources, // Include research resources with content
        },
      });

      if (error) throw error;

      const generatedText = data?.fullText;
      
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

      {/* Secțiune pentru adăugare manuală resurse individuale */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <CardTitle>Adaugă Resursă Individual</CardTitle>
          </div>
          <CardDescription>
            Adaugă articole sau video-uri cu conținut detaliat pentru draft-ul tezei
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div>
              <Label htmlFor="resource-title">Titlu Resursă *</Label>
              <Input
                id="resource-title"
                placeholder="Ex: Dispelling Five Myths on Business Resilience"
                value={newResourceTitle}
                onChange={(e) => setNewResourceTitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="resource-link">Link YouTube sau Articol (opțional)</Label>
              <Input
                id="resource-link"
                placeholder="https://www.youtube.com/watch?v=... sau link articol"
                value={newResourceLink}
                onChange={(e) => setNewResourceLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pentru YouTube: transcriptul se va extrage automat dacă e disponibil
              </p>
            </div>

            <div>
              <Label htmlFor="resource-content">
                Rezumat și Note Despre Resursă *
                <span className="text-sm text-muted-foreground ml-2">
                  (Scrie ideile cheie, concluziile, citatele importante)
                </span>
              </Label>
              <Textarea
                id="resource-content"
                placeholder="Exemplu:

Video-ul/articolul discută 5 mituri despre reziliență organizațională:

1. Mitul rezistenței: Reziliența ≠ rigiditate. Nu înseamnă să rezişti neschimbat, ci să te adaptezi rapid.

2. Mitul costurilor: Investiția în reziliență nu e o cheltuială inutilă - previne pierderi mult mai mari în criză.

3. Mitul planificării totale: Nu poți anticipa totul. Reziliența = flexibilitate + capacitate de improvizație.

Concluzie cheie: Companiile resiliente investesc în capabilități dinamice, nu doar în procese rigide."
                value={newResourceContent}
                onChange={(e) => setNewResourceContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 50 caractere. Cu cât mai detaliat, cu atât mai bun draft-ul generat.
              </p>
            </div>

            <Button onClick={handleAddResource} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Resursă
            </Button>
          </div>

          {/* Lista resurselor adăugate manual */}
          {researchData.length > 0 && (
            <div className="space-y-2 mt-4">
              <h3 className="font-semibold text-sm mb-3">Resurse Adăugate ({researchData.length}):</h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {researchData.map((resource) => (
                    <div 
                      key={resource.id} 
                      className="border rounded-lg p-4 space-y-2 bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm line-clamp-2">
                            {resource.course_name || resource.research_theme}
                          </h4>
                          
                          {resource.research_notes && (
                            <div className="flex items-center gap-2 mt-1">
                              <a 
                                href={resource.research_notes} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1 truncate"
                              >
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{resource.research_notes}</span>
                              </a>
                              
                              {/* Indicator transcript extras pentru YouTube */}
                              {resource.content && 
                               resource.research_notes.includes('youtube') && 
                               resource.content.length > 200 && (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs flex-shrink-0">
                                  <TranscriptIcon className="h-3 w-3 mr-1" />
                                  Transcript {Math.round(resource.content.length / 1000)}k
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Preview conținut */}
                          {resource.content && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                📄 Vezi conținut/transcript ({resource.content.length} caractere)
                              </summary>
                              <div className="mt-2 bg-muted/50 p-3 rounded text-xs max-h-40 overflow-y-auto">
                                <p className="whitespace-pre-wrap font-mono">
                                  {resource.content.substring(0, 500)}
                                  {resource.content.length > 500 && '...'}
                                </p>
                              </div>
                            </details>
                          )}
                        </div>
                        
                        <Button 
                          onClick={() => deleteResource(resource.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
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
              <Button onClick={exportThesisToWord} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportă Draft (.DOCX - Format Academic)
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
