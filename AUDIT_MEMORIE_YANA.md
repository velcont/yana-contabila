# 🧠 AUDIT COMPLET - SISTEM MEMORIE YANA

**Data auditului:** 24 Ianuarie 2026  
**Versiune:** 1.0

---

## 📊 REZUMAT EXECUTIV

### ✅ PUNCTE FORTE (Ce funcționează bine)
| Zonă | Status | Detalii |
|------|--------|---------|
| Memorie conversație curentă | ✅ Excelent | Ultimele 30 mesaje sunt încărcate din DB |
| Context balanță (balanceContext) | ✅ Excelent | Persistent în metadata conversației |
| Relații utilizator-YANA | ✅ Bine | `yana_relationships` tracking complet |
| Anti-greeting repetitiv | ✅ Implementat | Verifică `hasMetBefore` |
| Anti-scuze excesive | ✅ Implementat | Counter pentru apologii |

### ⚠️ PROBLEME IDENTIFICATE
| Problemă | Severitate | Impact |
|----------|-----------|--------|
| `ai_conversations.company_id` adesea NULL | 🟡 Medie | Memoria cross-conversații nu funcționează pentru firme neidentificate |
| `find_similar_conversations` depinde de company_id | 🟡 Medie | Fără company_id, nu găsește conversații anterioare |
| `user_journey` nu se sincronizează corect | 🟠 Importantă | `total_interactions` poate fi incorect |
| Nu există memorie pe termen lung pentru preferințe | 🟡 Medie | YANA nu învață stilul utilizatorului |
| `yana_soul_core` nu se actualizează consistent | 🟢 Minoră | Counters pot fi dezincronizați |

---

## 🔍 ANALIZA DETALIATĂ PE STRATURI

### 1️⃣ STRATUL 1: MEMORIE ÎN CADRUL CONVERSAȚIEI (Sesiune)

**Fișiere implicate:**
- `src/components/yana/YanaChat.tsx` (linii 263-282)
- `supabase/functions/ai-router/index.ts` (linii 441-470)

**Cum funcționează:**
```
1. Frontend (YanaChat) încarcă mesaje din DB: yana_messages (ultim 30)
2. Construiește historyForAI cu ultimele 25 mesaje
3. Trimite la ai-router împreună cu balanceContext
4. ai-router verifică și încarcă balanceContext din DB (fix pentru stale closure)
```

**✅ CE FUNCȚIONEAZĂ:**
- Mesajele se încarcă corect din `yana_messages`
- `balanceContext` se persistă în `yana_conversations.metadata`
- Frontend face fetch fresh din DB pentru fiecare mesaj (fix stale closure)

**⚠️ PROBLEMĂ:**
```typescript
// YanaChat.tsx linia 279
const historyForAI = allMessages.slice(-25).map(m => ({
  role: m.role,
  content: m.content.length > 2500 ? m.content.substring(0, 2500) + '...' : m.content
}));
```
- Dacă un mesaj are peste 2500 caractere, se trunchiază → poate pierde context important

**RECOMANDARE:** Păstrează primele 500 + ultimele 2000 caractere în loc de primele 2500.

---

### 2️⃣ STRATUL 2: MEMORIE CROSS-CONVERSAȚII (Long-term pentru firmă)

**Fișiere implicate:**
- `supabase/functions/ai-router/index.ts` (linii 43-168)
- `src/lib/ai/conversational-memory.ts`

**Tabele utilizate:**
- `ai_conversations` - Stochează întrebări/răspunsuri cu `company_id`
- `ai_learned_patterns` - Patterns învățate per firmă

**Cum funcționează:**
```
1. ai-router extrage CUI din fileName (extractCUIFromFileName)
2. Caută company_id în tabela companies
3. Apelează findSimilarConversations cu company_id
4. Construiește memoryContext din conversații similare
```

**⚠️ PROBLEMĂ CRITICĂ:**
```typescript
// ai-router linia 35-39
function extractCUIFromFileName(fileName: string): string | null {
  if (!fileName) return null;
  // Pattern: 8 cifre înainte de .xls sau .xlsx
  const cuiMatch = fileName.match(/(\d{6,8})\.xls/i);
  return cuiMatch ? cuiMatch[1] : null;
}
```
- **PROBLEMĂ:** Dacă fișierul nu are CUI în nume (format non-standard), NU se face matching cu firma
- **IMPACT:** `detectedCompanyId` rămâne NULL → nu se salvează în `ai_conversations` → nu funcționează memoria cross-conversații

