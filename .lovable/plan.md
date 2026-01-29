

# Plan: Reparare sincronizare Admin pentru utilizatori individuali

## Problema identificată

Funcția `sync-stripe-subscription` nu procesează corect parametrul `email` trimis din Admin. Logurile arată că folosește email-ul admin-ului în loc de email-ul clientului țintă:

```
User authenticated - {"email":"office@velcont.com"}  // Admin
Customer found - {"customerId":"cus_RlfpbEsIYezc71"} // Customer ID greșit
No active subscription                                // Normal - admin nu are subscripție
```

Cauză probabilă: deploy-ul anterior nu s-a finalizat sau există un bug în logica de parsing a body-ului.

---

## Soluție

### 1. Adaugă logging suplimentar pentru debug

În `supabase/functions/sync-stripe-subscription/index.ts`, adaug log-uri pentru a vedea exact ce primește funcția:

```typescript
// După parsarea body-ului (linia ~28)
logStep("Request body parsed", { 
  hasBody: !!body, 
  requestedEmail: body?.email || 'none',
  bodyKeys: Object.keys(body || {})
});
```

### 2. Corectează logica de override email

Adaug un log explicit când se face switch-ul de email:

```typescript
// Înainte de căutarea customerului în Stripe (linia ~102)
logStep("Searching Stripe for email", { targetEmail });
```

### 3. Re-deploy funcția

După modificări, re-deploy funcția pentru a asigura că versiunea corectă rulează.

---

## Rezultat așteptat

- Când admin-ul sincronizează `timoficiuc.g@gmail.com`, funcția va:
  1. Log: `Request body parsed - {"requestedEmail":"timoficiuc.g@gmail.com"}`
  2. Log: `Admin sync requested - {"requestedEmail":"timoficiuc.g@gmail.com"}`
  3. Căuta customerul corect în Stripe (`cus_Th6jWYK9CKkwOh`)
  4. Găsi subscripția activă și actualiza profilul

---

## Technical Details

Modificări în `supabase/functions/sync-stripe-subscription/index.ts`:

1. Adaug log după parsarea body-ului (linia 29):
```typescript
logStep("Request body parsed", { 
  hasBody: !!body, 
  requestedEmail: body?.email || 'none'
});
```

2. Adaug log înainte de căutarea Stripe (linia 102):
```typescript
logStep("Searching Stripe for email", { targetEmail, isAdminOverride: targetEmail !== user.email });
```

3. Re-deploy funcția pentru a aplica modificările

