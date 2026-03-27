import { Sparkles } from 'lucide-react';

const providers = [
  { name: 'GPT-5', company: 'OpenAI', role: 'Raționament complex & analiză', cost: '~100 RON/lună' },
  { name: 'Claude', company: 'Anthropic', role: 'Strategie de business', cost: '~100 RON/lună' },
  { name: 'Grok', company: 'xAI', role: 'Validare contabilă avansată', cost: '~100 RON/lună' },
  { name: 'Gemini', company: 'Google', role: 'Analiză rapidă & predicții', cost: '~100 RON/lună' },
  { name: 'Perplexity', company: 'Perplexity AI', role: 'Research & date actualizate', cost: '~100 RON/lună' },
];

export const LandingAIProviders = () => {
  return (
    <section className="space-y-5">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            5 AI-uri premium. Un singur preț.
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Alții plătesc separat pentru fiecare AI. Tu le ai pe toate.
        </p>
      </div>

      <div className="space-y-2.5">
        {providers.map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{p.name.slice(0, 2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground/60">{p.company}</span>
              </div>
              <p className="text-xs text-muted-foreground">{p.role}</p>
            </div>
            <span className="text-xs text-muted-foreground/50 line-through flex-shrink-0">
              {p.cost}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground line-through">500+ RON/lună separat</span>
          <span className="text-lg font-bold text-primary">→ 49 RON/lună cu YANA</span>
        </div>
        <p className="text-xs text-muted-foreground/70">
          Toate modelele AI lucrează împreună pentru afacerea ta
        </p>
      </div>
    </section>
  );
};
