# 📋 GHID COMPLET TESTARE MANUALĂ UX - YANA

**IMPORTANT:** Acest ghid trebuie urmat PAS CU PAS pentru a valida toate aspectele de UX.  
**DEADLINE:** 48 ore de la primirea acestui document

---

## 🎯 OBIECTIV

Să verifici EFECTIV că aplicația funcționează perfect pentru utilizatori reali, NU doar teoretic.

**Ce trebuie să faci:**
1. ✅ Parcurgi FIECARE flux descris mai jos
2. ✅ Faci SCREENSHOT-uri pentru fiecare pas
3. ✅ Notezi ORICE problemă întâlnită
4. ✅ Verifici pe TOATE dispozitivele (Desktop, Tablet, Mobile)
5. ✅ Testezi cu SCREEN READER (măcar pe 1 pagină)
6. ✅ Rulezi GOOGLE LIGHTHOUSE pe 5 pagini principale

---

## 📹 PARTEA 1: ÎNREGISTRARE VIDEO (30 MINUTE MINIM)

### 🎬 CERINȚĂ OBLIGATORIE:

**Trebuie să înregistrezi ecranul în timp ce parcurgi TOATĂ aplicația.**

**Tool-uri recomandate:**
- **Loom** (gratuit, max 5 minute per video) - https://www.loom.com/
- **OBS Studio** (gratuit, nelimitat) - https://obsproject.com/
- **QuickTime** (Mac only, gratuit)
- **Windows Game Bar** (Windows 10/11, gratuit - Win+G)

**Ce să faci în înregistrare:**
1. ✅ Deschide aplicația pe **https://yana-ai.lovable.app/**
2. ✅ **Vorbește cu voce tare** despre ce vezi și ce încerci să faci
3. ✅ **Explică:** "Acum încerc să mă înregistrez... Apas pe butonul Înregistrează-te... Aștept să se încarce..."
4. ✅ Parcurge TOATE fluxurile de mai jos (Sign Up, Login, Dashboard, etc.)
5. ✅ **Arată mouse-ul** în înregistrare (activează în setări OBS/Loom)
6. ✅ **Notează ORICE problemă** pe care o întâmpini

**Salvează video-ul și trimite link-ul (Google Drive, Dropbox, YouTube unlisted)**

---

## 📱 PARTEA 2: DISPOZITIVE PENTRU TESTARE

### OBLIGATORIU să testezi pe:

#### Desktop (TOATE browser-ele):
- ✅ **Chrome** (versiunea curentă)
- ✅ **Firefox** (versiunea curentă)
- ✅ **Safari** (dacă ai Mac)
- ✅ **Edge** (opțional dar recomandat)

#### Tablet:
- ✅ **iPad** (iOS Safari) SAU
- ✅ **Android Tablet** (Chrome)
- Rezoluție testată: min 768px width

#### Mobile:
- ✅ **iPhone** (iOS Safari) - orice model iPhone 12+
- ✅ **Android Phone** (Chrome) - orice model modern
- Rezoluție testată: 360px - 430px width

**📋 Template pentru fiecare dispozitiv:**
```
Dispozitiv: iPhone 13 Pro
Browser: iOS Safari 17.2
Rezoluție: 390x844px
Observații: [notează aici probleme]
Screenshot: [link Google Drive]
```

---

## 🧪 PARTEA 3: TESTARE FLUX UTILIZATOR

### FLUX 1: ÎNREGISTRARE UTILIZATOR NOU

#### 📝 PAȘI:

**1. Accesează pagina de înregistrare**
- URL: https://yana-ai.lovable.app/auth
- Screenshot: Pagina de început

**2. Observă prima impresie**
- ✅ Se vede clar că e pagină de înregistrare?
- ✅ Titlul este "Înregistrare" sau "Autentificare"?
- ✅ Există opțiune să comuti la Login dacă ești deja înregistrat?

**3. Selectează tip cont**
- ✅ Se văd 2 opțiuni: "Antreprenor" și "Contabil"?
- ✅ Sunt clickable? (dă click pe fiecare)
- ✅ Se colorează când sunt selectate?
- Screenshot: După selectare

**4. Completează formularul**
- ✅ Câmpuri vizibile: Nume complet, Email, Parolă
- ✅ Există placeholders utile? (ex: "Ion Popescu", "email@exemplu.ro")
- ✅ Câmpurile obligatorii sunt marcate cu `*`?

**5. Testează validarea**
- ❌ Încearcă să trimiți form-ul FĂRĂ să completezi câmpurile
- ✅ Apar mesaje de eroare clare?
- Screenshot: Erori de validare

- ❌ Încearcă email invalid: "test@"
- ✅ Apare eroare "Email invalid"?

- ❌ Încearcă parolă scurtă: "abc"
- ✅ Apare eroare "Minimum 6 caractere"?

**6. Încearcă să vezi parola**
- ❌ Există icon de "ochișor" să vezi parola?
- ⚠️ PROBLEMĂ: Dacă NU există, notează ca problemă!

