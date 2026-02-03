
# Plan: Reparare Sistem Grafice În Chat

## Problema Identificată

YANA ignoră datele din balanță când i se cere un grafic și cere date manual de la utilizator. Cauza:

1. **Reminder-ul de grafice e prea slab** - poziționat la sfârșitul prompt-ului
2. **Lipsesc exemple concrete** - AI-ul nu știe cum să transforme conturile în categorii
3. **Prompt-ul încă menționează "Dashboard"** în unele secțiuni

## Soluție Propusă

### 1. Mutare și Consolidare Instrucțiuni Artefacte în SYSTEM_PROMPT

În loc să injectăm un "reminder" la sfârșit (care e ignorat), vom adăuga instrucțiuni clare **în corpul principal al SYSTEM_PROMPT** (zona de reguli critice):

**Locație:** `supabase/functions/chat-ai/index.ts` - în SYSTEM_PROMPT, după secțiunea despre analiză financiară

**Conținut nou:**

```text
📊 **GENERARE GRAFICE ȘI VIZUALIZĂRI**

Când utilizatorul cere un grafic sau o vizualizare:

1. **EXTRAGE datele din conturile balanței de mai sus**
2. **GENEREAZĂ un bloc artifact JSON** în formatul:

\`\`\`artifact
{
  "type": "bar_chart",
  "title": "Titlu descriptiv",
  "data": {"Categorie1": valoare, "Categorie2": valoare}
}
\`\`\`

**TIPURI SUPORTATE:**
- "bar_chart" - pentru comparații între categorii
- "line_chart" - pentru evoluție în timp (data: array cu {name, value})
- "radar_chart" - pentru scor multi-dimensional
- "table" - pentru date tabelare (data: array cu obiecte)

**MAPARE CONTURI OBLIGATORIE:**

Pentru CHELTUIELI (grafic pe categorii):
- Clasă 6xx din balanță → Categorizează astfel:
  - 601, 602, 607, 608 → "Materii prime & Marfă"
  - 641, 645 → "Salarii & Taxe personal"
  - 612, 613 → "Chirii & Utilități"  
  - 623, 624 → "Transport & Deplasări"
  - 626 → "Poștă & Telecomunicații"
  - 628 → "Servicii externe"
  - Alte 6xx → "Alte cheltuieli"

Pentru VENITURI:
- Clasă 7xx → "Venituri din vânzări", "Venituri financiare", etc.

**EXEMPLU CONCRET:**

User: "arată-mi graficul cheltuielilor"
Balanță: Cont 641: 15000, Cont 628: 8000, Cont 607: 22000

Răspuns:
"Iată structura cheltuielilor tale:

\`\`\`artifact
{
  "type": "bar_chart",
  "title": "Structura Cheltuielilor",
  "data": {
    "Materii prime & Marfă": 22000,
    "Salarii & Taxe": 15000,
    "Servicii externe": 8000
  }
}
\`\`\`

Observ că cea mai mare categorie este Materii prime (22.000 RON)..."

**REGULI ABSOLUTE:**
- NU cere NICIODATĂ date de la utilizator dacă ai balanță
- NU genera grafice "ipotetice" când ai date reale
- EXTRAGE valorile din conturile listate mai sus
- Dacă NU ai balanță → Cere utilizatorului să încarce Excel
```

### 2. Eliminare Referințe "Dashboard" din Prompt

**Locație:** `supabase/functions/chat-ai/index.ts` linii 556-561

**Înainte:**
```text
📊 **DASHBOARD & VIZUALIZARE**
- "Unde văd analizele?" → Click "Dosarul Meu" (butonul care palpită pe pagina principală)
- "Cum văd istoricul?" → În Dashboard, tab-ul "Dosarul Meu" arată toate analizele
- "Cum compar 2 perioade?" → În Dashboard, tab "Comparare Perioade", selectează 2 analize
- "Unde sunt graficele?" → Dashboard → Tab "Grafice Analytics" (cifră afaceri, profit, DSO, etc.)
- "Cum văd alertele?" → Dashboard → Tab "Alerte Proactive" (probleme detectate automat)
```

