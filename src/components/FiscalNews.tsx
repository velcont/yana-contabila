import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { openExternalLink } from '@/config/externalLinks';
import { Newspaper, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewsItem {
  id: string;
  title: string;
  description: string | null;
  source: string;
  link: string;
  published_at: string;
  created_at: string;
}

export const FiscalNews = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  const loadNews = async () => {
    try {
      const { data, error } = await supabase
        .from('fiscal_news')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      
      setNews(data || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading fiscal news:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut încărca știrile fiscale.",
        variant: "destructive"
      });
    }
  };

  const refreshNews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-fiscal-news');
      
      if (error) throw error;

      toast({
        title: "Actualizare completă",
        description: `S-au găsit ${data?.count || 0} știri noi.`
      });

      await loadNews();
    } catch (error) {
      console.error('Error refreshing news:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut actualiza știrile.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6" />
            Știri Fiscale
          </h2>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground mt-1">
              Actualizat: {formatDate(lastUpdate.toISOString())}
            </p>
          )}
        </div>
        <Button 
          onClick={refreshNews} 
          disabled={loading}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizează
        </Button>
      </div>

      {news.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nu sunt știri disponibile. Apasă "Actualizează" pentru a căuta știri noi.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <Card key={item.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-medium leading-tight flex-1">
                      {item.title}
                    </h3>
                    <Badge variant="secondary" className="shrink-0">
                      {item.source}
                    </Badge>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.published_at)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openExternalLink(item.link)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Citește
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {news.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Ce contează pentru IMM-uri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              • Verifică modificările legislative recente care afectează obligațiile fiscale
              <br />
              • Fii la curent cu termenele de raportare e-Factura și SAF-T
              <br />
              • Monitorizează schimbările în plafonul de TVA și scutirile disponibile
            </p>
            <div className="pt-2 border-t mt-3">
              <p className="text-sm font-medium">Acțiune recomandată:</p>
              <p className="text-sm text-muted-foreground">
                Consultă contabilul pentru a evalua impactul acestor știri asupra afacerii tale.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};