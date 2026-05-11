## Modul "Firme Nou Înființate" — pagină `/firme-noi`

Modul separat (cu hook spre CRM-ul existent), alimentat săptămânal cu fișierul `MF_FirmeNoi*.xlsx` (4080 rânduri, 15 coloane: CUI, NrInmatriculare, Nume, Județ, Localitate, Tip, Adresa, Nr, Telefon, Mobil, Fax, DataInfiintarii, DataActualizarii, CAEN, DescriereCAENRo).

### Reguli de acces (foarte stricte)

- **Vizualizare permisă doar pentru:**
  - useri în perioada de gratuitate activă (`trial_ends_at > now()`), SAU
  - useri cu abonament activ 49 RON (`subscription_status = 'active'` și `subscription_ends_at > now() OR NULL`), SAU
  - useri cu `has_free_access = true`, SAU
  - admini.
- **Restul userilor:** văd doar empty-state cu CTA → `/pricing`.
- **Strict NO download / NO export:**
  - fără buton "Descarcă xlsx/CSV"
  - fără endpoint care întoarce fișierul brut
  - bucket-ul cu xlsx-ul original e privat, fără policy de SELECT pentru useri (doar admin via service role)
  - paginare server-side (50/page) — niciodată nu se livrează tot setul de 4080 rânduri într-un singur răspuns
  - rate limit pe edge function de listare: max 200 rânduri pe minut per user, ca să descurajeze scraping
  - frontend: dezactivăm select-text + context menu pe celulele cu telefon/CUI (descurajare, nu blocare absolută)

### 1. Bază de date (migration nouă)

**`new_companies_batches`** — un rând per upload săptămânal
- `file_name`, `period_start`, `period_end` (parsate din numele fișierului `2026-05-03-2026-05-09`)
- `uploaded_by` (admin), `total_rows`, `inserted_rows`, `duplicate_rows`

**`new_companies`** — firmele propriu-zise
- toate cele 15 coloane + `batch_id`, `data_infiintarii` (date real, conversie din serial Excel)
- `cui` UNIQUE → la re-upload, ON CONFLICT DO NOTHING (deduplicare CUI)
- index pe `judet`, `caen`, `data_infiintarii`

**`new_company_outreach`** — tracking ofertă per user × firmă
- `user_id`, `new_company_id`, `status` (`viewed`, `email_generated`, `copied`, `added_to_crm`)
- `crm_company_id`, `crm_deal_id` (când e împins în CRM)
- UNIQUE (user_id, new_company_id)

**RLS:**
- helper SECURITY DEFINER `has_firme_noi_access(uid uuid) returns boolean`:
  - admin OR (trial activ) OR (subscription_status='active' și nu expirat) OR has_free_access
- `new_companies` SELECT: doar dacă `has_firme_noi_access(auth.uid())`
- INSERT/DELETE pe `new_companies`/`new_companies_batches`: doar admin
- `new_company_outreach`: user vede/scrie doar rândurile lui

**Storage bucket** `firme-noi-uploads` (privat, **fără** policy SELECT pentru useri normali) — păstrează xlsx-ul original doar pentru admin.

### 2. Edge function `import-new-companies` (admin only)

- Input: `{ batch_id, file_path }`
- Verifică `has_role(uid, 'admin')`; refuză restul
- Descarcă xlsx din storage cu service role, parse cu `xlsx`
- Convertește serial Excel → ISO pentru `DataInfiintarii`/`DataActualizarii`
- Bulk insert în chunk-uri de 500, cu `onConflict: 'cui', ignoreDuplicates: true`
- Update `new_companies_batches` cu inserted/duplicate counts

### 3. Edge function `generate-prospect-email`

- Input: `{ new_company_id, sender_profile?: { name, business, offer } }`
- Verifică `has_firme_noi_access`; altfel 403
- Lovable AI (`google/gemini-2.5-flash`) — ofertă scurtă RO, fără placeholder-uri `[...]`, personalizată cu CAEN-ul firmei
- Returnează `{ subject, body }`
- Insert în `new_company_outreach` cu status `email_generated`

### 4. UI nou — `src/pages/FirmeNoi.tsx`

**Top bar:**
- Buton "Încarcă fișier" (vizibil doar admin) → dialog drag&drop xlsx → `import-new-companies`
- Selector batch (ultimele 8 săptămâni), badge `nou` pe ultimul

**Filtre (sticky, mobile-first):**
- Search nume / CUI
- Județ (dropdown)
- CAEN (multi-select cu căutare)
- Data înființării (range)
- Toggle "Doar cu telefon/mobil"
- Toggle "Ascunde firmele deja adăugate în CRM-ul meu"

**Listă paginată (50/page, server-side, fără buton de export):**
- Card per firmă: Nume + CUI, Județ + Localitate, CAEN + descriere, Data înființării, telefoane (📞 / 📱)
- Două butoane:
  - **"Generează ofertă"** → drawer cu emailul AI + 📋 Copy + "Marchează ca trimis"
  - **"Adaugă în CRM"** → creează `crm_companies` + `crm_deals` (stage "Lead nou" via `ensure_default_crm_pipeline`) + actualizează `new_company_outreach` + toast cu link `/crm`

**Empty-state pentru cei fără acces** (verificat și în UI, nu doar în RLS):
- Card mare: "Lista firmelor noi înființate (4080+ în această săptămână) este disponibilă pe planul Strategic 49 RON/lună sau în perioada de probă gratuită."
- CTA "Activează YANA Strategic" → `/pricing`.

### 5. Integrare CRM

- Reutilizează schema CRM (`crm_companies`, `crm_deals`, `crm_pipeline_stages`)
- Apelează `ensure_default_crm_pipeline(user_id)` pentru pipeline default
- Stadiu inițial = primul stage (display_order=0) — "Lead nou"
- Marchează `crm_companies.metadata = { source: 'firme_noi', new_company_id }` pentru filtre ulterioare

### 6. Navigație

- Link nou în `AppSidebar` între CRM și ChiefOfStaff: 🏢 "Firme noi"
- Banner subtil în `/crm`: "Ai 4080 firme noi de prospectat → Firme noi" când există batch din ultimele 7 zile

### 7. Out of scope (iterații viitoare)

- Trimitere email automat din platformă (Resend) — momentan doar copy/paste
- Bulk import în CRM
- WhatsApp (wa.me) — date Mobil deja stocate, ușor de adăugat
- Cron care citește dintr-un email/folder

### Detalii tehnice

- Conversie Excel serial → ISO: `new Date(Date.UTC(1899, 11, 30) + serial * 86400000)`
- Limită upload xlsx admin: 25 MB
- Filtru CAEN: caută pe cod numeric, afișează `DescriereCAENRo`
- Fără export, fără endpoint care livrează tot setul deodată — întotdeauna paginare 50/page cu rate limit
