

# Plan: Optimizare Funnel de Achiziție YANA

## Situația actuală
- Landing page minimalist cu un singur CTA ("Vorbește cu Yana") + Diagnostic gratuit + Demo chat (5 mesaje)
- Bounce rate 91% de pe social media
- 127 utilizatori, 66 clienți contabilitate (gratuit), 1 plătitor extern, 31 cu trial expirat
- Pricing page există dar e accesibilă doar din navigație internă

## Problemele identificate

1. **Landing page nu comunică valoarea concretă** - headline emoțional dar nu explică CE face YANA
2. **Lipsesc testimoniale reale** și cazuri de utilizare concrete
3. **Demo-ul de 5 mesaje** e prea scurt pentru a crea "addiction"
4. **Nu există secțiune de beneficii vizuale** (screenshots, video)
5. **Funnel-ul e întrerupt** - de la landing direct la signup fără a construi trust
6. **Pricing nu e vizibil pe landing** - utilizatorul nu știe cât costă înainte de signup

## Planul de implementare

### 1. Redesign Landing Page (componenta principală)
Transformăm landing-ul minimalist într-un funnel complet, în continuare mobile-first:

**Secțiunea Hero** (păstrată dar îmbunătățită):
- Headline: păstrat (e bun emoțional)
- Sub-headline: adăugăm "Partener AI de business: analizează balanța, dă sfaturi strategice, nu uită nimic"
- CTA principal rămâne "Vorbește cu Yana"

**Secțiunea nouă: "Ce face Yana concret"** (3 carduri vizuale):
- Card 1: "Îți analizează balanța contabilă" - upload Excel, raport instant
- Card 2: "Consilier strategic AI" - War Room, Battle Plan, predicții
- Card 3: "Nu uită nimic" - memorie conversațională, follow-up proactiv

**Secțiunea nouă: "Cum funcționează"** (3 pași simpli):
- Pas 1: Creează cont gratuit (30 sec)
- Pas 2: Încarcă balanța sau vorbește direct
- Pas 3: Primești analiză + sfaturi personalizate

**Secțiunea nouă: Pricing vizibil** (inline pe landing):
- Card cu "49 RON/lună" + lista de beneficii
- "30 zile gratuit, fără card"
- CTA: "Începe gratuit"

**Secțiunea îmbunătățită: Social proof**:
- Contor real din baza de date (utilizatori, conversații, analize)
- 2-3 citate scurte (pot fi anonimizate din conversațiile existente)

### 2. Mărire limită Demo Chat (10 mesaje)
- Schimbăm `MAX_QUESTIONS` de la 5 la 10 pentru a permite o experiență mai completă
- Adăugăm un mesaj de tranziție la mesajul 7: "Îți place cum gândesc? Cu cont gratuit, putem continua oricât"

### 3. Signup Overlay îmbunătățit
- După ce demo-ul se termină, overlay cu rezumatul conversației
- "Am vorbit despre X și Y. Cu un cont gratuit, pot ține minte tot și să revin cu idei noi"
- CTA: "Continuă cu Yana (gratuit, 30 zile)"

### 4. Tracking UTM + conversie
- Adăugăm parametrii UTM pe landing pentru campaniile viitoare
- Event tracking: "viewed_pricing_on_landing", "scrolled_to_benefits", "demo_to_signup_conversion"

## Fișiere modificate
- `src/pages/Landing.tsx` - redesign complet cu secțiuni noi
- `src/components/demo/DemoChat.tsx` - mărire limită + mesaj de tranziție
- Componente noi mici (opțional): `LandingBenefits`, `LandingHowItWorks`, `LandingPricing`

## Ce NU modificăm
- Funcționalitatea existentă (auth, subscription, Yana chat)
- Pricing-ul (49 RON)
- Logica de acces gratuit pentru clienții de contabilitate
- Demo chat core logic (doar limita)

## Estimare
- Landing redesign: componenta principală
- Demo improvements: schimbare minoră
- Total: ~2-3 iterații de implementare

