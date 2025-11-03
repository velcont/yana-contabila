import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, FileText, TrendingUp, Download, Shield } from "lucide-react";
import { DoctorateFileUploader } from "./DoctorateFileUploader";
import { DoctorateChapterManager } from "./DoctorateChapterManager";
import { generateDoctorateDocument } from "@/utils/generateDoctorateDocument";
import { PlagiarismAnalyzer } from "./PlagiarismAnalyzer";

interface DoctorateStructure {
  title: string;
  total_word_count: number;
  completion_percent: number;
  last_compiled: string | null;
}

interface ChapterStatus {
  chapter_number: number;
  chapter_title: string;
  word_count: number;
  expected_words: string;
  status: 'completed' | 'draft' | 'missing';
}

interface ChapterFile {
  id: string;
  file_name: string;
  word_count: number;
  uploaded_at: string;
  is_final_version: boolean;
}

const DOCTORATE_CHAPTERS: Omit<ChapterStatus, 'word_count' | 'status'>[] = [
  { chapter_number: 1, chapter_title: "Introducere", expected_words: "5.000-7.000" },
  { chapter_number: 2, chapter_title: "Fundamentare Teoretică", expected_words: "20.000-25.000" },
  { chapter_number: 3, chapter_title: "Metodologie", expected_words: "10.000-15.000" },
  { chapter_number: 4, chapter_title: "Analiză și Rezultate", expected_words: "30.000-35.000" },
  { chapter_number: 5, chapter_title: "Discuții", expected_words: "15.000-20.000" },
  { chapter_number: 6, chapter_title: "Concluzii", expected_words: "5.000-10.000" }
];

