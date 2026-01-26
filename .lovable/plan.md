

# Plan: Detectare Emoțională Locală în `capture-soul-state`

## Problema Identificată

Fluxul actual:
```text
consciousness-engine → ai-router → capture-soul-state
     emotionalMode →   emotionalTone →   salvare în DB
```

**Problema**: Dacă `consciousness-engine` nu returnează `emotionalMode` sau dacă AI-router nu îl propagă corect, câmpul `emotional_memory` rămâne gol (`{}`).

## Soluția: Detectare Locală cu Fallback

În loc să depindem de fluxul extern, `capture-soul-state` va:
1. **Folosi** `emotionalTone` dacă este primit (prioritate)
2. **Detecta local** starea emoțională din textul mesajului (fallback)

## Pattern-uri de Detectare

| Stare | Pattern-uri româneșți |
|-------|----------------------|
| **stressed** | urgent, stres, panica, nu știu ce să fac, ajutor, criză |
| **frustrated** | nu funcționează, nu înțeleg, de ce, iar, problema |
| **happy** | mulțumesc, super, perfect, excelent, grozav, bravo |
| **confused** | nu înțeleg, cum adică, poți să explici, ce înseamnă |
| **curious** | mă întreb, cum pot, vreau să știu, este posibil |
| **worried** | îngrijorat, teamă, risc, pericol, ce se întâmplă |
| **neutral** | fallback default |

## Modificări Tehnice

### Fișier: `supabase/functions/capture-soul-state/index.ts`

**Adăugare funcție de detectare locală:**
```typescript
function detectLocalEmotionalTone(message: string): string {
  const lowerMessage = message?.toLowerCase() || '';
  
  // Pattern-uri în ordine de prioritate
  const patterns = {
    stressed: /urgent|stres|panic[aă]|criz[aă]|ajutor|nu [șs]tiu ce s[aă] fac|disperat/i,
    frustrated: /nu func[țt]ioneaz[aă]|nu [îi]n[țt]eleg|de ce|iar[aă]?[șs]i|problem[aă]|enervant/i,
    happy: /mul[țt]umesc|super|perfect|excelent|grozav|bravo|minunat|genial|m-ai ajutat/i,
    confused: /nu [îi]n[țt]eleg|cum adic[aă]|po[țt]i s[aă] explici|ce [îi]nseamn[aă]|confuz/i,
    curious: /m[aă] [îi]ntreb|cum pot|vreau s[aă] [șs]tiu|este posibil|curios/i,
    worried: /[îi]ngrijorat|team[aă]|risc|pericol|ce se [îi]nt[aâ]mpl[aă]/i,
  };
  
  for (const [tone, pattern] of Object.entries(patterns)) {
    if (pattern.test(lowerMessage)) {
      return tone;
    }
  }
  
  return 'neutral';
}
```

**Modificare logica principală:**
```typescript
// ÎNAINTE:
if (emotionalTone) {
  emotionalMemory.last_tone = emotionalTone;
  emotionalMemory.last_updated = new Date().toISOString();
}

// DUPĂ:
const detectedTone = emotionalTone || detectLocalEmotionalTone(lastMessage);
emotionalMemory.last_tone = detectedTone;
emotionalMemory.last_updated = new Date().toISOString();
emotionalMemory.detection_source = emotionalTone ? 'consciousness-engine' : 'local-pattern';
```

## Beneficii

| Aspect | Înainte | După |
|--------|---------|------|
| `emotional_memory` populat | ~30% din cazuri | 100% din cazuri |
| Sursă detectare | Doar consciousness-engine | Dual (engine + local) |
| Tracking sursă | Nu | Da (`detection_source`) |
| Fallback | Nu există | `neutral` garantat |

## Pași Implementare

1. Adaug funcția `detectLocalEmotionalTone()` cu pattern-uri românești
2. Modific logica de salvare să folosească detectare locală ca fallback
3. Adaug `detection_source` pentru debugging
4. Deploy și test

## Timp Estimat

~15 minute

