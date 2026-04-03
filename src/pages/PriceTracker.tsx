import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, TrendingDown, ExternalLink, Clock, Loader2, ShoppingCart, Star, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { YanaHomeButton } from '@/components/YanaHomeButton';

interface PriceResult {
  store: string;
  product_name: string;
  price: number;
  currency: string;
  url: string;
}

interface SearchHistory {
  id: string;
  product_query: string;
  results: PriceResult[];
  best_price: number | null;
  best_source: string | null;
  currency: string;
  sources_checked: number;
  created_at: string;
}

const PriceTracker = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PriceResult[]>([]);
  const [bestPrice, setBestPrice] = useState<number | null>(null);
  const [bestSource, setBestSource] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('price_searches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setHistory(data as unknown as SearchHistory[]);
  };

  const searchPrices = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setBestPrice(null);
    setBestSource(null);

    try {
      const { data, error } = await supabase.functions.invoke('search-prices', {
        body: { product: query.trim(), currency: 'RON' },
      });

      if (error) throw error;

      setResults(data.results || []);
      setBestPrice(data.best_price);
      setBestSource(data.best_source);
      loadHistory();

      toast({
        title: '✅ Căutare completă',
        description: `Am găsit ${data.sources_checked} rezultate pentru "${query}"`,
      });
    } catch (err: any) {
      toast({
        title: 'Eroare',
        description: err.message || 'Nu am putut căuta prețuri',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSearch = async (id: string) => {
    await supabase.from('price_searches').delete().eq('id', id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const loadPreviousSearch = (item: SearchHistory) => {
    setQuery(item.product_query);
    setResults(item.results || []);
    setBestPrice(item.best_price);
    setBestSource(item.best_source);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <YanaHomeButton />

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <ShoppingCart className="h-8 w-8 text-primary" />
            Price Tracker
          </h1>
          <p className="text-muted-foreground">
            Caută cele mai bune prețuri pe eMAG, Amazon, AliExpress și alte magazine online.
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                placeholder="Ex: iPhone 15, Samsung Galaxy S24, laptop gaming..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPrices()}
                className="text-lg"
                disabled={loading}
              />
              <Button onClick={searchPrices} disabled={loading || !query.trim()} size="lg">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                <span className="ml-2 hidden sm:inline">{loading ? 'Caut...' : 'Caută'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Best Price Banner */}
        {bestPrice !== null && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-accent fill-accent" />
                  <div>
                    <p className="font-semibold text-lg">Cel mai bun preț găsit</p>
                    <p className="text-muted-foreground text-sm">pe {bestSource}</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-primary">
                  {bestPrice.toLocaleString('ro-RO')} RON
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3 mb-8">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              {results.length} rezultate găsite
            </h2>
            {results
              .sort((a, b) => (a.price || 999999) - (b.price || 999999))
              .map((result, idx) => (
                <Card key={idx} className={idx === 0 ? 'border-primary/50 ring-1 ring-primary/20' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={idx === 0 ? 'default' : 'secondary'} className="shrink-0">
                            {result.store}
                          </Badge>
                          {idx === 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-600 shrink-0">
                              Cel mai ieftin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{result.product_name}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xl font-bold">
                          {result.price?.toLocaleString('ro-RO')} {result.currency || 'RON'}
                        </span>
                        {result.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Caut prețuri pe eMAG, Amazon, AliExpress...</p>
            <p className="text-xs text-muted-foreground mt-1">Durează 5-15 secunde</p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Căutări recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => loadPreviousSearch(item)}
                  >
                    <div>
                      <p className="font-medium">{item.product_query}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('ro-RO')} •{' '}
                        {item.sources_checked} surse
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.best_price && (
                        <span className="font-semibold text-primary">
                          {item.best_price.toLocaleString('ro-RO')} {item.currency}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSearch(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PriceTracker;
