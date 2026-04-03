

# Plan: Dashboard "Ce a învățat YANA" + Raport lunar automat din memorii

## Rezumat

Două funcționalități care exploatează sistemul de memorie persistent:
1. **Dashboard user-facing "Ce a învățat YANA despre tine"** — arată memoriile semantice și episodice ale utilizatorului
2. **Raport lunar automat din memorii** — edge function care sintetizează memoriile într-un raport pe email

## Pas 1: Dashboard "Ce a învățat YANA despre tine"

**Componentă nouă: `src/components/yana/YanaMemoryInsights.tsx`**

Un card integrat în tab-ul "ai-learning" din Settings (lângă `AILearningDashboard`), care:
- Listează memoriile **semantice** (cunoștințe generalizate) ale userului — cu iconuri și etichete clare
- Listează memoriile **episodice** recente (fapte din conversații specifice)
- Arată statistici: câte memorii totale, câte promovate de la episodic→semantic, data ultimei extracții
- Buton "Șterge o memorie" — permite userului să elimine fapte incorecte
- Buton "Generează raport lunar" — declanșează manual sinteza lunară

**Query-uri:**
```sql
SELECT * FROM yana_semantic_memory 
WHERE user_id = auth.uid() AND memory_type = 'semantic'
ORDER BY relevance_score DESC LIMIT 20;

SELECT * FROM yana_semantic_memory 
WHERE user_id = auth.uid() AND memory_type = 'episodic'
ORDER BY created_at DESC LIMIT 10;
```

**RLS**: Politica `"Users read own memory"` există deja. Trebuie adăugată o politică DELETE pentru propriile memorii.

## Pas 2: Politică RLS pentru ștergere memorii proprii

**Migrare SQL:**
```sql
CREATE POLICY "Users delete own memory" ON yana_semantic_memory
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

## Pas 3: Edge function `generate-memory-report`

**Fișier nou: `supabase/functions/generate-memory-report/index.ts`**

Funcția:
1. Primește `userId` din auth token
2. Extrage toate memoriile semantice + episodice ale userului
3. Le trimite la Gemini Flash Lite cu prompt: "Sintetizează aceste fapte de business într-un raport scurt, structurat pe categorii"
4. Returnează raportul generat (text structurat)
5. Opțional: trimite pe email dacă userul cere

## Pas 4: Integrare în Settings

Adaugare `YanaMemoryInsights` în tab-ul `ai-learning` din `Settings.tsx`, sub `AILearningDashboard`.

## Fișiere afectate

| Fișier | Acțiune |
|---|---|
| `src/components/yana/YanaMemoryInsights.tsx` | **NOU** — dashboard memorii user |
| `supabase/functions/generate-memory-report/index.ts` | **NOU** — sinteză AI din memorii |
| `src/pages/Settings.tsx` | +import și render YanaMemoryInsights |
| Migrare DB | +RLS policy DELETE |

## Cost estimat
- Raport lunar: ~0.005 RON/generare (Gemini Flash Lite, ~500 tokeni)
- Dashboard: 0 cost (doar query-uri DB)