**7. Testează checkbox Termeni și Condiții**
- ✅ Există checkbox "Accept Termenii și Condițiile"?
- ✅ Link-ul la Termeni funcționează?
- ✅ Poți trimite form-ul FĂRĂ să bifezi?
- ✅ Apare eroare dacă nu bifezi?

**8. Trimite formularul cu date corecte**
- ✅ Apare loading spinner în buton?
- ✅ Butonul se dezactivează în timpul trimiterii?
- ✅ Cronometrează: Cât durează procesul? ______ secunde
- ✅ Apare mesaj de succes (toast notification)?
- Screenshot: Toast success
- ✅ Ești redirect-at automat la /app?

**9. Verifică ce se întâmplă după înregistrare**
- ✅ Vezi dashboard-ul principal?
- ✅ Numele tău apare undeva pe pagină?
- ✅ Tipul de cont selectat este corect?

#### 📊 RAPORTEAZĂ REZULTATELE:

```
FLUX 1: ÎNREGISTRARE - REZULTATE

✅ Funcționează: [listă ce funcționează bine]
❌ Probleme găsite: [listă probleme]
⏱️ Timp procesare: _____ secunde
📸 Screenshot-uri: [link-uri]
💯 Scor subiectiv (1-10): ___/10
💬 Impresie generală: [scrie aici]
```

---

### FLUX 2: AUTENTIFICARE (LOGIN)

#### 📝 PAȘI:

**1. Log out din contul creat anterior**
- ✅ Găsești butonul de Logout?
- ✅ Este clar că e pentru Logout?
- Screenshot: Buton logout

**2. Accesează pagina de login**
- URL: https://yana-ai.lovable.app/auth
- ✅ Se vede clar că e pagină de LOGIN (nu înregistrare)?
- ✅ Link către "Înregistrează-te" este vizibil pentru utilizatori noi?

**3. Observă tipurile de cont afișate**
- ⚠️ **PROBLEMA IDENTIFICATĂ:** Se văd carduri "Antreprenor" și "Contabil"?
- ❌ Încearcă să dai click pe ele
- ✅ NU sunt clickable? (corect - sunt doar informative)
- ✅ Este clar că sunt doar informative? (opacitate redusă, cursor default)
- Screenshot: Carduri tip cont

**4. Completează formularul de login**
- ✅ Doar 2 câmpuri: Email și Parolă?
- ✅ Link "Ai uitat parola?" este vizibil?

**5. Testează credențiale greșite**
- ❌ Încearcă email VALID dar parolă GREȘITĂ
- ✅ Apare eroare clară? "Email sau parolă greșită"
- ✅ NU dezvăluie că email-ul există? (securitate)
- Screenshot: Eroare login

**6. Testează "Am uitat parola"**
- ✅ Click pe link "Ai uitat parola?"
- ✅ Apare formular nou cu doar câmp EMAIL?
- ✅ Introduci email-ul tău
- ✅ Apare mesaj "Email trimis!"?
- ✅ Primești email-ul efectiv? (verifică inbox + spam)
- Screenshot: Email primit

**7. Resetează parola**
- ✅ Click pe link din email
- ✅ Te duce la pagină cu formular "Parolă nouă"?
- ✅ Introduci parolă nouă
- ✅ Funcționează și te loghează automat?

**8. Login cu credențiale corecte**
- ✅ Introduci email și parola corectă
- ✅ Apare loading?
- ✅ Cronometrează: Cât durează? ______ secunde
- ✅ Ești redirect-at la /app?
- ✅ Dashboard-ul se încarcă corect?

#### 📊 RAPORTEAZĂ REZULTATELE:

```
FLUX 2: LOGIN - REZULTATE

✅ Funcționează: [listă]
❌ Probleme găsite: [listă]
⏱️ Timp login: _____ secunde
⏱️ Timp resetare parolă: _____ secunde
📸 Screenshot-uri: [link-uri]
💯 Scor (1-10): ___/10
```

---

### FLUX 3: ÎNCĂRCARE BALANȚĂ (UPLOAD + ANALIZĂ)

#### 📝 PAȘI:

**1. Găsește butonul de upload**
- ✅ Ești pe dashboard (/app)?
- ✅ Vezi buton "Încarcă Balanță" sau similar?
- ✅ Este suficient de VIZIBIL? (culoare primary, poziție prominentă)
- Screenshot: Buton upload

**2. Click pe buton upload**
- ✅ Se deschide dialog de selectare fișier?
- ✅ Specifică extensii acceptate? (.xlsx, .xls)

**3. Încearcă să încarci fișier INVALID**
- ❌ Încarcă un .pdf sau .txt
- ✅ Apare eroare "Format invalid"?
- Screenshot: Eroare format

**4. Încarcă fișier VALID**
- ✅ Descarcă fișier demo: [link dacă există] SAU creează-ți un Excel simplu
- ✅ Numele fișierului conține LUNA și ANUL? (ex: "Balanta_Ianuarie_2025.xlsx")
- ✅ După selectare, vezi progress bar sau spinner?
- Screenshot: Upload în progres

