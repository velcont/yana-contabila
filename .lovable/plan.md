

# Plan: Secțiune "AI-uri Premium" pe Landing Page

## Locație în Pagină

Secțiunea va fi inserată între **CTA Principal** (liniile 28-41) și **Trust Badges** (liniile 43-54).

## Cod de Implementat

```tsx
{/* AI Models Section */}
<div className="border border-border/50 rounded-xl p-6 bg-muted/30 space-y-3">
  <p className="text-sm font-medium text-foreground">
    6 AI-uri premium. Un singur abonament.
  </p>
  
  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
    <span className="text-xs text-muted-foreground">Google Gemini</span>
    <span className="text-muted-foreground/30">•</span>
    <span className="text-xs text-muted-foreground">Claude</span>
    <span className="text-muted-foreground/30">•</span>
    <span className="text-xs text-muted-foreground">GPT-5</span>
    <span className="text-muted-foreground/30">•</span>
    <span className="text-xs text-muted-foreground">Grok</span>
  </div>
  
  <p className="text-xs text-primary font-medium">
    Toate incluse în 49 RON/lună
  </p>
</div>
```

## Stiluri Aplicate

| Element | Clasă Tailwind | Efect |
|---------|---------------|-------|
| Container | `border border-border/50` | Border subtil, semi-transparent |
| Container | `bg-muted/30` | Background ușor, discret |
| Container | `rounded-xl p-6` | Colțuri rotunjite, padding confortabil |
| Titlu | `text-sm font-medium text-foreground` | Text mic dar vizibil |
| Branduri AI | `text-xs text-muted-foreground` | Text mic, culoare secundară |
| Separatori | `text-muted-foreground/30` | Puncte foarte subtile |
| Preț | `text-xs text-primary font-medium` | Accent vizual pe preț |

## Rezultat Vizual

```text
┌─────────────────────────────────────────┐
│                                         │
│   6 AI-uri premium. Un singur abonament.│
│                                         │
│  Google Gemini • Claude • GPT-5 • Grok  │
│                                         │
│       Toate incluse în 49 RON/lună      │
│                                         │
└─────────────────────────────────────────┘
```

## Fișier Modificat

- `src/pages/Landing.tsx` — inserare secțiune nouă la linia 42

## Timp Estimat

5 minute

