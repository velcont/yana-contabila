import { ExternalLink, FileText } from 'lucide-react';

interface Source {
  url: string;
  title?: string;
}

interface SourcesDisplayProps {
  sources: Source[] | string[];
  className?: string;
}

export function SourcesDisplay({ sources, className = '' }: SourcesDisplayProps) {
  if (!sources || sources.length === 0) return null;

  const normalizedSources: Source[] = sources.map((s) =>
    typeof s === 'string' ? { url: s, title: extractDomain(s) } : s
  );

  return (
    <div className={`mt-3 pt-3 border-t border-border/50 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <FileText className="h-3.5 w-3.5" />
        <span>Surse ({normalizedSources.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {normalizedSources.slice(0, 5).map((source, index) => (
          <a
            key={index}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/50 hover:bg-secondary text-xs text-secondary-foreground transition-colors"
          >
            <span className="max-w-[150px] truncate">
              {source.title || extractDomain(source.url)}
            </span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
          </a>
        ))}
        {normalizedSources.length > 5 && (
          <span className="text-xs text-muted-foreground px-2 py-1">
            +{normalizedSources.length - 5} mai multe
          </span>
        )}
      </div>
    </div>
  );
}

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return url.substring(0, 30);
  }
}
