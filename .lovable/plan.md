

# Plan: Optimizare Landing Page + Mobile + Funnel Tracking + SEO

## Problema actuala (din analytics 1-8 Aprilie)
- **68% bounce rate** - 2 din 3 vizitatori pleaca imediat
- **74% mobile** - landing page-ul trebuie optimizat pentru telefon
- **Doar 8% ajung la /auth** - funnel-ul pierde masiv pe landing
- **0 trafic organic** - lipseste sitemap.xml, robots.txt incomplet
- Funnel tracking exista in cod dar nu e vizualizat in admin

---

## 1. Optimizare Landing Page (reduce bounce rate)

**Landing.tsx** - restructurare hero pentru impact imediat:
- Adaugare **video testimonial scurt** sau animatie care capteaza atentia in primele 3 secunde
- Hero CTA mai agresiv: buton mai mare, pulsant, cu urgenta ("Locuri limitate luna aceasta")
- Adaugare **social proof inline in hero**: "177+ antreprenori deja folosesc YANA"
- Mutare `LandingSocialProof` imediat sub hero (inainte de PainPoints) - dovada sociala reduce bounce
- Adaugare **sticky CTA bottom bar pe mobile** - buton fix in josul ecranului pe scroll

**LandingPainPoints.tsx** - mai putin text, mai mult impact:
- Reformulare mai scurta si directa

**LandingPricing.tsx** - adaugare urgenta:
- Adaugare countdown sau "X locuri ramase" pentru FOMO

## 2. Optimizare Mobile (74% din trafic)

**Landing.tsx**:
- Sticky bottom CTA bar vizibil doar pe mobile (`fixed bottom-0 md:hidden`)
- Reducere padding pe mobile (deja `px-5 py-8` - ok)
- Font-uri mai mari pe hero mobile (text-4xl minim)
- Reducere spatiu vertical intre sectiuni pe mobile

**Componente landing**:
- Touch targets minim 48px pe toate butoanele
- Imagini/iconite optimizate pentru retina

## 3. Funnel Tracking Detaliat

**Nou component: `src/components/admin/FunnelDashboard.tsx`**
- Vizualizare funnel cu drop-off pe fiecare pas:
  1. Landing page view → CTA click (% conversie)
  2. Auth page view → Form started (% conversie)
  3. Form started → Signup success (% conversie)
  4. Signup success → Yana page view (% conversie)
  5. Yana page view → First message (% conversie)
- Query-uri pe tabelul `analytics_events` cu evenimentele deja existente
- Vizualizare ca barchart/funnel cu procente de drop-off
- Filtru pe perioada (ultimele 7/30 zile)
- Segmentare pe device (mobile/desktop) si sursa (facebook/direct/youtube)

**Integrare in Admin panel** - tab nou sau sectiune in Monitoring

## 4. SEO Complet

**`public/sitemap.xml`** (fisier nou):
- Pagini: `/`, `/auth`, `/terms`, `/privacy`, `/contact`
- Priority si changefreq corecte

**`public/robots.txt`** - adaugare:
- `Sitemap: https://yana-contabila.lovable.app/sitemap.xml`

**`index.html`** - deja are meta tags bune, dar adaugam:
- `<meta name="keywords">` cu termeni relevanti
- Hreflang tag `ro`

**Landing.tsx** - JSON-LD deja exista, imbunatatiri:
- Adaugare FAQ schema (intrebari frecvente despre YANA)
- Adaugare Organization schema cu logo

---

## Fisiere modificate/create

| Fisier | Actiune |
|--------|---------|
| `src/pages/Landing.tsx` | Restructurare hero, sticky CTA, social proof sus |
| `src/components/landing/LandingSocialProof.tsx` | Inline stats in hero |
| `src/components/landing/LandingStickyMobileCTA.tsx` | **NOU** - buton fix pe mobile |
| `src/components/admin/FunnelDashboard.tsx` | **NOU** - vizualizare funnel |
| `public/sitemap.xml` | **NOU** |
| `public/robots.txt` | Adaugare sitemap |
| `index.html` | Keywords, hreflang |

