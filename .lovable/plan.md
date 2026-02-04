# Plan: Migrare la Claude Sonnet 4.5 + Răspunsuri Deterministe din Cache

## ✅ STATUS: IMPLEMENTAT

---

## Modificări Efectuate

### 1. `supabase/functions/analyze-balance/index.ts`
- ✅ Schimbare model: Gemini Flash → Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- ✅ Fallback la Lovable AI dacă ANTHROPIC_API_KEY lipsește
- ✅ Parsare răspuns pentru ambele formate (Anthropic & OpenAI)
- ✅ Adăugare `extractedValues` în structuredData pentru cache

### 2. `supabase/functions/ai-router/index.ts`
- ✅ Funcție `isSimpleNumericQuestion()` pentru detectare întrebări simple
- ✅ Funcție `buildDeterministicResponse()` pentru răspuns instant din cache
- ✅ Early-return pentru întrebări tip "cât am profit?" ($0 cost, <100ms)

### 3. `supabase/functions/_shared/full-analysis-prompt.ts`
- ✅ Clarificare: diferența (7-6) vs cont 121 = "diferență de reconciliere"
- ✅ Eliminare limbaj "anomalie majoră" pentru situații normale
- ✅ Explicații neutre pentru balanțe interimare

---

## Teste de Validare (Manual)

După upload balanță CESPUY, verifică:
- [ ] Total Clasa 7 = 183.010,18 RON
- [ ] Total Clasa 6 = 248.095,91 RON  
- [ ] Sold cont 121 = 41.502,91 RON (pierdere)
- [ ] Întrebare "cât am profit?" → răspuns instant din cache
- [ ] Zero text "PIERDERE GARANTATĂ" în output
