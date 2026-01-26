
# Plan: Integrare Claude API pentru Retenție și Empatie

## Sumar Executiv

Integrarea API-ului Claude (Anthropic) ca model secundar în YANA pentru:
1. **Generare text empatic** - mesaje personalizate de re-engagement
2. **Cross-validare răspunsuri strategice** - a doua opinie pe recomandări importante
3. **Sentiment analysis** - detectare stare emoțională utilizator pentru adaptare ton

## Analiză Situație Curentă

### Modele AI existente în proiect:
- **Lovable AI Gateway** (google/gemini-2.5-pro, gemini-2.5-flash) - model principal
- **OpenAI** (gpt-4o-mini) - folosit în AI Council pentru validări
- **Grok** (grok-3) - validare balanțe contabile
- **Perplexity** - căutări și validări

### Puncte de integrare identificate:
1. `validate-analysis-with-council` - deja are 3 AI-uri în paralel
2. `strategic-advisor` - folosește doar Gemini
3. `chat-ai` - folosește doar Gemini
4. `consult-yana` - dialog AI-to-AI (rar folosit)

## Propunere Arhitectură Claude

### Opțiunea 1: Claude ca "Empathy Agent" (RECOMANDAT)

Claude va fi folosit pentru **sarcinile care necesită empatie și nuanță**, nu pentru analize tehnice:

```text
┌─────────────────────────────────────────────────────────────┐
│                    UTILIZATOR                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI-ROUTER                                 │
│  - Detectează intenție                                       │
│  - Rutează la agentul potrivit                              │
└──────────┬──────────────────────────────────────┬───────────┘
           │                                      │
           ▼                                      ▼
┌──────────────────────┐              ┌──────────────────────┐
│   GEMINI (Principal) │              │   CLAUDE (Empathy)   │
│   - Analize balanțe  │              │   - Re-engagement    │
│   - Strategii        │              │   - Sentiment        │
│   - Calcule fiscale  │              │   - Ton adaptiv      │
└──────────────────────┘              └──────────────────────┘
```

### Cazuri de utilizare Claude:

#### 1. Email-uri de Re-engagement Personalizate
- **Când**: `send-inactivity-reminder`, `send-initiative-email`
- **Ce face Claude**: Generează text empatic bazat pe:
  - Ultima conversație a utilizatorului
  - Starea emoțională detectată
  - Motivul presupus al inactivității

#### 2. Mesaje de Celebrare Milestone
- **Când**: Utilizatorul atinge un obiectiv (10 conversații, prima analiză, reducere risc)
- **Ce face Claude**: Scrie un mesaj autentic de celebrare, personalizat

#### 3. Detectare și Răspuns la Burnout/Stres
- **Când**: Detectat în `consciousness-engine`
- **Ce face Claude**: Reformulează răspunsul Gemini într-un ton mai empatic

## Detalii Tehnice

### Edge Function nouă: `claude-empathy-agent`

```typescript
// Structura funcției
POST /functions/v1/claude-empathy-agent
Body:
{
  task: "reengagement" | "celebration" | "empathy-rewrite",
  context: {
    userName: string,
    lastTopic: string,
    emotionalState: string,
    daysInactive: number,
    originalText?: string // pentru empathy-rewrite
  }
}
```

### Integrare API Anthropic

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514', // sau claude-3-haiku pentru cost mai mic
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  })
});
```

### Estimare Costuri

| Model | Input/1M tokens | Output/1M tokens | Cost estimat/mesaj |
|-------|-----------------|------------------|-------------------|
| Claude Sonnet 4 | $3.00 | $15.00 | ~0.02-0.05 RON |
| Claude Haiku | $0.25 | $1.25 | ~0.005 RON |

**Recomandare**: Haiku pentru volume mari (emails), Sonnet pentru empatie critică.

## Plan Implementare

### Faza 1: Setup și Secret (10 min)
1. Adăugare secret `ANTHROPIC_API_KEY` în Supabase
2. Verificare conectivitate API

### Faza 2: Edge Function `claude-empathy-agent` (30 min)
1. Creare funcție cu 3 moduri: reengagement, celebration, empathy-rewrite
2. Prompt engineering pentru empatie în stil YANA
3. Integrare cu Identity Contract

### Faza 3: Integrare în fluxuri existente (45 min)
1. `send-inactivity-reminder` - înlocuire text static cu Claude
2. `consciousness-engine` - trigger pentru empathy-rewrite când stres detectat
3. Opțional: `strategic-advisor` pentru mesaje de încurajare

### Faza 4: Monitoring și Ajustări (15 min)
1. Tracking costuri în `ai_usage` table
2. A/B testing: email standard vs Claude

## Riscuri și Mitigări

| Risc | Probabilitate | Mitigare |
|------|--------------|----------|
| Cost mai mare decât estimat | Medie | Rate limiting + cost caps |
| Ton inconsistent cu YANA | Scăzută | Prompt cu Identity Contract |
| API downtime | Scăzută | Fallback la Gemini |

## Rezultate Așteptate

- **+15-25% open rate** pe email-uri de re-engagement
- **+10% retenție** utilizatori inactivi > 7 zile
- **Experiență mai umană** în momente cheie

---

**Întrebare pentru tine**: Vrei să încerc cu **email-urile de re-engagement** (impact rapid) sau cu **empathy-rewrite în chat** (experiență mai bună)?
