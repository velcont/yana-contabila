import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Trash2, Eye, Download, BarChart3, Calendar, Newspaper } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ro } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { AnalyticsCharts } from './AnalyticsCharts';
import { parseAnalysisText } from '@/utils/analysisParser';
import { FiscalNews } from './FiscalNews';
import { AnalysisDisplay } from './AnalysisDisplay';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Analysis {
  id: string;
  file_name: string;
  analysis_text: string;
  created_at: string;
  company_name?: string;
}

export const Dashboard = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'3' | '6' | '12' | 'all'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const { toast } = useToast();
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error loading analyses:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut încărca istoricul analizelor.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== id));
      if (selectedAnalysis?.id === id) {
        setSelectedAnalysis(null);
      }

      toast({
        title: 'Șters cu succes',
        description: 'Analiza a fost ștearsă.'
      });
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut șterge analiza.',
        variant: 'destructive'
      });
    }
  };

  const deleteAllAnalyses = async () => {
    if (!window.confirm('Ești sigur că vrei să ștergi TOATE analizele? Această acțiune nu poate fi anulată!')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nu ești autentificat');

      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setAnalyses([]);
      setSelectedAnalysis(null);
      
      toast({
        title: 'Șters cu succes',
        description: 'Toate analizele au fost șterse.'
      });
    } catch (error) {
      console.error('Error deleting all analyses:', error);
      toast({
        title: 'Eroare',
        description: 'Nu am putut șterge analizele.',
        variant: 'destructive'
      });
    }
  };

  const exportToPDF = (analysis: Analysis) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    
    // Header
    doc.setFontSize(18);
    doc.text('Yana - Analiză Balanță', margin, margin);
    
    doc.setFontSize(12);
    doc.text(`Fișier: ${analysis.file_name}`, margin, margin + 10);
    doc.text(
      `Data: ${format(new Date(analysis.created_at), 'dd MMMM yyyy, HH:mm', { locale: ro })}`,
      margin,
      margin + 17
    );
    
    // Content
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(analysis.analysis_text, maxWidth);
    let y = margin + 30;
    
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    });
    
    doc.save(`yana-analiza-${format(new Date(analysis.created_at), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: 'Export reușit',
      description: 'PDF-ul a fost descărcat cu succes.'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  // Filtrare date pe perioadă și companie
  const getFilteredAnalyses = () => {
    let filtered = analyses;
    
    // Filtrare după perioadă
    if (periodFilter !== 'all') {
      const months = parseInt(periodFilter);
      const cutoffDate = subMonths(new Date(), months);
      filtered = filtered.filter(analysis => 
        new Date(analysis.created_at) >= cutoffDate
      );
    }
    
    // Filtrare după companie
    if (companyFilter !== 'all') {
      filtered = filtered.filter(analysis => 
        (analysis.company_name || 'Firma Principală') === companyFilter
      );
    }
    
    return filtered;
  };
  
  // Lista unică de companii pentru filtru
  const uniqueCompanies = Array.from(new Set(
    analyses.map(a => a.company_name || 'Firma Principală')
  )).sort();

  const filteredAnalyses = getFilteredAnalyses();

  // Pregătire date pentru grafice
  const analyticsData = filteredAnalyses.map(analysis => ({
    date: analysis.created_at,
    fileName: analysis.file_name,
    indicators: parseAnalysisText(analysis.analysis_text)
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Dashboard Financiar</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selectează perioada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Ultimele 3 luni</SelectItem>
              <SelectItem value="6">Ultimele 6 luni</SelectItem>
              <SelectItem value="12">Ultimele 12 luni</SelectItem>
              <SelectItem value="all">Toate perioadele</SelectItem>
            </SelectContent>
          </Select>
          
          {uniqueCompanies.length > 1 && (
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toate firmele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate firmele</SelectItem>
                {uniqueCompanies.map(company => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {analyses.length > 0 && isAdmin && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={deleteAllAnalyses}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Șterge toate
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Grafice
          </TabsTrigger>
          <TabsTrigger value="news">
            <Newspaper className="h-4 w-4 mr-2" />
            Știri Fiscale
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            Dosarul Meu Financiar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsCharts data={analyticsData} />
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          <FiscalNews />
        </TabsContent>

        <TabsContent value="history">
          <div className="grid md:grid-cols-3 gap-6">
        {/* Lista analizelor */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Analizele Tale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {analyses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nu ai analize salvate încă.
              </p>
            ) : (
              analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAnalysis?.id === analysis.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedAnalysis(analysis)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {analysis.file_name}
                      </p>
                      {analysis.company_name && (
                        <p className="text-xs font-semibold text-primary">
                          {analysis.company_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(analysis.created_at), 'dd MMM yyyy', { locale: ro })}
                      </p>
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Detalii analiză */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {selectedAnalysis ? 'Detalii Analiză' : 'Selectează o analiză'}
            </CardTitle>
            {selectedAnalysis && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF(selectedAnalysis)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteAnalysis(selectedAnalysis.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Șterge
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedAnalysis ? (
              <AnalysisDisplay 
                analysisText={selectedAnalysis.analysis_text}
                fileName={selectedAnalysis.file_name}
                createdAt={selectedAnalysis.created_at}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selectează o analiză din listă pentru a vedea detaliile</p>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
