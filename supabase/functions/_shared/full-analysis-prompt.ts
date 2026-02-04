/**
 * PROMPT COMPLET PENTRU ANALIZĂ BALANȚE CONTABILE
 * 
 * ⚠️ PRECIZARE CRITICĂ ⚠️
 * ACEST PROMPT ESTE UNICA SURSĂ DE ADEVĂR PENTRU ANALIZA BALANȚEI CONTABILE
 * 
 * - Oriunde în aplicație se face analiza balanței (tabele, rapoarte, dashboard-uri, API calls, etc.)
 * - Indiferent de interfață sau context (upload PDF, import Excel, Chat AI, generare raport)
 * - Pentru ORICE tip de balanță contabilă (sintetică, analitică, de verificare)
 * 
 * → SE FOLOSEȘTE OBLIGATORIU EXCLUSIV ACEST PROMPT
 * 
 * Nu se acceptă:
 * - ❌ Variante simplificate ale promptului
 * - ❌ Prompturi alternative "pentru cazuri speciale"
 * - ❌ Interpretări locale diferite
 * - ❌ Override-uri sau excepții
 * - ❌ Prompturi "mai rapide" sau "optimizate"
 * 
 * Orice funcționalitate de analiză balanță TREBUIE să folosească acest prompt complet, fără modificări.
 */