**5. Așteaptă analiza**
- ⏱️ Cronometrează: Cât durează analiza? ______ secunde
- ✅ Vezi mesaj "Se analizează..." sau similar?
- ✅ Apare mesaj de succes când e gata?
- Screenshot: Success toast

**6. CRUCIAL: Verifică update INSTANT**
- ✅ Analiza nouă apare în listă **FĂRĂ** să faci refresh (F5)?
- ⚠️ **DACĂ TREBUIE SĂ FACI REFRESH = PROBLEMĂ CRITICĂ!**
- Screenshot: Lista cu analiza nouă (ÎNAINTE de refresh)

**7. Click pe analiza nouă**
- ✅ Se deschide detalii analiză?
- ✅ Vezi indicatori financiari? (CA, Profit, DSO, etc.)
- ✅ Vezi grafice?
- Screenshot: Pagină detalii analiză

**8. Testează Chat AI**
- ✅ Vezi buton sau widget pentru Chat?
- ✅ Click pe el, se deschide chat?
- ✅ Întreabă: "Care e profitul pentru [luna ta]?"
- ✅ Primești răspuns în < 5 secunde?
- ✅ Răspunsul este corect?
- Screenshot: Chat cu răspuns AI

#### 📊 RAPORTEAZĂ REZULTATELE:

```
FLUX 3: ÎNCĂRCARE BALANȚĂ - REZULTATE

✅ Funcționează: [listă]
❌ Probleme găsite: [listă]
⏱️ Timp analiză: _____ secunde
⏱️ Timp răspuns Chat AI: _____ secunde
✅ Update INSTANT fără refresh?: DA / NU
📸 Screenshot-uri: [link-uri]
💯 Scor (1-10): ___/10
```

---

### FLUX 4: EDITARE ȘI ȘTERGERE

#### 📝 PAȘI:

**1. Editează o analiză existentă** (dacă aplicabil)
- ✅ Găsești buton "Edit" sau icon creion?
- ✅ Click pe el, se deschide form pre-populat cu date existente?
- ✅ Modifici ceva (ex: nume companie)
- ✅ Salvezi
- ✅ Apare success toast?
- ✅ Modificarea apare INSTANT fără refresh?

**2. Șterge o analiză**
- ✅ Găsești buton "Șterge" sau icon coș de gunoi?
- ✅ Click pe el
- ✅ Apare dialog de confirmare "Ești sigur?"?
- Screenshot: Dialog confirmare
- ✅ Mesajul e clar că ștergerea e PERMANENTĂ?
- ✅ Click "Șterge"
- ✅ Elementul dispare INSTANT fără refresh?
- ✅ Apare success toast?

#### 📊 RAPORTEAZĂ REZULTATELE:

```
FLUX 4: EDIT + DELETE - REZULTATE

✅ Update INSTANT după edit?: DA / NU
✅ Delete INSTANT fără refresh?: DA / NU
❌ Probleme: [listă]
📸 Screenshot-uri: [link-uri]
💯 Scor (1-10): ___/10
```

---

## 🎨 PARTEA 4: TESTARE COMPONENTE UI

### A) FORMULARE - CHECKLIST DETALIAT

Testează pe 3 formulare diferite (ex: Înregistrare, Adaugă Companie, Setări):

#### Pentru FIECARE formular:

**1. Labels și Placeholders**
- [ ] Toate câmpurile au labels clare?
- [ ] Placeholders sunt utile? (nu generice ca "Introdu text")
- [ ] Câmpurile obligatorii au `*` sau alt indicator?

**2. Validare**
- [ ] Validare în timp real (se arată erori în timp ce scrii)?
- [ ] SAU validare la submit (erori apar când dai Submit)?
- [ ] Mesajele de eroare sunt SPECIFICE? ("Email invalid" nu "Eroare")

**3. Focus States**
- [ ] Când dai click într-un câmp, se vede un contur (ring) colorat?
- [ ] Poți naviga cu TAB între câmpuri?
- [ ] Ordinea de TAB are sens logic?

**4. Autocomplete**
- [ ] Browser-ul propune să auto-completeze (nume, email, etc.)?
- [ ] Dacă NU, notează ca problemă (lipsește autocomplete attribute)

**5. Password Fields**
- [ ] Există buton să vezi/ascunzi parola?
- [ ] Dacă NU, notează ca îmbunătățire recomandată

**6. Loading State**
- [ ] La submit, butonul arată "Se procesează..." cu spinner?
- [ ] Butonul se dezactivează în timpul procesării?

**7. Success State**
- [ ] După salvare, apare toast notification?
- [ ] Formularul se închide automat (dacă e dialog)?
- [ ] Datele noi apar INSTANT în listă (fără refresh)?

#### 📊 TEMPLATE RAPORT FORMULAR:

```
FORMULAR: [nume formular, ex: "Adaugă Companie"]

Labels și Placeholders: ✅ / ⚠️ / ❌
Validare: ✅ / ⚠️ / ❌
Focus States: ✅ / ⚠️ / ❌
Autocomplete: ✅ / ❌
Password Visibility: ✅ / ❌ / N/A
Loading State: ✅ / ⚠️ / ❌
Success Feedback: ✅ / ⚠️ / ❌

Probleme găsite:
1. [listă probleme]

Screenshot-uri: [link-uri]
```

