# 📘 Manual de Utilizare Tehnică - YANA Platform

> **Ghid de onboarding rapid pentru developeri**  
> Ultima actualizare: Ianuarie 2025

## 🏗️ Arhitectura Proiectului

```
yana-platform/
├── src/
│   ├── components/          # Componente React (UI + Business Logic)
│   │   ├── ui/             # Design System (shadcn/ui) - NU modifica direct
│   │   ├── chat-ai/        # Chat AI și analiză financiară
│   │   ├── marketplace/    # Marketplace contabil-antreprenor
│   │   └── yanacrm/        # CRM pentru cabinete de contabilitate
│   │
│   ├── hooks/              # Custom React Hooks
│   │   ├── useAuth.tsx     # Autentificare și user context
│   │   ├── useErrorHandler.tsx  # Toast-uri pentru erori (7s)
│   │   └── useUserRole.tsx # Role-based access (admin, accountant, entrepreneur)
│   │
│   ├── lib/                # Utilități și helpers
│   │   ├── supabaseHelpers.ts  # DRY wrapper pentru queries (querySupabase)
│   │   ├── finance.ts      # CRITIC: Calcule financiare cu decimal.js
│   │   └── logger.ts       # Logging structurat (Sentry integration)
│   │
│   ├── integrations/       # API clients (auto-generated)
│   │   └── supabase/
│   │       ├── client.ts   # ⚠️ NU MODIFICA - auto-generated
│   │       └── types.ts    # ⚠️ NU MODIFICA - auto-generated
│   │
│   ├── pages/              # Route components (React Router)
│   └── utils/              # Helpers specifici (PDF export, analytics)
│
├── supabase/
│   ├── functions/          # Edge Functions (Deno runtime)
│   │   ├── create-checkout/           # Inițiere checkout Stripe
│   │   ├── verify-credits-purchase/   # Verificare plată și adăugare credite
│   │   ├── stripe-webhook/            # Procesare evenimente Stripe
│   │   ├── chat-ai/                   # AI conversational (OpenAI/Gemini)
│   │   └── analyze-balance/           # Analiză financiară balante
│   │
│   ├── migrations/         # Schema database + RLS policies
│   └── config.toml         # ⚠️ NU MODIFICA - auto-managed

├── ARCHITECTURE.md         # Arhitectură detaliată (citește-l!)
└── README_TEHNIC.md        # 👈 Ești aici
```

---

## 🚨 REGULI CRITICE (DO NOT TOUCH)

### 1. **Calcule Financiare - OBLIGATORIU decimal.js**

❌ **GREȘIT:**
```typescript
const total = price * quantity; // FLOATING POINT ERRORS!
const vat = total * 0.19;
```

✅ **CORECT:**
```typescript
import Decimal from 'decimal.js';

const total = new Decimal(price).mul(quantity);
const vat = total.mul('0.19');
const totalWithVat = total.add(vat);
```

**De ce?** JavaScript folosește IEEE 754 floating point:
- `0.1 + 0.2 = 0.30000000000000004` ❌
- Cu `Decimal.js`: `new Decimal('0.1').add('0.2') = 0.3` ✅

**Când să folosești:**
- Orice calcul cu bani (facturi, credite, plăți)
- TVA, discount-uri, profituri
- RON convertit în cenți (divide by 100)

---

### 2. **Butoane de Plată - disabled={loading}**

❌ **GREȘIT:**
```typescript
<Button onClick={handlePayment}>
  Plătește {amount} RON
</Button>
```

✅ **CORECT:**
```typescript
<Button 
  onClick={handlePayment} 
  disabled={loading}
>
  {loading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Procesare...
    </>
  ) : (
    `Plătește ${amount} RON`
  )}
</Button>
```

**De ce?** Fără `disabled={loading}`:
- Utilizatorul poate face double-click
- Se trimit 2 requesturi Stripe
- Clientul este taxat de 2 ori ❌

**Regula de aur:** Orice buton care face API call = `disabled={loading}`

---

### 3. **Storage RLS - INSERT Policy cu WITH CHECK**

