

# Plan: Listare Detaliată a Celor 6 Modele AI

## Obiectiv

Actualizăm secțiunea "AI Models" pentru a lista toate cele 6 modele distincte, justificând astfel cifra "6 AI-uri premium".

## Modele de Listat

| Brand | Modele | Count |
|-------|--------|-------|
| Google Gemini | Pro + Flash | 2 |
| Claude | Sonnet + Haiku | 2 |
| OpenAI | GPT-5 | 1 |
| xAI | Grok | 1 |
| **Total** | | **6** |

## Modificare Propusă

### Fișier: `src/pages/Landing.tsx`

Liniile 48-56 (lista de AI-uri) vor fi înlocuite cu:

```tsx
<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
  <span className="text-xs text-muted-foreground">Gemini Pro</span>
  <span className="text-muted-foreground/30">•</span>
  <span className="text-xs text-muted-foreground">Gemini Flash</span>
  <span className="text-muted-foreground/30">•</span>
  <span className="text-xs text-muted-foreground">Claude Sonnet</span>
  <span className="text-muted-foreground/30">•</span>
  <span className="text-xs text-muted-foreground">Claude Haiku</span>
  <span className="text-muted-foreground/30">•</span>
  <span className="text-xs text-muted-foreground">GPT-5</span>
  <span className="text-muted-foreground/30">•</span>
  <span className="text-xs text-muted-foreground">Grok</span>
</div>
```

## Rezultat Vizual

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│      6 AI-uri premium. Un singur abonament.             │
│                                                         │
│  Gemini Pro • Gemini Flash • Claude Sonnet • Claude     │
│  Haiku • GPT-5 • Grok                                   │
│                                                         │
│           Toate incluse în 49 RON/lună                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Ajustări Styling

- `gap-x-3` în loc de `gap-x-4` pentru a încăpea mai bine pe mobile
- `flex-wrap` asigură că lista se rupe elegant pe ecrane mici

## Timp Estimat

2 minute