---

### B) BUTOANE - INVENTAR COMPLET

Trebuie să faci un tabel cu TOATE butoanele din aplicație.

#### 📋 Template Excel/Google Sheets:

| Pagină | Text Buton | Culoare | Are Icon? | Este Clar ce Face? | Are aria-label? | Screenshot |
|--------|-----------|---------|-----------|-------------------|----------------|-----------|
| Landing | Începe Gratuit | Violet | Nu | ✅ Da - CTA principal | N/A | [link] |
| Dashboard | 🗑️ (icon doar) | Roșu | Da | ⚠️ Ar trebui text "Șterge" | ❌ Nu găsit | [link] |

**Instrucțiuni:**
1. Parcurge FIECARE pagină (Landing, Auth, Dashboard, Settings, etc.)
2. Notează TOATE butoanele vizibile
3. Pentru butoane cu DOAR ICON (fără text):
   - Deschide DevTools (F12)
   - Inspectează butonul
   - Verifică dacă are `aria-label="..."` în HTML
   - Dacă NU are = PROBLEMĂ DE ACCESIBILITATE

---

### C) NOTIFICĂRI (TOAST) - TESTARE

#### Testează 4 tipuri de toast:

**1. Success Toast**
- Acțiune: Salvează ceva cu succes
- ✅ Culoare: Verde?
- ✅ Icon: Checkmark?
- ✅ Mesaj clar?: "Firmă adăugată cu succes!"
- ⏱️ Cât timp rămâne vizibil?: _____ secunde
- Screenshot: Toast success

**2. Error Toast**
- Acțiune: Încearcă să ștergi ceva care generează eroare
- ✅ Culoare: Roșu?
- ✅ Icon: X sau Alert?
- ✅ Mesaj specific?: "Nu s-a putut șterge..." (nu generic "Eroare")
- ⏱️ Cât timp rămâne?: _____ secunde
- Screenshot: Toast error

**3. Warning Toast**
- Acțiune: [găsește o acțiune care generează warning]
- ✅ Culoare: Galben/Portocaliu?
- ✅ Mesaj clar?
- Screenshot: Toast warning

**4. Info Toast**
- Acțiune: [găsește o acțiune care generează info]
- ✅ Culoare: Albastru?
- Screenshot: Toast info

#### 📊 RAPORT TOAST-URI:

```
TOAST NOTIFICATIONS - REZULTATE

Success Toast:
- Culoare: [verde/alta]
- Durată: ___ secunde
- Mesaj clar: ✅ / ❌

Error Toast:
- Culoare: [roșu/alta]
- Durată: ___ secunde
- Mesaj specific: ✅ / ❌

Observații generale:
- Toate toast-urile au aceeași durată?: DA / NU
- Poziția e consistentă?: DA / NU (top-right, bottom-center, etc.)
- Se pot închide manual (buton X)?: DA / NU

Recomandări:
[scrie aici]
```

---

## 📱 PARTEA 5: TESTARE RESPONSIVE (Mobile, Tablet)

### OBLIGATORIU: Testează pe TOATE dispozitivele

#### A) DESKTOP (Chrome, Firefox, Safari)

**1. Redimensionează fereastra browser-ului**
- Fă fereastra MAI MICĂ treptat
- Observă când se schimbă layout-ul (breakpoints)
- ✅ La ce lățime apare hamburger menu?: _____ px
- ✅ Grid-urile se adaptează (3 coloane → 2 coloane → 1 coloană)?

**2. Testează pe 3 rezoluții:**
- Full HD: 1920x1080px
- Laptop: 1366x768px
- Small: 1024x768px

**Template pentru fiecare:**
```
Rezoluție: 1920x1080px
Browser: Chrome
Probleme observate: [listă]
Screenshot: [link]
```

#### B) TABLET (iPad SAU Android Tablet)

**Folosește device real DACĂ posibil. Alternativ: Chrome DevTools Device Mode.**

**1. iPad (768px x 1024px)**
- Orientare: Portrait (vertical)
  - ✅ Meniul e hamburger sau full?
  - ✅ Butoanele sunt suficient de MARI pentru deget? (min 44x44px)
  - ✅ Formularele se completează ușor?
  - Screenshot: Homepage
  - Screenshot: Dashboard
  - Screenshot: Formular

- Orientare: Landscape (orizontal)
  - ✅ Layout-ul se adaptează?
  - ✅ Nu apare scroll orizontal nedorit?
  - Screenshot: Landscape

**2. Android Tablet (800px x 1280px)**
- Repetă testele de mai sus
- ✅ Chrome Android funcționează la fel ca iPad Safari?

#### C) MOBILE (iPhone ȘI Android Phone)

**CRUCIAL: Testează pe DISPOZITIV REAL dacă posibil!**

