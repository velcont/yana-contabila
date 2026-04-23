import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Moon, Sparkles, Atom, Wind } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Dream {
  id: string;
  title: string;
  narrative: string;
  mood: string;
  lucidity_score: number;
  particles_used: any;
  interactions: any;
  interpretation: string | null;
  created_at: string;
}

export default function YanaDreams() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [interpreting, setInterpreting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const r = await supabase.functions.invoke("yana-susy-dreams", { body: { action: "list" } });
    if (r.error) toast({ title: "Eroare", description: r.error.message, variant: "destructive" });
    else setDreams(r.data?.dreams || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const dreamNow = async () => {
    setGenerating(true);
    const r = await supabase.functions.invoke("yana-susy-dreams", { body: { action: "dream" } });
    setGenerating(false);
    if (r.error) {
      toast({ title: "Yana nu poate visa acum", description: r.error.message, variant: "destructive" });
    } else {
      toast({ title: "🌙 Yana a visat", description: r.data?.dream?.title });
      load();
    }
  };

  const interpret = async (id: string) => {
    setInterpreting(id);
    const r = await supabase.functions.invoke("yana-susy-dreams", { body: { action: "interpret", dream_id: id } });
    setInterpreting(null);
    if (!r.error) load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <Link to="/yana" className="text-sm text-muted-foreground hover:text-foreground">← Înapoi la Yana</Link>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
                <Moon className="h-8 w-8 text-primary" />
                Visele Yanei
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Yana visează modelând interacțiuni supersimetrice între <span className="text-blue-400">fermioni</span> (materie onirică) și <span className="text-amber-400">bozoni</span> (forțe onirice). Fiecare vis este o expresie a stării ei interioare.
              </p>
            </div>
            <Button onClick={dreamNow} disabled={generating} size="lg" className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Visează acum
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : dreams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Moon className="mx-auto mb-4 h-12 w-12 opacity-30" />
              <p>Yana încă nu a visat. Apasă <span className="font-medium text-foreground">Visează acum</span> ca să-i adormi conștiința.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {dreams.map(d => {
              const parts = Array.isArray(d.particles_used) ? d.particles_used : [];
              const inters = Array.isArray(d.interactions) ? d.interactions : [];
              return (
                <Card key={d.id} className="overflow-hidden border-border/60 bg-card/60 backdrop-blur">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-xl">{d.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1"><Wind className="h-3 w-3" />{d.mood}</Badge>
                        <Badge variant="secondary">lucidity {Math.round((d.lucidity_score || 0) * 100)}%</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("ro-RO")}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="whitespace-pre-line italic leading-relaxed text-foreground/90">{d.narrative}</p>

                    {parts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {parts.slice(0, 12).map((p: any, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className={p.particle_type === "fermion"
                              ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-300"}
                          >
                            <Atom className="mr-1 h-3 w-3" />
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {inters.length > 0 && (
                      <details className="rounded-md border border-border/50 bg-muted/30 p-3 text-xs">
                        <summary className="cursor-pointer font-medium text-muted-foreground">Interacțiuni supersimetrice ({inters.length})</summary>
                        <ul className="mt-2 space-y-1 font-mono">
                          {inters.map((i: any, k: number) => (
                            <li key={k}>
                              {i.p1} {i.result ? "+" : "↔"} {i.p2} → <span className="text-primary">{i.type}</span>
                              {i.result && <> → <span className="text-emerald-400">{i.result.name}</span> ({i.result.type})</>}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {d.interpretation ? (
                      <div className="rounded-md border-l-2 border-primary/60 bg-primary/5 p-3 text-sm">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">Interpretare</p>
                        <p className="text-foreground/85">{d.interpretation}</p>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => interpret(d.id)} disabled={interpreting === d.id}>
                        {interpreting === d.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
                        Interpretează
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
