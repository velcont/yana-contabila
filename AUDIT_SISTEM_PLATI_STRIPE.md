# 🔴 AUDIT CRITIC - Sistem Plăți Stripe

**Data Audit:** 28 Octombrie 2025  
**Auditor:** AI Security Analysis  
**Nivel Risc General:** 🔴 **RIDICAT**

---

## 📋 REZUMAT EXECUTIV

Am identificat **8 vulnerabilități critice** în sistemul de procesare plăți care pot duce la:
- ❌ Dublări de credite pentru aceeași plată
- ❌ Pierdere tracking plăți
- ❌ Credite incorecte acordate
- ❌ Lipsă notificări la erori critice
- ❌ Inconsistențe între Stripe și Supabase

---

## 🔴 PROBLEME CRITICE

### 1. **DUBLARE CREDITE - checkout.session.completed**
**Fișier:** `supabase/functions/stripe-webhook/index.ts` (liniile 114-282)  
**Severitate:** 🔴 **CRITICĂ**

**Problema:**
```typescript
// ❌ NU există verificare dacă session-ul a fost deja procesat
if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;
  // Direct insert fără verificare duplicat!
  await supabaseClient.from('credits_purchases').insert({...})
}
```

**Risc:**
- Dacă Stripe retrigerează webhook-ul (normal behavior în cazuri de timeout/erori), utilizatorul primește **credite DUBLE** pentru aceeași plată
- Cineva care plătește 10 RON poate primi 20 RON în credite
- **PIERDERE FINANCIARĂ DIRECTĂ**

**Dovezi:**
- Stripe recomandă oficial să verifici idempotency pentru toate webhook-urile
- Checkout session ID este unic și trebuie verificat înainte de procesare

**Soluție:**
```typescript
// ✅ Verifică dacă session-ul a mai fost procesat
const { data: existingPurchase } = await supabaseClient
  .from('credits_purchases')
  .select('id')
  .eq('stripe_checkout_session_id', session.id)
  .single();

if (existingPurchase) {
  console.log(`⚠️ Session ${session.id} already processed`);
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

---

### 2. **DUBLARE PLĂȚI ABONAMENT - invoice.paid**
**Fișier:** `supabase/functions/stripe-webhook/index.ts` (liniile 36-112)  
**Severitate:** 🔴 **CRITICĂ**

**Problema:**
```typescript
// ❌ NU există verificare dacă invoice-ul a fost deja procesat
if (event.type === "invoice.paid") {
  await supabaseClient.from('subscription_payments').insert({...})
}
```

**Risc:**
- Dacă webhook-ul se retrigerează, se creează **înregistrări multiple** pentru aceeași plată
- Contabilitatea devine incorectă
- Rapoarte financiare false

**Soluție:**
```typescript
// ✅ Verifică dacă invoice-ul a mai fost procesat
const { data: existingPayment } = await supabaseClient
  .from('subscription_payments')
  .select('id')
  .eq('stripe_invoice_id', invoice.id)
  .single();