**1. iPhone (390px x 844px) - Safari iOS**
- Homepage:
  - ✅ Titlul principal e lizibil fără zoom?
  - ✅ Butoanele CTA sunt MARI și ușor de apăsat?
  - ✅ Imaginile se încarcă corect?
  - Screenshot: iPhone homepage

- Formular Înregistrare:
  - ✅ Tastatura se deschide corect?
  - ✅ Câmpul email deschide tastatura cu "@" vizibil?
  - ✅ Câmpul parolă ascunde caracterele?
  - ✅ Butonul Submit e vizibil FĂRĂ să scrollezi?
  - ✅ Poți da zoom dacă vrei? (nu e blocat cu `user-scalable=no`)
  - Screenshot: Formular pe iPhone

- Dashboard:
  - ✅ Graficele sunt lizibile?
  - ✅ Tabele sunt scrollable pe orizontal (dacă sunt late)?
  - Screenshot: Dashboard pe iPhone

**2. Android Phone (360px x 640px) - Chrome Android**
- Repetă toate testele de la iPhone
- ✅ Funcționează la fel ca pe iPhone?
- ✅ Există diferențe majore?

#### 📊 RAPORT RESPONSIVE:

```
RESPONSIVE DESIGN - REZULTATE

Desktop (1920x1080):
- Layout: ✅ Perfect / ⚠️ Minor issues / ❌ Probleme majore
- Probleme: [listă]

Tablet (iPad 768x1024):
- Portrait: ✅ / ⚠️ / ❌
- Landscape: ✅ / ⚠️ / ❌
- Touchable areas (44x44px): ✅ / ❌
- Probleme: [listă]

Mobile (iPhone 390x844):
- Layout: ✅ / ⚠️ / ❌
- Tastatură: ✅ / ⚠️ / ❌
- Butoane touchable: ✅ / ❌
- Zoom permis: ✅ / ❌
- Probleme: [listă]

Mobile (Android 360x640):
- Similar cu iPhone?: ✅ / NU
- Diferențe notabile: [listă]

Screenshot-uri: [link folder Google Drive]

Scor final responsive (1-10): ___/10
```

---

## ♿ PARTEA 6: TESTARE ACCESIBILITATE (A11Y)

### A) NAVIGARE CU TASTATURA (FĂRĂ MOUSE)

**Instrucțiuni:**
- Pune mouse-ul DEPARTE de calculator
- Folosește DOAR tastatura pentru navigare

**1. Testează TAB navigation**
- Deschide homepage (/)
- Apasă TAB repetat
- ✅ Focus ring-ul se vede CLAR pe fiecare element?
- ✅ Ordinea de tab are sens? (stânga → dreapta, sus → jos)
- ✅ Poți accesa TOATE butoanele și link-urile?
- ⏱️ Câte tab-uri trebuie să apeși pentru a ajunge la primul CTA important?: _____

**2. Testează formular cu tastatura**
- Accesează pagina de înregistrare (/auth)
- Apasă TAB până ajungi la primul câmp
- Completează cu tastatura
- Apasă TAB pentru next field
- ✅ Poți completa tot formularul fără mouse?
- ✅ Poți da Submit cu ENTER?

**3. Testează modale/dialoguri**
- Deschide un dialog (ex: Adaugă Companie)
- ✅ Focus-ul merge AUTOMAT în dialog când se deschide?
- ✅ Apasă ESC - se închide dialog-ul?
- ✅ După închidere, focus-ul revine la butonul care l-a deschis?

**4. Testează dropdown-uri și select-uri**
- Găsește un dropdown (ex: filtru sau select)
- ✅ Poți deschide cu ENTER sau SPACE?
- ✅ Poți naviga opțiunile cu săgeți (↑ ↓)?
- ✅ Poți selecta cu ENTER?

#### 📊 RAPORT KEYBOARD NAVIGATION:

```
NAVIGARE TASTATURA - REZULTATE

Tab Navigation:
- Focus ring vizibil: ✅ / ⚠️ / ❌
- Ordinea logică: ✅ / ⚠️ / ❌
- Toate elementele accesibile: ✅ / ❌
- Nr tab-uri până la CTA: _____

Formulare:
- Completare cu tastatura: ✅ / ❌
- Submit cu ENTER: ✅ / ❌

Modale:
- ESC închide: ✅ / ❌
- Focus management: ✅ / ⚠️ / ❌

Dropdown-uri:
- Navigare cu săgeți: ✅ / ⚠️ / ❌

Probleme găsite: [listă]
Screenshot-uri: [focus states vizibile]

Scor (1-10): ___/10
```

---

### B) TESTARE CU SCREEN READER

**⚠️ ATENȚIE:** Acest test necesită experiență cu screen readers!

**Tool-uri:**
- **Windows:** NVDA (gratuit) - https://www.nvaccess.org/download/
- **Mac:** VoiceOver (built-in) - Cmd+F5 pentru activare
- **Chrome Extension:** ChromeVox (pentru teste rapide)

**Test MINIM - Pagina de Login:**

