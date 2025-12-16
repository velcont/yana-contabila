import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, 
  Image, 
  FileSpreadsheet, 
  Zap, 
  Upload, 
  Download, 
  Presentation,
  ShoppingBag,
  Award,
  BarChart3,
  Loader2,
  MessageSquare,
  Brain,
  Target,
  FileOutput,
  Copy
} from "lucide-react";
import { generateYanaPremiumReportPPT } from "@/utils/generateYanaPremiumReportPPT";
import { generateMarketplacePowerPoint } from "@/utils/generateMarketplacePowerPoint";
import { generateYanaStrategicaDemoPPT } from "@/utils/generateYanaStrategicaDemoPPT";
import { generateCopyrightPDF } from "@/utils/copyrightPdfExport";

interface StorageFile {
  name: string;
  path: string;
  size: number;
  created_at: string;
}

export default function MarketingMaterials() {
  const { isAdmin, isLoading } = useUserRole();
  const navigate = useNavigate();
  const [files, setFiles] = useState<Record<string, StorageFile[]>>({
    logos: [],
    screenshots: [],
    documents: [],
    social: []
  });
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadFiles();
    }
  }, [isAdmin]);

  const loadFiles = async () => {
    const folders = ['logos', 'screenshots', 'documents', 'social-media'];
    const newFiles: Record<string, StorageFile[]> = {
      logos: [],
      screenshots: [],
      documents: [],
      social: []
    };

    for (const folder of folders) {
      const { data, error } = await supabase.storage
        .from('marketing-assets')
        .list(folder);

      if (!error && data) {
        const key = folder === 'social-media' ? 'social' : folder;
        newFiles[key] = data.map(file => ({
          name: file.name,
          path: `${folder}/${file.name}`,
          size: file.metadata?.size || 0,
          created_at: file.created_at
        }));
      }
    }

    setFiles(newFiles);
  };

  const handleUpload = async (folder: string, file: File) => {
    setUploading(true);
    try {
      const filePath = `${folder}/${file.name}`;
      const { error } = await supabase.storage
        .from('marketing-assets')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      toast.success(`${file.name} uploaded successfully`);
      await loadFiles();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('marketing-assets')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('File downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleGeneratePPT = async (type: 'premium' | 'marketplace' | 'strategic-demo') => {
    setGenerating(type);
    try {
      if (type === 'premium') {
        await generateYanaPremiumReportPPT();
      } else if (type === 'marketplace') {
        await generateMarketplacePowerPoint();
      } else if (type === 'strategic-demo') {
        await generateYanaStrategicaDemoPPT();
      }
      toast.success('PowerPoint generated successfully');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate PowerPoint');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateCopyright = async () => {
    setGenerating('copyright');
    try {
      await generateCopyrightPDF();
      toast.success('Copyright certificate generated');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate certificate');
    } finally {
      setGenerating(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Mesaj copiat în clipboard!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">🎨 Marketing Materials Hub</h1>
          <p className="text-muted-foreground">Centralizare materiale publicitare YANA - Acces Admin Only</p>
        </div>

        <Tabs defaultValue="presentations" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="presentations">
              <Presentation className="w-4 h-4 mr-2" />
              Presentations
            </TabsTrigger>
            <TabsTrigger value="assets">
              <Image className="w-4 h-4 mr-2" />
              Visual Assets
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="actions">
              <Zap className="w-4 h-4 mr-2" />
              Quick Actions
            </TabsTrigger>
            <TabsTrigger value="copy">
              <MessageSquare className="w-4 h-4 mr-2" />
              Copy Library
            </TabsTrigger>
          </TabsList>

          {/* PRESENTATIONS TAB */}
          <TabsContent value="presentations" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Raport Premium Tutorial
                  </CardTitle>
                  <CardDescription>
                    8 sliduri: problemă + soluție + tutorial pas-cu-pas + unicitate YANA
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGeneratePPT('premium')}
                    disabled={generating === 'premium'}
                    className="w-full"
                  >
                    {generating === 'premium' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Se generează...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generează PPT Raport Premium
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Marketplace Presentation
                  </CardTitle>
                  <CardDescription>
                    9 sliduri: beneficii contabili + antreprenori + CTA marketplace
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGeneratePPT('marketplace')}
                    disabled={generating === 'marketplace'}
                    className="w-full"
                  >
                    {generating === 'marketplace' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Se generează...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generează PPT Marketplace
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Presentation className="w-5 h-5 text-primary" />
                    Demo Yana Strategică
                  </CardTitle>
                  <CardDescription>
                    12 sliduri: TechServ SRL + texte Synthesia + placeholders screenshots
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGeneratePPT('strategic-demo')}
                    disabled={generating === 'strategic-demo'}
                    className="w-full"
                  >
                    {generating === 'strategic-demo' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Se generează...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generează PPT Demo YouTube
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* VISUAL ASSETS TAB */}
          <TabsContent value="assets" className="space-y-4">
            <Alert>
              <AlertDescription>
                Upload logo-uri, screenshot-uri și bannere pentru social media. Formate acceptate: PNG, JPG, SVG, WebP
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Logo-uri YANA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload('logos', file);
                    }}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Logo
                  </Button>
                  <div className="space-y-2">
                    {files.logos.map((file) => (
                      <div key={file.path} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(file.path)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Screenshots App</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload('screenshots', file);
                    }}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <Button
                    onClick={() => document.getElementById('screenshot-upload')?.click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Screenshot
                  </Button>
                  <div className="space-y-2">
                    {files.screenshots.map((file) => (
                      <div key={file.path} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(file.path)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Social Media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload('social-media', file);
                    }}
                    className="hidden"
                    id="social-upload"
                  />
                  <Button
                    onClick={() => document.getElementById('social-upload')?.click()}
                    disabled={uploading}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Banner
                  </Button>
                  <div className="space-y-2">
                    {files.social.map((file) => (
                      <div key={file.path} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(file.path)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="space-y-4">
            <Alert>
              <AlertDescription>
                Upload pitch decks, case studies și analize competitive. Format: PDF
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Documente Marketing</CardTitle>
                <CardDescription>Pitchuri, case studies, analize competitive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload('documents', file);
                  }}
                  className="hidden"
                  id="doc-upload"
                />
                <Button
                  onClick={() => document.getElementById('doc-upload')?.click()}
                  disabled={uploading}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document PDF
                </Button>
                <div className="space-y-2">
                  {files.documents.map((file) => (
                    <div key={file.path} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(file.path)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QUICK ACTIONS TAB */}
          <TabsContent value="actions" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Certificat Proprietate Intelectuală
                  </CardTitle>
                  <CardDescription>
                    Generează PDF cu certificatul de copyright YANA
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleGenerateCopyright}
                    disabled={generating === 'copyright'}
                    className="w-full"
                  >
                    {generating === 'copyright' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Se generează...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generează Certificat PDF
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Export Analytics Marketing
                  </CardTitle>
                  <CardDescription>
                    Statistici pentru pitch-uri (coming soon)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    disabled
                    variant="outline"
                    className="w-full"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Analytics (Coming Soon)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* COPY LIBRARY TAB */}
          <TabsContent value="copy" className="space-y-4">
            <Alert>
              <AlertDescription>
                Mesaje de marketing corecte pentru fiecare funcționalitate YANA. Click pentru copiere rapidă.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              {/* CHAT AI - Raport Financiar */}
              <Card className="border-blue-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Chat AI - Raport Financiar
                  </CardTitle>
                  <CardDescription>
                    Funcționalitate: Încărcare balanță → Raport 40+ pagini în 60 secunde
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">📺 YouTube / TikTok:</p>
                    <p className="text-sm text-foreground">"Încarcă balanța ta pe Yana-contabila.velcont.com și primești raportul financiar complet în 60 de secunde. Link în primul comentariu."</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard("Încarcă balanța ta pe Yana-contabila.velcont.com și primești raportul financiar complet în 60 de secunde. Link în primul comentariu.")}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiază
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">📘 Facebook:</p>
                    <p className="text-sm text-foreground">"Ai nevoie de analiză financiară rapidă? Încarcă balanța pe Yana și primești raport de 40+ pagini cu indicatori, grafice și recomandări. Gratuit prima analiză!"</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard("Ai nevoie de analiză financiară rapidă? Încarcă balanța pe Yana și primești raport de 40+ pagini cu indicatori, grafice și recomandări. Gratuit prima analiză!")}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiază
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* YANA STRATEGICĂ - Strategie Business */}
              <Card className="border-violet-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-violet-500" />
                    Yana Strategică - Strategie Business
                  </CardTitle>
                  <CardDescription>
                    Funcționalitate: Conversație AI → Strategii personalizate pentru afacerea ta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-violet-50 dark:bg-violet-950/50 rounded-lg">
                    <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">📺 YouTube / TikTok:</p>
                    <p className="text-sm text-foreground">"Intră pe Yana-contabila.velcont.com, accesează Yana Strategică și primești strategii personalizate pentru afacerea ta. Link în primul comentariu."</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard("Intră pe Yana-contabila.velcont.com, accesează Yana Strategică și primești strategii personalizate pentru afacerea ta. Link în primul comentariu.")}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiază
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-violet-50 dark:bg-violet-950/50 rounded-lg">
                    <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">📘 Facebook:</p>
                    <p className="text-sm text-foreground">"Cum crești vânzările? Cum reduci costurile? Discută cu Yana Strategică - AI-ul tău de business care îți oferă strategii concrete bazate pe datele firmei tale."</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard("Cum crești vânzările? Cum reduci costurile? Discută cu Yana Strategică - AI-ul tău de business care îți oferă strategii concrete bazate pe datele firmei tale.")}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiază
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* WAR ROOM - Simulări Scenarii */}
              <Card className="border-red-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-red-500" />
                    War Room - Simulări Scenarii
                  </CardTitle>
                  <CardDescription>
                    Funcționalitate: Testează scenarii de criză înainte să se întâmple
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">📺 YouTube / TikTok:</p>
                    <p className="text-sm text-foreground">"Ce se întâmplă dacă pierzi clientul principal? Testează scenarii de criză în War Room-ul Yana înainte să se întâmple în realitate. Link în bio."</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard("Ce se întâmplă dacă pierzi clientul principal? Testează scenarii de criză în War Room-ul Yana înainte să se întâmple în realitate. Link în bio.")}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiază
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">📘 Facebook:</p>
                    <p className="text-sm text-foreground">"Simulează scenarii de criză: scădere vânzări 30%, pierdere client major, creștere costuri. War Room-ul Yana îți arată impactul și soluțiile ÎNAINTE să fie prea târziu."</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard("Simulează scenarii de criză: scădere vânzări 30%, pierdere client major, creștere costuri. War Room-ul Yana îți arată impactul și soluțiile ÎNAINTE să fie prea târziu.")}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiază
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* BATTLE PLAN - Export PDF */}
              <Card className="border-amber-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileOutput className="w-5 h-5 text-amber-500" />
                    Battle Plan - Export PDF
                  </CardTitle>
                  <CardDescription>
                    Funcționalitate: Exportă strategia completă în PDF profesional
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">📺 YouTube / TikTok:</p>
                    <p className="text-sm text-foreground">"Primește Battle Plan-ul tău în PDF: obiective, pași concreți, timeline și KPIs. Exportă și prezintă echipei sau investitorilor. Link în bio."</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard("Primește Battle Plan-ul tău în PDF: obiective, pași concreți, timeline și KPIs. Exportă și prezintă echipei sau investitorilor. Link în bio.")}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiază
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">📘 Facebook:</p>
                    <p className="text-sm text-foreground">"Strategia ta de business într-un document profesional: Battle Plan PDF cu obiective SMART, pași de implementare și indicatori de succes. Pregătit pentru prezentare!"</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard("Strategia ta de business într-un document profesional: Battle Plan PDF cu obiective SMART, pași de implementare și indicatori de succes. Pregătit pentru prezentare!")}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiază
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
