import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, FileText, Upload, Download, AlertCircle, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import mammoth from "mammoth";
import { exportPlagiarismReportPDF } from "@/utils/exportPlagiarismReport";

interface PlagiarismCriteria {
  score: number;
  issues: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  locations: string[];
}

interface PlagiarismReport {
  overallScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  plagiarismProbability: number;
  criteriaScores: {
    typographyVariations: PlagiarismCriteria;
    translationErrors: PlagiarismCriteria;
    styleInconsistency: PlagiarismCriteria;
    structureLogic: PlagiarismCriteria;
    personInconsistency: PlagiarismCriteria;
    citationInconsistency: PlagiarismCriteria;
    bibliographyIssues: PlagiarismCriteria;
    attributionErrors: PlagiarismCriteria;
  };
  detailedFindings: Array<{
    criterion: string;
    location: string;
    issue: string;
    recommendation: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  recommendations: string[];
}

interface Chapter {
  id: string;
  chapter_number: number;
  chapter_title: string;
  content?: string;
  file_path?: string;
}

interface PlagiarismAnalyzerProps {
  chapters: Chapter[];
  onAnalysisComplete?: () => void;
}

export function PlagiarismAnalyzer({ chapters, onAnalysisComplete }: PlagiarismAnalyzerProps) {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [report, setReport] = useState<PlagiarismReport | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'LOW': return <CheckCircle2 className="h-5 w-5" />;
      case 'MEDIUM': return <AlertCircle className="h-5 w-5" />;
      case 'HIGH': return <AlertTriangle className="h-5 w-5" />;
      case 'CRITICAL': return <XCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      toast({
        title: "Format invalid",
        description: "Te rog încarcă un fișier Word (.docx sau .doc)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fișier prea mare",
        description: "Dimensiunea maximă permisă este 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setSelectedChapterId("");
    toast({
      title: "Fișier încărcat",
      description: `${file.name} - Gata pentru analiză`,
    });
  };

  const extractTextFromWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const analyzeDocument = async () => {
    try {
      setAnalyzing(true);
      setProgress(10);
      setCurrentStep("Pregătire document...");
      setReport(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nu ești autentificat");

      let content = "";
      let chapterNumber = 0;
      let chapterTitle = "";

      if (uploadedFile) {
        setProgress(20);
        setCurrentStep("Extragere text din document...");
        content = await extractTextFromWord(uploadedFile);
        chapterNumber = 0;
        chapterTitle = uploadedFile.name.replace(/\.(docx|doc)$/i, '');
      } else if (selectedChapterId) {
        const chapter = chapters.find(ch => ch.id === selectedChapterId);
        if (!chapter) throw new Error("Capitol nu a fost găsit");

        setProgress(20);
        setCurrentStep("Încărcare capitol...");
        
        if (chapter.content) {
          content = chapter.content;
        } else if (chapter.file_path) {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('doctorate-documents')
            .download(chapter.file_path);
          
          if (downloadError) throw downloadError;
          
          const file = new File([fileData], 'chapter.docx');
          content = await extractTextFromWord(file);
        } else {
          throw new Error("Capitolul nu are conținut disponibil");
        }

        chapterNumber = chapter.chapter_number;
        chapterTitle = chapter.chapter_title;
      } else {
        throw new Error("Te rog selectează un capitol sau încarcă un document");
      }

      if (content.length < 100) {
        throw new Error("Documentul este prea scurt pentru analiză (minim 100 caractere)");
      }

      setProgress(40);
      setCurrentStep("Analizare pe 8 criterii anti-plagiat...");

      const { data, error } = await supabase.functions.invoke('analyze-plagiarism', {
        body: { content, chapterNumber, chapterTitle }
      });

      if (error) throw error;
      if (!data?.success || !data?.report) {
        throw new Error(data?.error || "Nu am primit raport valid de la server");
      }

      setProgress(80);
      setCurrentStep("Salvare rezultate...");

      const analysisReport: PlagiarismReport = data.report;
      setReport(analysisReport);

      // Save to database
      const { error: insertError } = await supabase
        .from('plagiarism_analyses')
        .insert({
          user_id: user.id,
          chapter_id: selectedChapterId || null,
          chapter_number: chapterNumber,
          chapter_title: chapterTitle,
          overall_score: analysisReport.overallScore,
          risk_level: analysisReport.riskLevel,
          plagiarism_probability: analysisReport.plagiarismProbability,
          detailed_report: analysisReport as any,
          recommendations: analysisReport.recommendations,
        } as any);

      if (insertError) {
        console.error("Error saving analysis:", insertError);
      }

      setProgress(100);
      setCurrentStep("Analiză completă!");

      toast({
        title: "Analiză finalizată",
        description: `Scor general: ${analysisReport.overallScore}/100 - Risc: ${analysisReport.riskLevel}`,
      });

      if (onAnalysisComplete) onAnalysisComplete();

    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Eroare la analiză",
        description: error.message || "A apărut o eroare neașteptată",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const handleExportPDF = () => {
    if (!report) return;
    
    const chapterInfo = uploadedFile 
      ? { number: 0, title: uploadedFile.name }
      : chapters.find(ch => ch.id === selectedChapterId);
    
    if (!chapterInfo) return;

    exportPlagiarismReportPDF(report, {
      chapterNumber: 'number' in chapterInfo ? chapterInfo.number : chapterInfo.chapter_number,
      chapterTitle: 'title' in chapterInfo ? chapterInfo.title : chapterInfo.chapter_title,
    });

    toast({
      title: "Raport exportat",
      description: "PDF-ul a fost descărcat cu succes",
    });
  };

  const criteriaInfo = {
    typographyVariations: { name: "Variații Tipografice", max: 20 },
    translationErrors: { name: "Erori de Traducere", max: 20 },
    styleInconsistency: { name: "Stil Incoerent", max: 15 },
    structureLogic: { name: "Structură Ilogică", max: 10 },
    personInconsistency: { name: "Inconsistențe de Persoană", max: 15 },
    citationInconsistency: { name: "Inconsistențe Citări", max: 10 },
    bibliographyIssues: { name: "Probleme Bibliografice", max: 5 },
    attributionErrors: { name: "Erori de Atribuire", max: 5 },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            🔍 Analiză Anti-Plagiat Academic
          </CardTitle>
          <CardDescription>
            Verificare pe 8 criterii profesionale de detectare a plagiatului
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="existing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">
                <FileText className="h-4 w-4 mr-2" />
                Capitol Existent
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                Încarcă Document
              </TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Selectează Capitol
                </label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => {
                    setSelectedChapterId(e.target.value);
                    setUploadedFile(null);
                  }}
                  className="w-full p-2 border rounded-md"
                  disabled={analyzing}
                >
                  <option value="">-- Alege un capitol --</option>
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      Capitol {ch.chapter_number}: {ch.chapter_title}
                    </option>
                  ))}
                </select>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Încarcă Document Word (.docx)
                </label>
                <input
                  type="file"
                  accept=".docx,.doc"
                  onChange={handleFileUpload}
                  disabled={analyzing}
                  className="w-full p-2 border rounded-md"
                />
                {uploadedFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Fișier selectat: {uploadedFile.name}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={analyzeDocument}
            disabled={analyzing || (!selectedChapterId && !uploadedFile)}
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <>
                <Shield className="h-5 w-5 mr-2 animate-spin" />
                Analizare în curs...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 mr-2" />
                🚀 Începe Analiza
              </>
            )}
          </Button>

          {analyzing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {currentStep}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-6">
          {/* Overall Score Card */}
          <Card className={`border-2 ${getRiskColor(report.riskLevel)}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getRiskIcon(report.riskLevel)}
                  📊 SCOR GENERAL: {report.overallScore}/100
                </span>
                <Badge variant="outline" className={getRiskColor(report.riskLevel)}>
                  RISC: {report.riskLevel}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Probabilitate Plagiat: {report.plagiarismProbability}%</span>
                  <span>{100 - report.plagiarismProbability}% Original</span>
                </div>
                <Progress value={100 - report.plagiarismProbability} className="h-3" />
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {report.riskLevel === 'LOW' && '✅ Textul respectă criteriile academice. Revizuire finală recomandată.'}
                  {report.riskLevel === 'MEDIUM' && '⚠️ Câteva aspecte necesită atenție. Revizuiește recomandările de mai jos.'}
                  {report.riskLevel === 'HIGH' && '🚨 Probleme importante detectate. Revizuire substanțială necesară.'}
                  {report.riskLevel === 'CRITICAL' && '🔴 CRITIC! Consultă îndrumătorul și revizuiește complet textul.'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Criteria Scores */}
          <Card>
            <CardHeader>
              <CardTitle>🔍 Criterii Individuale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(report.criteriaScores).map(([key, criteria]) => {
                const info = criteriaInfo[key as keyof typeof criteriaInfo];
                const percentage = (criteria.score / info.max) * 100;
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{info.name}</span>
                      <Badge variant="outline" className={getRiskColor(criteria.severity)}>
                        {criteria.score}/{info.max}
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    
                    {criteria.issues.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {criteria.issues.map((issue, idx) => (
                          <div key={idx} className="text-sm">
                            <p className="text-muted-foreground">• {issue}</p>
                            {criteria.locations[idx] && (
                              <p className="text-xs text-muted-foreground ml-4">
                                📍 {criteria.locations[idx]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Detailed Findings */}
          {report.detailedFindings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🔎 Probleme Detectate Detaliat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.detailedFindings.map((finding, idx) => (
                  <Alert key={idx} className={getRiskColor(finding.severity)}>
                    <AlertDescription className="space-y-2">
                      <div className="font-medium">{finding.criterion}</div>
                      <div className="text-sm">
                        <strong>Problemă:</strong> {finding.issue}
                      </div>
                      <div className="text-sm">
                        <strong>Locație:</strong> {finding.location}
                      </div>
                      <div className="text-sm">
                        <strong>💡 Recomandare:</strong> {finding.recommendation}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Recomandări de Acțiune</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="font-bold text-primary">{idx + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Export Actions */}
          <div className="flex gap-4">
            <Button onClick={handleExportPDF} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              📥 Descarcă Raport PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