**RECOMANDARE:** 
1. Adaugă fallback pentru a căuta firma în `yana_conversations.metadata.companyName`
2. Permite utilizatorului să confirme/selecteze firma manual

---

### 3️⃣ STRATUL 3: MEMORIE RELAȚIONALĂ (User-YANA Relationship)

**Fișiere implicate:**
- `supabase/functions/consciousness-engine/index.ts` (linii 572-781)

**Tabele utilizate:**
- `yana_relationships` - Scor relație, conversații totale, momente împărtășite
- `user_journey` - Obiective, incertitudine, stare emoțională

**Cum funcționează:**
```
1. consciousness-engine încarcă RelationshipContext
2. Verifică hasMetBefore (totalConversations > 1)
3. Construiește promptInjection cu context relațional
4. Blochează greeting-uri repetitive dacă v-ați mai întâlnit
```

**✅ CE FUNCȚIONEAZĂ BINE:**
- Anti-greeting: `isFirstMeetingEver = isFirstMessageInThisConversation && !hasMetBefore`
- Anti-apology: Counter pentru scuze excesive (max 2)
- Detectare topic conversație: `detectConversationTopic()`
- Personalizare cu nume utilizator

**⚠️ PROBLEME:**

**A) user_journey.total_interactions nu se incrementează corect:**
```typescript
// ai-router liniile 800-830
const journeyUpdaterTask = async () => {
  const { error } = await supabase
    .from('user_journey')
    .upsert({
      user_id: user.id,
      last_interaction_at: new Date().toISOString(),
      total_interactions: 1, // ❌ MEREU 1, nu incrementează!
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    });
```
- **BUG:** `total_interactions: 1` ar trebui să fie `total_interactions = total_interactions + 1`
- **IMPACT:** YANA nu știe câte interacțiuni a avut cu utilizatorul

**B) yana_relationships.total_conversations:**
- Se actualizează prin trigger SQL (`trigger_sync_soul_core`) 
- Dar sincronizarea se face la INSERT, nu la UPDATE frecvent

---

### 4️⃣ STRATUL 4: MEMORIE SOUL (Identitate YANA)

**Fișiere implicate:**
- `supabase/functions/consciousness-engine/index.ts`
- `supabase/functions/capture-soul-state/index.ts`

**Tabele utilizate:**
- `yana_soul_core` - Core values, recent_thoughts, mood
- `ai_reflection_logs` - Self-reflection după fiecare răspuns

**✅ CE FUNCȚIONEAZĂ:**
- Self-reflection se face async după fiecare răspuns (ai-router linii 720-750)
- Surprise-detector detectează contradicții
- Experiment-tracker evaluează ce a funcționat

**⚠️ PROBLEMĂ:**
- `yana_soul_core.total_conversations` se sincronizează prin trigger
- Dar trigger-ul se bazează pe `yana_relationships` care nu se actualizează mereu

---

## 🛠️ RECOMANDĂRI DE ÎMBUNĂTĂȚIRE

### PRIORITATE 1 - CRITICAL (Fix bugs)

