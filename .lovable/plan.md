## Plan: Yana trimite emailuri prin contul tău office@velcont.com (IMAP/SMTP)

### Ce schimb față de acum

**Acum:** Yana trimite prin Resend de la `yana@yana-contabila.velcont.com` (un sender separat, cu reply-to la tine).

**După:** Yana trimite **direct din contul tău office@velcont.com** prin SMTP-ul Velcont (mail.velcont.com:465 SSL). Email-ul apare nativ în Sent-ul tău, destinatarul vede `office@velcont.com` ca expeditor real, răspunsurile vin direct la tine.

---

### Cei 7 pași

**1. Salvez configurația ta SMTP/IMAP**
Mergi la `/email-settings`, completezi datele (sunt deja precompletate cu mail.velcont.com:993/465). Pun parola `Vc!em2026@Aria#Mk`. Apăs "Testează & Salvează" → se validează conexiunea și parola se criptează AES-GCM în baza de date.

**2. Adaug `send_via_smtp` în edge function `email-client`**
Acțiune nouă care primește `to`, `subject`, `body`, `attachment` (base64) și trimite prin nodemailer/denomailer pe portul 465 SSL folosind credențialele tale criptate. Loghează în `email_logs` + `outbound_emails`.

**3. Refactor tool-ul `send_email_with_attachment` din `yana-agent`**
În loc să cheme `send-business-email` (Resend), cheamă `email-client` cu acțiunea `send_via_smtp`. Păstrez exact aceeași logică de confirmare (`email_trusted_recipients`) și aceleași parametri pentru utilizator — comportamentul Yanei rămâne identic, doar canalul de trimitere se schimbă.

**4. Fallback automat**
Dacă SMTP-ul Velcont eșuează (server down, parolă schimbată), Yana cade automat pe Resend cu mesaj clar: *"SMTP-ul tău a picat, am trimis prin sistemul backup. Verifică `/email-settings`."*

**5. Marchez raportari@velcont.com ca trusted din start**
Insert direct în `email_trusted_recipients` pentru ca prima trimitere să nu mai ceară confirmare (tu deja ai cerut asta implicit).

**6. Update prompt Yana**
Adaug în system prompt: *"Trimiți emailuri din contul real al utilizatorului (office@velcont.com), nu dintr-un cont generic. Răspunsurile vor veni direct la el."*

**7. Test end-to-end**
Trimit un email de test la tine însuți (`office@velcont.com → office@velcont.com`) cu un attachment mic, verific că apare în Sent și că logarea în `outbound_emails` e corectă.

---

### Detalii tehnice

- **Librărie SMTP în Deno edge:** `denomailer` (compatibilă Deno, suportă SSL/TLS pe 465, attachments base64).
- **Decriptare parolă:** funcția `email-client` are deja logica AES-GCM implementată pentru `save_account` — refolosesc aceeași cheie din env.
- **Atașamente:** convertesc base64 → Uint8Array înainte de pasare la denomailer.
- **Headers:** setez `From: "Numele tău" <office@velcont.com>` și `Reply-To` identic.
- **DKIM/SPF:** se rezolvă automat — Velcont semnează deja emailurile plecate de pe serverul lor.

---

### Ce câștigi
✅ Email-uri din contul tău real, nu de la un sender suspect  
✅ Apar în Sent-ul tău Velcont (poți vedea ce a trimis Yana)  
✅ Răspunsurile vin direct la tine, nu prin reply-to  
✅ Deliverability mai bună (DKIM/SPF Velcont vs. domeniu nou Resend)  
✅ Nu mai depinzi de Resend pentru flow-ul principal

### Timp estimat
~5 minute (am 80% din infra deja construită).

**Aprobă și încep cu pașii 1–7.**