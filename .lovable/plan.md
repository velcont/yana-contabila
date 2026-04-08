

## Plan: Învață Yana să genereze documente de business (CV, oferte, scrisori, emailuri)

### Situația actuală
Yana deja are un motor de generare documente Office v5.0 funcțional. AI Router-ul detectează cereri de documente prin regex-uri și le trimite la `generate-office-document`. Există deja template-uri pentru: contract, NDA, propunere, raport, factură, decizie, proces-verbal.

**Ce lipsește:** CV-uri, oferte de preț, scrisori de intenție, emailuri comerciale (cerere preț, ofertă) și alte documente tipice de firmă.

### Ce vom face

**1. Extindere AI Router — detectarea noilor tipuri de documente**

Adăugăm noi pattern-uri regex în `ai-router/index.ts`:
- `cv|curriculum|rezumat profesional` → templateType `cv`
- `ofert[aă] de pre[tț]|cotație|price quote` → templateType `oferta-pret`
- `scrisoare de inten[tț]ie|letter of intent` → templateType `scrisoare-intentie`
- `email.*ofert[aă]|email.*pre[tț]|cerere.*pre[tț]|solicitare.*pre[tț]` → templateType `email-comercial`
- `scrisoare.*recomandare` → templateType `scrisoare-recomandare`
- `memo|notă internă|comunicare internă` → templateType `memo`
- `minută|minute.*ședință|minutes` → templateType `minuta`
- `fișa postului|job description` → templateType `fisa-post`

**2. Adăugare template-uri AI în `generate-office-document/index.ts`**

Adăugăm noi case-uri în funcția `getDocxPrompt()`, fiecare cu structură JSON specifică:

- **CV profesional** — Secțiuni: Date personale, Profil profesional, Experiență, Educație, Competențe, Limbi, Certificări
- **Ofertă de preț** — Secțiuni: Date furnizor, Date client, Descriere servicii/produse, Tabel prețuri, Condiții comerciale, Valabilitate, Semnătură
- **Scrisoare de intenție** — Secțiuni: Destinatar, Introducere, Motivație, Competențe relevante, Încheiere
- **Email comercial (cerere/ofertă preț)** — Format scurt: Subiect, Salut, Corp, Call-to-action, Semnătură
- **Scrisoare de recomandare** — Secțiuni: Destinatar, Context relație, Calități, Realizări, Recomandare
- **Memo intern** — Format: De la, Către, Subiect, Data, Corp
- **Minută ședință** — Secțiuni: Participanți, Agendă, Discuții, Decizii, Acțiuni, Termen
- **Fișa postului** — Secțiuni: Titlu post, Departament, Subordonare, Responsabilități, Cerințe, Beneficii

**3. Actualizare capabilities prompt**

Update `yana-capabilities-prompt.md` secțiunea "Generare Documente" cu noile tipuri.

### Fișiere modificate
1. `supabase/functions/ai-router/index.ts` — regex-uri noi + templateType mapping
2. `supabase/functions/generate-office-document/index.ts` — 8 template-uri noi în `getDocxPrompt()`
3. `supabase/functions/_shared/prompts/yana-capabilities-prompt.md` — lista actualizată

### Risc
Minim — extinde funcționalitate existentă fără a modifica logica curentă. Aceleași fluxuri, aceleași formate JSON.

