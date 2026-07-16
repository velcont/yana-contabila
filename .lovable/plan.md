# Plan implementare: Vedere + Memorie afectivă + Wow moment

Cele 3 puncte sunt substanțiale. Le sparg în livrabile concrete, mergând de la cel mai rapid ROI la cel mai complex.

---

## #4 Wow Moment pe Landing (livrare rapidă, impact imediat pe bounce rate)

**Obiectiv:** primele 8 secunde pe landing = user vede o demonstrație live, nu text.

**Componente:**
- `LandingWowMoment.tsx` — hero nou care înlocuiește secțiunea diagnostic actuală
  - Zone drag&drop mare pentru balanță (accept `.xlsx`)
  - Fallback: buton „Vezi demo cu balanță exemplu" care încarcă `public/demo/balanta-exemplu.xlsx`
  - După upload → animație progres cu 4 pași („Citesc conturile...", „Calculez Z-Score...", „Detectez riscuri...", „Pregătesc dashboardul...")
  - Dashboard animat: 3 carduri (Health Score, Cash Runway, Top Risc) care fac fade-in secvențial
  - CTA jos: „Vezi analiza completă gratuit" → `/auth`
- Refolosește `analyze-balance` edge function existentă (nu autentificat pentru demo — cu rate limit IP)
- Fără voice-over în v1 (adăugat în #3 dacă merge bine)

**Impact:** direct pe bounce rate 95%.

---

## #3 Memorie afectivă vizibilă

**Obiectiv:** YANA scoate proactiv la suprafață stări emoționale anterioare, nu doar fapte.

**Componente:**
- Migrare DB: coloană nouă `emotional_tone` pe `yana_memory_soul_core` (enum: `stressed`, `hopeful`, `frustrated`, `celebrating`, `worried`, `neutral`)
- Edge function `yana-emotional-tagger` — rulează async după fiecare mesaj user, extrage tonul emoțional prin Gemini 3.5 Flash și îl salvează
- În `chat-ai` system prompt: injectează secțiune „Stări emoționale recente" (ultimele 5 tag-uri cu dată + rezumat) când sunt >2 mesaje cu tonuri non-neutre
- Prompt update: regulă nouă — la începutul conversației, dacă ultima stare era `stressed`/`worried` și au trecut >3 zile, YANA deschide cu „Acum X zile erai stresat cu [topic]. Cum a evoluat?"
- UI: badge subtil pe avatar YANA („îmi amintesc de data trecută") care apare doar când injectăm memorie afectivă

---

## #2 Vedere în timp real (cel mai complex, ultima livrare)

**Obiectiv:** YANA vede ecranul userului și îi explică ce vede.

**Componente:**
- Componentă nouă `YanaVisionMode.tsx` pe `/yana`
  - Buton „Arată-i YANA ecranul tău" → `getDisplayMedia({ video: true })`
  - Buton „Deschide camera" → `getUserMedia({ video: true })`
  - Capturează frame la fiecare 3s (sau la click „Ce vezi?")
- Edge function `yana-vision` — primește frame base64 + întrebare → Gemini 3.5 Flash (multimodal nativ) → răspuns text în stilul YANA
- Streaming răspuns în chat obișnuit (nu suprafață separată)
- Fără WebRTC/Live API în v1 (prea complex); folosim capture + request simplu pe frame
- Limitare: max 30 capturi/sesiune ca să nu explodeze costurile

**Trade-off:** nu e „live continuu" ca Gemini Live API, dar 90% din wow cu 20% din efort.

---

## Ordine execuție

1. **#4 Wow moment** (fișiere frontend + refolosire edge function existentă) — 1 sesiune
2. **#3 Memorie afectivă** (migrare DB + edge function nouă + prompt update) — 1 sesiune
3. **#2 Vedere** (componentă frontend + edge function nouă vision) — 1 sesiune

Le implementez pe rând, în această ordine, dacă aprobi. Sau spune-mi dacă vrei să sar direct la una anume (ex. „doar #4 acum").

---

## Detalii tehnice

- Toate edge functions folosesc `LOVABLE_API_KEY` + Gemini 3.5 Flash (multimodal, ieftin, rapid).
- Migrarea DB pentru #3: enum nou + coloană + GRANT + policy (respect regulile RLS).
- Wow moment pe landing NU necesită auth (demo mode) — folosim rate limit pe IP în edge function.
- Vision mode necesită doar permisiuni browser standard (nimic instalabil).
