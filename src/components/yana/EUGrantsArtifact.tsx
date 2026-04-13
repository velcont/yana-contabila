import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Euro, Calendar, TrendingUp, Building2, MapPin } from 'lucide-react';

export interface EUGrantData {
  grants: Array<{
    title: string;
    description: string;
    deadline: string | null;
    funding_amount: string | null;
    source_url: string;
    program: string;
    eligibility_score: number;
    eligibility_notes: string;
    source_type: 'eu_official' | 'ro_national' | 'perplexity';
  }>;
  profile: {
    industry: string;
    business_type: string;
  };
  metadata: {
    eu_sources: number;
    ro_sources: number;
    total: number;
  };
}

function getScoreColor(score: number) {
  if (score >= 8) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (score >= 5) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

function getScoreLabel(score: number) {
  if (score >= 8) return 'Foarte eligibil';
  if (score >= 5) return 'Posibil eligibil';
  return 'Eligibilitate redusă';
}

function getSourceBadge(type: string) {
  switch (type) {
    case 'eu_official': return { label: '🇪🇺 EU Official', color: 'bg-blue-500/20 text-blue-400' };
    case 'ro_national': return { label: '🇷🇴 România', color: 'bg-yellow-500/20 text-yellow-400' };
    default: return { label: '🔍 Căutare', color: 'bg-gray-500/20 text-gray-400' };
  }
}

export function EUGrantsArtifact({ data }: { data: EUGrantData }) {
  const { grants, profile, metadata } = data;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-blue-900/40 rounded-xl p-4 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Euro className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-foreground">
            Fonduri Europene — {metadata.total} oportunități
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" /> {profile.industry}
          </span>
          <span>•</span>
          <span>{metadata.eu_sources} surse UE</span>
          <span>•</span>
          <span>{metadata.ro_sources} surse RO</span>
        </div>
      </div>

      {/* Grants List */}
      {grants.map((grant, idx) => {
        const source = getSourceBadge(grant.source_type);
        return (
          <Card key={idx} className="p-4 bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-sm leading-tight">
                  {grant.title}
                </h4>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Badge variant="outline" className={source.color + ' text-xs border'}>
                    {source.label}
                  </Badge>
                  {grant.program && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      {grant.program}
                    </Badge>
                  )}
                </div>
              </div>
              <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${getScoreColor(grant.eligibility_score)}`}>
                {grant.eligibility_score}/10
                <div className="text-[10px] font-normal">{getScoreLabel(grant.eligibility_score)}</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
              {grant.description}
            </p>

            {/* Eligibility Notes */}
            {grant.eligibility_notes && (
              <div className="bg-muted/30 rounded-lg p-2 mb-3 flex items-start gap-2">
                <TrendingUp className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{grant.eligibility_notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-3 text-muted-foreground">
                {grant.funding_amount && (
                  <span className="flex items-center gap-1">
                    <Euro className="w-3 h-3" /> {grant.funding_amount}
                  </span>
                )}
                {grant.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {grant.deadline}
                  </span>
                )}
              </div>
              {grant.source_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary hover:text-primary/80"
                  onClick={() => window.open(grant.source_url, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Detalii
                </Button>
              )}
            </div>
          </Card>
        );
      })}

      {grants.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          <p>Nu am găsit fonduri europene relevante pentru profilul tău momentan.</p>
          <p className="text-sm mt-1">Încearcă să specifici o industrie mai exactă.</p>
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        ⚠️ Verifică întotdeauna informațiile pe sursele oficiale. YANA nu garantează eligibilitatea.
      </p>
    </div>
  );
}
