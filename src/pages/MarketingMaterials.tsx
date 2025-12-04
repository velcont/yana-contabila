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
  Loader2
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
          <TabsList className="grid w-full grid-cols-4">
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
        </Tabs>
      </div>
    </div>
  );
}
