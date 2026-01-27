

# Plan: Actualizare YANA cu Noutățile D212 2026 și Link-ul ANAF

## Obiectiv
Completarea informațiilor despre Declarația Unică cu noutățile 2026 menționate în video-ul tău, astfel încât YANA să poată răspunde corect inclusiv cu link-ul oficial ANAF.

---

## Modificări Propuse

### 1. Actualizare secțiune D212 în fiscal-chat/index.ts

**Locație:** Secțiunea "DECLARAȚIA UNICĂ D212" (liniile 142-220)

Se adaugă:

```text
### NOUTĂȚI MAJORE 2026 - SIMPLIFICĂRI ANAF

**Completare în browser (NOU 2026):**
- Nu mai e necesar PDF + semnătură electronică
- Formular interactiv direct în browser
- Se salvează automat progresul
- Link direct: https://www.anaf.ro/declaratii/duf

**Declarația precompletată (NOU 2026):**
- ANAF trimite automat date precompletate din:
  - Plătitori de venituri (angajatori, bănci, brokeri)
  - Cadastru (chirii)
  - Declarații anterioare
- Verifici datele și completezi doar ce lipsește

**Obligații eliminate:**
- Nu mai e obligatorie depunerea anuală dacă nu ai modificări
- Rectificativa simplificată - se editează direct
```

### 2. Adăugare keyword "duf" în ai-router

**Fișier:** `supabase/functions/ai-router/index.ts`

Adaug `lowerMessage.includes('duf')` în blocul de detecție fiscală pentru a capta și varianta "DUF" (Declarația Unică Formular).

### 3. Sincronizare în fiscal-chat-prompt.md

Actualizez secțiunea D212 cu aceleași noutăți pentru consistență.

---

## Fișiere de Modificat

| Fișier | Modificare |
|--------|------------|
| `supabase/functions/ai-router/index.ts` | Adaug keyword "duf" |
| `supabase/functions/fiscal-chat/index.ts` | Adaug noutățile 2026 + link ANAF |
| `supabase/functions/_shared/prompts/fiscal-chat-prompt.md` | Sincronizez informațiile |

---

## Detalii Tehnice

### Modificare 1: ai-router/index.ts

În blocul de detecție fiscală (~linia 291), adaug:

```typescript
lowerMessage.includes('duf') ||
```

### Modificare 2: fiscal-chat/index.ts

După "DEADLINE CRITIC" (linia 145), adaug o nouă secțiune:

```text
### NOUTĂȚI MAJORE 2026 - SIMPLIFICĂRI ANAF

**Completare în browser (NOU!):**
- Formular interactiv direct în browser - nu mai e necesar PDF cu semnătură electronică
- Salvare automată a progresului
- Link direct formular online: https://www.anaf.ro/declaratii/duf

**Declarația precompletată (NOU!):**
- ANAF trimite automat date precompletate:
  - De la plătitori de venituri (angajatori, bănci, brokeri)
  - Din cadastru (pentru chirii)
  - Din declarații anterioare
- Tu verifici datele și completezi doar ce lipsește sau ce vrei să corectezi

**Ce s-a simplificat:**
- Nu mai e nevoie de semnătură electronică separată
- Nu mai descarci/încarci PDF-uri
- Rectificativa se face direct în browser editând declarația existentă
- Nu mai e obligatorie depunerea anuală dacă nu ai modificări la estimări
```

---

## Întrebări Acoperite După Actualizare

Cu aceste modificări, YANA va putea răspunde corect la:

1. "Unde completez Declarația Unică?" → Link: https://www.anaf.ro/declaratii/duf
2. "Ce s-a schimbat la declarația unică în 2026?" → Completare în browser, declarație precompletată
3. "Mai am nevoie de semnătură electronică?" → Nu, se face direct în browser
4. "Ce e DUF?" → Declarația Unică Formular, formularul online
5. "ANAF îmi trimite declarația precompletată?" → Da, cu date de la angajatori, bănci, etc.
6. "Mai trebuie să depun anual?" → Doar dacă ai modificări la estimări

---

## Rezultat Final

Utilizatorii care vin din comentariile video-ului tău vor primi:
- **Link-ul corect** pentru formularul online ANAF
- **Informații actualizate** despre simplificările 2026
- **Răspunsuri complete** despre noul sistem de completare în browser