**1. Activează screen reader-ul**
- Windows: Deschide NVDA
- Mac: Cmd+F5

**2. Accesează /auth**
- Lasă screen reader-ul să citească pagina
- ✅ Anunță titlul paginii? "Autentificare"
- ✅ Citește labels pentru câmpuri? "Email", "Parolă"
- ✅ Anunță când un câmp e obligatoriu?

**3. Navighează cu săgețile**
- ✅ Citește fiecare element în ordine logică?
- ✅ Butoanele sunt anunțate ca "button"?
- ✅ Link-urile sunt anunțate ca "link"?

**4. Testează un buton ICON-ONLY**
- Găsește un buton cu doar icon (ex: Edit, Delete)
- ✅ Screen reader-ul citește ce face? ("Editează", "Șterge")
- ❌ Dacă citește doar "button" fără context = PROBLEMĂ!

#### 📊 RAPORT SCREEN READER:

```
SCREEN READER - REZULTATE

Tool folosit: NVDA / VoiceOver / ChromeVox
Pagină testată: /auth (login)

Citește corect:
- Titlu pagină: ✅ / ❌
- Labels câmpuri: ✅ / ❌
- Butoane text: ✅ / ❌
- Butoane icon-only: ✅ / ❌ ⚠️

Probleme critice:
[listă butoane care NU au aria-label]

Audio recording: [link dacă ai înregistrat]

Recomandare: Funcțional / Necesită îmbunătățiri / Probleme majore
```

---

### C) VERIFICARE CONTRAST CULORI (WCAG AA)

**Tool OBLIGATORIU:** WebAIM Contrast Checker - https://webaim.org/resources/contrastchecker/

**Ce trebuie să verifici:**

Găsește 10 combinații de culori din aplicație și verifică-le:

