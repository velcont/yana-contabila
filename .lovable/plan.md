

# Plan: Corecții Landing Page - Modele AI și Footer Legal

## Problema 1: GPT-5 nu există (încă)

**Situația actuală:** Landing.tsx menționează "GPT-5" în lista de modele AI, dar acest model nu a fost lansat oficial de OpenAI.

**Corecție:** Înlocuiesc "GPT-5" cu "GPT-4o" (modelul real cel mai avansat de la OpenAI, disponibil public).

**Notă:** În config-ul intern (`aiCosts.ts`) există referințe la "gpt-5" care sunt din documentația Lovable AI - acelea pot rămâne ca referință internă, dar pe landing page afișăm doar modele reale, verificabile.

---

## Problema 2: Footer minimal - lipsesc link-uri legale

**Situația actuală:** Landing page nu are footer, iar MiniFooter (folosit în alte părți) are doar email și Contact.

**Corecție:** Adaug un footer minimal dar complet la sfârșitul Landing page, cu:

| Element | Destinație |
|---------|-----------|
| Termeni și condiții | `/terms` |
| Politica de confidențialitate | `/privacy` |
| Contact | `/contact` |
| Email | `office@velcont.com` |

---

## Modificări Propuse

### Fișier: `src/pages/Landing.tsx`

**Schimbări:**

1. **Linia 58** - Înlocuiesc "GPT-5" cu "GPT-4o"

2. **După linia 90** (înainte de `</div>` final) - Adaug footer legal:

```tsx
{/* Footer Legal */}
<div className="pt-8 border-t border-border/40 space-y-3">
  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
    <Link to="/terms" className="hover:text-primary transition-colors">
      Termeni și condiții
    </Link>
    <span className="text-muted-foreground/30">•</span>
    <Link to="/privacy" className="hover:text-primary transition-colors">
      Confidențialitate
    </Link>
    <span className="text-muted-foreground/30">•</span>
    <Link to="/contact" className="hover:text-primary transition-colors">
      Contact
    </Link>
  </div>
  <div className="text-xs text-muted-foreground/60 text-center">
    <a href="mailto:office@velcont.com" className="hover:text-primary transition-colors">
      office@velcont.com
    </a>
    <span className="mx-2">•</span>
    © {new Date().getFullYear()} YANA by Velcont
  </div>
</div>
```

---

## Rezultat Final

| Înainte | După |
|---------|------|
| GPT-5 | GPT-4o |
| Fără footer | Footer cu: Termeni, Confidențialitate, Contact, Email, Copyright |

---

## Vizual Estimat

```text
┌─────────────────────────────────────────┐
│  Yana nu e un chatbot.                  │
│  Este un AI pentru business.            │
│                                         │
│  [Încearcă Yana gratuit]               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 6 AI-uri premium                │   │
│  │ Gemini Pro • Gemini Flash       │   │
│  │ Claude Sonnet • Claude Haiku    │   │
│  │ GPT-4o • Grok                   │  ← Corectat
│  │ Toate incluse în 49 RON/lună    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  GDPR compliant • Date criptate • UE   │
│                                         │
│  ─────────────────────────────────────  │
│  Termeni • Confidențialitate • Contact │ ← NOU
│  office@velcont.com • © 2026 YANA      │ ← NOU
└─────────────────────────────────────────┘
```

---

## Beneficii

1. **Credibilitate**: Modelele afișate sunt reale și verificabile
2. **Conformitate legală**: Link-uri obligatorii pentru GDPR și e-commerce
3. **Profesionalism**: Footer complet transmite seriozitate
4. **SEO**: Link-uri interne îmbunătățesc crawlability