if (existingPayment) {
  console.log(`⚠️ Invoice ${invoice.id} already processed`);
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

---

### 3. **INCONSISTENȚĂ ATOMICĂ - Credite vs Tracking**
**Fișier:** `supabase/functions/stripe-webhook/index.ts` (liniile 179-222)  
**Severitate:** 🔴 **CRITICĂ**

**Problema:**
```typescript
// ❌ Două operații separate - dacă una eșuează, inconsistență!
// Step 1: Update budget
await supabaseClient.from("ai_budget_limits").update({...})

// Step 2: Insert purchase record (POATE EȘUA!)
await supabaseClient.from('credits_purchases').insert({...})
```

**Risc:**
- Utilizatorul primește credite în `ai_budget_limits` DAR nu există înregistrare în `credits_purchases`
- **PIERDERE TRACKING FINANCIAR**
- Nu știm cine a plătit ce și când

**Soluție:**
```typescript
// ✅ Verifică success-ul ambelor operații
const { error: budgetError } = await supabaseClient
  .from("ai_budget_limits").update({...});

if (budgetError) {
  console.error("❌ Failed to update budget:", budgetError);
  throw new Error("Budget update failed");
}

const { error: purchaseError } = await supabaseClient
  .from('credits_purchases').insert({...});

if (purchaseError) {
  console.error("❌ Failed to record purchase:", purchaseError);
  // ROLLBACK: Revert budget update
  await supabaseClient.from("ai_budget_limits").update({
    monthly_budget_cents: existingBudget.monthly_budget_cents
  }).eq("id", existingBudget.id);
  throw new Error("Purchase recording failed");
}
```

---

### 4. **CREDITE INCORECTE - Fallback Logic Nesigură**
**Fișier:** `supabase/functions/stripe-webhook/index.ts` (liniile 156-176)  
**Severitate:** 🟡 **MEDIE-ÎNALTĂ**

**Problema:**
```typescript
// ⚠️ Dacă priceId nu e găsit, fallback-ul pe amount poate fi inexact
if (priceId && creditPackages[priceId]) {
  creditsToAdd = creditPackages[priceId].credits;
} else {
  // ❌ RISC: Cineva poate plăti 15 RON și să primească 2500 credite
  if (amountPaid >= 2000) {
    creditsToAdd = 2500;
  }
}
```

**Risc:**
- Dacă Stripe schimbă structura priceId sau adminul creează un price nou fără să updateze codul
- Fallback-ul pe `amount` poate acorda credite greșite
- **PIERDERE FINANCIARĂ sau CREDITE INSUFICIENTE**

**Soluție:**
```typescript
// ✅ Logare clară + blocare în caz de neconcordanță
if (!priceId || !creditPackages[priceId]) {
  console.error(`🔴 UNKNOWN PRICE ID: ${priceId} for amount ${amountPaid}`);
  
  // Notify admin
  await supabaseClient.from('admin_alerts').insert({
    alert_type: 'UNKNOWN_PRICE_ID',
    severity: 'critical',
    details: { priceId, amountPaid, sessionId: session.id }
  });
  
  // NU PROCESA AUTOMAT - așteaptă review manual
  throw new Error(`Unknown price ID: ${priceId}. Manual review required.`);
}
```

---

### 5. **EMAIL CONFIRMATION EȘUAT SILENT**
**Fișier:** `supabase/functions/stripe-webhook/index.ts` (liniile 241-279)  
**Severitate:** 🟡 **MEDIE**

**Problema:**
```typescript
// ⚠️ Dacă email-ul eșuează, doar logăm - utilizatorul nu știe că are credite
try {
  await fetch("https://api.resend.com/emails", {...});
} catch (emailError) {
  console.error("Failed to send email:", emailError);
  // ❌ SILENT FAIL - nu notifică pe nimeni!
}
```

**Risc:**
- Utilizatorul plătește dar nu primește confirmare
- Nu știe că are credite disponibile
- **EXPERIENȚĂ PROASTĂ + POSIBILE RECLAMAȚII**

**Soluție:**
```typescript
// ✅ Creează notificare in-app dacă email-ul eșuează
try {
  await fetch("https://api.resend.com/emails", {...});
} catch (emailError) {
  console.error("Failed to send email:", emailError);
  
  // Creează notificare in-app
  await supabaseClient.from('user_notifications').insert({
    user_id: user.id,
    type: 'credits_added',
    title: '✅ Credite AI Adăugate',
    message: `Ai primit ${creditsToAdd / 100} lei în credite AI!`,
    priority: 'high'
  });
}
```

---

### 6. **LIPSĂ VERIFICARE SUBSCRIPTION STATUS ÎNAINTE UPDATE**
**Fișier:** `supabase/functions/check-subscription/index.ts` (liniile 260-269)  
**Severitate:** 🟡 **MEDIE**

**Problema:**
```typescript
// ⚠️ Update direct fără să verifice dacă există deja un abonament manual activ
await supabaseClient.from('profiles').update({
  subscription_status: 'active',
  subscription_type: subscriptionType,
  stripe_customer_id: customerId,
  stripe_subscription_id: stripeSubscriptionId,
  subscription_ends_at: subscriptionEnd,
}).eq('id', user.id);
```

**Risc:**
- Dacă adminul a dat manual un abonament "accounting_firm" până pe 2026
- Dar utilizatorul plătește pentru "entrepreneur" în Stripe
- **SE SUPRASCRIE ABONAMENTUL MAI BUN CU CEL MAI PROST**

**Soluție:**
```typescript
// ✅ Verifică dacă există un manual subscription mai bun
const { data: profile } = await supabaseClient
  .from('profiles')
  .select('subscription_status, subscription_ends_at, subscription_type')
  .eq('id', user.id)
  .single();

// Nu suprascrie dacă există un manual subscription activ mai bun
if (profile?.subscription_status === 'active' && 
    profile?.subscription_ends_at && 
    new Date(profile.subscription_ends_at) > subscriptionEnd) {
  console.log('⚠️ Manual subscription is better, not overwriting');
  return; // Keep manual subscription
}
```

---

### 7. **LIPSĂ UNIQUE CONSTRAINT PE stripe_checkout_session_id**
**Fișier:** Schema `credits_purchases` table  
**Severitate:** 🔴 **CRITICĂ**

**Problema:**
- Tabelul `credits_purchases` NU are constraint `UNIQUE` pe `stripe_checkout_session_id`
- Chiar dacă adaugi verificare în cod, cineva poate bypassa prin SQL direct

**Risc:**
- **DUPLICĂRI LA NIVEL DE BAZĂ DE DATE**
- Protecție zero dacă cineva face insert direct în DB

**Soluție:**
```sql
-- ✅ Adaugă unique constraint
ALTER TABLE credits_purchases 
ADD CONSTRAINT unique_stripe_checkout_session_id 
UNIQUE (stripe_checkout_session_id);
```

---

### 8. **LIPSĂ UNIQUE CONSTRAINT PE stripe_invoice_id**
**Fișier:** Schema `subscription_payments` table  
**Severitate:** 🔴 **CRITICĂ**

**Problema:**
- Tabelul `subscription_payments` NU are constraint `UNIQUE` pe `stripe_invoice_id`

**Risc:**
- **DUPLICĂRI LA NIVEL DE BAZĂ DE DATE**
- Contabilitate incorectă

**Soluție:**
```sql
-- ✅ Adaugă unique constraint
ALTER TABLE subscription_payments 
ADD CONSTRAINT unique_stripe_invoice_id 
UNIQUE (stripe_invoice_id);
```

---

## 📊 PRIORITIZARE FIX-URI

### 🔴 URGENT (Implementare ACUM)
1. ✅ Verificare duplicat `stripe_checkout_session_id` în webhook
2. ✅ Verificare duplicat `stripe_invoice_id` în webhook
3. ✅ Unique constraints la nivel DB
4. ✅ Atomicitate update budget + insert purchase

### 🟡 IMPORTANT (În 24-48h)
5. ⚠️ Fallback logic mai robustă pentru priceId necunoscut
6. ⚠️ Notificare in-app când email eșuează
7. ⚠️ Protecție suprascrie manual subscriptions

### 🟢 NICE TO HAVE (Următoarele zile)
8. 📝 Monitoring + alerting pentru webhook failures
9. 📝 Audit log pentru toate operațiile financiare
10. 📝 Dashboard admin pentru reconciliation Stripe vs Supabase

---

## 🎯 RECOMANDĂRI FINALE

1. **Testing Manual:**
   - Testează un purchase real în Stripe test mode
   - Trigger manual webhook de 2-3 ori pentru același session
   - Verifică dacă se creează duplicate

2. **Monitoring:**
   - Implementează alerting pentru toate erorile din webhook
   - Track `credits_purchases.count()` vs Stripe payments count zilnic
   - Alert dacă există discrepanțe

3. **Documentation:**
   - Documentează flow-ul exact de la payment → webhook → DB
   - Creează runbook pentru "Utilizator nu a primit credite"
   - Training pentru suport: cum verifici manual plățile

4. **Backup Plan:**
   - Implementează un "sync-payments" edge function care compară Stripe vs DB și reconciliază diferențele
   - Run săptămânal ca safety net

---

## 📞 CONTACT URGENT

Dacă observi discrepanțe în plăți:
1. Nu șterge nimic din DB
2. Exportă logs din Stripe webhook attempts
3. Exportă `credits_purchases` + `subscription_payments` din Supabase
4. Compare manual payment_intent_id / invoice_id / session_id

**Status:** 🔴 NECESITĂ ACȚIUNE IMEDIATĂ
