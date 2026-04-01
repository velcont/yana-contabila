

# Anunț Suită Office — Landing + In-App Banner

## Ce facem

### 1. Secțiune nouă pe Landing: "NOU: Suita Office"
Adăugăm o secțiune vizibilă între LandingBenefits și LandingHowItWorks cu un banner de tip "NEW" care anunță capabilitatea de generare documente Office (Word, Excel, PDF, PowerPoint).

**Fișier**: `src/components/landing/LandingOfficeAnnouncement.tsx`
- Badge "NOU" cu animație subtilă (pulse)
- Titlu: "Yana generează documente Office pentru tine"
- 4 iconițe: Word, Excel, PDF, PowerPoint cu descrieri scurte
- Mesaj: "Spune-i ce document vrei → primești fișierul gata pe email"
- CTA: "Încearcă gratuit"

### 2. Integrare în Landing.tsx
Import + plasare între `LandingBenefits` și `LandingHowItWorks`.

### 3. Banner în app pentru utilizatorii logați
**Fișier**: `src/components/yana/OfficeFeatureAnnouncement.tsx`
- Banner dismissable (cu localStorage persist) care apare o singură dată în chat-ul Yana
- Text scurt: "NOU: Yana generează acum Word, Excel, PDF și PowerPoint. Spune-i ce document vrei!"
- Buton dismiss + buton "Încearcă"

### 4. Integrare în YanaChat.tsx
Afișare banner deasupra chat-ului, vizibil o singură dată per utilizator.

## De ce NU trimitem email în masă
Emailurile bulk pot afecta reputația domeniului și livrabilitatea emailurilor critice. În schimb, Yana va menționa proactiv funcționalitatea în conversațiile viitoare cu fiecare utilizator.

## Fișiere afectate
- `src/components/landing/LandingOfficeAnnouncement.tsx` — NOU
- `src/pages/Landing.tsx` — import + plasare secțiune
- `src/components/yana/OfficeFeatureAnnouncement.tsx` — NOU
- `src/components/yana/YanaChat.tsx` — integrare banner

