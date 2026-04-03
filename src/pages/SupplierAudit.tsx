import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  Search, ShieldCheck, AlertTriangle, XCircle, Loader2, Building2,
  TrendingDown, Clock, ExternalLink, FileText, Trash2, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { YanaHomeButton } from '@/components/YanaHomeButton';

interface SupplierScores {
  price: number;
  reliability: number;
  risk: number;
  overall: number;
}

interface MarketPrice {
  source: string;
  price: number;
  currency: string;
}

interface AnalysisResult {
  scores: SupplierScores;
  recommendation: string;
  confidence: number;
  reasoning: string;
  market_prices: MarketPrice[];
  risk_factors: string[];
  strengths: string[];
  web_sources: string[];
  supplier_name: string;
}

interface ExtractedBid {
  vendor_name?: string;
  vendor_cui?: string;
  total_price?: number;
  currency?: string;
  bid_date?: string;
  valid_until?: string;
  delivery_terms?: string;
  payment_terms?: string;
  warranty?: string;
  reference_number?: string;
  items?: { name: string; quantity: number; unit_price: number; total: number }[];
  specifications?: string;
  confidence_score?: number;
}

interface HistoryItem {
  id: string;
  supplier_name: string;
  product_description: string | null;
  offer_price: number | null;
  currency: string;
  scores: SupplierScores;
  recommendation: string;
  confidence: number;
  reasoning: string;
  created_at: string;
}

