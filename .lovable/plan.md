

# Dashboard Abonati YANA - Separare clara plati YANA vs Contabilitate

## Problema
In panoul admin, platile YANA (49 RON) si platile de contabilitate (150-500 RON) sunt amestecate, creand confuzie. Trebuie sa fie clar cine plateste abonament YANA si sa avem un dashboard dedicat.

## Ce vom construi

### 1. Dashboard nou "Abonati YANA" in panoul Admin
Un tab nou in Admin cu:
- **KPI-uri**: Abonati activi, MRR (Monthly Recurring Revenue), rata de conversie free-to-paid
- **Lista abonati YANA**: tabel cu email, nume, data start, urmatoarea plata, status
- **Lista candidati**: utilizatori cu acces gratuit care ar putea fi convertiti

### 2. Separare vizuala in AdminRevenueMonitor
AdminRevenueMonitor deja filtreaza corect (doar `amount_paid_cents = 4900`), dar vom adauga si o integrare cu tab-ul admin.

### 3. Alertare lipsa facturi
Card de alertare cand exista plati YANA fara factura SmartBill generata.

---

## Detalii tehnice

### Fisier nou: `src/components/admin/YanaSubscribersDashboard.tsx`
- Interogheaza `subscription_payments` unde `amount_paid_cents = 4900` pentru plati YANA
- Interogheaza `profiles` pentru lista utilizatori cu `stripe_subscription_id` activ
- Calculeaza MRR = numar abonati activi x 49 RON
- Afiseaza tabel cu: email, nume, data prima plata, ultima plata, total platit, status factura
- Sectiune separata: "Utilizatori Free Access" cu potentialul de conversie
- Buton "Trimite oferta" pentru utilizatorii cu acces gratuit (pregatit pentru viitor)

### Modificare: `src/pages/Admin.tsx`
- Adauga tab nou "Abonati YANA" cu iconita DollarSign
- Lazy load componentul YanaSubscribersDashboard
- Pozitionat dupa tab-ul "Utilizatori"

### Logica de date
- **Abonat YANA activ**: `profiles.stripe_subscription_id IS NOT NULL AND profiles.subscription_status = 'active'`
- **Plata YANA**: `subscription_payments.amount_paid_cents = 4900`
- **Candidat conversie**: `profiles.has_free_access = true AND profiles.stripe_subscription_id IS NULL`
- **Alerta factura lipsa**: `subscription_payments.invoice_generated = false AND amount_paid_cents = 4900`

