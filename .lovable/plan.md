

# Fix: Răspunsuri trunchiate și Deep Healing agresiv în conversațiile financiare

## Problema

Clienta Lost in Travel a primit un răspuns despre TVA pe marjă care s-a tăiat la jumătate (limită de 1024 tokeni). Când a cerut continuarea, YANA a interpretat frustrarea ei ca „criză emoțională" și a activat protocolul Deep Healing, întrebând-o „cum te simți" în loc să continue calculul financiar.

## Modificări

### 1. `supabase/functions/chat-ai/index.ts` (linia 2098)

Creștere `max_tokens` de la `1024` la `4096` pentru a permite răspunsuri financiare complete.

### 2. `supabase/functions/_shared/prompts/chat-ai-prompt.md` (secțiunile 32 și 36)

**Secțiunea 32** - Adăugare excepție critică la Deep Healing:

```
EXCEPȚIE CRITICĂ - DEEP HEALING NU SE ACTIVEAZĂ CÂND:
- Utilizatorul așteaptă continuarea unui răspuns tehnic/financiar trunchiat
- Utilizatorul cere explicit cifre, calcule sau răspunsuri concrete
- Conversația este în mijlocul unei analize financiare active
- Frustrarea utilizatorului vine din faptul că NU a primit un răspuns tehnic complet

În aceste cazuri: CONTINUĂ răspunsul tehnic FĂRĂ intervenție emoțională.
```

**Secțiunea 36** - Adăugare reguli de prioritate în checklist:

```
PRIORITATE: Dacă există analiză financiară în curs -> CONTINUĂ analiza
PRIORITATE: Dacă utilizatorul cere date/cifre -> RĂSPUNDE cu date
Deep Healing doar pentru crize emoționale reale, NU pentru frustrare tehnică
```

### 3. `supabase/functions/_shared/prompts/yana-identity-contract.md` (după secțiunea 2)

Adăugare secțiune nouă **2b. REGULĂ ANTI-HIJACK**:

```
INTERZIS: Nu interpreta frustrarea tehnică drept criză emoțională.
- "dă-mi răspunsul" / "continuă" / "s-a blocat" → CONTINUĂ informația tehnică
- Deep Healing se activează DOAR când utilizatorul vorbește explicit despre starea lui emoțională personală
```

## Ce NU se schimbă

- Logica Deep Healing rămâne activă pentru crize emoționale reale ("cred că dau faliment și nu mai pot")
- Restul prompt-ului (reguli de identitate, analiză balanță, etc.) rămâne neschimbat
- Niciun fișier frontend nu se modifică

## Rezultat

1. Răspunsurile financiare nu se mai taie (4096 tokeni = ~3000 cuvinte)
2. "Continuă" / "dă-mi cifrele" → YANA continuă calculul, nu întreabă "cum te simți"
3. Deep Healing rămâne activ doar pentru distress emoțional real

