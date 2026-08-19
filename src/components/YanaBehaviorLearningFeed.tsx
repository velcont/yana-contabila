import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Headphones, ExternalLink } from 'lucide-react';

interface BehaviorEntry {
  id: string;
  topic: string;
  response_template: string;
  created_at: string;
  metadata: {
    theme?: string;
    channel?: string;
    source_url?: string;
    video_title?: string;
  } | null;
}

export function YanaBehaviorLearningFeed() {
  const [entries, setEntries] = useState<BehaviorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('id, topic, response_template, created_at, metadata')
        .eq('category', 'human_behavior')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(15);
      if (!error && data) setEntries(data as unknown as BehaviorEntry[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          Ce ascultă YANA despre oameni
        </CardTitle>
        <CardDescription>
          În fiecare noapte, la ora 03:00, YANA caută singură materiale educative pe YouTube
          (psihologie, negociere, leadership) și își notează concluziile cu propriile cuvinte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Se încarcă...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Încă nu există notițe. Prima sesiune de învățare rulează la ora 03:00.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {entries.map((e) => (
              <AccordionItem key={e.id} value={e.id}>
                <AccordionTrigger className="text-left text-sm">
                  <div className="flex flex-col gap-1 pr-2">
                    <span>{e.metadata?.video_title || e.topic.replace('[Comportament uman] ', '')}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {e.metadata?.theme && (
                        <Badge variant="secondary" className="text-xs">{e.metadata.theme}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString('ro-RO')}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {e.response_template}
                  </div>
                  {e.metadata?.source_url && (
                    <a
                      href={e.metadata.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Vezi sursa pe YouTube <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}