#### 1.1 Fix incrementare total_interactions
```sql
-- Crează funcție SQL pentru increment atomic
CREATE OR REPLACE FUNCTION increment_user_interactions(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_journey (user_id, total_interactions, last_interaction_at)
  VALUES (p_user_id, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_interactions = user_journey.total_interactions + 1,
    last_interaction_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

#### 1.2 Fix company_id detection
Adaugă fallback în ai-router:
```typescript
// Dacă nu am detectat compania din fileName, verifică metadata conversației
if (!detectedCompanyId && conversationId) {
  const { data: convData } = await supabase
    .from('yana_conversations')
    .select('company_id, metadata')
    .eq('id', conversationId)
    .single();
  
  if (convData?.company_id) {
    detectedCompanyId = convData.company_id;
  } else if (convData?.metadata?.companyName) {
    // Caută firma după nume
    const result = await findCompanyByContext(supabase, user.id, convData.metadata.companyName);
    detectedCompanyId = result.companyId;
  }
}
```

### PRIORITATE 2 - IMPORTANT (Îmbunătățiri)

#### 2.1 Salvare preferințe utilizator
Adaugă în `yana_relationships.user_preferences`:
```json
{
  "preferredResponseLength": "short|medium|long",
  "expertiseLevel": "novice|intermediate|expert",
  "preferredTopics": ["fiscalitate", "cash flow"],
  "dislikedPhrases": []
}
```

#### 2.2 Memorie pe termen lung pentru teme recurente
```typescript
// După fiecare conversație, analizează și salvează teme frecvente
if (detectedTopic && user.id) {
  await supabase.rpc('increment_topic_frequency', {
    p_user_id: user.id,
    p_topic: detectedTopic
  });
}
```

### PRIORITATE 3 - NICE TO HAVE

#### 3.1 Dashboard memorie (pentru debugging)
- Pagină admin cu vizualizare:
  - Ultimele 10 conversații per user
  - Relationship score evolution
  - Topics discutate frecvent

---

## 📋 CHECKLIST VERIFICARE MEMORIE

Când testezi dacă YANA își amintește:

- [ ] **Test 1:** Întreabă "Cum mă cheamă?" → YANA trebuie să știe numele din profil
- [ ] **Test 2:** În conversație nouă, verifică salutul → NU trebuie să spună "Mă bucur să te cunosc" dacă v-ați mai întâlnit
- [ ] **Test 3:** Încarcă balanță, închide conversația, deschide altă conversație și întreabă despre balanță → NU trebuie să știe (e altă conversație)
- [ ] **Test 4:** În aceeași conversație, întreabă despre balanță după 5 mesaje → TREBUIE să știe
- [ ] **Test 5:** Verifică în DB: `SELECT total_conversations FROM yana_relationships WHERE user_id = 'X'` → trebuie să crească

---

## 🔄 FLUXUL COMPLET DE MEMORIE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER TRIMITE MESAJ                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ YanaChat.tsx                                                         │
│ 1. Fetch balanceContext din DB (fix stale closure)                   │
│ 2. Fetch ultim 30 mesaje din yana_messages                          │
│ 3. Construiește historyForAI (25 mesaje, max 2500 chars)            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ ai-router                                                            │
│ 1. Detectează companie din fileName (CUI) sau metadata              │
│ 2. Încarcă balanceContext din yana_conversations.metadata           │
│ 3. Caută similar conversations în ai_conversations                   │
│ 4. Apelează consciousness-engine pentru context relațional          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ consciousness-engine                                                 │
│ 1. Încarcă user_journey (goal, uncertainty, emotional_state)        │
│ 2. Încarcă yana_relationships (score, total_conv, last_topic)       │
│ 3. Verifică hasMetBefore pentru anti-greeting                       │
│ 4. Detectează topic din history                                      │
│ 5. Construiește promptInjection cu tot contextul                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ chat-ai / fiscal-chat / strategic-advisor                           │
│ 1. Primește consciousnessContext cu promptInjection                 │
│ 2. Primește history și balanceContext                               │
│ 3. Generează răspuns personalizat                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ POST-PROCESARE (async)                                               │
│ 1. self-reflect → salvează ai_reflection_logs                       │
│ 2. surprise-detector → detectează contradicții                      │
│ 3. experiment-tracker → evaluează ce a funcționat                   │
│ 4. journeyUpdater → actualizează user_journey                       │
│ 5. Salvează în ai_conversations pentru memorie viitoare             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📈 METRICI DE SUCCES

După implementarea fix-urilor, verifică:

1. **`ai_conversations` cu `company_id` NOT NULL:** > 80%
2. **`yana_relationships.total_conversations`:** Crește corect la fiecare conversație
3. **`user_journey.total_interactions`:** Crește la fiecare mesaj
4. **Test anti-greeting:** 100% success rate (nu spune "Mă bucur să te cunosc" la revenire)
5. **Memorie balanță:** 100% success rate în aceeași conversație

---

**Autor:** Lovable AI  
**Data:** 24 Ianuarie 2026
