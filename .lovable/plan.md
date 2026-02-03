
# Plan de Remediere: YANA Halucinează Funcționalități Inexistente

## Problema Identificată

Utilizatorul `suciugyorfinicolae@gmail.com` a raportat că YANA descrie funcționalități care **nu există în aplicație**, creând confuzie și frustrare.

### Neconcordanțele Găsite (din conversația de azi):

| Ce spune YANA | Realitatea |
|--------------|-----------|
| "Marketplace: Un loc unde antreprenorii pot găsi contabili" | **NU EXISTĂ** - nicio componentă Marketplace în aplicație |
| "Card verde Marketplace din pagina /app" | **NU EXISTĂ** - nu există card Marketplace |
| "Postează Anunț Caut Contabil", "Trimite Ofertă" | **NU EXISTĂ** - funcții inexistente |
| War Room cu modificare manuală a variabilelor (venituri, costuri, prețuri) | **PARȚIAL** - există War Room dar doar cu scenarii predefinite |

### Sursa Problemelor

Am identificat 3 locuri unde YANA primește informații greșite:

1. **`supabase/functions/chat-ai/index.ts`** (linii 656-665)
   - Conține instrucțiuni complete despre un Marketplace inexistent
   
2. **`src/hooks/useTutorialSteps.tsx`** (linii 32-37)
   - Menționează "Card Marketplace" în tutorial

3. **`supabase/functions/consult-yana/index.ts`**
   - Nu are restricții clare despre ce funcții există

---

## Soluția Propusă

### Pas 1: Șterge referințele false din promptul Chat AI

**Fișier:** `supabase/functions/chat-ai/index.ts`

**Acțiune:** Elimină secțiunea Marketplace (linii 656-665):
```typescript
// DE ȘTERS:
💼 **MARKETPLACE YANA**
- "Unde e Marketplace?" → Card verde "Marketplace"...
...toate liniile 656-665
```

**Înlocuire cu:**
```typescript
💼 **FUNCȚIONALITĂȚI DISPONIBILE**
Aplicația YANA include:
- ✅ Analiză balanțe contabile (încarcă Excel)
- ✅ Dashboard cu grafice și alerte proactive
- ✅ Consultanță strategică (Yana Strategică)
- ✅ War Room (scenarii predefinite: Criză Cash, Pierdere Client, Recesiune)
- ✅ Battle Plan (export PDF strategie)
- ✅ Rapoarte profesionale (export PDF/Word)
- ✅ Comparare perioade și multi-firmă
- ❌ Marketplace NU este disponibil momentan (în dezvoltare)
```

### Pas 2: Șterge tutorial-ul Marketplace

**Fișier:** `src/hooks/useTutorialSteps.tsx`

**Acțiune:** Elimină pasul despre Marketplace (linii 32-37):
```typescript
// DE ȘTERS:
{
  page: '/yana',
  title: '💼 Card Marketplace',
  description: 'Găsește contabilul perfect...',
  highlight: '[data-tour="card-marketplace"]',
},
```

### Pas 3: Adaugă reguli clare de auto-cunoaștere în prompturi

**Fișier:** `supabase/functions/chat-ai/index.ts`

**Adaugă în secțiunea de reguli:**
```typescript
🚫 **REGULI DE AUTO-CUNOAȘTERE (CRITICE)**
Când ești întrebată despre funcționalitățile aplicației:
1. NICIODATĂ nu inventa funcții care nu există
2. Dacă nu ești sigură că o funcție există, spune: "Nu sunt sigură dacă această funcție este disponibilă. Te rog să verifici în aplicație sau să contactezi office@velcont.com."
3. NU descrie în detaliu funcții pe care nu le-ai văzut în acțiune

FUNCȚII CONFIRMATE (poți vorbi despre ele):
✅ Încărcare balanță Excel
✅ Dashboard cu grafice (Analytics Charts)
✅ Alerte Proactive
✅ Comparare Perioade
✅ War Room (doar scenarii predefinite)
✅ Battle Plan Export
✅ Rapoarte PDF/Word

FUNCȚII INEXISTENTE (NU le menționa):
❌ Marketplace antreprenori-contabili
❌ Postări anunțuri "Caut Contabil"
❌ Sistem de oferte
```

### Pas 4: Actualizează promptul demo-chat

**Fișier:** `supabase/functions/demo-chat/index.ts`

**Adaugă în systemPrompt:**
```typescript
### FUNCȚII DISPONIBILE (doar astea poți descrie):
- Analiză balanță contabilă (Excel)
- Chat AI pentru întrebări financiare
- Consultanță strategică
- Rapoarte premium (PDF/Word)
- War Room cu scenarii predefinite
- Alerte proactive

NU menționa: Marketplace, CRM complex, sau funcții pe care nu le-ai văzut.
```

### Pas 5: Actualizează promptul consult-yana

**Fișier:** `supabase/functions/consult-yana/index.ts`

**Adaugă restricție similară în system prompt.**

---

## Verificare și Testare

După implementare:
1. Întreabă YANA: "Ce funcționalități are aplicația?"
2. Întreabă YANA: "Ce este Marketplace?"
3. Verifică că răspunde: "Marketplace nu este disponibil momentan"

---

## Secțiune Tehnică

### Fișiere de Modificat

| Fișier | Tip modificare | Risc |
|--------|---------------|------|
| `supabase/functions/chat-ai/index.ts` | Ștergere Marketplace + adăugare reguli | Scăzut |
| `supabase/functions/demo-chat/index.ts` | Adăugare restricții | Scăzut |
| `supabase/functions/consult-yana/index.ts` | Adăugare restricții | Scăzut |
| `src/hooks/useTutorialSteps.tsx` | Ștergere pas Marketplace | Scăzut |

### Deploy

Toate edge functions trebuie redeployed după modificări.

### Impactul Corecției

| Înainte | După |
|---------|------|
| YANA descrie Marketplace inexistent în detaliu | YANA spune "nu este disponibil" |
| Utilizatorii caută funcții care nu există | Utilizatorii știu ce există real |
| Frustrare și neîncredere | Încredere în informații corecte |

---

## Concluzie

**Cauza:** YANA primește informații false în prompturi despre funcționalități planificate dar neimplementate (Marketplace).

**Soluția:** Curățăm toate referințele la funcții inexistente și adăugăm reguli stricte de auto-cunoaștere.

**Riscul implementării:** SCĂZUT - modificări doar în texte/prompturi, nu în logică.
