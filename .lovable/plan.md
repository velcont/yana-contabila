
# Plan: Fix Răspunsuri Deterministe pentru Întrebări Simple (Profit/Pierdere)

## Problema Identificată

Când utilizatorul întreabă **"cât am profit sau pierdere?"** după upload balanță, sistemul NU returnează răspunsul instant din cache, ci rutează către `strategic-advisor`, care cere date suplimentare.

### Cauze Root (din analiza codului):

| Linie | Problemă |
|-------|----------|
| 654-655 | `detectIntent()` se apelează ÎNAINTE de verificarea răspunsului determinist |
| 516-517 | `detectIntent()` include `"profit"` și `"pierdere"` în pattern-urile pentru `strategic-advisor` |
| 225-238 | `isSimpleNumericQuestion()` are pattern-uri incomplete (lipsește "cât am avut profit") |
| 697-726 | Verificarea deterministă vine DUPĂ ce ruta e deja decisă |

### Flux actual (GREȘIT):

```text
User: "cât am profit?"
    ↓
detectIntent() → route = 'strategic-advisor' (match pe "profit")
    ↓
routeDecision.route = 'strategic-advisor'
    ↓
isSimpleNumericQuestion() → SKIP (pentru că nu schimbă ruta)
    ↓
Call strategic-advisor → "Care au fost veniturile?" ❌
```

### Flux dorit (CORECT):

```text
User: "cât am profit?"
    ↓
isSimpleNumericQuestion() → TRUE
    ↓
Check balanceContext.extractedValues → EXISTS
    ↓
buildDeterministicResponse() → "❌ PIERDERE: 41.502,91 RON" ✅
    ↓
Return instant (fără AI call, $0 cost)
```

---

## Soluția Tehnică

### Fișier: `supabase/functions/ai-router/index.ts`

**Modificare 1: Extindere pattern-uri în `isSimpleNumericQuestion()` (liniile 225-238)**

Adaugăm variante românești comune:
- "cât am avut profit"
- "spune-mi profitul"
- "arată-mi pierderea"
- "rezultatul financiar"
- "sunt pe minus/plus"
- "cât am câștigat/pierdut"

**Modificare 2: PRIORITIZARE verificare deterministă ÎNAINTE de `detectIntent()` (linia 653-656)**

Mutăm blocul de verificare deterministă (liniile 691-726) ÎNAINTE de apelul `detectIntent()`, astfel:

```text
// Înainte de detectIntent:
1. Fetch balanceContext din DB
2. Dacă balanceContext.extractedValues + isSimpleNumericQuestion() → Return instant
3. Altfel → continuă cu detectIntent() normal
```

**Modificare 3: Îmbunătățire `buildDeterministicResponse()` (liniile 249-327)**

- Răspunsuri mai naturale și complete
- Include `company` și `period` în header
- Explică diferența dintre rezultat perioadă și cont 121

---

## Cod Propus

### 1. Pattern-uri extinse (`isSimpleNumericQuestion`)

