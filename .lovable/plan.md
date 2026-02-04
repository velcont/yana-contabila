
# Plan: Migrare la Claude Sonnet 4.5 + Răspunsuri Deterministe din Cache

## 1. Rezumat

Implementez exact ce ai cerut:
- Parsing Excel → rămâne neschimbat
- Interpretare → Claude Sonnet 4.5 (în loc de Gemini Flash)
- Follow-up simplu → citire din cache-ul răspunsului Claude
- Eliminare "PIERDERE GARANTATĂ" și calcule TypeScript de "verificare"

---

## 2. Arhitectura Nouă

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UPLOAD BALANȚĂ                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────┐     ┌────────────────────┐     ┌──────────────────┐ │
│  │  XLSX Parsing     │ ──► │  Claude Sonnet 4.5 │ ──► │  Cache Răspuns   │ │
│  │  (liniile 45-134) │     │  (interpretare)    │     │  + Valori Cheie  │ │
│  │  PĂSTRAT          │     │  NOU               │     │  NOU             │ │
│  └───────────────────┘     └────────────────────┘     └──────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           FOLLOW-UP ÎNTREBĂRI                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  "cât am profit?" ──► Citire din cache ──► Răspuns instant ($0)       │ │
│  │  "care e sold 121?" ──► Citire din cache ──► Răspuns instant ($0)     │ │
│  │  Întrebare complexă ──► Claude Sonnet + context ──► Răspuns ($0.01)   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modificări Concrete

### 3.1. `supabase/functions/analyze-balance/index.ts`

**A) Schimbare model AI (liniile 1503-1518)**

De la:
```typescript
aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    ...
  })
});
```

La:
```typescript
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
  headers: {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16000,
    messages: [{
      role: "user",
      content: SYSTEM_PROMPT + "\n\n" + balanceText
    }]
  })
});
```

**B) Extragere valori din răspunsul Claude și salvare în metadata**

După ce primim răspunsul Claude, extragem valorile cheie cu regex simplu:

```typescript
// Extrage valori din răspunsul Claude (NU recalculează!)
const extractFromClaudeResponse = (response: string) => {
  const extractNumber = (pattern: RegExp): number | null => {
    const match = response.match(pattern);
    if (!match) return null;
    // Parse format românesc: 183.010,18 sau 183010.18
    const cleanVal = match[1].replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanVal) || null;
  };

  return {
    totalClasa7: extractNumber(/Total.*Clasa 7[:\s]*(\d[\d.,\s]*)/i),
    totalClasa6: extractNumber(/Total.*Clasa 6[:\s]*(\d[\d.,\s]*)/i),
    sold121: extractNumber(/(?:Sold|Cont)\s*121[:\s]*(\d[\d.,\s]*)/i),
    sold121IsProfit: /profit|creditor/i.test(response.match(/Cont\s*121[^\.]*(?:PROFIT|PIERDERE|creditor|debitor)/i)?.[0] || ''),
    cifraAfaceri: extractNumber(/Cifr[aă] de [Aa]faceri[:\s]*(\d[\d.,\s]*)/i),
  };
};

const claudeExtractedValues = extractFromClaudeResponse(analysis);
```

**C) Salvare în conversation metadata**

```typescript
// Salvează răspunsul Claude + valorile extrase pentru follow-up
await supabaseClient
  .from('yana_conversations')
  .update({
    metadata: {
      ...existingMetadata,
      balanceAnalysis: {
        claudeResponse: analysis, // Răspunsul complet
        extractedValues: claudeExtractedValues, // Valorile cheie
        analyzedAt: new Date().toISOString(),
        company: structuredData.company,
        period: /* din fileName */,
      }
    }
  })
  .eq('id', conversationId);
```

**D) Eliminare "PIERDERE GARANTATĂ" și warnings agresive**

Căutăm și eliminăm textele:
- `🔴 PIERDERE GARANTATĂ`
- Orice warning de "verificare" în TypeScript

