

# Plan: Completare Informații Oficiale despre Declarația Precompletată

## Obiectiv
Actualizarea YANA cu informațiile oficiale din comunicatul Ministerului Finanțelor pentru a oferi răspunsuri complete și corecte despre declarația unică precompletată.

---

## Ce lipsește acum

Din comunicatul oficial lipsesc aceste aspecte importante:

1. **Disclaimer critic**: Declarația precompletată are ROL ORIENTATIV - nu garantează corectitudinea sumelor
2. **Responsabilitate**: Responsabilitatea finală privind sumele aparține contribuabililor
3. **Notificări**: Contribuabilii sunt notificați prin email când declarația e gata (dacă au activat opțiunea)
4. **Istoric SPV**: În SPV se găsesc și informații despre veniturile anilor anteriori impozitate la sursă
5. **Rectificativă**: Dacă se constată erori ulterior, se poate depune declarația rectificativă

---

## Modificări Propuse

### Actualizare secțiunea "Declarația precompletată" în fiscal-chat/index.ts

Înlocuiesc secțiunea actuală cu una completă:

```text
**Declarația precompletată (NOU!):**
- Se descarcă din SPV (Spațiul Privat Virtual)
- Primești notificare pe email când e gata (dacă ai activat notificările)
- Conține date de la: angajatori, bănci, brokeri, cadastru, declarații anterioare
- În SPV găsești și istoricul veniturilor anterioare (salarii, dividende, dobânzi)

**ATENȚIE - ROL ORIENTATIV:**
- Declarația precompletată NU garantează corectitudinea sumelor
- Responsabilitatea finală privind sumele aparține CONTRIBUABILULUI
- Verifică toate datele cu documentele tale reale
- Dacă găsești erori după depunere, poți depune rectificativă
- Neprimirea declarației precompletate NU elimină obligația de depunere
```

---

## Fișiere de Modificat

| Fișier | Modificare |
|--------|------------|
| `supabase/functions/fiscal-chat/index.ts` | Actualizez secțiunea declarație precompletată |
| `supabase/functions/_shared/prompts/fiscal-chat-prompt.md` | Sincronizez modificările |

---

## Impact

Cu aceste modificări, YANA va răspunde corect și complet la:

1. "Ce e declarația precompletată?" - Va include disclaimer-ul oficial
2. "Pot avea încredere în sumele din declarația precompletată?" - Va explica caracterul orientativ
3. "Cine e responsabil pentru sume?" - Contribuabilul, nu ANAF
4. "Cum aflu când e gata declarația precompletată?" - Notificare email prin SPV
5. "Ce fac dacă am greșit?" - Declarație rectificativă

---

## Detalii Tehnice

### Locație modificare: fiscal-chat/index.ts (liniile 156-167)

Înlocuiesc:
```text
**Declarația precompletată (NOU!):**
- ANAF trimite automat date precompletate:
  - De la plătitori de venituri (angajatori, bănci, brokeri)
  - Din cadastru (pentru chirii)
  - Din declarații anterioare
- Tu verifici datele și completezi doar ce lipsește sau ce vrei să corectezi
```

Cu versiunea completă care include disclaimer-ul oficial.