```typescript
function isSimpleNumericQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const patterns = [
    // Pattern-uri existente
    /c[aâ]t\s*(am|e|este|avem)\s*(profit|pierdere)/i,
    /care\s*(e|este)\s*(profitul|pierderea|rezultatul)/i,
    /sold(ul)?\s*121/i,
    /care\s*(e|sunt)\s*(veniturile|cheltuielile)/i,
    /total\s*(venituri|cheltuieli|clasa)/i,
    /am\s*(profit|pierdere)/i,
    /sunt\s*pe\s*(profit|pierdere)/i,
    /cifra\s*de\s*afaceri/i,
    
    // 🆕 Pattern-uri noi
    /c[aâ]t\s*(am\s+avut|a\s+fost)\s*(profit|pierdere)/i,
    /spune-mi\s*(profitul|pierderea|rezultatul)/i,
    /ar[aă]t[aă]-mi\s*(profitul|pierderea|rezultatul)/i,
    /d[aă]-mi\s*(profitul|pierderea|rezultatul|cifra)/i,
    /(profit|pierdere)\s*(pe\s*)?(lun[aă]|perioad[aă]|trimestrul?)/i,
    /rezultat(ul)?\s*(financiar|contabil|net|perioad[aă])/i,
    /c[aâ]t\s*(am\s+)?c[aâ][sș]tigat/i,
    /c[aâ]t\s*(am\s+)?pierdut/i,
    /pe\s+(minus|plus)/i,
    /venituri\s*totale/i,
    /cheltuieli\s*totale/i,
    /sum[aă]\s*(venituri|cheltuieli)/i,
    /(profit|pierdere)\s+sau\s+(pierdere|profit)/i,
  ];
  
  const isMatch = patterns.some(p => p.test(lowerMessage));
  
  if (isMatch) {
    console.log(`[AI-Router] 🎯 isSimpleNumericQuestion MATCH: "${message.substring(0, 60)}..."`);
  }
  
  return isMatch;
}
```

### 2. Restructurare flux (early return pentru întrebări simple)

```typescript
// După linia 662 (efectiveBalanceContext), ÎNAINTE de detectIntent():

// =============================================================================
// 🆕 v3.1.0: PRIORITY CHECK - Răspuns determinist ÎNAINTE de routing
// =============================================================================
if (!fileData && message) {
  const balanceCtx = effectiveBalanceContext as BalanceAnalysisCache | null;
  
  console.log(`[AI-Router] Priority check for deterministic response:`, {
    hasBalanceCtx: !!balanceCtx,
    hasExtractedValues: !!balanceCtx?.extractedValues,
    messagePreview: message.substring(0, 60)
  });
  
  if (balanceCtx?.extractedValues && isSimpleNumericQuestion(message)) {
    console.log(`[AI-Router] 🚀 DETERMINISTIC RESPONSE: Bypassing detectIntent()`);
    
    const deterministicResponse = buildDeterministicResponse(balanceCtx, message);
    
    if (deterministicResponse) {
      console.log(`[AI-Router] ✅ Returning cached response ($0 cost, instant)`);
      
      // Salvează mesajul assistant în DB
      await supabase.from('yana_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: deterministicResponse,
        artifacts: [],
        ends_with_question: false,
        question_responded: null,
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          response: deterministicResponse,
          route: 'direct-response',
          source: 'cached_balance_analysis',
          cost: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
}

// Dacă nu s-a returnat deja, continuă cu detectIntent() normal
routeDecision = detectIntent(message);
```

---

## Rezultat Așteptat

| Întrebare | Înainte (BUG) | După (FIX) |
|-----------|---------------|------------|
| "Cât am profit?" | → strategic-advisor → "Care au fost veniturile?" | → direct-response → "❌ PIERDERE: 41.502,91 RON" |
| "Care e rezultatul financiar?" | → strategic-advisor | → direct-response |
| "Sunt pe plus sau pe minus?" | → strategic-advisor | → direct-response |
| "Ce strategie să aplic?" | → strategic-advisor | → strategic-advisor (corect) |
| "Generează un grafic" | → chat-ai | → chat-ai (corect) |

---

## Pași de Implementare

1. **Extinde pattern-uri** în `isSimpleNumericQuestion()` (liniile 225-238)
2. **Mută verificarea deterministă** ÎNAINTE de `detectIntent()` (după linia 662)
3. **Șterge codul duplicat** de la liniile 691-726 (mutat mai sus)
4. **Adaugă log-uri** pentru debugging și monitorizare
5. **Deploy** edge function
6. **Test** cu balanța CESPUY + întrebări simple

---

## Beneficii

- **$0 cost** pentru întrebări simple despre profit/pierdere
- **Latență ~100ms** în loc de 3-5 secunde
- **Zero hallucinations** - date directe din cache
- **UX îmbunătățit** - răspuns instant și precis