---

### 3.2. `supabase/functions/ai-router/index.ts`

**A) Detectare întrebări simple de tip numeric**

```typescript
function isSimpleNumericQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const patterns = [
    /c[aâ]t\s*(am|e|este)\s*(profit|pierdere)/i,
    /care\s*(e|este)\s*(profitul|pierderea|rezultatul)/i,
    /sold(ul)?\s*121/i,
    /care\s*(e|sunt)\s*(veniturile|cheltuielile)/i,
    /total\s*(venituri|cheltuieli|clasa)/i,
    /am\s*(profit|pierdere)/i,
  ];
  return patterns.some(p => p.test(lowerMessage));
}
```

**B) Răspuns direct din cache (fără AI)**

```typescript
if (balanceAnalysis && isSimpleNumericQuestion(message)) {
  const { extractedValues, company, period } = balanceAnalysis;
  
  // Construiește răspuns din valorile pe care Claude le-a dat deja
  let response = `📊 **Date din analiza balanței ${company}** (${period}):\n\n`;
  
  if (message.includes('profit') || message.includes('pierdere') || message.includes('rezultat')) {
    if (extractedValues.sold121IsProfit) {
      response += `✅ **PROFIT**: ${formatNumber(extractedValues.sold121)} RON (conform contului 121)\n`;
    } else {
      response += `❌ **PIERDERE**: ${formatNumber(extractedValues.sold121)} RON (conform contului 121)\n`;
    }
    response += `\n📈 Total Venituri (Clasa 7): ${formatNumber(extractedValues.totalClasa7)} RON`;
    response += `\n📉 Total Cheltuieli (Clasa 6): ${formatNumber(extractedValues.totalClasa6)} RON`;
  }
  
  return new Response(JSON.stringify({
    route: 'direct-response',
    response,
    source: 'cached_claude_analysis'
  }), { headers: corsHeaders });
}
```

---

### 3.3. `supabase/functions/_shared/full-analysis-prompt.ts`

**Ajustări minore în prompt:**
- Clarificare că diferența între (7-6) și cont 121 = "diferență de reconciliere"
- Eliminare limbaj de tip "anomalie majoră" pentru diferențe normale

---

## 4. Teste de Validare

După implementare, testez cu balanța CESPUY:

| Criteriu | Valoare Așteptată |
|----------|-------------------|
| Total Clasa 7 | 183.010,18 RON |
| Total Clasa 6 | 248.095,91 RON |
| Sold cont 121 | 41.502,91 RON (pierdere) |
| Răspuns "cât am profit?" | Instant, din cache, cu cifrele corecte |
| Text "PIERDERE GARANTATĂ" | NU apare |

---

## 5. Costuri Estimate

| Operațiune | Model | Cost |
|------------|-------|------|
| Analiză inițială balanță | Claude Sonnet 4.5 | ~$0.08 |
| Follow-up simplu ("cât am profit?") | Cache (fără AI) | $0.00 |
| Follow-up complex (strategie) | Claude Sonnet 4.5 | ~$0.01 |

**Total pentru 200 analize/lună + 600 follow-up:**
- ~$16 analize + ~$3 follow-up complex = **~$19/lună**

---

## 6. Fișiere Modificate

| Fișier | Modificări |
|--------|-----------|
| `supabase/functions/analyze-balance/index.ts` | Schimbare model Gemini → Claude, salvare valori în metadata |
| `supabase/functions/ai-router/index.ts` | Detectare întrebări simple, răspuns direct din cache |
| `supabase/functions/_shared/full-analysis-prompt.ts` | Clarificări limbaj (opțional) |

---

## 7. Livrabile

1. Call către Claude Sonnet 4.5 funcțional
2. Valori extrase automat din răspunsul Claude
3. Răspuns instant la "cât am profit?" din cache
4. Zero "PIERDERE GARANTATĂ" în output
5. Total Clasa 7 = 183.010,18 RON (nu 23.281,87)