export const DoctorateStructureView = () => {
  const [structure, setStructure] = useState<DoctorateStructure | null>(null);
  const [chapters, setChapters] = useState<ChapterStatus[]>([]);
  const [chapterFiles, setChapterFiles] = useState<Map<number, ChapterFile[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [assembling, setAssembling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch doctorate structure
      const { data: structureData } = await supabase
        .from('doctorate_structure')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setStructure(structureData);

      // Fetch all chapter files
      const { data: filesData } = await supabase
        .from('doctorate_chapter_files')
        .select('id, chapter_number, file_name, word_count, uploaded_at, is_final_version')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      // Group files by chapter
      const filesMap = new Map<number, ChapterFile[]>();
      (filesData || []).forEach(file => {
        const existing = filesMap.get(file.chapter_number) || [];
        filesMap.set(file.chapter_number, [...existing, file]);
      });
      setChapterFiles(filesMap);

      // Fetch chapters for status
      const { data: chaptersData } = await supabase
        .from('doctorate_chapters')
        .select('chapter_number, chapter_title, word_count, status')
        .eq('user_id', user.id);

      // Map chapters to status
      const chapterStatusMap = new Map(
        (chaptersData || []).map(ch => [ch.chapter_number, ch])
      );

      const allChapters = DOCTORATE_CHAPTERS.map(base => {
        const existing = chapterStatusMap.get(base.chapter_number);
        const files = filesMap.get(base.chapter_number) || [];
        const hasFiles = files.length > 0;
        
        return {
          ...base,
          word_count: existing?.word_count || 0,
          status: hasFiles 
            ? (existing?.status === 'final' ? 'completed' : 'draft')
            : 'missing'
        } as ChapterStatus;
      });

      setChapters(allChapters);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Eroare la încărcare",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssemble = async () => {
    try {
      setAssembling(true);

      // Check if all chapters are present
      const missingChapters = chapters.filter(ch => ch.status === 'missing');
      if (missingChapters.length > 0) {
        toast({
          title: "Capitole lipsă",
          description: `Te rog încarcă mai întâi: ${missingChapters.map(ch => `Capitol ${ch.chapter_number}`).join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      // Fetch all chapter content
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: chaptersData } = await supabase
        .from('doctorate_chapters')
        .select('*')
        .eq('user_id', user.id)
        .order('chapter_number', { ascending: true });

      if (!chaptersData || chaptersData.length === 0) {
        toast({
          title: "Niciun capitol găsit",
          description: "Te rog încarcă cel puțin un capitol",
          variant: "destructive"
        });
        return;
      }

      // Generate document
      await generateDoctorateDocument(
        structure?.title || "Teză de Doctorat",
        chaptersData
      );

      // Update last_compiled timestamp
      await supabase
        .from('doctorate_structure')
        .upsert({
          user_id: user.id,
          last_compiled: new Date().toISOString()
        }, { onConflict: 'user_id' });

      toast({
        title: "✅ Doctorat asamblat cu succes!",
        description: "Documentul Word a fost descărcat"
      });

      fetchData();
    } catch (error: any) {
      console.error("Assembly error:", error);
      toast({
        title: "Eroare la asamblare",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAssembling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalWords = structure?.total_word_count || 0;
  const targetWords = 80000;
  const overallProgress = Math.min(Math.round((totalWords / targetWords) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <GraduationCap className="h-6 w-6" />
                {structure?.title || "Teză de Doctorat"}
              </CardTitle>
              <CardDescription>
                Progres general: {overallProgress}% completat
              </CardDescription>
            </div>
            <Button
              onClick={handleAssemble}
              disabled={assembling || chapters.some(ch => ch.status === 'missing')}
              size="lg"
              className="gap-2"
            >
              {assembling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Asamblare...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  🎓 Asamblează Doctorat Final
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total cuvinte
              </span>
              <span className="font-semibold">
                {totalWords.toLocaleString()} / {targetWords.toLocaleString()}
              </span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {structure?.last_compiled && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Ultima asamblare: {new Date(structure.last_compiled).toLocaleString('ro-RO')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chapters Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status Capitole</CardTitle>
          <CardDescription>
            {chapters.filter(ch => ch.status === 'completed').length} din {chapters.length} capitole complete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {chapters.map((chapter) => (
              <div
                key={chapter.chapter_number}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    chapter.status === 'completed' ? 'bg-green-500' :
                    chapter.status === 'draft' ? 'bg-yellow-500' : 'bg-gray-300'
                  }`} />
                  <div>
                    <p className="font-medium text-sm">
                      Capitol {chapter.chapter_number}: {chapter.chapter_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Obiectiv: {chapter.expected_words} cuvinte
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">
                    {chapter.word_count > 0 ? chapter.word_count.toLocaleString() : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {chapter.status === 'completed' ? '✅ Completat' :
                     chapter.status === 'draft' ? '⏳ Draft' : '⚠️ Lipsește'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Sections - ALL chapters always visible */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">📤 Încarcă Capitole</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {DOCTORATE_CHAPTERS.map((chapter) => {
            const files = chapterFiles.get(chapter.chapter_number) || [];
            
            return (
              <Card key={chapter.chapter_number} className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Capitol {chapter.chapter_number}: {chapter.chapter_title}
                  </CardTitle>
                  <CardDescription>
                    🎯 Obiectiv: {chapter.expected_words} cuvinte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {files.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">✅ Fișiere Încărcate ({files.length}):</p>
                        {files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">📗 {file.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                ⚖️ {file.word_count.toLocaleString()} cuvinte | 📅 {new Date(file.uploaded_at).toLocaleDateString('ro-RO')}
                                {file.is_final_version && ' ⭐ FINAL'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <DoctorateFileUploader
                        chapterNumber={chapter.chapter_number}
                        chapterTitle={chapter.chapter_title}
                        expectedWordCount={chapter.expected_words}
                        onUploadComplete={fetchData}
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">⚠️ Niciun fișier încărcat</p>
                      <DoctorateFileUploader
                        chapterNumber={chapter.chapter_number}
                        chapterTitle={chapter.chapter_title}
                        expectedWordCount={chapter.expected_words}
                        onUploadComplete={fetchData}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Existing Chapters Manager */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">📚 Capitole Existente</h3>
        <DoctorateChapterManager />
      </div>

      {/* Anti-Plagiarism Analysis Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          🔍 Analiză Anti-Plagiat
        </h3>
        <PlagiarismAnalyzer 
          chapters={chapters.map(ch => ({
            id: chapterFiles.get(ch.chapter_number)?.[0]?.id || '',
            chapter_number: ch.chapter_number,
            chapter_title: ch.chapter_title,
          }))}
          onAnalysisComplete={fetchData}
        />
      </div>
    </div>
  );
};
