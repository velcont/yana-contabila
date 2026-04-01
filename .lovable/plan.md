

# Ce poate prelua Yana din specificațiile Aria

## Situația actuală

Yana are deja `generate-office-document` edge function care generează DOCX, XLSX, PPTX și PDF cu AI content + upload în Storage + email via Resend. **Dar** lipsesc mai multe capabilități critice din spec-ul Aria.

## Ce se poate aplica (și cum)

### 1. Excel cu formule, formatare avansată și chart-uri
**Acum**: XLSX-ul Yanei folosește `xlsx` library — generează tabele simple fără formatare, fără formule, fără alternate row colors.
**De aplicat**: Structura `generate_excel` din Aria cu: headers colorate, alternate row shading, formule Excel reale (`=SUM(D2:D49)`), auto-filter, freeze header, column widths personalizate.
**Implementare**: Migrare de la `npm:xlsx` la `npm:exceljs` (mai bun pentru formatare în Deno) sau extinderea logicii cu styling.

### 2. Word cu template-uri (letterhead, TOC, semnătură)
**Acum**: DOCX-ul Yanei generează heading-uri și paragrafe simple.
**De aplicat**: Sistem de template-uri — `blank`, `letterhead` (cu logo, antet firmă, subsol CUI), `report` (cu secțiuni predefinite), `client_notification` (cu bloc destinatar, linie subiect, bloc semnătură). Suport pentru liste formatate corect (nu unicode bullets), tabele cu borduri, footer cu page numbers.
**Implementare**: Parametru `template` în request + logica de header/footer în `generateDocx()`.

### 3. PDF cu moduri multiple (create, merge, fill_form)
**Acum**: PDF-ul Yanei doar creează PDF-uri simple cu jsPDF.
**De aplicat**: Modurile `merge` (combină mai multe PDF-uri) și `convert_from_docx`. Form filling nu e posibil în Deno fără Python, dar merge-ul da.
**Implementare**: Parametru `mode` în request PDF, logica de merge cu `pdf-lib` (funcționează în Deno).

### 4. Citire inteligentă de documente primite (`read_document`)
**Acum**: `DocumentUploader.tsx` citește fișiere dar nu clasifică inteligent tipul documentului.
**De aplicat**: Când un user uploadează un PDF/Excel/Word, Yana nu doar confirmă — **citește, clasifică** (extras bancar, factură, registru, bilanț, chitanță) și **răspunde contextual**: "Am primit extrasele bancare — 47 tranzacții pe perioada ianuarie."
**Implementare**: Extinderea logicii din `ai-router` pentru fișiere uploadate — adăugare clasificare automată.

### 5. Routing document intent în ai-router (LIPSEȘTE!)
**Acum**: `ai-router` nu are rutare către `generate-office-document` — ruta `generate-document` e declarată în tipuri dar **nu e implementată**.
**De aplicat**: Detecție intent din mesaj: "fă-mi un contract", "generează un tabel Excel", "trimite-mi pe email un raport" → rutare automată cu extragere format + template type + email.
**Implementare**: Bloc de detecție keywords + dispatch la `generate-office-document`.

### 6. Email cu fișier atașat (cerere email în chat)
**Acum**: Email-ul trimite un link de download.
**De aplicat**: Flux în care Yana detectează "trimite-mi pe email" → cere emailul dacă nu-l are → generează + trimite automat.
**Implementare**: Logica în ai-router de extragere email din mesaj sau din profil.

### 7. Generare proactivă de documente
**De aplicat**: Yana poate sugera generare de documente bazat pe context — după o analiză de balanță, propune "Vrei un raport PDF cu analiza completă?" sau "Pot să-ți trimit situația pe email".
**Implementare**: Suggestion chips post-analiză cu acțiuni de document generation.

## Ce NU se poate aplica

- **WhatsApp integration** (`send_whatsapp_file`) — nu e relevant, Yana are deja Resend
- **Python server-side** — Yana rulează pe Deno Edge Functions, nu Python. Bibliotecile sunt echivalente JS: `docx` = `python-docx`, `exceljs/xlsx` = `openpyxl`, `pptxgenjs` = `python-pptx`, `jspdf/pdf-lib` = `reportlab`
- **OCR pe imagini** — `pytesseract` nu funcționează în Deno; Yana folosește deja AI vision pentru imagini
- **Malware scanning** — nu aplicabil în sandbox Deno
- **Fill PDF forms (XFA)** — necesită Python `pdfrw`, nu e posibil în Deno

## Plan de implementare (5 pași)

### Pas 1: Fix routing în ai-router
Adaugare bloc de detecție document intent cu keywords (`contract`, `raport`, `tabel`, `excel`, `word`, `pdf`, `prezentare`, `generează`, `fă-mi`, `creează`) → dispatch la `generate-office-document` cu format + template + email extras din mesaj.

### Pas 2: Excel avansat cu formatare
Refactorizare `generateXlsx()` cu: header coloring, alternate rows, formule, freeze panes, auto-filter, column widths. AI prompt actualizat să returneze date structurate cu `headers` + `rows` + `formulas`.

### Pas 3: Word cu template-uri
Adăugare sistem de template-uri în `generateDocx()`: letterhead (antet + subsol), notification (bloc destinatar + semnătură), report (secțiuni standard). Footer cu page numbers pe fiecare pagină.

### Pas 4: PDF merge mode
Adăugare mod `merge` în generarea PDF cu `pdf-lib` — permite combinarea mai multor PDF-uri uploadate.

### Pas 5: Clasificare inteligentă documente uploadate
Extinderea răspunsului Yanei la upload-uri — clasificare automată tip document, rezumat inteligent, răspuns contextual.

## Fișiere afectate

- `supabase/functions/ai-router/index.ts` — routing document intent
- `supabase/functions/generate-office-document/index.ts` — template system, Excel avansat, PDF merge
- `src/components/yana/YanaChat.tsx` — suggestion chips post-generare
- `src/components/yana/ArtifactRenderer.tsx` — UI îmbunătățit download