⚠️ **VULNERABILITATE CRITICĂ** (PATCHED manual în Supabase Dashboard):

```sql
-- ❌ GREȘIT (lipsește WITH CHECK)
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
USING (bucket_id = 'legal-documents');

-- ✅ CORECT (verifică ownership)
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'legal-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**De ce?** Fără `WITH CHECK`:
- User A poate uploada în folderul lui User B
- Risc: data corruption, privacy breach, malware injection

**Cum verifici:** 
```bash
# În Supabase Dashboard -> Storage -> Policies
# Verifică că TOATE policy-urile de INSERT au WITH CHECK
```

---

## 💳 Fluxul de Plăți (Stripe Integration)

### Diagramă Simplificată

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   Frontend  │──(1)──>│  Edge Function:  │──(2)──>│   Stripe    │
│   (React)   │       │ create-checkout  │       │   API       │
└─────────────┘       └──────────────────┘       └─────────────┘
       │                                                  │
       │                                                  │
    (4)│ Redirect                                     (3)│ Webhook
       │ to success                                      │
       │                                                  ▼
       │                                          ┌──────────────────┐
       └──────────────────────────────────────────│  Edge Function:  │
                                                  │  stripe-webhook  │
                                                  └──────────────────┘
                                                          │
                                                       (5)│ Update DB
                                                          ▼
                                                  ┌──────────────────┐
                                                  │   Supabase DB    │
                                                  │ credits_purchases│
                                                  │ ai_budget_limits │
                                                  └──────────────────┘
```

### Pașii Detaliați

#### **(1) Frontend inițiază plata**
```typescript
// src/components/AICreditsPurchase.tsx
const { data, error } = await supabase.functions.invoke('create-checkout', {
  body: { priceId: 'price_abc123' }
});

if (data?.url) {
  window.open(data.url, '_blank'); // Redirect la Stripe Checkout
}
```

#### **(2) Edge Function creează sesiune Stripe**
```typescript
// supabase/functions/create-checkout/index.ts
const session = await stripe.checkout.sessions.create({
  customer_email: user.email,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'payment',
  success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
});
```

#### **(3) Stripe trimite webhook**
După plata reușită, Stripe trimite `checkout.session.completed` la:
```
https://[project-id].supabase.co/functions/v1/stripe-webhook
```

#### **(4) Webhook procesează plata**
```typescript
// supabase/functions/stripe-webhook/index.ts
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  
  // ✅ Verifică payment_status
  if (session.payment_status !== 'paid') return;
  
  // ✅ Adaugă credite în DB
  await supabaseAdmin.from('credits_purchases').insert({
    user_id: user.id,
    credits_added: 1000,
    stripe_checkout_session_id: session.id
  });
  
  // ✅ Update buget utilizator
  await supabaseAdmin.from('ai_budget_limits')
    .update({ monthly_budget_cents: oldBudget + 1000 })
    .eq('user_id', user.id);
}
```

#### **(5) Success page verifică plata**
```typescript
// src/pages/SubscriptionSuccess.tsx
const sessionId = searchParams.get('session_id');

const { data } = await supabase.functions.invoke('verify-credits-purchase', {
  body: { sessionId }
});

if (data.success) {
  toast.success(`${data.credits_added} credite adăugate!`);
}
```

### 🐛 Debugging Plăți

**Plata nu apare în DB?**
1. Verifică webhook-ul în Stripe Dashboard → Developers → Webhooks
2. Caută erori în Supabase Dashboard → Edge Functions → Logs (`stripe-webhook`)
3. Verifică că `STRIPE_WEBHOOK_SECRET` este setat corect

**Double payments?**
- Verifică `disabled={loading}` pe butonul de plată
- Verifică că webhook-ul nu procesează de 2 ori (folosește `stripe_checkout_session_id` ca unique constraint)

---

## 🔑 Dependențe Externe și API Keys