**După:**
```text
📊 **VIZUALIZĂRI ȘI ANALIZĂ (TOTUL ÎN CHAT)**
- "Unde văd analizele?" → Cere "arată-mi analiza" direct în chat
- "Cum văd istoricul?" → Click pe iconița 📜 în sidebar-ul din stânga
- "Cum compar 2 perioade?" → Întreabă "compară ianuarie cu februarie"
- "Unde sunt graficele?" → Cere "arată-mi grafic cheltuieli" - apare direct în chat
- "Cum văd alertele?" → Întreabă "ce alerte am?" - le primești în conversație
```

### 3. Îmbunătățire Reminder Dinamic (Backup)

**Locație:** `supabase/functions/chat-ai/index.ts` linii 1815-1835

Rescrie reminder-ul să fie mai prescriptiv și să includă conturile reale din balanță:

```typescript
if (isGraphRequest && hasBalanceData) {
  // Extrage conturile 6xx și 7xx din balanceContext pentru a le lista explicit
  const expenseAccounts = balanceContext?.accounts
    ?.filter((a: any) => String(a.code).startsWith('6'))
    ?.slice(0, 10)
    ?.map((a: any) => `${a.code}: ${Number(a.debit || 0).toFixed(0)} RON`)
    ?.join(', ') || 'nu există';
  
  graphReminder = `

🚨 **COMANDĂ DIRECTĂ - GENEREAZĂ GRAFIC ACUM!**

Utilizatorul a cerut un grafic. Ai datele. ACȚIONEAZĂ:

CONTURI CHELTUIELI (6xx) DISPONIBILE: ${expenseAccounts}

RĂSPUNS OBLIGATORIU:
1. Scrie 1-2 propoziții despre ce arată graficul
2. Inserează bloc artifact JSON cu datele REALE
3. Adaugă observație cheie

FORMAT:
\`\`\`artifact
{
  "type": "bar_chart",
  "title": "Structura Cheltuielilor",
  "data": {"Categorie1": valoare_reala, "Categorie2": valoare_reala}
}
\`\`\`

⛔ INTERZIS: Să ceri date de la utilizator
⛔ INTERZIS: Să generezi date "ipotetice" sau "exemplu"
`;
}
```

### 4. Consult-yana și Demo-chat - Aceleași Actualizări

Vom aplica aceleași modificări în:
- `supabase/functions/consult-yana/index.ts`
- `supabase/functions/demo-chat/index.ts`

---

## Fișiere Afectate

| Fișier | Modificare |
|--------|------------|
| `supabase/functions/chat-ai/index.ts` | Adaugă secțiune detaliată despre artefacte în SYSTEM_PROMPT + corectează Dashboard → Chat + îmbunătățește reminder |
| `supabase/functions/consult-yana/index.ts` | Aceleași instrucțiuni artefacte |
| `supabase/functions/demo-chat/index.ts` | Aceleași instrucțiuni artefacte |

---

## Risc și Impact

| Aspect | Evaluare |
|--------|----------|
| Risc | SCĂZUT - doar modificări de text în prompturi |
| Impact | RIDICAT - va rezolva problema principală a graficelor |
| Compatibilitate | Menține formatul artifact existent |
| Testare | Necesită test: "arată-mi graficul cheltuielilor" |

---

## Rezultat Așteptat

**Înainte:**
> "Hai să facem altfel. O să generez eu un grafic cu date ipotetice..."

**După:**
> "Iată structura cheltuielilor tale din balanță:
> 
> [GRAFIC BAR CHART - afișat inline]
> 
> Observ că Salariile reprezintă cea mai mare cheltuială (41.2%)..."
