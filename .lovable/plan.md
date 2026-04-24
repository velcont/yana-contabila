## Plan: Yana trimite emailuri cu atașament (cazul Velcont)

### Ce vei putea spune Yanei

> *"Yana, trimite Fisa Rol Simplificata pentru NATURE ART FLEURS SRL la raportari@velcont.com cu subiectul 'NATURE ART FLEURS SRL luna MARTIE 2026' și textul: Bună ziua, am închis luna MARTIE 2026..."*

Yana:
1. Identifică fișierul (ultimul generat de ea SAU cel atașat de tine în chat).
2. Compune emailul cu **subiectul și textul tău exact** (fără reformulări AI).
3. Confirmă o dată: *"Trimit [fișier] la raportari@velcont.com — confirmi?"*
4. La "da" → trimite + salvează în istoric.
5. Pentru destinatari recurenți (raportari@velcont.com), poți spune odată *"nu mai cere confirmare pentru velcont"* → data viitoare trimite direct.

---

### Ce construiesc

**1. Tabel `outbound_emails`** — istoric: `to`, `subject`, `body`, `attachment_name`, `status`, `provider_msg_id`, `sent_at`. RLS: doar ownerul vede.

**2. Tabel `email_trusted_recipients`** — destinatari fără confirmare. Câmpuri: `email`, `label`. (Adaugi raportari@velcont.com o singură dată.)

**3. Edge function `send-business-email`** — primește `to`, `subject`, `body`, fișier (base64 sau path din storage). Trimite via Lovable Email (sistemul nativ). Loghează rezultatul.

**4. Tool nou în `yana-agent`: `send_email_with_attachment`**
Parametri:
- `to`, `subject`, `body` (textul tău exact)
- `attachment_source`: `"last_generated_file"` (din artefactele Yanei) | `"chat_attachment"` (fișier urcat în chat)
- `confirmed`: bool (Yana cere confirmare la prima încercare, retrimite cu `true` după "da")

---

### Cum atașează Yana fișierul concret

- **Fișier generat de Yana** (ex: ai cerut anterior "fă-mi un export") → îl ține în memorie 30min, îl ia automat când spui "trimite-l".
- **Fișier atașat de tine în chat** (clip pe agrafă → urci .xlsx) → spui "trimite-l la velcont".

Yana **NU generează singură** Fisa Rol Simplificata în acest scope — îl atașezi tu (din Saga/SmartBill) sau ceri separat să-l genereze.

---

### Domeniu sender
Folosesc domeniul Lovable Email deja configurat pentru proiect. La implementare verific exact ce domeniu e activ și îl folosesc. Apare ca *"YANA <noreply@[domeniul-tău]>"* cu reply-to la adresa ta.

Dacă vrei să apară de la **Gmail-ul tău personal** → necesită OAuth Gmail (separat, nu intră aici).

---

### Ce NU intră
- ❌ Submisie paper academic / căutare jurnale
- ❌ OAuth Gmail
- ❌ Generare automată Fisa Rol Simplificata

---

**Aprobă și execut: migrație tabele + edge function + tool nou. ~3 minute.**