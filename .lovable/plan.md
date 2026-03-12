

# Plan: Memorie de context financiar intra-sesiune

## Problema

Când utilizatorul menționează valori financiare în conversație (ex: "am cifră de afaceri de 500.000 RON", "profitul e 80.000"), YANA nu le refolosește automat în răspunsurile ulterioare din aceeași sesiune. Deși istoricul conversației (25 mesaje) este trimis la AI, nu există o instrucțiune explicită care să-i spună AI-ului să extragă și să rețină aceste valori.

## Soluția

Două schimbări complementare:

### 1. Instrucțiune explicită în system prompt (chat-ai)
Adăugăm o secțiune în system prompt-ul din `supabase/functions/chat-ai/index.ts` care instruiește AI-ul:
- Să extragă automat orice valori financiare menționate de utilizator în mesajele anterioare din history
- Să le folosească ca referință în răspunsurile ulterioare fără a le cere din nou
- Să facă referire la ele natural ("Ai menționat că CA e 500k...")

### 2. Extracție automată din history și injectare ca context structurat (ai-router)
În `supabase/functions/ai-router/index.ts`, înainte de a trimite payload-ul la chat-ai, scanăm mesajele din history pentru valori financiare (regex pe patterns precum "CA/cifră de afaceri: X", "profit: X", "angajați: X", "industrie: X") și construim un bloc de context structurat injectat în payload ca `userMentionedFacts`.

Acest bloc va fi apoi injectat în system prompt de chat-ai, astfel:
```
📝 VALORI FINANCIARE MENȚIONATE DE UTILIZATOR ÎN ACEASTĂ CONVERSAȚIE:
- Cifră afaceri: 500.000 RON
- Profit: 80.000 RON  
- Industrie: retail
- Angajați: 15
⚠️ Folosește aceste valori ca referință! NU le cere din nou!
```

## Fișiere modificate

1. **`supabase/functions/ai-router/index.ts`** — Funcție nouă `extractUserMentionedFacts(history)` care scanează mesajele user din history cu regex-uri pentru valori financiare comune (CA, profit, angajați, industrie, datorii, cash, etc.). Rezultatul se adaugă la `routeDecision.payload.userMentionedFacts`.

2. **`supabase/functions/chat-ai/index.ts`** — 
   - Adăugare câmp `userMentionedFacts` în schema Zod
   - Construire secțiune de context din valorile extrase
   - Injectare în system prompt (secțiune dedicată)
   - Adăugare instrucțiune în SYSTEM_PROMPT care spune explicit AI-ului să rețină și să referențieze valorile financiare menționate de utilizator

## Detalii tehnice

**Patterns de extracție (ai-router):**
- `cifr[aă]\s*(?:de\s+)?afaceri\s*[:=\-]?\s*([0-9.,\s]+)` → CA
- `profit\s*(?:net)?\s*[:=\-]?\s*([-]?[0-9.,\s]+)` → Profit
- `(\d+)\s*angaja[tț]i` → Angajați
- `industri[ea]\s*[:=\-]?\s*(\w+)` → Industrie
- `cash\s*(?:disponibil)?\s*[:=\-]?\s*([0-9.,\s]+)` → Cash
- `datorii\s*[:=\-]?\s*([0-9.,\s]+)` → Datorii
- `venituri?\s*[:=\-]?\s*([0-9.,\s]+)` → Venituri
- `cheltuieli\s*[:=\-]?\s*([0-9.,\s]+)` → Cheltuieli

Scanarea se face doar pe mesajele cu `role === 'user'` din history. Extracția nu suprascrie datele din balanceContext (care au prioritate).