**1. Text pe fundal**
- Exemplu: Text negru (#222) pe fundal alb (#FFF)
- Introdu culorile în WebAIM Contrast Checker
- ✅ Ratio minim pentru text normal: 4.5:1
- ✅ Ratio minim pentru text mare (18px+): 3:1

**2. Butoane**
- Exemplu: Buton Primary - text alb pe fundal violet
- Verifică contrastul

**3. Badge-uri și Labels**
- Exemplu: Badge "Plătitor TVA" - text pe fundal verde
- Verifică contrastul

**4. Text Secondary**
- Exemplu: Text muted-foreground pe fundal
- Verifică contrastul

#### 📋 TEMPLATE EXCEL pentru contrast:

| Element | Culoare Text (Hex) | Culoare Fundal (Hex) | Ratio | Trece WCAG AA? | Screenshot |
|---------|-------------------|---------------------|-------|----------------|-----------|
| Text principal | #1a1a1a | #ffffff | 16.4:1 | ✅ Da | [link] |
| Badge success | #22c55e | #f0fdf4 | 2.1:1 | ❌ Nu | [link] |

**Cum găsești codurile hex:**
1. Deschide DevTools (F12)
2. Inspectează elementul (click dreapta → Inspect)
3. Găsește `color:` și `background-color:` în tab Styles
4. Copiază valorile hex (ex: #22c55e)

#### 📊 RAPORT CONTRAST:

```
CONTRAST CULORI - REZULTATE

Testate: 10 combinații
Trec WCAG AA: ___ / 10

Probleme critice (sub 4.5:1):
1. [element] - Ratio: ___ - Culori: [hex] pe [hex]
2. [element] - Ratio: ___ - Culori: [hex] pe [hex]

Excel complet: [link Google Sheets]

Recomandare: Conformitate completă / Necesită ajustări / Probleme majore
```

---

## ⚡ PARTEA 7: TESTARE PERFORMANȚĂ (GOOGLE LIGHTHOUSE)

### CERINȚĂ: Rulează Lighthouse pe 5 pagini principale

**Pași:**
1. Deschide Chrome (OBLIGATORIU - Lighthouse e built-in)
2. Accesează pagina de testat
3. F12 (DevTools)
4. Tab "Lighthouse"
5. Selectează:
   - ✅ Performance
   - ✅ Accessibility
   - ✅ Best Practices
   - ✅ SEO
6. Mod: Desktop SAU Mobile (testează ambele)
7. Click "Analyze page load"
8. Așteaptă 30-60 secunde
9. Screenshot cu rezultatele

#### Pagini de testat:

**1. Homepage (/)**
- Desktop + Mobile

**2. Auth (/auth)**
- Desktop + Mobile

**3. Demo (/demo)**
- Desktop

**4. Pricing (/pricing)**
- Desktop

**5. Dashboard (/app)** - dacă poți accesa autentificat
- Desktop

#### 📋 TEMPLATE RAPORT per pagină:

```
PAGINĂ: Homepage (/)
MOD: Desktop

Scoruri Lighthouse:
- Performance: ___/100
- Accessibility: ___/100
- Best Practices: ___/100
- SEO: ___/100

Probleme identificate:
[Lighthouse le listează automat - copiază top 3]

Screenshot: [link]

---

PAGINĂ: Homepage (/)
MOD: Mobile

[repetă template]
```

#### 📊 RAPORT FINAL LIGHTHOUSE:

```
LIGHTHOUSE AUDIT - REZUMAT

Pagini testate: 5
Mod: Desktop + Mobile

Scoruri medii:
- Performance: ___/100
- Accessibility: ___/100
- Best Practices: ___/100
- SEO: ___/100

Pagina cea mai lentă: [nume pagină] - Performance: ___
Probleme comune pe toate paginile:
1. [problemă 1]
2. [problemă 2]

Link folder screenshot-uri: [Google Drive]

Recomandare: Excelent (>90) / Bun (70-90) / Necesită îmbunătățiri (<70)
```

---

## 🎯 PARTEA 8: TESTARE CAZURI EXTREME (EDGE CASES)

### A) STĂRI GOALE (EMPTY STATES)

**Test:** Vezi ce se întâmplă când NU există date.

**1. Listă Analize Goală**
- Creează cont NOU sau șterge toate analizele
- Accesează dashboard
- ✅ Vezi mesaj clar? "Nu ai încă analize"
- ✅ Există CTA vizibil? "Încarcă Prima Balanță"
- ✅ Există ilustrație sau icon?
- Screenshot: Empty state dashboard

**2. Căutare Fără Rezultate**
- Găsește o funcție de search
- Caută ceva care sigur NU există
- ✅ Vezi mesaj "Niciun rezultat găsit"?
- ✅ Există sugestie ce să faci? "Încearcă alt termen"
- Screenshot: Search no results

**3. Filtre Fără Rezultate**
- Găsește filtre (ex: pe lista de clienți)
- Selectează combinație care nu returnează nimic
- ✅ Mesaj clar?
- Screenshot: Filtered empty

#### 📊 RAPORT EMPTY STATES:

```
EMPTY STATES - REZULTATE

Testate: 3 scenarii

Dashboard gol:
- Mesaj clar: ✅ / ❌
- CTA vizibil: ✅ / ❌
- Screenshot: [link]

Search no results:
- Mesaj: ✅ / ❌
- Screenshot: [link]

Filtered empty:
- Mesaj: ✅ / ❌
- Screenshot: [link]

Scor general (1-10): ___/10
```

---

### B) STĂRI DE EROARE

**1. Eroare de Rețea**
- Oprește internetul (dezactivează Wi-Fi)
- Încearcă să încarci o pagină sau să faci o acțiune
- ✅ Apare mesaj de eroare clar?
- ✅ Mesajul e util? "Verifică conexiunea la internet"
- Screenshot: Network error

**2. Eroare Server (500)**
- Mai greu de simulat - dacă întâlnești, documentează!
- ✅ Mesaj prietenos sau cod tehnic?

**3. Sesiune Expirată**
- Lasă aplicația deschisă 24 ore
- Încearcă să faci o acțiune
- ✅ Te redirect-ează la login?
- ✅ După reautentificare, revii unde erai?

---

### C) DATE EXTREME

**1. Texte Foarte Lungi**
- Încearcă să introduci titlu cu 500 caractere
- ✅ Se trunchează elegant?
- ✅ Apare eroare de validare?
- Screenshot: Long text

**2. Caractere Speciale**
- Încearcă nume cu emoji: "Firma Mea 🚀💰"
- ✅ Acceptă?
- ✅ Se afișează corect?

**3. Numere Mari**
- Încearcă valori foarte mari în câmpuri numerice
- ✅ Se formează corect? (1000000 → 1.000.000)

---

## 📝 PARTEA 9: RAPORT FINAL

### TEMPLATE RAPORT COMPLET:

```markdown
# RAPORT TESTARE MANUALĂ UX - YANA
**Data:** [data ta]
**Tester:** [numele tău]

---

## 🎬 VIDEO RECORDING
Link: [link Loom/Google Drive]
Durată: ___ minute

---

## 📱 DISPOZITIVE TESTATE

✅ Desktop - Chrome
✅ Desktop - Firefox
✅ Desktop - Safari (dacă ai Mac)
✅ Tablet - iPad / Android
✅ Mobile - iPhone
✅ Mobile - Android

---

## ✅ FLUXURI TESTATE - REZUMAT

| Flux | Funcționează | Probleme | Scor |
|------|-------------|----------|------|
| 1. Sign Up | ✅ Da | 2 minore | 8/10 |
| 2. Login | ✅ Da | 1 medie | 9/10 |
| 3. Upload Balanță | ✅ Da | 0 | 10/10 |
| 4. Edit + Delete | ✅ Da | 1 minoră | 9/10 |

---

## 🎨 COMPONENTE UI - REZUMAT

| Component | Testat | Status | Note |
|-----------|--------|--------|------|
| Formulare | ✅ 3 formulare | ⚠️ Probleme minore | Lipsă autocomplete |
| Butoane | ✅ 15+ butoane | ❌ Probleme A11Y | 5 butoane fără aria-label |
| Toast Notifications | ✅ 4 tipuri | ✅ Perfect | Durate consistente |
| Empty States | ✅ 3 scenarii | ✅ Bine | Mesaje clare |

---

## 📱 RESPONSIVE - REZULTATE

Desktop (1920x1080): ✅ Perfect - 10/10
Tablet (iPad): ⚠️ Minor issues - 8/10
Mobile (iPhone): ⚠️ Butoane mici - 7/10
Mobile (Android): ✅ Similar iPhone - 7/10

Probleme critice: [listă]

---

## ♿ ACCESIBILITATE - REZULTATE

Keyboard Navigation: ✅ Funcționează - 9/10
Screen Reader: ⚠️ 5 butoane fără aria-label - 6/10
Contrast Culori: ⚠️ 2/10 sub WCAG AA - 7/10

Probleme critice:
1. [listă]

---

## ⚡ LIGHTHOUSE - SCORURI MEDII

Performance: ___/100
Accessibility: ___/100
Best Practices: ___/100
SEO: ___/100

---

## 🔴 TOP 10 PROBLEME GĂSITE (PRIORITIZATE)

### PRIORITATE CRITICĂ 🔴

1. **[Titlu problemă]**
   - Descriere: [detalii]
   - Unde: [pagină/component]
   - Impact: [explicație]
   - Screenshot: [link]
   - Soluție propusă: [ce să se facă]

2. **[Problemă 2]**
   - [repetă template]

### PRIORITATE MEDIE 🟡

3. **[Problemă 3]**
   - [template]

### PRIORITATE SCĂZUTĂ 🟢

8. **[Problemă 8]**
   - [template]

---

## ✅ PUNCTE FORTE (Top 5)

1. [ce funcționează excelent]
2. [punct forte 2]
3. [punct forte 3]
4. [punct forte 4]
5. [punct forte 5]

---

## 💯 SCOR FINAL UX

| Categorie | Scor | Maxim |
|-----------|------|-------|
| Funcționalitate | __/10 | 10 |
| Performanță | __/10 | 10 |
| Accesibilitate | __/10 | 10 |
| Responsive | __/10 | 10 |
| Design | __/10 | 10 |
| UX Flow | __/10 | 10 |

**SCOR TOTAL: ___/60**
**SCOR MEDIU: ___/10**

---

## 🎯 RECOMANDARE FINALĂ

☐ ✅ GATA DE LANSARE - Fără probleme blocante
☐ ⚠️ GATA CU REZERVE - Remedieri minore recomandate
☐ ❌ NU ESTE GATA - Probleme critice de rezolvat

**Justificare:**
[explică de ce ai ales opțiunea de mai sus]

**Estimare timp remedieri:** ___ ore/zile

**Data estimată lansare:** [după remedieri]

---

## 📎 ANEXE

- Video recording: [link]
- Screenshot-uri (folder): [link Google Drive]
- Excel contrast culori: [link]
- Excel inventar butoane: [link]
- Lighthouse reports (folder): [link]

---

**✍️ Semnat:**
[Numele tău]
[Data]
```

---

## 📤 LIVRARE RAPORT

### Unde să trimiți raportul:

1. **Email:** [email-ul autorității de supraveghere]
2. **Subject:** "Raport Testare Manuală UX - YANA - [data]"
3. **Atașamente:**
   - Raport Final (PDF sau Markdown)
   - Link Google Drive cu toate dovezile:
     - Video recording (30+ minute)
     - Screenshot-uri (50+ imagini)
     - Excel-uri (contrast, butoane)
     - Lighthouse reports (10+ fișiere)

### Checklist înainte de trimitere:

- [ ] Video recording (min 30 min) - ✅ Încărcat pe Google Drive/Loom
- [ ] Raport final completat (toate secțiunile)
- [ ] Minim 50 screenshot-uri în folder organizat
- [ ] Excel contrast culori (10+ combinații)
- [ ] Excel inventar butoane (15+ butoane)
- [ ] 10+ Lighthouse reports (5 pagini x 2 moduri)
- [ ] Toate link-urile funcționează
- [ ] Folder Google Drive are permisiuni "Anyone with link can view"

---

## ⏰ DEADLINE

**Acest audit complet trebuie finalizat în maxim 48 ore.**

**Estimare timp necesar:**
- Video recording: 30-60 min
- Testare fluxuri: 2-3 ore
- Testare componente: 2-3 ore
- Testare responsive: 2-3 ore
- Testare accesibilitate: 1-2 ore
- Lighthouse audits: 1 oră
- Scriere raport: 2-3 ore

**TOTAL: 10-15 ore de muncă efectivă**

---

## 📞 ÎNTREBĂRI?

Dacă ai întrebări sau întâmpini probleme tehnice în timpul testării:

- **NU improviza** - urmează ghidul exact
- **Documentează orice problemă** - chiar dacă nu e în ghid
- **Fă screenshot-uri la ORICE** lucru suspect
- **Notează-ți observațiile** în timp real, nu la final

**Succes la testare! 🚀**

---

**Creat de:** AI UX Specialist  
**Data:** 26 Ianuarie 2025  
**Versiune:** 1.0 - Complet
