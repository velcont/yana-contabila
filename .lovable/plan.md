
# Plan: Actualizare Prompturi - Totul Este În Chat

## Situația Curentă

Sistemul de **Artifacts** este deja implementat și funcțional:
- `ArtifactRenderer.tsx` suportă: grafice radar, bar, line, tabele, download, war_room, battle_plan
- Toate se afișează **inline în chat** exact ca la ChatGPT/Claude

Dar prompturile încă vorbesc despre "Dashboard separat" ceea ce confuzează utilizatorii.

## Modificări Propuse

### 1. Actualizare `chat-ai/index.ts` (linii 662-670)

**Înainte:**
```text
FUNCȚII CONFIRMATE (poți vorbi despre ele):
✅ Încărcare balanță Excel
✅ Dashboard cu grafice (Analytics Charts)
✅ Alerte Proactive
✅ Comparare Perioade
...
```

**După:**
```text
FUNCȚII CONFIRMATE (TOATE ÎN CHAT):
✅ Încărcare balanță Excel - direct în chat
✅ Grafice și vizualizări - apar inline în chat ca artefacte
✅ Alerte Proactive - le primești în chat
✅ Comparare Perioade - rezultate în chat
✅ War Room (scenarii predefinite) - disponibil prin chat
✅ Battle Plan Export (PDF) - download din chat
✅ Rapoarte profesionale (PDF/Word) - generate și descărcate din chat
✅ Consultanță strategică - conversație directă

NOTĂ IMPORTANTĂ:
Toată experiența YANA este în această interfață de chat.
Graficele, tabelele, rapoartele - toate apar direct aici, inline.
NU există un "Dashboard separat" - totul e în conversație, ca la ChatGPT.
```

### 2. Actualizare `consult-yana/index.ts` (linii 85-94)

**Înainte:**
```text
FUNCȚII CONFIRMATE care EXISTĂ:
✅ Analiză balanțe Excel, Dashboard grafice, Alerte Proactive
```

**După:**
```text
FUNCȚII CONFIRMATE (TOATE ÎN CHAT):
✅ Analiză balanțe Excel - încarcă și primești rezultate în chat
✅ Grafice/Vizualizări - apar ca artefacte inline în conversație
✅ Alerte Proactive - primite în chat
✅ War Room (scenarii predefinite), Battle Plan Export
✅ Rapoarte PDF/Word - descărcabile din chat

IMPORTANT: NU există Dashboard separat. TOTUL e în chat.
```

### 3. Actualizare `demo-chat/index.ts` (linii 250-261)

**Înainte:**
```text
### FUNCȚII DISPONIBILE (doar astea poți descrie):
- Analiză balanță contabilă (Excel)
- Chat AI pentru întrebări financiare
...
```

**După:**
```text
### FUNCȚII DISPONIBILE (TOATE ÎN CHAT):
- Încărcare și analiză balanță Excel - rezultatele apar direct în conversație
- Grafice și vizualizări - afișate inline ca artefacte (ca la ChatGPT)
- Rapoarte profesionale (PDF/Word) - generate și descărcate din chat
- War Room cu scenarii predefinite
- Consultanță financiară, fiscală, strategică

IMPORTANT: TOTUL se întâmplă în această conversație.
NU există Dashboard separat, NU există pagini externe.
Graficele, tabelele, rapoartele - toate apar aici, inline.
```

---

## Rezumat Modificări

| Fișier | Ce se modifică |
|--------|----------------|
| `supabase/functions/chat-ai/index.ts` | Rescrie secțiunea "FUNCȚII CONFIRMATE" să specifice că totul e în chat |
| `supabase/functions/consult-yana/index.ts` | Aceeași clarificare |
| `supabase/functions/demo-chat/index.ts` | Aceeași clarificare |

---

## Impactul Schimbării

| Întrebare utilizator | Răspuns YANA înainte | Răspuns YANA după |
|---------------------|---------------------|-------------------|
| "Unde văd graficele?" | "Pe Dashboard" | "Apar direct aici în chat când analizez balanța" |
| "Există Dashboard?" | "Da, cu grafice..." | "Totul e în acest chat - graficele, rapoartele apar inline" |
| "Cum accesez analizele?" | "Pagina principală..." | "Încarcă balanța aici și îți arăt tot direct în conversație" |

---

## Risc: SCĂZUT
- Doar modificări de text în prompturi
- Nu afectează logica sau funcționalitatea
- Aliniază descrierea cu realitatea UI
