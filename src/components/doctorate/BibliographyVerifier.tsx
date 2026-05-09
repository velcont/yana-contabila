import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, XCircle, Wifi, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type Verdict = {
  citation: string;
  url?: string;
  doi?: string;
  http_status?: number;
  fetched_title?: string;
  crossref_match?: { title: string; doi: string; authors: string; year: string } | null;
  status: 'real' | 'suspect' | 'hallucinated' | 'unreachable';
  confidence: number;
  reason: string;
};

const STATUS_META = {
  real: { label: 'Validă', icon: CheckCircle2, color: 'text-green-600 bg-green-500/10 border-green-500/30' },
  suspect: { label: 'Suspectă', icon: AlertTriangle, color: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
  hallucinated: { label: 'Halucinație', icon: XCircle, color: 'text-red-600 bg-red-500/10 border-red-500/30' },
  unreachable: { label: 'Inaccesibilă', icon: Wifi, color: 'text-muted-foreground bg-muted border-border' },
} as const;

export function BibliographyVerifier() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Verdict[] | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const verify = async () => {
    if (text.trim().length < 20) {
      toast.error('Lipește bibliografia sau textul proiectului (min. 20 caractere).');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('verify-bibliography', { body: { text } });
      if (error) throw error;
      setResults(data.results || []);
      setSummary(data.summary || null);
      toast.success(`Verificare completă: ${data.summary?.real || 0} validate, ${data.summary?.hallucinated || 0} halucinații`);
    } catch (e: any) {
      toast.error('Eroare verificare: ' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Verifică bibliografie (anti-halucinație AI)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Lipește bibliografia sau întreg proiectul de cercetare. YANA verifică fiecare referință:
          accesează URL-urile, validează DOI-urile pe Crossref și caută lucrările textuale pentru a depista
          citările inventate de AI.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Lipește aici bibliografia sau textul complet al proiectului (cu link-uri și/sau DOI-uri)..."
          className="min-h-[200px] font-mono text-sm"
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Maxim 60 referințe / verificare. Durează ~10-30 secunde.
          </p>
          <Button onClick={verify} disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verific...</>
            ) : (
              <><ShieldCheck className="h-4 w-4 mr-2" />Verifică bibliografia</>
            )}
          </Button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['real','suspect','hallucinated','unreachable'] as const).map((k) => {
              const M = STATUS_META[k];
              const Icon = M.icon;
              return (
                <div key={k} className={`rounded-md border p-3 ${M.color}`}>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Icon className="h-4 w-4" /> {M.label}
                  </div>
                  <div className="text-2xl font-bold mt-1">{summary[k] || 0}</div>
                </div>
              );
            })}
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {results.map((r, i) => {
              const M = STATUS_META[r.status];
              const Icon = M.icon;
              return (
                <div key={i} className={`rounded-md border p-3 ${M.color}`}>
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{M.label}</Badge>
                        <span className="text-[10px] opacity-70">încredere {(r.confidence * 100).toFixed(0)}%</span>
                        {r.http_status && <Badge variant="outline" className="text-[10px]">HTTP {r.http_status}</Badge>}
                        {r.doi && <Badge variant="outline" className="text-[10px]">DOI</Badge>}
                      </div>
                      <p className="text-xs text-foreground/90 break-words">{r.citation}</p>
                      <p className="text-xs italic">{r.reason}</p>
                      {r.crossref_match && (
                        <p className="text-[11px] opacity-80">
                          Crossref: <span className="font-medium">{r.crossref_match.title}</span> — {r.crossref_match.authors} ({r.crossref_match.year})
                        </p>
                      )}
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] underline">
                          <ExternalLink className="h-3 w-3" /> deschide link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
