import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Clock, FileText } from 'lucide-react';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';

export interface DeepResearchData {
  report: string;
  sources: string[];
  metadata: {
    totalSearches: number;
    iterations: number;
    sourcesCount: number;
  };
}

export function DeepResearchArtifact({ data }: { data: DeepResearchData }) {
  return (
    <Card className="w-full max-w-2xl border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-5 w-5 text-primary" />
            Raport Deep Research
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <FileText className="h-3 w-3" />
              {data.metadata.totalSearches} cercetări
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              {data.metadata.iterations} iterații
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="prose prose-sm dark:prose-invert max-w-none max-h-96 overflow-y-auto">
          <MarkdownRenderer content={data.report} />
        </div>

        {data.sources.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Surse ({data.sources.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.sources.slice(0, 10).map((src, i) => {
                const domain = (() => {
                  try { return new URL(src).hostname.replace('www.', ''); } catch { return src.slice(0, 30); }
                })();
                return (
                  <a
                    key={i}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border bg-muted/30 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    [{i + 1}] {domain}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
