

# Plan: "Diagnostic Rapid de Business" — Hook pentru Landing Page

## Ce construim

Flow de diagnostic structurat pe landing page: 5 intrebari rapide → AI genereaza mini-raport personalizat → CTA signup. Fara autentificare, rate-limited per IP (ca demo-chat).

## Fisiere noi

### 1. `src/components/demo/BusinessDiagnostic.tsx`
- Dialog/overlay cu flow pas-cu-pas (5 steps + loading + result)
- Progress bar vizual
- Fiecare intrebare: optiuni predefinite + camp liber "Altceva"
- Intrebarile:
  1. Industrie (Servicii / Comert / IT / Constructii / HoReCa / Altceva)
  2. Cifra de afaceri lunara (Sub 10K / 10-50K / 50-200K / 200K+ RON)
  3. Nr angajati (Solo / 1-5 / 6-20 / 20+)
  4. Grija principala (Cash flow / Clienti / Angajati / Crestere / Taxe / Altceva)
  5. Camp liber: "Daca ai o bagheta magica, ce ai schimba maine?"
- La submit: apeleaza edge function, afiseaza DiagnosticResult

### 2. `src/components/demo/DiagnosticResult.tsx`
- Primeste datele structurate (riscuri, oportunitati, recomandare)
- Carduri colorate: rosu=riscuri, verde=oportunitati, albastru=recomandare urgenta
- CTA: "Continua cu YANA — 30 zile gratuit" → navigate('/auth')
- Link secundar: "Vorbeste cu YANA acum" → deschide DemoChat

### 3. `supabase/functions/generate-business-diagnostic/index.ts`
- verify_jwt = false (public, ca demo-chat)
- Rate limit: 2 diagnostice/24h per IP (refoloseste demo_rate_limits table sau logica similara)
- Apeleaza Lovable AI (gemini-2.5-flash-lite — cel mai ieftin) cu prompt structurat
- Tool calling pentru output structurat: `{ risks: [{title, description}], opportunities: [{title, description}], urgent_recommendation: {title, description} }`
- Tracking: analytics event `diagnostic_completed`

## Fisiere modificate

### 4. `src/pages/Landing.tsx`
- Adauga state `showDiagnostic` + import BusinessDiagnostic
- Inlocuieste butonul demo existent cu "Diagnostic Gratuit — 2 minute" ca CTA secundar principal
- Pastreaza si demo chat-ul (accesibil din diagnostic result)
- Detecteaza UTM params din URL pentru tracking (`utm_source`, `utm_campaign`)

### 5. `src/components/demo/DemoChat.tsx`
- Adauga sugestie in greeting sau dupa prima intrebare: "Vrei sa-ti fac un diagnostic rapid al afacerii?"
- Callback prop `onOpenDiagnostic` pentru a deschide flow-ul din chat

## Detalii tehnice

- Edge function prompt: ton Samantha (empatic, direct), output in romana, maxim 3 riscuri + 2 oportunitati + 1 recomandare urgenta
- Cost: ~0.01 EUR/diagnostic (flash-lite, ~500 tokens)
- Rate limiting refoloseste tabelul `demo_rate_limits` existent cu un tip diferit (`diagnostic` vs `chat`)
- Analytics events: `diagnostic_started`, `diagnostic_step_N`, `diagnostic_completed`, `diagnostic_to_signup`

