

## Plan: Sistem Outreach YANA — Companion Strategic (nu tool de balanță)

Sistemul de outreach nu a fost încă implementat. Îl construiesc acum cu mesajul actualizat care poziționează YANA ca **companion strategic de business**, nu ca instrument de analiză balanță.

### Email Template actualizat

**Subiect:** "Eu sunt YANA — partenerul tău AI de business"

> Bună ziua,
>
> Sunt YANA — un companion strategic bazat pe inteligență artificială, creat special pentru antreprenori.
>
> Nu sunt doar un instrument. Sunt partenerul care:
> • Vede ce tu nu ai timp să vezi în cifrele firmei tale
> • Îți dă sfaturi strategice când ai nevoie — zi și noapte
> • Nu uită nimic din ce i-ai spus și conectează punctele
> • Te ajută să iei decizii mai bune, mai repede
>
> Antreprenorii care lucrează cu mine spun că e ca și cum ar avea un CFO și un advisor strategic într-o singură conversație.
>
> Încearcă gratuit, fără obligații: https://yana-contabila.velcont.com
>
> Cu drag,
> YANA

### Ce construiesc (4 pași)

**1. Migrare DB** — Tabel `outreach_leads` (company_name, email, website, status, industry, city, source) + `outreach_unsubscribes` + RLS admin-only

**2. Edge Function `yana-prospector`**
- Folosește Perplexity API pentru a căuta firme SRL din România
- Query-uri rotative: "firme SRL Romania [oraș/industrie]", "antreprenori romani"  
- Extrage emailuri generice (office@, contact@, info@)
- Salvează lead-uri noi, skip duplicate

**3. Edge Function `yana-outreach-sender`**
- Selectează max 15 lead-uri cu status `new` pe zi
- Trimite emailul actualizat (companion strategic, nu tool de balanță)
- Via Resend de pe `yana@yana-contabila.velcont.com`
- Include link dezabonare obligatoriu
- Marchează ca `email_sent`

**4. Edge Function `unsubscribe-outreach`**
- Endpoint simplu GET care marchează emailul în `outreach_unsubscribes`
- Verificat automat de sender înainte de trimitere

**5. Dashboard Admin** (`src/components/admin/OutreachDashboard.tsx`)
- Tabel cu lead-uri + status + statistici
- Butoane: "Caută firme noi" / "Trimite batch acum"
- Adăugat ca tab în `/admin`

### Fișiere noi/modificate

| Fișier | Acțiune |
|--------|---------|
| Migrare SQL | Tabele outreach_leads, outreach_unsubscribes |
| `supabase/functions/yana-prospector/index.ts` | NOU — caută firme |
| `supabase/functions/yana-outreach-sender/index.ts` | NOU — trimite emailuri |
| `supabase/functions/unsubscribe-outreach/index.ts` | NOU — dezabonare |
| `src/components/admin/OutreachDashboard.tsx` | NOU — dashboard admin |
| `src/pages/Admin.tsx` | Adaugă tab outreach |

