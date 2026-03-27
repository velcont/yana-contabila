

# Plan: Secțiune "5 AI-uri premium incluse" pe Landing Page

## Ideea
Adăugăm o secțiune nouă pe landing care evidențiază că pentru 49 RON/lună, utilizatorul primește acces la **5 provider-i AI premium** — în loc să plătească separat sute de lei pe abonamente individuale. E un argument de vânzare concret și diferențiator.

## Implementare

### 1. Componenta nouă: `LandingAIProviders.tsx`
Secțiune vizuală cu:
- **Headline**: "5 AI-uri premium. Un singur preț."
- **5 carduri/logo-uri** cu provider-ii: GPT-5 (OpenAI), Claude (Anthropic), Grok (xAI), Perplexity, Gemini (Google)
- **Comparație vizuală**: "Abonamente separate: ~500+ RON/lună" tăiat cu linie → "Cu YANA: 49 RON/lună"
- Fiecare provider cu o scurtă descriere (1 rând): ce aduce în YANA (ex: "Grok — validare contabilă avansată", "Claude — strategie de business")

### 2. Integrare în `Landing.tsx`
- Plasăm secțiunea între **LandingBenefits** și **LandingPricing** (sau chiar direct deasupra pricing-ului, ca argument final înainte de CTA)

### 3. Update `LandingPricing.tsx`
- Adăugăm în lista de features: "5 AI-uri premium incluse (GPT-5, Claude, Grok, Gemini, Perplexity)"

## Tonul mesajului
- "Alții plătesc separat pentru fiecare AI. Tu le ai pe toate."
- Comparație clară: cost individual vs YANA all-in-one
- Nu tehnic, ci orientat pe valoare

## Fișiere modificate
- **Nou**: `src/components/landing/LandingAIProviders.tsx`
- **Editat**: `src/pages/Landing.tsx` (adăugare componentă)
- **Editat**: `src/components/landing/LandingPricing.tsx` (feature adăugat în listă)

