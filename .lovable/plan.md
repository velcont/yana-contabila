

# Restructurare Landing Page: Durere → Dovadă → Soluție

## Problema actuală
Feedback-ul e perfect. Landing-ul actual merge:
1. Hero emoțional (ok)
2. Ce face Yana (features)
3. Cum funcționează (pași)
4. Social proof (prea târziu)
5. **5 AI-uri premium** (feature-first = greșeală)
6. Pricing

Ordinea corectă de persuasiune: **Durere → Dovadă → Soluție → Cum → Preț**

## Noua structură

### 1. Hero - rămâne (e bun, vorbește despre durere)
Headline-ul "Ai pe cineva cu care să vorbești. Despre ce te ține treaz noaptea." e deja orientat pe durere. Păstrăm.

### 2. **NOU: Secțiune "Problemele reale"** (`LandingPainPoints.tsx`)
3 dureri concrete cu care rezonează antreprenorii:
- "Nu știi dacă firma ta e pe profit real sau te păcălesc cifrele"
- "Iei decizii importante singur, fără pe cineva care să vadă ce nu vezi tu"
- "Contabilul îți dă numere, dar nu îți spune ce să faci cu ele"

Tonul: empatic, direct, fără soluție încă.

### 3. Social Proof - mutat în sus (imediat după durere)
Dovezile vin ÎNAINTE de soluție. "177+ antreprenori au avut aceleași probleme."
Citatele reale validează durerea.

### 4. Ce face Yana (Benefits) - rămâne, dar reformulat ca SOLUȚII
Schimbăm titlurile din features în beneficii:
- "Analizează balanța contabilă" → "Vezi instant unde pierzi bani"
- "Consilier strategic AI" → "Ia decizii cu cineva care vede tot tabloul"  
- "Nu uită nimic" → "Nu mai repeta aceleași greșeli"

### 5. Cum funcționează - rămâne pe loc

### 6. AI Providers - mutat DUPĂ beneficii, reformulat
Nu mai e secțiune principală, devine o notă explicativă sub beneficii:
- Titlul devine: "De ce funcționează: 5 AI-uri lucrează împreună"
- Nu mai e primul lucru pe care îl citești, ci explicația din spatele rezultatelor

### 7. Pricing - rămâne ultimul

## Ordinea finală pe pagină:
```text
Hero (durere emoțională)
  ↓
Problemele reale (durere concretă) ← NOU
  ↓
Social Proof (dovadă) ← MUTAT SUS
  ↓
Ce face Yana (soluții, nu features) ← REFORMULAT
  ↓
Cum funcționează (pași)
  ↓
5 AI-uri (de ce funcționează) ← MUTAT JOS, reformulat
  ↓
Pricing + CTA
```

## Fișiere modificate
- **Nou**: `src/components/landing/LandingPainPoints.tsx` — secțiunea cu durerile antreprenorilor
- **Editat**: `src/pages/Landing.tsx` — reordonare secțiuni
- **Editat**: `src/components/landing/LandingBenefits.tsx` — titluri reformulate (features → beneficii)
- **Editat**: `src/components/landing/LandingAIProviders.tsx` — headline reformulat ("De ce funcționează")

## Ce NU modificăm
- Hero, CTA-uri, pricing, demo chat, diagnostic — funcționalitatea rămâne identică