export const FULL_ANALYSIS_PROMPT = `Analizeaza balanta atasata urmand urmatoarele Instrucțiuni:

## REGULI FUNDAMENTALE DE INTERPRETARE

### 1. REGULI DE CLASIFICARE ȘI ANALIZĂ

**CLASE 1-5 (Active, Pasive, Capitaluri, Creanțe, Datorii):**
- Analiză EXCLUSIV pe coloana "Solduri finale Debitoare" SAU "Solduri finale Creditoare"
- UN CONT NU POATE AVEA SIMULTAN sold debitor ȘI creditor (≠ 0)
- NU se folosesc coloanele "Rulaje" sau "Total sume"

**CLASE 6-7 (Cheltuieli și Venituri):**
- Analiză EXCLUSIV pe coloanele "Total sume Debitoare" (clasa 6) și "Total sume Creditoare" (clasa 7)
- Aceste conturi se închid lunar → NU trebuie să aibă "Solduri finale"
- "Total sume Debitoare" TREBUIE să fie egal cu "Total sume Creditoare"
- Dacă NU sunt egale → ⚠️ ANOMALIE CONTABILĂ

### 2. POZIȚIONARE NORMALĂ CONTURI CHEIE

**Solduri finale DEBITOARE:**
- 4424 (TVA de recuperat)
- 4111 (Clienți)
- 371 (Mărfuri)
- 301 (Materii prime)
- 5121 (Conturi curente bancare)
- 5311 (Casa în lei) - MAX 50.000 lei

**Solduri finale CREDITOARE:**
- 4423 (TVA de plată)
- 401 (Furnizori)
- 4411 (Impozit pe profit)
- 4418 (Impozit pe venit)
- 421/431/437 (Salarii și contribuții)
- 4551 (Cont curent asociat)

**Rezultat (cont 121):**
- Sold CREDITOR = PROFIT (venituri > cheltuieli)
- Sold DEBITOR = PIERDERE (cheltuieli > venituri)

### 3. PRINCIPII DE INTERPRETARE OBIECTIVĂ

⚠️ **OBLIGATORIU - NU formula concluzii fără bază documentară:**
- NU asocia automat conturi cu situații economice bazate doar pe uzanțe
- NU folosi formulări speculative: "probabil", "pare că", "poate indica"
- Folosește formulări neutre: "Necesită verificare", "Analiză suplimentară recomandată"
- Dacă informația lipsește → STOP analiza și marchează: "⚠️ NU SE POATE CONCLUZIONA - se recomandă verificarea documentelor justificative"

**Exemple interdicții:**
- Cont 462 ≠ automat împrumut de la asociat (doar dacă apare și 4551)
- Cont 7588 ≠ automat subvenție (necesită documentație)

---

## PROCES DE ANALIZĂ - STRUCTURĂ RAPORT

### 0. METADATE

Client: [Nume firmă]
CUI: [___] | J: [___]
Perioadă: [Luna/Anul]
Sursă: Balanță de verificare - sintetică

### 1. SNAPSHOT STRATEGIC

**Calculare Cifră de Afaceri Anuală:**
- Formula: Σ (Total sume creditoare conturi clasa 7) - cont 709 (reduceri comerciale)
- Conturi incluse: 701, 702, 703, 704, 705, 706, 707, 708
- ⚠️ FOLOSEȘTE EXCLUSIV coloana "Total sume Creditoare" (NU "Rulaje perioadă Credit")
- Dacă primești DATE DETERMINISTE la începutul mesajului, folosește valorile de acolo!

**Indicatori Cheie Inițiali:**
- TVA de plată (4423) sold final creditor: [___]
- TVA de recuperat (4424) sold final debitor: [___]
- Clienți (4111) sold final debitor: [___] | DSO: [___] zile
- Furnizori (401) sold final creditor: [___] | DPO: [___] zile
- Impozit (4411/4418) sold final creditor: [___]
- Bănci (5121) sold final debitor: [___]
- Casă (5311) sold final debitor: [___] (⚠️ max 50.000)
- Rezultat (121): Sold [debitor/creditor]: [___]

**Interpretare Preliminară:**
[Evaluare sănătate financiară + direcții de optimizare]

### 2. ANALIZA CONTURILOR CHEIE

**2.1 TVA - Conformare**
> ⚠️ SKIP dacă firma este neplatitoare de TVA (lipsesc conturile 4423, 4424, 4426, 4427)

- 4423 (sold creditor): [___]
- 4424 (sold debitor): [___]
- 4426/4427 (verificare anomalii): [___]
- Riscuri: [___]
- Măsuri: [___]

**2.2 Lichidități (5121/5311)**
- Bănci (5121): [___]
- Casă (5311): [___] (⚠️ verificare plafon 50.000)
- Analiză flux de numerar
- Riscuri: Lichiditate insuficientă, nerespectare legislație
- Recomandări: Management lichiditate, control intern

**2.3 Rezultat (121/117)**
- Verificare: (Total clasa 7 - Total clasa 6) vs Sold cont 121
- ⚠️ IMPORTANT: Diferența între rezultatul calculat (Clasa 7 - Clasa 6) și soldul contului 121 este NORMALĂ pentru balanțe interimare.
- Această diferență poate proveni din: solduri inițiale (cont 1171), ajustări lunare, sau operațiuni de regularizare.
- NU folosi termenul "anomalie majoră" pentru această diferență - folosește "diferență de reconciliere".
- Analiză evoluție rezultat
- Riscuri: Pierderi neidentificate, probleme de lichiditate
- Recomandări: Strategii profitabilitate, management costuri

**2.4 Stocuri și Marjă (607/371)**
> ⚠️ SKIP dacă lipsesc conturile 371, 378, 607, 707 (firmă prestări servicii)

- Marjă brută: [___]
- Rotație stocuri (DIO): [___]
- Stocuri lent circulante
- Riscuri: Deprecieri, costuri depozitare
- Recomandări: Management stocuri, optimizare achiziții

**2.5 Salarii și Contribuții (421/431/437)**
> ⚠️ SKIP dacă lipsesc aceste conturi (firmă fără angajați)

- Verificare conformitate legislație
- Corelarea cu state de salarii
- Riscuri: Amenzi, litigii
- Recomandări: Optimizare costuri, beneficii extra-salariale

**2.6 Alte Cheltuieli/Venituri (6588/7588)**
- Identificare natură și frecvență
- Riscuri: Nedeclarare, tratament fiscal incorect
- Recomandări: Clasificare corectă, conformitate

**2.7 Cont Curent Asociat (4551)**
> ⚠️ NU presupune 462 = asociat dacă nu apare explicit 4551

- Analiză sume, justificare, legalitate
- Riscuri: Reclasificare dividend, implicații fiscale
- Recomandări: Regularizare, documentare

### 3. CONFORMITATE TVA & IMPOZITE

> ⚠️ SKIP dacă firmă neplatitoare TVA

- 4423 (TVA plată) sold creditor: Analiză cauze, riscuri, măsuri
- 4424 (TVA recuperat) sold debitor: Oportunități compensare/rambursare
- 4411/4418 (Impozit): Optimizare bază impozitare, planificare fiscală
- Măsuri optimizare fiscală concrete

### 4. PROFIT vs CASH (BRIDGE)

**Verificare Contabilă:**
Total clasa 7 (Total Sume): [___]
Total clasa 6 (Total Sume): [___]
Rezultat pe perioadă (7 - 6): [___]
Sold cont 121: [___]

📊 **Reconciliere:**
- Dacă rezultatul calculat (7-6) diferă de soldul 121, aceasta este o DIFERENȚĂ DE RECONCILIERE normală
- Cauze frecvente: sold inițial cont 1171 (rezultat reportat), ajustări de regularizare, operațiuni inter-perioade
- NU este o eroare contabilă - este specific balanțelor interimare

**Interpretare Sold 121:**
- Sold DEBITOR → Pierdere: Cauze + măsuri redresare
- Sold CREDITOR → Profit: Surse + strategii consolidare

**Reconciliere Cash:**
EBIT: [___]
+/- Amortizare: [___]
+/- Capital de lucru: [___]
+/- Alte elemente: [___]
= Cash din operațiuni: [___]

Interpretare: Relație profit-cash, blocaje, strategii optimizare

### 5. INDICATORI-CHEIE

**DSO** (Days Sales Outstanding): 4111 mediu / Vânzări zilnice
- Analiză, tendințe, comparații industrie
- Recomandări optimizare ciclu încasare

**DPO** (Days Payable Outstanding): 401 mediu / Achiziții zilnice
- Analiză, tendințe, comparații industrie
- Recomandări optimizare ciclu plată

**DIO** (Days Inventory Outstanding): 371 mediu / COGS zilnic
- Analiză, tendințe, comparații industrie
- Recomandări management stocuri

**Marjă brută**: (Vânzări - COGS) / Vânzări
- Analiză, tendințe, strategie prețuri/costuri

**Lichiditate curentă**: Active curente / Datorii curente
- Analiză, recomandări menținere lichiditate optimă

### 6. ANOMALII & ALERTE

- Solduri atipice (474, 461, 462, 409, 419, 542, 581): Cauze, măsuri corective
- Casă > 50.000: Riscuri fiscale, măsuri conformitate
- Solduri anormale 4426/4427: Măsuri corecție
- Conturi 6/7 cu solduri finale: Măsuri corecție contabilă

### 7. VERIFICARE CIFRĂ DE AFACERI - PLAFOANE FISCALE

**Extragere CA:**
- Total conturi 700-709 (Total Sume): [___]

**Analiză Plafoane Microîntreprinderi:**

*Până la 31.12.2025:*
- Plafon max: 250.000 EUR (~1.243.525 RON)
- Cote: 1% (până 60.000 EUR) | 3% (60.000-250.000 EUR)
- Coduri CAEN speciale (HoReCa, stomatologie, IT): 3% fix

*Începând cu 01.01.2026:*
- Plafon max: 100.000 EUR

**Evaluare:**
- Încadrare actuală: [___]
- Risc depășire: [___]
- Recomandări: Strategii optimizare, planificare tranziție 2026

**Analiză Plafon TVA:**

*Până la 31.08.2025:*
- Plafon scutire: 300.000 RON

*Începând cu 01.09.2025:*
- Plafon scutire: 395.000 RON

**Evaluare:**
- Situație vs plafon: [___]
- Risc depășire: [___]
- Recomandări: Măsuri preventive, analiză avantaje înregistrare TVA voluntară

### 8. VERIFICARE ACTIV NET

**Analiză:** Activ net vs 50% Capital social
- Activ net curent: [___]
- 50% Capital social: [___]
- Status: [OK / ⚠️ ALERT - sub jumătate]
- Implicații legale: [___]
- Măsuri necesare: [___]

### 9. REZUMAT EXECUTIV & PLAN DE ACȚIUNE

**Top Constatări:**
1. [___]
2. [___]
3. [___]

**Plan Prioritizat (max 12 puncte):**

| Prioritate | Acțiune | Responsabil | Termen | Impact Estimat |
|------------|---------|-------------|--------|----------------|
| 1 | [___] | [___] | [___] | [___] |
| 2 | [___] | [___] | [___] | [___] |
| ... | | | | |

---

## FORMAT RĂSPUNS

- Comunicare: Raport narativ, coerent
- Stil: Profesional, direct, acționabil
- Limbaj: Română tehnică contabilă
- Structură: Urmează exact secțiunile 0-9
- Output: Text curat, fără formatare markdown excesivă

---

## INDICATORI FINANCIARI STRUCTURAȚI (OBLIGATORIU LA SFÂRȘIT)

🔴 ABSOLUT OBLIGATORIU 🔴

LA SFÂRȘITUL ANALIZEI, ADAUGĂ O SECȚIUNE CU TITLUL "=== INDICATORI FINANCIARI ===" și include următorii indicatori în format structurat.

ATENȚIE: ACEASTA NU ESTE OPȚIONALĂ! Fără această secțiune, analiza este incompletă și va genera erori în sistem!

=== INDICATORI FINANCIARI ===
DSO: [valoare_numerică]
DPO: [valoare_numerică]
DIO: [valoare_numerică]
CCC: [valoare_numerică]
EBITDA: [valoare_numerică]
CA: [valoare_numerică]
Cheltuieli: [valoare_numerică]
Profit: [valoare_numerică]
Sold Furnizori: [valoare_numerică]
Sold Clienti: [valoare_numerică]
Sold Banca: [valoare_numerică]
Sold Casa: [valoare_numerică]

Unde:
- DSO (Days Sales Outstanding) = (Clienți / Cifra de afaceri) × 365
- DPO (Days Payable Outstanding) = (Furnizori / Cheltuieli) × 365
- DIO (Days Inventory Outstanding) = (Stocuri / Cost marfă) × 365 (dacă aplicabil)
- CCC (Cash Conversion Cycle) = DSO + DIO - DPO
- EBITDA = calculat din date disponibile
- CA = Cifra de afaceri totală (total clasa 7)
- Cheltuieli = Total cheltuieli (total clasa 6)
- Profit = sold cont 121 (creditor = profit, debitor = pierdere cu semnul minus)

IMPORTANT: Această secțiune trebuie să apară OBLIGATORIU la sfârșitul fiecărei analize, cu valorile numerice clare (fără separatori de mii, doar punct pentru zecimale, fără RON).

Exemplu de format corect:
=== INDICATORI FINANCIARI ===
DSO: 45.5
DPO: 30.2
DIO: 25.0
CCC: 40.3
EBITDA: 261909.27
CA: 1080733.22
Cheltuieli: 818823.95
Profit: 261909.27
Sold Furnizori: 150000.00
Sold Clienti: 200000.00
Sold Banca: 50000.00
Sold Casa: 5000.00

REPETĂM: ACEASTĂ SECȚIUNE ESTE OBLIGATORIE! NU UITA SĂ O ADAUGI LA SFÂRȘIT!`;

// Export pentru utilizare în edge functions
export function getFullAnalysisPrompt(): string {
  return FULL_ANALYSIS_PROMPT;
}
