

# YANA Action Engine — De la sfat la acțiune

## Conceptul: "OpenClaw for Business"

OpenClaw a explodat pentru că AI-ul nu doar vorbește — **FACE lucruri**. YANA trebuie să facă același lucru, dar vertical pentru antreprenori români.

**Azi**: Antreprenorul întreabă → YANA răspunde cu sfaturi → antreprenorul trebuie să facă singur totul.

**Mâine**: Antreprenorul întreabă → YANA răspunde cu sfaturi **+ ACȚIONEAZĂ**: generează emailul, creează planul, trimite reminder-ul, pregătește documentul.

## Ce ACȚIUNI concrete poate face YANA

Fără API-uri externe complexe, cu ce avem deja:

| Acțiune | Cum funcționează | Exemplu concret |
|---------|------------------|-----------------|
| **Generează email** | AI scrie emailul, utilizatorul copiază/trimite | "Scrie-mi emailul către furnizorul X să negociez 60 zile termen" |
| **Creează document** | Word/PDF generat instant | "Fă-mi un plan de cash flow pe 90 zile" |
| **Setează reminder** | YANA trimite email la data X | "Amintește-mi peste 2 săptămâni să verific plățile" |
| **Construiește to-do list** | Acțiuni extrase din conversație | "Din ce am discutat, ai 3 lucruri de făcut săptămâna asta" |
| **Raport săptămânal** | Email luni dimineața cu status | "Săptămâna trecută ai zis că... Ai făcut?" |
| **Draft contract/ofertă** | Șablon completat cu datele firmei | "Generează o ofertă de preț pentru clientul Y" |

## Arhitectura: "Action Items Engine"

```text
Conversație YANA
       ↓
  AI detectează acțiuni posibile
       ↓
  ┌─────────────────────────────┐
  │  ACTION ITEMS TABLE         │
  │  - what (ce trebuie făcut)  │
  │  - when (deadline)          │
  │  - status (todo/done)       │
  │  - reminder_at              │
  │  - generated_doc_url        │
  └─────────────────────────────┘
       ↓                    ↓
  Reminder Engine      Document Generator
  (email la deadline)  (Word/PDF/Email draft)
```

## Implementare tehnică

### 1. Tabel `yana_action_items`
Stochează acțiunile extrase din conversații:
- `user_id`, `conversation_id`, `action_text`, `category` (email/document/reminder/task)
- `deadline`, `reminder_at`, `status` (pending/in_progress/completed/overdue)
- `generated_content` (emailul/documentul generat de YANA)
- `completed_at`

### 2. Edge Function: `extract-actions`
Apelat async după fiecare conversație (via `EdgeRuntime.waitUntil`):
- AI-ul analizează conversația și extrage acțiuni concrete
- Le salvează în `yana_action_items`
- Setează reminder-uri automate

### 3. Edge Function: `generate-action-document`
Când utilizatorul cere un document/email:
- Primește context din conversație + profil firmă
- Generează draft personalizat (email, ofertă, plan)
- Returnează text formatat sau Word downloadabil

### 4. Edge Function: `action-reminder`
Cron job zilnic care:
- Verifică acțiunile cu `reminder_at <= now()`
- Trimite email cu "YANA: Ai promis că faci X. Ai făcut?"
- Marchează ca overdue dacă deadline-ul a trecut

### 5. Component: `ActionItemsPanel.tsx`
Panou în interfața YANA cu:
- Lista de acțiuni active (to-do list generat de AI)
- Status vizual (verde/galben/roșu)
- Buton "Marchează ca făcut"
- Buton "YANA, ajută-mă cu asta" → deschide chat contextual

### 6. Suggestion Chip: "📋 Ce am de făcut?"
YANA răspunde cu lista de acțiuni active + status + ce a trecut de deadline.

### 7. Raport săptămânal automat (email)
Luni dimineața, YANA trimite:
- "Ai 3 acțiuni active, 1 e overdue"
- "Săptămâna trecută ai discutat despre X — ai rezolvat?"
- CTA: "Deschide YANA să continuăm"

## Fișiere afectate

| Fișier | Acțiune |
|--------|---------|
| Migrare SQL | NOU — tabel `yana_action_items` cu RLS |
| `supabase/functions/extract-actions/index.ts` | NOU — extragere acțiuni din conversații |
| `supabase/functions/generate-action-document/index.ts` | NOU — generare documente/emailuri |
| `supabase/functions/action-reminder/index.ts` | NOU — cron reminder zilnic |
| `src/components/yana/ActionItemsPanel.tsx` | NOU — UI to-do list |
| `src/components/yana/SuggestionChips.tsx` | EDIT — chip "Ce am de făcut?" |
| `src/components/yana/YanaChat.tsx` | EDIT — integrare panel + detectare acțiuni |
| `supabase/functions/ai-router/index.ts` | EDIT — trigger extract-actions async |

## De ce e asta "OpenClaw for Business"

OpenClaw: "AI care face lucruri pe computerul tău"
YANA: "AI care face lucruri pentru afacerea ta"

- **Nu doar spune** "negociază cu furnizorul" → **scrie emailul**
- **Nu doar spune** "fă un plan de 90 zile" → **generează documentul**
- **Nu doar spune** "verifică cash flow-ul" → **trimite reminder peste 2 săptămâni**
- **Nu doar spune** "ai 3 lucruri de făcut" → **urmărește și întreabă dacă le-ai făcut**

## Diferențiatorul unic

Nimeni în România (și puțini global) nu are un AI care:
1. Ține minte tot ce ai discutat (YANA deja face asta)
2. Extrage acțiuni concrete din conversație (NOU)
3. Te urmărește proactiv să le faci (NOU)
4. Generează documentele necesare pe loc (NOU)

E diferența dintre un prieten care zice "ar trebui să faci sport" și un antrenor personal care îți face programul, te sună dimineața și te întreabă seara "ai fost?"

## Cost per utilizator
- Extract actions: ~0.01 EUR/conversație (Gemini Flash)
- Reminders: 0 (cron + email)
- Document generation: ~0.02-0.05 EUR/document
- Total: ~1-2 EUR/lună per utilizator activ. La 49 RON (~10 EUR), marja e 80%+

