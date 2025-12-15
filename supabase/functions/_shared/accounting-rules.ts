/**
 * REGULI CONTABILE PARTAJATE
 * 
 * Acest fișier centralizează regulile de interpretare contabilă
 * folosite atât de analyze-balance cât și de chat-ai.
 * 
 * O singură sursă de adevăr pentru reguli contabile!
 */

export const ACCOUNTING_RULES = `
🔴 **REGULI CONTABILE FUNDAMENTALE** 🔴

=== REGULĂ CRITICĂ - CONTUL 121 (Profit sau Pierdere) ===

ATENȚIE MAXIMĂ LA INTERPRETAREA CONTULUI 121:
• Contul 121 se analizează EXCLUSIV pe coloana "SOLDURI FINALE"
• Sold final CREDITOR pe contul 121 = PROFIT (veniturile > cheltuielile)
• Sold final DEBITOR pe contul 121 = PIERDERE (cheltuielile > veniturile)

**EXEMPLU CONCRET:**
- Dacă contul 121 are "Solduri finale" → Debit: 5.052,09 și Credit: 0,00
  → Acest sold DEBITOR înseamnă PIERDERE de 5.052,09 RON
- Dacă contul 121 are "Solduri finale" → Debit: 0,00 și Credit: 5.052,09
  → Acest sold CREDITOR înseamnă PROFIT de 5.052,09 RON

NU confunda "Rulaje perioadă" cu "Solduri finale"!
NU inversa interpretarea! Sold DEBITOR pe 121 = PIERDERE, NU profit!

=== ANALIZĂ DIFERENȚIATĂ PE CLASE ===

**CLASE 1-5 (Balanță - Active/Pasive/Capital):**
• Analizează EXCLUSIV coloana "Solduri finale" (Debit și Credit)
• Fiecare cont trebuie să aibă DOAR sold debitor SAU sold creditor, NU ambele
• Dacă un cont are ambele solduri completate → ANOMALIE GRAVĂ
• Conturile cu sold final 0.00 pe ambele coloane = INEXISTENTE (nu le raporta)

**CLASE 6-7 (Profit & Pierdere - Cheltuieli/Venituri):**
• Analizează EXCLUSIV coloana "Rulaje perioadă" SAU "Total sume" (Debit și Credit)
• Pentru fiecare cont, rulajul DEBIT trebuie să fie EGAL cu rulajul CREDIT
• Dacă Rulaj Debit ≠ Rulaj Credit → ANOMALIE
• Soldurile finale pentru conturile 6-7 trebuie să fie 0 (se închid lunar/anual)

=== CONTURI SPECIFICE ȘI INTERPRETARE ===

**Clasa 4 (Terți):**
• Contul 4111 (Clienți) - sold final DEBITOR (creanțe de încasat)
• Contul 401 (Furnizori) - sold final CREDITOR (datorii de plătit)
• Contul 4423 (TVA de plată) - sold final CREDITOR
• Contul 4424 (TVA de recuperat) - sold final DEBITOR
• Contul 4411 (Impozit pe profit) - sold final CREDITOR
• Contul 4418 (Impozit pe venit) - sold final CREDITOR
• Conturile de salarii și contribuții (4xx) - solduri finale CREDITOARE

**Clasa 5 (Trezorerie - DISPONIBILITĂȚI):**
🔴 CRITICE - Toate conturile din clasa 5 au solduri finale DEBITOARE:
• Contul 5121 - Conturi la bănci în LEI
• Contul 5124 - Conturi la bănci în VALUTĂ (EUR, USD, etc.)
• Contul 5125 - Sume în curs de decontare (NU este cont de bancă în valută, ci sume temporare în tranzit, ex: încasări cu cardul în curs de procesare)
• Contul 5311 - Casa în lei (numerar)
• Contul 5314 - Casa în valută (numerar în valută)

IMPORTANT: Pentru calculul disponibilităților totale, însumează:
Cash Total = 5121 + 5124 + 5125 + 5311 + 5314

=== PREVENIREA ASOCIERILOR ERONATE ===

1. NU formula concluzii privind natura sumelor decât dacă informația este explicit menționată în balanță
2. NU asocia automat un cont cu o situație economică doar pe baza uzanțelor contabile
   • Contul 462 NU se asociază automat cu împrumuturi de la asociați dacă lipsește contul 4551
   • Contul 7588 NU se tratează ca subvenție fără documentație
3. NU utiliza formulări speculative ("probabil", "pare că", "poate indica")
   • Folosește: "Necesită verificare" sau "Analiză suplimentară recomandată"
4. Dacă informația lipsește sau este ambiguă:
   → "Pe baza datelor disponibile, nu se poate formula o concluzie corectă."

=== INDICATORI FINANCIARI ===

**DSO (Days Sales Outstanding):**
DSO = (Cont 4111 Clienți / Cifra de afaceri) × 365 zile

**DPO (Days Payable Outstanding):**
DPO = (Cont 401 Furnizori / Cheltuieli totale) × 365 zile

**DIO (Days Inventory Outstanding):**
DIO = (Stocuri clasa 3 / Cost marfă) × 365 zile

**Cash Conversion Cycle:**
CCC = DSO + DIO - DPO (cu cât este mai mic, cu atât mai bine)

**Lichiditate:**
• Cash disponibil = 5121 + 5124 + 5125 + 5311 + 5314
• Current Ratio = Active curente / Pasive curente
• Quick Ratio = (Active curente - Stocuri) / Pasive curente

**Profitabilitate:**
• Marja brută % = (Venituri - Cost marfă) / Venituri × 100
• Marja netă % = Profit net / Cifra de afaceri × 100

=== CIFRA DE AFACERI ===

Cifra de afaceri se calculează prin însumarea "Total sume creditoare" din clasa 7:
• Grupa 70: conturi 701, 702, 703, 704, 705, 706, 707, 708
• MINUS reduceri comerciale din contul 709 (dacă există)
• Se folosesc rulajele (total sume creditoare), NU soldurile finale

=== REGULI DE ACURATEȚE ===

• NU inventa, NU aproxima, NU rotunjește valori
• Raportează EXACT valorile din balanță, CU TOATE ZECIMALELE
• Dacă un cont are sold 290.00 RON, scrii EXACT "290.00 RON"
• NU menționa un cont dacă SOLD FINAL este 0.00 sau lipsește
• NU confunda "Solduri inițiale" sau "Rulaje" cu "Solduri finale"
`;

// Export pentru utilizare în edge functions
export function getAccountingRulesPrompt(): string {
  return ACCOUNTING_RULES;
}