### 1. **Supabase (Lovable Cloud)**
- **Unde:** Lovable Dashboard → Integrations → Lovable Cloud
- **Ce face:** Database, Auth, Storage, Edge Functions
- **Secrets:**
  - `SUPABASE_URL` (auto-set în `.env`)
  - `SUPABASE_ANON_KEY` (auto-set în `.env`)
  - `SUPABASE_SERVICE_ROLE_KEY` (setată manual în Secrets)

### 2. **Stripe**
- **Unde:** [Stripe Dashboard](https://dashboard.stripe.com/)
- **Ce face:** Procesare plăți, checkout, subscripții
- **Secrets:**
  - `STRIPE_SECRET_KEY` (Test: `sk_test_...`, Live: `sk_live_...`)
  - `STRIPE_WEBHOOK_SECRET` (webhook signing secret)
- **Webhook URL:** 
  ```
  https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/stripe-webhook
  ```
- **Events așteptate:** `checkout.session.completed`, `invoice.paid`

### 3. **OpenAI**
- **Unde:** [OpenAI Platform](https://platform.openai.com/)
- **Ce face:** AI chat, analiză financiară, generare conținut
- **Secrets:**
  - `OPENAI_API_KEY` (organizație: YANA)
- **Modele folosite:** `gpt-4o`, `gpt-4o-mini`

### 4. **Resend**
- **Unde:** [Resend Dashboard](https://resend.com/)
- **Ce face:** Email transactional (facturi, notificări)
- **Secrets:**
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` (ex: `noreply@yana.ro`)

### 5. **Sentry** (Optional)
- **Unde:** [Sentry.io](https://sentry.io/)
- **Ce face:** Error tracking, performance monitoring
- **Setup:** Vezi `src/utils/sentry.ts`

---

## 📦 Package.json - Dependențe Critice

```json
{
  "dependencies": {
    "decimal.js": "^10.6.0",          // ⚠️ Calcule financiare
    "@supabase/supabase-js": "^2.58.0", // Database client
    "@stripe/stripe-js": "^4.0.0",    // Stripe checkout frontend
    "react-query": "^5.0.0",          // Data fetching + caching
    "zod": "^3.25.76",                // Schema validation
    "framer-motion": "^12.23.24"      // Animații UI
  }
}
```

---

## 🛠️ Comenzi Utile

```bash
# Development
npm run dev                    # Start dev server (localhost:5173)

# Database
# ⚠️ NU există CLI local pentru Supabase în Lovable Cloud
# Toate migrările se fac prin Lovable UI (nu prin supabase CLI)

# Edge Functions
# ⚠️ NU există deploy manual - se auto-deploy la fiecare push

# Build & Deploy
npm run build                  # Build production (dist/)
# Deploy: Lovable se ocupă automat
```

---

## 🧪 Testing (TODO)

**❌ Lipsește:** Test suite complet pentru:
- Fluxul de plăți (mock Stripe)
- Calcule financiare (decimal.js edge cases)
- RLS policies (testing în local)

**Framework recomandat:** Vitest + React Testing Library

---

## 🚀 Checklist Pre-Launch

- [x] RLS activat pe toate tabelele sensibile
- [x] Storage policies cu `WITH CHECK`
- [x] Toate calculele financiare folosesc `decimal.js`
- [x] Butoanele de plată au `disabled={loading}`
- [x] Webhook Stripe configurat și testat
- [x] Error handling cu toast-uri de 7s
- [x] Empty states și skeleton loaders implementate
- [ ] Performance audit (Lighthouse score > 90)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Backup strategy pentru database
- [ ] Monitoring și alerting (Sentry)

---

## 📚 Resurse Utile

- **Arhitectură:** `ARCHITECTURE.md` (citește-l complet!)
- **Audit Securitate:** `RAPORT_AUDIT_FINAL_CU_DOVEZI.md`
- **Design System:** `src/index.css` (semantic tokens)
- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://docs.stripe.com/
- **Lovable Docs:** https://docs.lovable.dev/

---

## 👤 Contact

Pentru întrebări tehnice sau onboarding:
- **Email:** dev@yana.ro
- **Slack:** #yana-dev

**Happy coding! 🚀**
