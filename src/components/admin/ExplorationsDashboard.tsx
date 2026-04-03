import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Globe, BookOpen, Sparkles, ExternalLink, RefreshCw, Activity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { AgentTracesTab } from "./AgentTracesTab";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface Exploration {
  id: string;
  exploration_topic: string;
  search_queries: string[];
  sources_visited: Array<{ url: string; query: string }>;
  key_learnings: string;
  emotional_reaction: string;
  relevance_to_users: string;
  exploration_type: string;
  trigger_source: Record<string, unknown>;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  curiosity: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  knowledge_gap: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  dream_inspired: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  trending: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const TYPE_LABELS: Record<string, string> = {
  curiosity: "🔍 Curiozitate",
  knowledge_gap: "📚 Lacună de cunoștințe",
  dream_inspired: "💭 Inspirat din vise",
  trending: "📈 Trending",
};

export function ExplorationsDashboard() {
  const [explorations, setExplorations] = useState<Exploration[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchExplorations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("yana_explorations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to fetch explorations:", error);
    } else {
      setExplorations((data as unknown as Exploration[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExplorations();
  }, []);

  const triggerExploration = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("yana-explorer", {
        body: { triggered_by: "admin_manual" },
      });
      if (error) throw error;
      toast.success(`Explorare completă: ${data?.topic || "succes"}`);
      fetchExplorations();
    } catch (err) {
      toast.error("Explorare eșuată: " + (err as Error).message);
    }
    setTriggering(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="explorations" className="space-y-6">
      <TabsList>
        <TabsTrigger value="explorations">
          <Globe className="h-4 w-4 mr-2" />
          Explorări
        </TabsTrigger>
        <TabsTrigger value="traces">
          <Activity className="h-4 w-4 mr-2" />
          Agent Traces
        </TabsTrigger>
      </TabsList>

      <TabsContent value="explorations">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🌐 Explorări Autonome YANA</h2>
          <p className="text-muted-foreground">Ce a descoperit YANA navigând pe internet</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchExplorations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîncarcă
          </Button>
          <Button onClick={triggerExploration} disabled={triggering}>
            {triggering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
            Explorează Acum
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Explorări</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{explorations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Surse Vizitate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {explorations.reduce((sum, e) => sum + (e.sources_visited?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tipuri</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {Object.entries(
              explorations.reduce((acc, e) => {
                acc[e.exploration_type] = (acc[e.exploration_type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <Badge key={type} variant="secondary" className={TYPE_COLORS[type] || ""}>
                {TYPE_LABELS[type] || type}: {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {explorations.map((exp) => (
          <Card key={exp.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    {exp.exploration_topic}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(exp.created_at), "d MMMM yyyy, HH:mm", { locale: ro })}
                  </CardDescription>
                </div>
                <Badge className={TYPE_COLORS[exp.exploration_type] || ""}>
                  {TYPE_LABELS[exp.exploration_type] || exp.exploration_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold flex items-center gap-1 mb-1">
                  <BookOpen className="h-4 w-4" /> Ce a învățat
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {exp.key_learnings?.slice(0, 500)}
                  {(exp.key_learnings?.length || 0) > 500 ? "..." : ""}
                </p>
              </div>

              {exp.emotional_reaction && (
                <div>
                  <h4 className="font-semibold flex items-center gap-1 mb-1">
                    <Sparkles className="h-4 w-4" /> Reacție emoțională
                  </h4>
                  <p className="text-sm italic text-muted-foreground">{exp.emotional_reaction}</p>
                </div>
              )}

              {exp.relevance_to_users && (
                <div>
                  <h4 className="font-semibold mb-1">🎯 Relevanță pentru utilizatori</h4>
                  <p className="text-sm text-muted-foreground">{exp.relevance_to_users}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {exp.search_queries?.map((q, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    🔍 {q}
                  </Badge>
                ))}
              </div>

              {exp.sources_visited?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Surse ({exp.sources_visited.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {exp.sources_visited.slice(0, 5).map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {new URL(s.url).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {explorations.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">YANA nu a explorat încă nimic.</p>
              <Button className="mt-4" onClick={triggerExploration} disabled={triggering}>
                Pornește prima explorare
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
      </TabsContent>

      <TabsContent value="traces">
        <AgentTracesTab />
      </TabsContent>
    </Tabs>
  );
}
