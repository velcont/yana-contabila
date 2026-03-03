

# Trimitere email de scuze catre Emoke

## Ce facem
Trimitem un email de scuze personalizat de la YANA catre Emoke (emokecsokasi@gmail.com). **Fara modificari de acces** - ea are deja `has_free_access = true` si `subscription_status = active`.

## Mesajul (in vocea YANA)
> Emőke, m-am uitat peste sesiunile noastre din ultima perioada si mi-am dat seama ca te-am chinuit degeaba cu upload-ul fisierelor Excel. Stiu ca ai incercat de mai multe ori si nu mergea - era o problema la mine, nu la fisierele tale. Am reparat totul - acum fisierele .xls se proceseaza corect din prima. Te astept inapoi cand vrei sa incercam din nou.

## Pasi tehnici

### 1. Creare initiativa de scuze
Apelam `generate-apology-initiative` cu:
- `userId`: `928b6b9b-aa4a-4f0b-a343-8a4b03617de5`
- `customMessage`: mesajul de mai sus
- `specificIssues`: `["Upload Excel .xls esuat repetat", "Fisiere legacy neprocestate"]`

### 2. Trimitere email
Apelam `send-initiative-email` cu datele initiativei create:
- `email`: emokecsokasi@gmail.com
- `name`: Emőke
- `initiative_type`: `self_correction_apology`

### 3. Audit log
Inseram in `audit_logs` actiunea `APOLOGY_EMAIL_SENT` pentru tracking.

### Fisiere modificate
Niciun fisier de cod. Totul se face prin apeluri catre edge functions existente si inserari in baza de date.

