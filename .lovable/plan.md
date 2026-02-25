

# Fix: Întrebările fiscale cu balanță încărcată primesc doar generalități

## Problema identificată

Toate mesajele Lost in Travel sunt rutate la **`fiscal-chat`** (pentru că conțin cuvinte precum "TVA", "marjă", "impozit"). Funcția `fiscal-chat` este un Q&A fiscal generic care:
- **NU primește** `balanceContext` (datele balanței)
- **NU are acces** la cifrele companiei
- Are `max_tokens: 2000` (risc de trunchiere pentru calcule complexe)

Rezultat: YANA răspunde cu generalități despre TVA pe marjă în loc de calcule concrete cu cifrele clientei.

## Cauza root

In `ai-router/index.ts`, funcția `detectIntent()` verifică keywords fiscal (`tva`, `impozit`, `marja` etc.) **ÎNAINTE** de a verifica dacă există o balanță încărcată. Orice întrebare fiscală e trimisă la `fiscal-chat`, chiar dacă utilizatorul are o balanță activă cu date concrete.

## Soluția

### 1. `supabase/functions/ai-router/index.ts` - Redirecționare inteligentă

In secțiunea de routing (după ce `detectIntent` returnează `fiscal-chat`), adăugăm un override:

```
Dacă ruta == 'fiscal-chat' SI există balanceContext cu date
  -> Schimbă ruta la 'chat-ai' (care are acces la balanță)
  -> Adaugă flag: fiscalQuestionWithBalance = true
```

Aceasta asigură că întrebările fiscale DESPRE datele din balanță ajung la `chat-ai` (care știe să calculeze concret cu cifrele), iar întrebările fiscale generale (fără balanță) merg în continuare la `fiscal-chat`.

### 2. `supabase/functions/fiscal-chat/index.ts` - Creștere max_tokens

Schimbare `max_tokens` de la `2000` la `4096` (la fel ca `chat-ai`) pentru cazurile când fiscal-chat e folosit fără balanță dar cu întrebări complexe.

## Ce NU se schimbă

- Prompt-urile rămân neschimbate (fix-urile Deep Healing anterioare rămân)
- `chat-ai` funcționează deja corect cu balanceContext
- Frontend-ul nu necesită modificări
- Întrebările fiscale simple (fără balanță) merg tot la `fiscal-chat`

## Rezultat așteptat

Când Lost in Travel întreabă "cum calculez TVA pe marjă pentru decembrie?" și are balanța încărcată:
- **Înainte**: fiscal-chat → răspuns generic fără cifre
- **După**: chat-ai cu balanceContext → calcul concret cu cifrele din balanță (cont 707, cont 607, marjă reală)

