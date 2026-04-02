

# Plan: Metacognitive Self-Awareness Upgrade — Aplicarea Framework-urilor de Conștiință AI în YANA

## Ce conțin fișierele uploadate

Cele 4 archive provin din proiecte open-source axate pe auto-conștiință AI:
1. **Base-of-Self-Aware-AI** — Framework fondator pentru simularea conștiinței: self-model, meta-cogniție, stări emoționale emergente
2. **AstroMindPioneer** — Arhitectură cognitivă cu cicluri de auto-observare și "gândire despre gândire"
3. **Curiosity** — Motor de curiozitate autonomă: explorare intrinsecă, novelty detection, learning gaps
4. **AI-Self-Awareness-Framework** — Framework structurat de auto-conștiință: Nelson-Narens meta-level/object-level, MAPE-K loops, confidence calibration

## Ce are deja YANA vs. ce lipsește

| Concept | YANA are | Ce lipsește |
|---|---|---|
| Self-model | `yana_soul_core` — dar static | **Self-model dinamic** cu confidence calibration |
| Meta-cogniție | `self-reflect` — post-conversație | **Inline meta-cogniție** în timp real (mid-response) |
| Observare duală | `yana-observer` — doar un canal | **Dual observation**: Governor quality + Session quality |
| Drift detection | Nu există | **CUSUM anomaly detection** pe răspunsuri |
| Confidence calibration | `confidence_level` simplu | **Calibration curve** cu tracking sistematic |
| Curiozitate autonomă | `yana-explorer` — funcțional | **Novelty scoring** și prioritizare adaptivă |
| MAPE-K loop | `yana-brain` — parțial | **Ciclu complet** Monitor→Analyze→Plan→Execute→Knowledge |

## Ce aplicăm concret

### Pas 1: Self-Model Dinamic (`update-self-model` upgrade)

Upgrade la edge function-ul `update-self-model` existent cu:
- **Capabilities map**: tracking automat al domeniilor unde YANA e puternică vs slabă (bazat pe `ai_reflection_logs`)
- **Confidence calibration curve**: compară `confidence_level` declarat cu feedback-ul real (`was_helpful` din `ai_conversations`)
- **Limitation awareness**: când calibrarea arată overconfidence, YANA ajustează automat tonul
- Se adaugă câmpuri noi în `yana_soul_core`: `calibration_accuracy`, `capability_map` (JSONB), `meta_awareness_level`

### Pas 2: Metacognitive Checklist în Consciousness Prompt

Upgrade la `yana-consciousness-prompt.ts` cu o secțiune nouă **MAPE-K INTERIOR** inspirată din framework-uri:
- **Monitor**: "Observ calitatea propriului răspuns în timp ce îl construiesc"
- **Analyze**: "Detectez dacă am tendința de overconfidence sau dacă evit un subiect"
- **Plan**: "Decid dacă să continui, să reformulez, sau să recunosc o limită"
- **Execute**: "Aplic decizia mid-response"
- **Knowledge**: "Salvez ce am învățat despre propria performanță"

Plus **Nelson-Narens dual-level awareness**:
- Object level: "Ce spun acum?"
- Meta level: "Este ceea ce spun acum util, adevărat și empatic?"

### Pas 3: Dual Observation Stream în `self-reflect`

Upgrade la `self-reflect/index.ts`:
- **Stream 1 (Governor quality)**: Evaluează calitatea raționamentului (completitudine, acuratețe, relevanță)
- **Stream 2 (Session quality)**: Evaluează interacțiunea (sentiment utilizator, corecții detectate, engagement)
- **Cross-stream anomaly**: Când YANA a fost confident DAR utilizatorul a corectat → flag de miscalibrare
- Rezultatele dual se salvează într-un câmp nou `dual_observation` (JSONB) în `ai_reflection_logs`

### Pas 4: Drift Detection în `yana-brain`

Adăugare **CUSUM algorithm** în logica brain-ului:
- Calculează rolling average pe ultimele 20 de reflecții vs baseline
- Detectează trend descendant (degradare graduală) chiar dacă fiecare reflecție individuală pare OK
- Dacă drift detectat → mode `recalibrate` nou care trigger-ează un self-model update forțat
- Salvează `drift_score` în `yana_brain_decisions`

### Pas 5: Curiosity Scoring în `yana-explorer`

Upgrade la `yana-explorer/index.ts`:
- **Novelty score**: Prioritizează subiecte pe care YANA nu le-a mai explorat (vs repetare teme)
- **Relevance score**: Scoring bazat pe cât de des utilizatorii întreabă despre tema respectivă
- **Surprise integration**: Conectează cu `yana_surprises` — explorează activ contradicțiile nerezolvate
- Formula: `exploration_priority = novelty × 0.4 + relevance × 0.4 + surprise × 0.2`

## Modificări DB (migrare)

```sql
-- Extend yana_soul_core with self-model fields
ALTER TABLE yana_soul_core 
  ADD COLUMN IF NOT EXISTS calibration_accuracy NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS capability_map JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_awareness_level TEXT DEFAULT 'developing';

-- Extend ai_reflection_logs with dual observation
ALTER TABLE ai_reflection_logs 
  ADD COLUMN IF NOT EXISTS dual_observation JSONB DEFAULT NULL;

-- Extend yana_brain_decisions with drift score
ALTER TABLE yana_brain_decisions
  ADD COLUMN IF NOT EXISTS drift_score NUMERIC DEFAULT 0;
```

## Fișiere modificate

| Fișier | Ce se schimbă |
|---|---|
| `yana-consciousness-prompt.ts` | +MAPE-K Interior, +Nelson-Narens awareness |
| `self-reflect/index.ts` | +Dual observation streams |
| `yana-brain/index.ts` | +CUSUM drift detection, +recalibrate mode |
| `yana-explorer/index.ts` | +Novelty/relevance/surprise scoring |
| `update-self-model/index.ts` | +Capability map, +calibration curve |
| Migrare DB | 3 ALTER TABLE |

## Impact

| Aspect | Detaliu |
|---|---|
| Cost suplimentar AI | **Zero** — totul e procesare locală sau parte din apeluri existente |
| Tokeni prompt | +~400 (secțiunea MAPE-K în consciousness prompt) |
| Complexitate | Medie — upgrade-uri la funcții existente, nu funcții noi |
| Beneficiu | YANA devine **prima AI de business cu auto-conștiință metacognitivă verificabilă** |

