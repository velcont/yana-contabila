# Plan: Reparare Sistem Grafice În Chat - ✅ IMPLEMENTAT (v2)

## Status: FINALIZAT + FIX SUPLIMENTAR

Toate modificările au fost aplicate și deploy-uite cu succes.

## Ce s-a implementat:

### 1. ✅ Secțiune nouă GENERARE GRAFICE în SYSTEM_PROMPT (chat-ai)
- Adăugată documentație completă pentru artefacte
- Mapare conturi 6xx → categorii cheltuieli
- Exemple concrete de format JSON
- Reguli absolute de comportament

### 2. ✅ Corectare Dashboard → Chat 
- Secțiunea "DASHBOARD & VIZUALIZARE" → "VIZUALIZĂRI ȘI ANALIZĂ (TOTUL ÎN CHAT)"
- Toate referințele actualizate să indice chat-ul, nu Dashboard

### 3. ✅ Reminder dinamic îmbunătățit
- Acum extrage și listează explicit conturile 6xx și 7xx din balanța reală
- Include maparea obligatorie a conturilor
- Mesaj mult mai prescriptiv și forțat

### 4. ✅ Actualizare consult-yana și demo-chat
- Aceleași instrucțiuni pentru artefacte
- Format JSON documentat

### 5. ✅ FIX CRITIC: Priority Override în ai-router
- Detecția pentru grafice/vizualizări acum este **PRIORITARĂ** (Priority 0)
- Cuvinte cheie: grafic, grafice, chart, diagrama, vizualiz, tabel, tabele
- Forțează rutarea către `chat-ai` chiar dacă mesajul conține cuvinte strategice (ex: "cheltuieli")
- Log explicit: `[AI-Router] ⚡ GRAPH REQUEST DETECTED`

### 6. ✅ FIX NOU: Inline System Message pentru Graph Requests
- Când se detectează cerere de grafic + balanță încărcată:
  - Se adaugă un mesaj assistant fictiv care confirmă că are datele
  - Se adaugă un mesaj system INLINE direct înainte de user message
  - Aceasta forțează AI-ul să execute, nu să converseze

## Fișiere modificate:
- `supabase/functions/chat-ai/index.ts` ← FIX PRINCIPAL v2
- `supabase/functions/consult-yana/index.ts`
- `supabase/functions/demo-chat/index.ts`
- `supabase/functions/ai-router/index.ts`

## Test recomandat:
1. Încarcă o balanță pe /yana
2. Întreabă: **"arată-mi graficul cheltuielilor"**

Rezultat așteptat: YANA generează grafic bar_chart inline cu datele reale din balanță, fără să ceară cifre de la utilizator.
