## Obiectiv

Testez **doar dacă cheia ta API de la listafirme.ro mai funcționează**, înainte să modificăm orice cod. Așa nu pierdem timp dacă abonamentul a expirat.

## Pași

1. **Tu îmi dai cheia API** de la listafirme.ro (o iei din contul tău de pe `platform.listafirme.ro` → secțiunea "Acces API"). Dacă nu o mai găsești în cont, deja știm că abonamentul nu mai e activ.

2. **Eu o adaug ca secret** `LISTAFIRME_API_KEY` în Lovable Cloud (după aprobarea planului).

3. **Rulez un test direct** cu `curl` din sandbox către:
   ```
   POST https://listafirme.ro/api/firme-noi-v2.asp
   Body: key=<API_KEY>&data=2026/04/25
   ```

4. **Interpretez răspunsul în 3 cazuri**:
   - **CSV cu firme** → abonament activ. Trecem la planul de integrare completă.
   - **Eroare "invalid key" / "subscription expired" / 401 / 403** → abonamentul a expirat, trebuie reactivat (337 RON/lună fără TVA).
   - **CSV gol fără eroare** → cheia merge dar nu erau firme noi în acea zi. Testez și pe alte 2-3 date înapoi.

5. **Îți raportez rezultatul** și decidem împreună următorul pas.

## Ce NU fac în acest pas

- Nu modific `prospect-onrc-scraper`.
- Nu adaug coloane în DB.
- Nu schimb UI-ul `/prospect`.
- Doar **testez cheia**.

## După test

- **Dacă merge** → îți prezint planul de integrare completă (refactor scraper de la Perplexity la listafirme.ro + adăugare telefon în DB + buton WhatsApp în UI).
- **Dacă nu merge** → îți spun exact ce să faci ca să reactivezi abonamentul, fără cod modificat inutil.

Confirmi? După aprobare îți cer cheia API.