

# Plan: Reparare sincronizare Stripe Webhook pentru plăți recurente

## Problema identificată

Pentru `timoficiuc.g@gmail.com`:
- **Plata inițială** (29 Dec 2025): `in_1SjiWHBu3m83VcDANbR7vR2r` - 49 RON - ✅ Sincronizată manual
- **Plata reînnoire** (29 Jan 2026): `in_1SuxJaBu3m83VcDApyjyPIqB` - 49 RON - ❌ **Lipsește din baza de date**

Webhook-ul `stripe-webhook` nu procesează corect evenimentele `invoice.paid` pentru reînnoiri.

---

## Soluție imediată (rezolvă problema curentă)

### 1. Rulează funcția `sync-stripe-payments` din Admin

Această funcție va sincroniza manual toate facturile plătite din Stripe cu baza de date, inclusiv factura `in_1SuxJaBu3m83VcDApyjyPIqB`.

După sincronizare, poți genera factura SmartBill pentru client.

---

## Soluție pe termen lung (previne problema în viitor)

### 2. Îmbunătățire Webhook cu logging extins

**Fișier: `supabase/functions/stripe-webhook/index.ts`**

Adaug logging detaliat pentru a vedea DE CE facturile nu se sincronizează:

```typescript
// După primirea invoice.paid
console.log(`📧 Processing invoice.paid: ${invoice.id}, email: ${invoice.customer_email}, subscription: ${invoice.subscription}`);

// Dacă nu găsește profilul
if (!profile) {
  console.error(`❌ NO PROFILE FOUND for email: ${customerEmail}`);
  
  await supabaseClient.from('admin_alerts').insert({
    alert_type: 'INVOICE_PROFILE_NOT_FOUND',
    severity: 'warning',
    title: `Invoice Paid but Profile Not Found: ${customerEmail}`,
    description: 'An invoice was paid but no matching profile exists in database.',
    details: { invoice_id: invoice.id, email: customerEmail, subscription_id: invoice.subscription }
  });
}
```

### 3. Adăugare monitorizare pentru plăți lipsă

**Fișier nou: `supabase/functions/stripe-monitoring/index.ts`** (actualizare)

Adaug verificare automată care compară facturile Stripe cu baza de date și alertează dacă lipsesc:

```typescript
// Periodic check (daily cron) 
// Compară toate invoice.paid din Stripe cu subscription_payments
// Alertează dacă găsește discrepanțe
```

---

## Verificări suplimentare necesare

1. **Verificare configurare webhook în Stripe Dashboard**:
   - URL endpoint corect: `https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/stripe-webhook`
   - Evenimente activate: `invoice.paid`, `checkout.session.completed`, `customer.subscription.*`
   - Secret webhook setat corect în Supabase Secrets

2. **Verificare dacă webhook-ul primește evenimente**:
   - Logs în Stripe Dashboard → Developers → Webhooks → Recent events
   - Verificare dacă apar erori 4xx/5xx pentru endpoint

---

## Rezultat așteptat

- Toate plățile de reînnoire vor fi înregistrate automat
- Admin-ul va primi alerte dacă webhook-ul eșuează
- Facturile SmartBill se vor genera automat

