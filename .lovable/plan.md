

# Plan: Sfat SAGA despre denumirea fișierului — ÎNAINTE de analiză

## Problema
Utilizatorii SAGA au fișiere cu nume generice (cifre). Dacă sfatul vine DUPĂ analiză, e prea târziu — parser-ul deja a procesat fișierul fără context.

## Soluția
În `supabase/functions/ai-router/index.ts`, imediat după detectarea `isSaga = true` (linia ~809), adăugăm sfatul de redenumire **în prefix-ul confirmării** (linia ~1300), DAR îl punem **înaintea** textului de analiză, nu după.

Concret, modificăm secțiunea de confirmare (linia 1300-1304) pentru a include un sfat SAGA:

```
// Dacă e SAGA, adaugă sfat de redenumire
const sagaTip = routeDecision.route === 'analyze-balance-saga' 
  ? `\n\n💡 **Sfat pentru data viitoare:** Salvează balanța din SAGA cu numele:\n\`Balanta_DenumireFirma_Luna_An.xlsx\`\n(exemplu: \`Balanta_DEMO_SRL_Ianuarie_2026.xlsx\`)\nAstfel pot extrage automat firma și perioada.\n\n`
  : '';

const confirmationPrefix = `✅ ...${sagaTip}---\n\n`;
```

## Impact
- Apare o singură dată, doar la balanțe SAGA
- Mesajul e vizibil ÎNAINTE de analiza propriu-zisă în chat
- Zero risc — text adăugat la prefix-ul existent

## Fișier modificat
- `supabase/functions/ai-router/index.ts` — secțiunea de confirmare (~linia 1300)

