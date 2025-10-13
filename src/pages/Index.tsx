import { useState, useEffect } from "react";
import { Upload, FileText, Loader2, Download, LogOut, History, User, Phone, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ChatAI } from "@/components/ChatAI";
import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnalysisDisplay } from "@/components/AnalysisDisplay";

import AdvertisementPopup from "@/components/AdvertisementPopup";
import { Landing } from "@/pages/Landing";
import { QuickStartGuide } from "@/components/QuickStartGuide";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { AdminRoleSwitcher } from "@/components/AdminRoleSwitcher";
import { AccountTypeSelector } from "@/components/AccountTypeSelector";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");
  
  const [isOpen, setIsOpen] = useState(false);
  const [showChatOnLoad, setShowChatOnLoad] = useState(true);
  const [triggerAutoChat, setTriggerAutoChat] = useState(false);
  const [showAccountTypeSelector, setShowAccountTypeSelector] = useState(false);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [userSubscriptionType, setUserSubscriptionType] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, signOut, loading } = useAuth();
  const { isAccountant } = useSubscription();
  const { themeType, setThemeOverride } = useTheme();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  // Removed auto-redirect to accountant dashboard to keep users on /app after login

  // Check if user needs to select account type
  useEffect(() => {
    const checkAccountType = async () => {
      if (user && !loading) {
        const { data, error } = await supabase
          .from('profiles')
          .select('account_type_selected, subscription_type, subscription_status, trial_ends_at')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          if (!data.account_type_selected) {
            setShowAccountTypeSelector(true);
            return;
          }

          // IMPORTANT: /app este pentru TOȚI - interfața de analiză (upload balanță, chat AI)
          // Nu mai redirecționăm - doar setăm tema corespunzătoare
          if (data.subscription_type === 'accounting_firm') {
            console.log('✅ User este contabil - afișare interfață analiză cu temă contabil');
            setUserSubscriptionType('accounting_firm');
            // Setează tema contabil
            setThemeOverride?.('accountant');
          } else {
            console.log('✅ User este antreprenor - afișare interfață analiză cu temă antreprenor');
            setUserSubscriptionType('entrepreneur');
            // Setează tema antreprenor
            setThemeOverride?.('entrepreneur');
          }

          // Verifică expirarea perioadei de testare
          if (data.trial_ends_at && new Date(data.trial_ends_at) <= new Date() && data.subscription_status !== 'active') {
            toast({
              title: "Perioada de testare expirată",
              description: "Perioada ta gratuită de 3 luni s-a încheiat. Abonează-te pentru a continua.",
              variant: "destructive",
            });
            navigate('/subscription');
            return;
          }
          
          // Load first company as default pentru antreprenori
          if (data.subscription_type === 'entrepreneur') {
            const { data: companies } = await supabase
              .from('companies')
              .select('id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (companies && companies.length > 0) {
              setCurrentCompanyId(companies[0].id);
            }
          }
        }
      }
    };

    checkAccountType();
  }, [user, loading]);

  useEffect(() => {
    // Auto-open chat when user logs in
    if (user && !loading) {
      const hasOpenedChat = sessionStorage.getItem('chat-opened-on-login');
      if (!hasOpenedChat) {
        setTimeout(() => {
          setShowChatOnLoad(true);
          sessionStorage.setItem('chat-opened-on-login', 'true');
        }, 1500);
      }
    }
  }, [user, loading]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      const invalidFiles = selectedFiles.filter(file => {
        const nameOk = file.name?.toLowerCase().match(/\.(xls|xlsx)$/);
        const typeOk = file.type === "application/vnd.ms-excel" || 
                       file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return !nameOk || !typeOk; // FIX: Changed from && to || for correct validation
      });

      if (invalidFiles.length > 0) {
        toast({
          title: "Format invalid",
          description: "Se acceptă DOAR fișiere Excel (.xls sau .xlsx) cu balanța de verificare.",
          variant: "destructive",
        });
        return;
      }
      
      setFiles(selectedFiles);
      setAnalysis("");
    }
  };

  const convertExcelToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast({
        title: "Niciun fișier selectat",
        description: "Te rog încarcă cel puțin o balanță de verificare.",
        variant: "destructive",
      });
      return;
    }

    // Company name is now optional - can be filled later from dashboard

    setIsAnalyzing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Process each file separately
      for (const file of files) {
        try {
          const excelBase64 = await convertExcelToBase64(file);

          const { data, error } = await supabase.functions.invoke("analyze-balance", {
            body: { excelBase64, fileName: file.name },
          });

          if (data?.error) throw new Error(data.error);

          // Show analysis only for the last file processed
          if (file === files[files.length - 1]) {
            setAnalysis(data.analysis);
          }
          
          if (user) {
            try {
              // Parse financial indicators from analysis text
              const { parseAnalysisText } = await import('@/utils/analysisParser');
              const indicators = parseAnalysisText(data.analysis);
              
              const { error: saveError } = await supabase
                .from('analyses')
                .insert({
                  user_id: user.id,
                  file_name: file.name,
                  analysis_text: data.analysis,
                  company_name: companyName.trim() || 'Firmă nouă',
                  metadata: indicators as any
                });
              if (saveError) throw saveError;
            } catch (saveError) {
              console.error('Error saving analysis:', saveError);
              failCount++;
              continue;
            }
          }
          
          successCount++;
        } catch (fileError) {
          console.error(`Error analyzing ${file.name}:`, fileError);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Analiză completă!",
          description: user 
            ? `${successCount} ${successCount === 1 ? 'analiză a fost generată' : 'analize au fost generate'} și ${successCount === 1 ? 'salvată' : 'salvate'} separat în Dosarul Meu Financiar.${failCount > 0 ? ` (${failCount} ${failCount === 1 ? 'eșuată' : 'eșuate'})` : ''}`
            : `${successCount} ${successCount === 1 ? 'analiză a fost generată' : 'analize au fost generate'} cu succes.`,
        });
        
        // Pornește automat chatbot-ul
        setTriggerAutoChat(true);
      } else {
        throw new Error("Toate analizele au eșuat");
      }
    } catch (error) {
      console.error("Eroare la analiză:", error);
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : "A apărut o eroare la generarea analizelor.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!analysis) return;
    
    const jsPDF = (await import('jspdf')).default;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    
    doc.setFontSize(18);
    doc.text('Yana - Analiză Balanță', margin, margin);
    
    if (files.length > 0) {
      doc.setFontSize(12);
      doc.text(`Fișier: ${files[files.length - 1].name}`, margin, margin + 10);
    }
    
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(analysis, maxWidth);
    let y = margin + 25;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    });
    
    doc.save(`yana-analiza-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({
      title: "Export reușit",
      description: "PDF-ul a fost descărcat cu succes.",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    setThemeOverride(null); // Reset any mode override on logout to avoid unintended redirects
    setAnalysis("");
    setFiles([]);
    toast({
      title: "Deconectat",
      description: "Te-ai deconectat cu succes.",
    });
  };

  // Loading state - afișează ecran de încărcare
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Dacă utilizatorul NU este autentificat, afișează Landing page
  if (!user) {
    console.log('User is not authenticated, showing Landing page');
    return <Landing />;
  }

  console.log('User is authenticated:', user.email);

  // /app afișează interfața de ANALIZĂ pentru TOȚI utilizatorii
  // Dashboard-ul contabil este la /accountant-dashboard (rută separată)

  if (showDashboard && user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" onClick={() => setShowDashboard(false)}>
                ← Înapoi la Analiză
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Deconectare
              </Button>
            </div>
          </div>
          <Dashboard />
          <Footer />
        </div>
        <ChatAI 
          autoStart={triggerAutoChat}
          onAutoStartComplete={() => setTriggerAutoChat(false)}
          onOpenDashboard={() => setShowDashboard(true)}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/contact')} className="text-sm">
                <Phone className="mr-2 h-4 w-4" />
                Contact
              </Button>
              {themeType === 'accountant' && userSubscriptionType === 'accounting_firm' && (
                <Button 
                  variant="default" 
                  onClick={() => navigate('/crm')} 
                  className="text-sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  CRM Clienți
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <ThemeToggle />
              {user ? (
                <>
                  {/* În /app NU arătăm nimic legat de modul contabil, indiferent de rol */}
                  {userSubscriptionType === 'entrepreneur' && (
                    <>
                      <SubscriptionBadge />
                      <CompanySwitcher 
                        currentCompanyId={currentCompanyId}
                        onCompanyChange={setCurrentCompanyId}
                        onAddCompany={() => navigate('/crm')}
                      />
                    </>
                  )}
                  {/* Dacă utilizatorul e contabil, nu afișăm badge sau buton contabil în /app */}
                  <AdminRoleSwitcher />
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDashboard(true)}
                    data-tour="dashboard-button"
                    className="relative animate-glow-pulse border-2 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 bg-[length:200%_200%] animate-gradient-shift font-semibold shadow-lg hover:shadow-xl"
                  >
                    <History className="mr-2 h-4 w-4 animate-bounce" />
                    <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_200%]">
                      📊 Dashboard cu grafice și indicatori
                    </span>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  </Button>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Deconectare
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => navigate('/auth')}>
                  <User className="mr-2 h-4 w-4" />
                  Autentificare
                </Button>
              )}
            </div>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Yana - Analiza Balanței
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Înțelege situația financiară a afacerii tale instant, fără să aștepți explicații de la contabil.
              Analiză managerială completă în câteva secunde.
            </p>
          </div>

          {user && <QuickStartGuide onOpenChat={() => setShowChatOnLoad(true)} onOpenDashboard={() => setShowDashboard(true)} />}

          {analysis && (
            <Card className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Analiză Managerială</CardTitle>
                <Button onClick={handleExportPDF} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </CardHeader>
              <CardContent>
                <AnalysisDisplay 
                  analysisText={analysis}
                  fileName={files[files.length - 1]?.name}
                />
              </CardContent>
            </Card>
          )}

          {!analysis && (
            <Card className="mt-8 bg-accent/5 border-accent/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2 text-accent">Despre Yana</h3>
                <p className="text-sm text-muted-foreground">
                  Yana folosește inteligență artificială pentru a genera analize contabile manageriale 
                  pe baza balanțelor de verificare. Analizele sunt structurate și ușor de înțeles 
                  pentru antreprenori fără pregătire contabilă, respectând regulile contabile și 
                  fiscale din România. Aplicația funcționează cu balanțe din orice program de 
                  contabilitate (SmartBill, WizOne, Saga, etc.).
                </p>
              </CardContent>
            </Card>
          )}
          
          <Footer />
        </div>
      </div>
      {user && (
        <ChatAI 
          autoStart={triggerAutoChat}
          onAutoStartComplete={() => setTriggerAutoChat(false)}
          onOpenDashboard={() => setShowDashboard(true)}
          openOnLoad={showChatOnLoad}
        />
      )}
      
      <AdvertisementPopup intervalMinutes={10} />
      <AccountTypeSelector 
        open={showAccountTypeSelector} 
        onComplete={() => {
          setShowAccountTypeSelector(false);
          window.location.reload(); // Refresh to load correct theme and settings
        }}
      />
    </>
  );
};

export default Index;
