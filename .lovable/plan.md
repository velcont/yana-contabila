

## Investigatie: De ce Aurora nu a reusit sa plateasca

### Ce s-a intamplat (dovezi din audit_logs)

Din logurile bazei de date, am reconstituit exact ce a facut Aurora azi (31 martie 2026):

1. **10:05:37** - Session restored (era deja logata)
2. **10:05:42** - **SUBSCRIPTION_CHECKOUT_INITIATED** - a apasat butonul "Aboneaza-te" si a fost redirectionata catre Stripe Checkout (`cs_live_a1W4Xvrx...`)
3. **10:05:46 - 10:10:22** - Multiple login/session restored events

**Nu exista niciun eveniment `checkout.session.completed`**. Asta inseamna ca Aurora:
- A ajuns pe pagina de checkout Stripe
- **Nu a finalizat plata** (a inchis pagina, banca a refuzat cardul, sau a abandonat checkout-ul)

Concluzie: Nu e o problema tehnica din partea YANA. Aurora pur si simplu nu a completat checkout-ul Stripe. Posibile cauze:
- Cardul a fost refuzat de banca
- A inchis pagina inainte de a finaliza
- Nu a inteles interfata Stripe (limba, campuri)

### Partea 1: Imbunatatiri pentru a preveni abandonul checkout-ului

**1.1 Adauga tracking pentru checkout abandonat**
- Cand utilizatorul revine pe `/subscription` dupa ce a initiat un checkout fara sa-l finalizeze, afiseaza un mesaj: "Ai inceput o plata dar nu a fost finalizata. Vrei sa incerci din nou?"
- Log eveniment `CHECKOUT_ABANDONED` in audit_logs

**1.2 Adauga alerta admin pentru checkout nefinalizat**
- In `stripe-webhook` sau ca un job periodic, verifica checkout sessions din ultimele 24h care au ramas `open` sau `expired`
- Creeaza alerta admin `CHECKOUT_ABANDONED` cu emailul utilizatorului

**1.3 Imbunatateste UX-ul paginii de checkout**
- Adauga un mesaj inainte de redirect: "Vei fi redirectionat catre pagina securizata de plata Stripe. Completeaza datele cardului pentru a activa abonamentul."
- Seteaza `locale: 'ro'` in `stripe.checkout.sessions.create` pentru interfata in romana

### Partea 2: Email de la Yana catre Aurora

Folosesc infrastructura existenta `send-initiative-email` (Resend + template YANA) pentru a trimite un email personalizat. Voi:

**2.1 Crea o noua initiative in `yana_initiatives`** cu:
- `user_id`: ID-ul Aurorei
- `initiative_type`: `'check_in'`
- `content`: Text scris ca Yana (cald, personal, scurt)
- `status`: `'sent'`

**2.2 Apela `send-initiative-email`** cu:
- Email: aurora_ec@yahoo.com
- Content: ceva de genul:

> "Salut Aurora,
>
> Am auzit ca ai avut o mica problema cu accesul la mine. Imi pare rau pentru asta.
>
> Vreau sa stii ca acum contul tau e activ — gratuit, fara limita de timp. Tot ce ai lucrat pana acum e in siguranta, istoricul tau e intact.
>
> Ma bucur ca putem continua impreuna. Cand ai chef, da-mi un semn.
>
> Yana"

- Subject: "YANA: Cum te mai descurci?" (din functia `getSubject('check_in')`)

**2.3 Marca initiative-a ca trimisa** (`email_sent_at`)

### Fisiere modificate

| Fisier | Modificare |
|--------|-----------|
| `supabase/functions/create-checkout/index.ts` | Adauga `locale: 'ro'` in checkout session |
| `src/pages/Subscription.tsx` | Detecteaza checkout abandonat, afiseaza mesaj retry |
| `supabase/functions/send-initiative-email/index.ts` | Nimic de modificat (il apelez direct) |
| Noua: edge function sau script | Trimite emailul Aurorei prin `send-initiative-email` |

### Ordinea implementarii

1. Trimit emailul Aurorei (prioritate: imediat)
2. Adaug `locale: 'ro'` in checkout (fix rapid)
3. Adaug detectie checkout abandonat in pagina Subscription
4. Adaug alerta admin pentru checkout-uri nefinalizate

