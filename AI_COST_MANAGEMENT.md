# Gestionarea Costurilor AI în YANA

## Prezentare Generală

Sistemul de gestionare a costurilor AI trackează automat consumul de token-uri și costurile pentru toate cererile către serviciile AI (Lovable AI Gateway: Gemini și GPT-5).

## Funcționalități

### 1. **Tracking Automat al Costurilor**
- Fiecare cerere AI este înregistrată automat
- Se trackează: input tokens, output tokens, model folosit, durată
- Costuri estimate în USD pe baza ratelor oficiale ale modelelor

### 2. **Limite de Buget Lunare**
- Fiecare utilizator are un buget lunar configurat (default: $10/lună)
- Adminii pot modifica bugetul din dashboard
- Sistemul verifică automat înainte de fiecare cerere AI

### 3. **Alerte Automate**
- La 80% din buget: alertă warning în chat insights
- La 90%: alertă critical
- La 100%: blocare cereri AI până luna următoare

### 4. **Dashboard Monitorizare** (Admin Only)
Accesibil din **Monitorizare Sistem → Tab "Costuri AI"**:
- Cost total luna curentă
- Număr cereri procesate
- Total token-uri consumate
- Procent utilizare buget
- Actualizare buget lunar

## Prețuri Estimate (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| Gemini 2.5 Flash Lite | $0.02 | $0.10 |
| Gemini 2.5 Flash ⭐ | $0.08 | $0.30 |
| Gemini 2.5 Pro | $1.25 | $5.00 |
| GPT-5 Nano | $0.04 | $0.16 |
| GPT-5 Mini | $0.15 | $0.60 |
| GPT-5 | $2.50 | $10.00 |

⭐ Model recomandat: **Gemini 2.5 Flash** - balanță optimă cost/performanță

## Arhitectură Tehnică

### Database Tables

**`ai_usage`** - Înregistrări individuale de utilizare:
```sql
- user_id: UUID (referință la auth.users)
- endpoint: TEXT (chat-ai, analyze-balance, etc.)
- model: TEXT (google/gemini-2.5-flash, etc.)
- input_tokens: INTEGER
- output_tokens: INTEGER
- total_tokens: INTEGER
- estimated_cost_cents: INTEGER (cost în USD cents)
- month_year: TEXT (YYYY-MM pentru agregare)
- success: BOOLEAN
- created_at: TIMESTAMP
```

**`ai_budget_limits`** - Limite configurate:
```sql
- user_id: UUID (UNIQUE)
- monthly_budget_cents: INTEGER (default 1000 = $10)
- alert_at_percent: INTEGER (default 80%)
- is_active: BOOLEAN
```

### Database Functions

**`get_monthly_ai_usage(user_id?, month_year?)`**
- Returnează statistici agregat

e pentru o lună
- Calculează procent utilizare buget

**`check_ai_budget(user_id)`**
- Verifică dacă utilizatorul poate face cereri AI
- Returnează: can_proceed, usage_percent, message

### Edge Function: `track-ai-usage`

**Input:**
```typescript
{
  endpoint: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  requestDurationMs?: number,
  success: boolean,
  errorMessage?: string
}
```

**Output:**
```typescript
{
  success: boolean,
  usage: {
    tokens: number,
    cost_cents: number,
    cost_usd: string
  },
  budget: {
    can_proceed: boolean,
    usage_percent: number,
    message: string
  }
}
```

## Integrare în Edge Functions

### Exemplu: Chat AI

```typescript
// La începutul request-ului - verifică bugetul
const { data: budgetCheck } = await supabase.rpc("check_ai_budget", {
  p_user_id: userId
});

if (!budgetCheck?.[0]?.can_proceed) {
  return new Response(
    JSON.stringify({ 
      error: "Buget lunar depășit. Contactează administratorul." 
    }),
    { status: 402, headers: corsHeaders }
  );
}

// După cererea AI - trackează consumul
const { data: aiResponse } = await fetch(AI_GATEWAY_URL, ...);

// Extrage token count din response
const usage = aiResponse.usage; // { prompt_tokens, completion_tokens }

// Track usage în background (nu blochez response-ul)
EdgeRuntime.waitUntil(
  supabase.functions.invoke("track-ai-usage", {
    body: {
      endpoint: "chat-ai",
      model: "google/gemini-2.5-flash",
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      requestDurationMs: Date.now() - startTime,
      success: true
    }
  })
);
```

## Limitări și Considerații

1. **Costuri Estimate**: Prețurile sunt estimate bazate pe ratele publice ale furnizorilor. Costurile reale pot varia.

2. **Delay în Tracking**: Tracking-ul se face în background, deci dashboard-ul poate avea întârziere de câteva secunde.

3. **Overhead Performanță**: Tracking-ul adaugă ~50-100ms per cerere (în background, nu afectează user experience).

4. **Limite Lovable AI**: Lovable AI Gateway are propriile sale rate limits și costuri separate de acest sistem.

## Recomandări

### Pentru Utilizatori Standard
- Buget recomandat: **$10-20/lună** (suficient pentru ~500-1000 analize)
- Model recomandat: **Gemini 2.5 Flash**

### Pentru Utilizatori Power
- Buget recomandat: **$50-100/lună**
- Consideră GPT-5 Mini pentru cereri complexe

### Pentru Administratori
- Monitorizează dashboard-ul săptămânal
- Ajustează bugetele pe bază de utilizare reală
- Analizează endpoint-urile cu cost mare

## Troubleshooting

**"Buget lunar depășit"**
- Verifică tab "Costuri AI" din Monitorizare Sistem
- Crește bugetul lunar sau așteaptă luna următoare

**Token count incorect**
- Unele modele raportează diferit token-urile
- Verifică logs în supabase edge function logs

**Cost calculat greșit**
- Verifică modelul folosit (TOKEN_COSTS în track-ai-usage)
- Actualizează prețurile dacă furnizorii le schimbă

## Viitor & Îmbunătățiri

- [ ] Export CSV pentru rapoarte contabilitate
- [ ] Previziuni consum bazate pe istoric
- [ ] Optimizări automate de prompt pentru reducere costuri
- [ ] Integrare cu facturare automată
- [ ] Alerting via email când se apropie de limită