const SupplierAudit = () => {
  const [supplierName, setSupplierName] = useState('');
  const [cui, setCui] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Bid extraction
  const [bidText, setBidText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedBid | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('supplier_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setHistory(data as unknown as HistoryItem[]);
  };

  const analyzeSupplier = async () => {
    if (!supplierName.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-supplier', {
        body: {
          supplier_name: supplierName.trim(),
          cui: cui.trim() || undefined,
          product_description: productDesc.trim() || undefined,
          offer_price: offerPrice ? parseFloat(offerPrice) : undefined,
          currency: 'RON',
        },
      });

      if (error) throw error;
      setResult(data);
      loadHistory();
      toast({
        title: '✅ Analiză completă',
        description: `Furnizorul "${supplierName}" a fost analizat cu succes.`,
      });
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const extractBidData = async () => {
    if (!bidText.trim()) return;
    setExtracting(true);
    setExtracted(null);

    try {
      const { data, error } = await supabase.functions.invoke('extract-bid-data', {
        body: { document_text: bidText.trim() },
      });

      if (error) throw error;
      setExtracted(data.extracted);

      // Auto-fill form
      if (data.extracted?.vendor_name) setSupplierName(data.extracted.vendor_name);
      if (data.extracted?.vendor_cui) setCui(data.extracted.vendor_cui);
      if (data.extracted?.total_price) setOfferPrice(data.extracted.total_price.toString());

      toast({ title: '✅ Extracție completă', description: 'Datele au fost extrase și populate automat.' });
    } catch (err: any) {
      toast({ title: 'Eroare', description: err.message, variant: 'destructive' });
    } finally {
      setExtracting(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    await supabase.from('supplier_analyses').delete().eq('id', id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const getRecBadge = (rec: string) => {
    switch (rec) {
      case 'APROBAT':
        return <Badge className="bg-primary/10 text-primary border-primary"><ShieldCheck className="h-3 w-3 mr-1" /> Aprobat</Badge>;
      case 'RESPINS':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Respins</Badge>;
      default:
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" /> De revizuit</Badge>;
    }
  };

  const ScoreBar = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">{icon} {label}</span>
        <span className="font-semibold">{value}/100</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <YanaHomeButton />

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            Supplier Audit AI
          </h1>
          <p className="text-muted-foreground">
            Analizează furnizori cu AI: scoring multi-criteriu, cercetare web, extracție date din oferte.
          </p>
        </div>

        <Tabs defaultValue="analyze">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="analyze">🔍 Analiză Furnizor</TabsTrigger>
            <TabsTrigger value="extract">📄 Extrage din Document</TabsTrigger>
          </TabsList>

          <TabsContent value="analyze">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Date furnizor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="Nume furnizor *"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    placeholder="CUI (opțional)"
                    value={cui}
                    onChange={(e) => setCui(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Input
                  placeholder="Descriere produs/serviciu (opțional)"
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  disabled={loading}
                />
                <div className="flex gap-3">
                  <Input
                    placeholder="Preț ofertă (RON)"
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    disabled={loading}
                    className="max-w-[200px]"
                  />
                  <Button onClick={analyzeSupplier} disabled={loading || !supplierName.trim()} className="flex-1 sm:flex-none">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    {loading ? 'Analizez...' : 'Analizează'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loading && (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Cercetez furnizorul online și calculez scoruri...</p>
                <p className="text-xs text-muted-foreground mt-1">Durează 10-20 secunde</p>
              </div>
            )}

            {result && (
              <div className="space-y-4 mb-8">
                {/* Overall Score Card */}
                <Card className="border-primary/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{result.supplier_name}</h3>
                        <p className="text-muted-foreground text-sm">
                          Încredere: {Math.round((result.confidence || 0) * 100)}%
                        </p>
                      </div>
                      <div className="text-right">
                        {getRecBadge(result.recommendation)}
                        <div className="text-3xl font-bold mt-2 text-primary">
                          {result.scores?.overall || 0}/100
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <ScoreBar label="Competitivitate Preț" value={result.scores?.price || 0} icon={<TrendingDown className="h-3.5 w-3.5" />} />
                      <ScoreBar label="Fiabilitate" value={result.scores?.reliability || 0} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
                      <ScoreBar label="Nivel Siguranță (risc scăzut)" value={result.scores?.risk || 0} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
                    </div>
                  </CardContent>
                </Card>

                {/* Reasoning */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-2">💡 Concluzie AI</h4>
                    <p className="text-sm text-muted-foreground">{result.reasoning}</p>
                  </CardContent>
                </Card>

                {/* Strengths & Risks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.strengths?.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <h4 className="font-semibold mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-primary" /> Puncte forte
                        </h4>
                        <ul className="space-y-1">
                          {result.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {result.risk_factors?.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <h4 className="font-semibold mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-destructive" /> Factori de risc
                        </h4>
                        <ul className="space-y-1">
                          {result.risk_factors.map((r, i) => (
                            <li key={i} className="text-sm text-muted-foreground">• {r}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Market Prices */}
                {result.market_prices?.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">📊 Prețuri de piață</h4>
                      <div className="space-y-2">
                        {result.market_prices.map((mp, i) => (
                          <div key={i} className="flex justify-between items-center p-2 rounded bg-muted/50">
                            <span className="text-sm">{mp.source}</span>
                            <span className="font-semibold">{mp.price?.toLocaleString('ro-RO')} {mp.currency}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Web Sources */}
                {result.web_sources?.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-2">🌐 Surse web consultate</h4>
                      <div className="space-y-1">
                        {result.web_sources.map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                            <ExternalLink className="h-3 w-3 shrink-0" /> {src}
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="extract">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Extrage date din document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Lipește textul ofertei, facturii sau documentului de licitație aici..."
                  value={bidText}
                  onChange={(e) => setBidText(e.target.value)}
                  rows={8}
                  disabled={extracting}
                />
                <Button onClick={extractBidData} disabled={extracting || bidText.trim().length < 10}>
                  {extracting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                  {extracting ? 'Extrag...' : 'Extrage date'}
                </Button>
              </CardContent>
            </Card>

            {extracted && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📋 Date extrase</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {extracted.vendor_name && <div><span className="text-muted-foreground">Furnizor:</span> <strong>{extracted.vendor_name}</strong></div>}
                    {extracted.vendor_cui && <div><span className="text-muted-foreground">CUI:</span> <strong>{extracted.vendor_cui}</strong></div>}
                    {extracted.total_price && <div><span className="text-muted-foreground">Preț total:</span> <strong>{extracted.total_price.toLocaleString('ro-RO')} {extracted.currency || 'RON'}</strong></div>}
                    {extracted.bid_date && <div><span className="text-muted-foreground">Data ofertei:</span> <strong>{extracted.bid_date}</strong></div>}
                    {extracted.valid_until && <div><span className="text-muted-foreground">Valabil până:</span> <strong>{extracted.valid_until}</strong></div>}
                    {extracted.delivery_terms && <div><span className="text-muted-foreground">Livrare:</span> <strong>{extracted.delivery_terms}</strong></div>}
                    {extracted.payment_terms && <div><span className="text-muted-foreground">Plată:</span> <strong>{extracted.payment_terms}</strong></div>}
                    {extracted.warranty && <div><span className="text-muted-foreground">Garanție:</span> <strong>{extracted.warranty}</strong></div>}
                    {extracted.reference_number && <div><span className="text-muted-foreground">Nr. ref:</span> <strong>{extracted.reference_number}</strong></div>}
                  </div>

                  {extracted.items && extracted.items.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-semibold mb-2">Articole:</h5>
                      <div className="space-y-1">
                        {extracted.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                            <span>{item.name} × {item.quantity}</span>
                            <span className="font-medium">{item.total?.toLocaleString('ro-RO')} {extracted.currency || 'RON'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extracted.confidence_score !== undefined && (
                    <div className="mt-4 flex items-center gap-2">
                      <Badge variant="outline">Încredere: {Math.round(extracted.confidence_score * 100)}%</Badge>
                    </div>
                  )}

                  <Button variant="secondary" className="mt-4" onClick={() => {
                    // Switch to analyze tab with prefilled data
                    const tabTrigger = document.querySelector('[data-value="analyze"]') as HTMLElement;
                    tabTrigger?.click();
                  }}>
                    <Search className="h-4 w-4 mr-2" />
                    Analizează furnizorul extras
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* History */}
        {history.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Analize recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{item.supplier_name}</p>
                        {getRecBadge(item.recommendation)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('ro-RO')} •
                        Scor: {(item.scores as any)?.overall || 0}/100
                        {item.offer_price && ` • ${item.offer_price.toLocaleString('ro-RO')} ${item.currency}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => deleteAnalysis(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
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

export default SupplierAudit;
