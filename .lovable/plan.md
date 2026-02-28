

# Fix: Emitere automată facturi SmartBill la plata Stripe

## Problema

Webhook-ul Stripe (`stripe-webhook`) procesează corect evenimentele `invoice.paid` si `checkout.session.completed`, dar nu apelează SmartBill pentru emiterea automată a facturii. Facturile se emit doar manual din panoul Admin ("Emite Factură").

## Soluția

Adăugăm apelul automat la SmartBill direct în webhook, după ce plata este înregistrată cu succes. Reutilizăm logica existentă din `admin-generate-invoice` dar o apelăm intern (server-to-server).

## Modificări

### 1. `supabase/functions/stripe-webhook/index.ts`

**In blocul `invoice.paid` (linia ~238, după log-ul de succes):**

Adăugăm un apel automat la funcția `admin-generate-invoice` folosind `fetch` intern (server-to-server, fără auth admin -- vom crea o funcție dedicată).

In loc de a duplica logica, cream o functie nouă `auto-generate-invoice` care face exact ce face `admin-generate-invoice` dar fără verificarea admin (este apelată intern de webhook).

**Concret, după linia 238 (`console.log("Recorded subscription payment...")`), adăugăm:**

```typescript
// AUTO-GENERATE SmartBill Invoice
try {
  console.log(`📄 Auto-generating SmartBill invoice for ${customerEmail}`);
  const autoInvoiceResponse = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/auto-generate-invoice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        stripeInvoiceId: invoice.id,
        customerEmail,
        customerName: profile.email,
        userId: profile.id,
        amountCents: invoice.amount_paid,
        subscriptionId: subscription.id,
      }),
    }
  );
  const invoiceResult = await autoInvoiceResponse.json();
  console.log(`📄 SmartBill auto-invoice result:`, JSON.stringify(invoiceResult));
} catch (invoiceError) {
  // Non-blocking: log error but don't fail the webhook
  console.error(`⚠️ Auto-invoice failed (non-blocking):`, invoiceError);
  await supabaseClient.from('admin_alerts').insert({
    alert_type: 'AUTO_INVOICE_FAILED',
    severity: 'warning',
    title: `Auto-facturare eșuată: ${customerEmail}`,
    description: 'Webhook-ul a procesat plata dar factura SmartBill nu s-a generat automat.',
    details: { invoice_id: invoice.id, email: customerEmail, error: String(invoiceError) }
  });
}
```

**La fel, in blocul `checkout.session.completed` pentru subscription (linia ~398), adăugăm un apel similar.**

### 2. Noua funcție: `supabase/functions/auto-generate-invoice/index.ts`

Funcție nouă care:
- Primește datele plății (stripeInvoiceId, customerEmail, userId, amountCents)
- Verifică autorizarea prin `SUPABASE_SERVICE_ROLE_KEY` (doar apeluri interne)
- Verifică dacă factura SmartBill există deja (prevenire duplicate)
- Apelează SmartBill API cu aceleași credențiale
- Salvează rezultatul în `smartbill_invoices`
- In caz de eșec, creează admin_alert pentru intervenție manuală

Logica este similară cu `admin-generate-invoice` dar:
- Nu necesită admin auth (folosește service role key)
- Primește datele direct (nu re-fetch din Stripe)
- Este non-blocking (webhook-ul nu eșuează dacă factura nu se generează)

### 3. Ce NU se schimbă

- Butonul manual "Emite Factură" rămâne funcțional (fallback)
- `admin-generate-invoice` rămâne neschimbat
- Logica de plăți/webhook rămâne aceeași
- Verificarea duplicatelor previne emiterea dublă (dacă adminul apasă manual după auto-generare)

## Flux rezultat

```text
Stripe Payment -> Webhook -> 1. Înregistrează plata in DB
                            2. Actualizează profil
                            3. AUTO: Apelează auto-generate-invoice
                               -> SmartBill API -> Factură emisă
                               -> Salvează in smartbill_invoices
                            4. Dacă eșuează: admin_alert (facturare manuală)
```

## Beneficiu

Fiecare plată Stripe generează automat factura SmartBill, fără intervenție manuală. Adminul primește alertă doar dacă auto-facturarea eșuează.
