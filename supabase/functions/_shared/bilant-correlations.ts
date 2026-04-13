/**
 * CORELAȚII ANAF PENTRU SITUAȚII FINANCIARE
 * Sursa: https://static.anaf.ro/static/10/Anaf/Aplicatii/22/directiva4/Corelatii.txt
 * 
 * Formule: FF.RR.C = cod formular.nr rand.nr coloana
 * F10 = Bilanț, F20 = Cont Profit și Pierdere, F30 = Date Informative, F40 = Situația Activelor Imobilizate
 */

// ═══════════════════════════════════════
// BILANȚ (cod 10) — Corelații interne
// ═══════════════════════════════════════
export const BILANT_CORRELATIONS = {
  // Active imobilizate
  'rd06': { formula: 'rd01 + rd02 + rd03 + rd04 + rd05', label: 'I. IMOBILIZĂRI - TOTAL' },
  'rd11': { formula: 'rd07 + rd08 + rd09 + rd10', label: 'II. ACTIVE CIRCULANTE - subtotal stocuri' },
  'rd18': { formula: 'rd12 + rd13 + rd14 + rd15 + rd16 + rd17', label: 'II. ACTIVE CIRCULANTE - subtotal creanțe' },
  'rd19': { formula: 'rd06 + rd11 + rd18', label: 'ACTIVE CIRCULANTE - TOTAL' },
  'rd24': { formula: 'rd20 + rd21 + rd22 + rd23', label: 'III. CHELTUIELI ÎN AVANS' },
  'rd30': { formula: 'rd25 + rd26 + rd27 + rd28 + rd29', label: 'DATORII PE TERMEN SCURT' },
  'rd33': { formula: 'rd31 + rd32', label: 'E. ACTIVE CIRCULANTE/DATORII CURENTE NETE' },
  'rd35': { formula: 'rd24 + rd30 + rd33 + rd34', label: 'F. TOTAL ACTIVE MINUS DATORII CURENTE' },
  'rd45': { formula: 'rd37 + rd38 + rd39 + rd40 + rd41 + rd42 + rd43 + rd44', label: 'G. DATORII PE TERMEN LUNG' },
  'rd46': { formula: 'rd35 + rd36 - rd45 - rd62', label: 'H. PROVIZIOANE' },
  'rd47': { formula: 'rd19 + rd46', label: 'I. VENITURI ÎN AVANS' },
  'rd56': { formula: 'rd48 + rd49 + rd50 + rd51 + rd52 + rd53 + rd54 + rd55', label: 'J. CAPITAL ȘI REZERVE' },
  'rd60': { formula: 'rd57 + rd58 + rd59', label: 'Capital subscris' },
  'rd63': { formula: 'rd61 + rd62', label: 'Patrimoniul public' },
  'rd67': { formula: 'rd64 + rd65 + rd66', label: 'Rezerve din reevaluare' },
  'rd74': { formula: 'rd70 + rd71 + rd72 + rd73', label: 'Rezerve' },
  'rd83': { formula: 'rd67 + rd68 + rd69 + rd74 - rd75 + rd76 - rd77 + rd78 - rd79 + rd80 - rd81 - rd82', label: 'CAPITALURI PROPRII - TOTAL' },
  'rd85': { formula: 'rd83 + rd84', label: 'CAPITALURI - TOTAL' },

  // Corelație fundamentală bilanț
  'balance_check': { formula: 'rd85 == rd47 - rd56 - rd60 - rd61', label: 'VERIFICARE ECHILIBRU BILANȚIER' },
};

// ═══════════════════════════════════════
// BILANȚ PRESCURTAT (cod 10) — Corelații
// ═══════════════════════════════════════
export const BILANT_PRESCURTAT_CORRELATIONS = {
  'rd04': { formula: 'rd01 + rd02 + rd03', label: 'ACTIVE IMOBILIZATE - TOTAL' },
  'rd09': { formula: 'rd05 + rd06 + rd07 + rd08', label: 'ACTIVE CIRCULANTE - TOTAL' },
  'rd12': { formula: 'rd09 + rd10 - rd11 - rd18', label: 'ACTIVE CIRCULANTE NETE' },
  'rd13': { formula: 'rd04 + rd12', label: 'TOTAL ACTIV NET' },
  'rd16': { formula: 'rd17 + rd18', label: 'Venituri în avans' },
  'rd19': { formula: 'rd20 + rd21 + rd22', label: 'Capital' },
  'rd34': { formula: 'rd19 + rd23 + rd24 + rd25 - rd26 + rd27 - rd28 + rd29 - rd30 + rd31 - rd32 - rd33', label: 'CAPITALURI PROPRII - TOTAL' },
  'rd36': { formula: 'rd34 + rd35', label: 'CAPITALURI - TOTAL' },
  'balance_check': { formula: 'rd36 == rd13 - rd14 - rd15 - rd17', label: 'VERIFICARE ECHILIBRU' },
};

// ═══════════════════════════════════════
// CONT PROFIT ȘI PIERDERE (cod 20)
// ═══════════════════════════════════════
export const CPP_CORRELATIONS = {
  'rd01': { formula: 'rd02 + rd03 + rd04 + rd05', label: 'Cifra de afaceri netă', constraint: '>= 0' },
  'rd10': { formula: 'rd01 + rd06 - rd07 + rd08 + rd09', label: 'VENITURI DIN EXPLOATARE - TOTAL' },
  'rd15': { formula: 'rd16 + rd17', label: 'Cheltuieli cu personalul' },
  'rd18': { formula: 'rd19 - rd20', label: 'Ajustări de valoare privind imobilizările' },
  'rd21': { formula: 'rd22 - rd23', label: 'Ajustări de valoare privind activele circulante' },
  'rd24': { formula: 'rd25 + rd26 + rd27 + rd28', label: 'Alte cheltuieli de exploatare' },
  'rd29': { formula: 'rd30 - rd31', label: 'Ajustări privind provizioanele' },
  'rd32': { formula: 'rd11 + rd12 + rd13 + rd14 + rd15 + rd18 + rd21 + rd24 + rd29', label: 'CHELTUIELI DE EXPLOATARE - TOTAL' },
  'rd33': { formula: 'rd10 - rd32 (dacă > 0)', label: 'PROFIT DIN EXPLOATARE' },
  'rd34': { formula: 'rd32 - rd10 (dacă > 0)', label: 'PIERDERE DIN EXPLOATARE' },
  'rd42': { formula: 'rd35 + rd37 + rd39 + rd41', label: 'VENITURI FINANCIARE - TOTAL' },
  'rd43': { formula: 'rd44 - rd45', label: 'Ajustări de valoare financiare' },
  'rd49': { formula: 'rd43 + rd46 + rd48', label: 'CHELTUIELI FINANCIARE - TOTAL' },
  'rd50': { formula: 'rd42 - rd49 (dacă > 0)', label: 'PROFIT FINANCIAR' },
  'rd51': { formula: 'rd49 - rd42 (dacă > 0)', label: 'PIERDERE FINANCIARĂ' },
  'rd52': { formula: 'rd10 + rd42 - rd32 - rd49 (dacă > 0)', label: 'PROFIT CURENT' },
  'rd53': { formula: 'rd32 + rd49 - rd10 - rd42 (dacă > 0)', label: 'PIERDERE CURENTĂ' },
  'rd58': { formula: 'rd10 + rd42 + rd54', label: 'VENITURI TOTALE' },
  'rd59': { formula: 'rd32 + rd49 + rd55', label: 'CHELTUIELI TOTALE' },
  'rd60': { formula: 'rd58 - rd59 (dacă > 0)', label: 'PROFIT BRUT' },
  'rd61': { formula: 'rd59 - rd58 (dacă > 0)', label: 'PIERDERE BRUTĂ' },
  'rd64': { formula: 'rd60 - rd61 - rd62 - rd63 (dacă > 0)', label: 'PROFIT NET' },
  'rd65': { formula: 'rd61 + rd62 + rd63 - rd60 (dacă > 0)', label: 'PIERDERE NETĂ' },
};

// Constrângeri CPP
export const CPP_CONSTRAINTS = [
  { rule: 'rd35 >= rd36', label: 'Venituri din dobânzi >= Venituri din entități afiliate' },
  { rule: 'rd37 >= rd38', label: 'Cheltuieli cu dobânzile >= Cheltuieli din entități afiliate' },
  { rule: 'rd39 >= rd40', label: 'Venituri/cheltuieli financiare coerente' },
  { rule: 'rd46 >= rd47', label: 'Cheltuieli financiare coerente' },
];

// ═══════════════════════════════════════
// CORELAȚII INTER-FORMULARE
// ═══════════════════════════════════════
export const CROSS_FORM_CORRELATIONS = {
  bilant_cpp: [
    { left: '10.80.1', right: '20.64.1', label: 'Profit exercițiu (sold inițial)' },
    { left: '10.81.1', right: '20.65.1', label: 'Pierdere exercițiu (sold inițial)' },
    { left: '10.80.2', right: '20.64.2', label: 'Profit exercițiu (sold final)' },
    { left: '10.81.2', right: '20.65.2', label: 'Pierdere exercițiu (sold final)' },
  ],
  bilant_f30: [
    { left: '10.80.2', right: '30.01.2', label: 'Profit net = Date informative profit' },
    { left: '10.81.2', right: '30.02.2', label: 'Pierdere netă = Date informative pierdere' },
    { rule: '10.45.2 + 10.56.2 >= 30.03.1', label: 'Active nete >= Număr salariați' },
  ],
  bilant_f40: [
    { left: '10.06.1', right: '40.04.1 - 40.15.6 - 40.25.10', label: 'Imobilizări necorporale (inițial)' },
    { left: '10.06.2', right: '40.04.5 - 40.15.9 - 40.25.13', label: 'Imobilizări necorporale (final)' },
    { left: '10.11.1', right: '40.10.1 - 40.20.6 - 40.31.10', label: 'Imobilizări corporale (inițial)' },
    { left: '10.11.2', right: '40.10.5 - 40.20.9 - 40.31.13', label: 'Imobilizări corporale (final)' },
    { left: '10.18.1', right: '40.11.1 - 40.32.10', label: 'Imobilizări financiare (inițial)' },
    { left: '10.18.2', right: '40.11.5 - 40.32.13', label: 'Imobilizări financiare (final)' },
  ],
  bilant_prescurtat_cpp: [
    { left: '10.31.1', right: '20.64.1', label: 'Profit exercițiu (sold inițial)' },
    { left: '10.32.1', right: '20.65.1', label: 'Pierdere exercițiu (sold inițial)' },
    { left: '10.31.2', right: '20.64.2', label: 'Profit exercițiu (sold final)' },
    { left: '10.32.2', right: '20.65.2', label: 'Pierdere exercițiu (sold final)' },
  ],
};

// ═══════════════════════════════════════
// CONSTRÂNGERI SUPLIMENTARE ANAF
// ═══════════════════════════════════════
export const BILANT_CONSTRAINTS = [
  { rule: 'rd67 + rd84 >= 0', col: 1, label: 'Capital propriu + Rezultat >= 0 (sold inițial)' },
  { rule: 'rd67 + rd84 > 0', col: 2, label: 'Capital propriu + Rezultat > 0 (sold final, posibil =0 la sucursale)' },
  { field: 'rd64', constraint: '>= 0', label: 'Capital subscris vărsat >= 0' },
  { field: 'rd65', constraint: '>= 0', label: 'Capital subscris nevărsat >= 0' },
  { field: 'rd66', constraint: '>= 0', label: 'Patrimoniul regiei >= 0' },
  { field: 'rd68', constraint: '>= 0', label: 'Prime de capital >= 0' },
  { field: 'rd70', constraint: '>= 0', label: 'Rezerve legale >= 0' },
  { field: 'rd71', constraint: '>= 0', label: 'Rezerve statutare >= 0' },
  { field: 'rd72', constraint: '>= 0', label: 'Alte rezerve >= 0' },
  { field: 'rd73', constraint: '>= 0', label: 'Rezerve de reevaluare >= 0' },
];

// ═══════════════════════════════════════
// MAPARE CONTURI → RÂNDURI BILANȚ
// ═══════════════════════════════════════
export const ACCOUNT_TO_BILANT_MAP: Record<string, { rd: string; col: 'debit' | 'credit'; section: string }> = {
  // ACTIVE IMOBILIZATE
  '201': { rd: 'rd01', col: 'debit', section: 'Cheltuieli de constituire' },
  '203': { rd: 'rd02', col: 'debit', section: 'Cheltuieli de dezvoltare' },
  '205': { rd: 'rd03', col: 'debit', section: 'Concesiuni, brevete' },
  '207': { rd: 'rd03', col: 'debit', section: 'Fond comercial' },
  '208': { rd: 'rd04', col: 'debit', section: 'Alte imobilizări necorporale' },
  '211': { rd: 'rd07', col: 'debit', section: 'Terenuri' },
  '212': { rd: 'rd08', col: 'debit', section: 'Construcții' },
  '213': { rd: 'rd08', col: 'debit', section: 'Instalații tehnice' },
  '214': { rd: 'rd08', col: 'debit', section: 'Alte instalații' },
  '2131': { rd: 'rd08', col: 'debit', section: 'Echipamente tehnologice' },
  '2133': { rd: 'rd09', col: 'debit', section: 'Mijloace de transport' },
  '231': { rd: 'rd10', col: 'debit', section: 'Imobilizări în curs' },
  '261': { rd: 'rd12', col: 'debit', section: 'Acțiuni deținute la entități afiliate' },
  '263': { rd: 'rd13', col: 'debit', section: 'Alte titluri imobilizate' },
  '267': { rd: 'rd14', col: 'debit', section: 'Creanțe imobilizate' },
  
  // ACTIVE CIRCULANTE - STOCURI
  '301': { rd: 'rd20', col: 'debit', section: 'Materii prime' },
  '302': { rd: 'rd20', col: 'debit', section: 'Materiale consumabile' },
  '303': { rd: 'rd20', col: 'debit', section: 'Materiale de natura obiectelor' },
  '331': { rd: 'rd21', col: 'debit', section: 'Producția în curs' },
  '341': { rd: 'rd22', col: 'debit', section: 'Semifabricate' },
  '345': { rd: 'rd22', col: 'debit', section: 'Produse finite' },
  '354': { rd: 'rd22', col: 'debit', section: 'Produse reziduale' },
  '371': { rd: 'rd23', col: 'debit', section: 'Mărfuri' },
  '381': { rd: 'rd23', col: 'debit', section: 'Ambalaje' },
  
  // CREANȚE
  '4111': { rd: 'rd25', col: 'debit', section: 'Clienți' },
  '4118': { rd: 'rd25', col: 'debit', section: 'Clienți incerți' },
  '409': { rd: 'rd26', col: 'debit', section: 'Furnizori-debitori' },
  '4424': { rd: 'rd28', col: 'debit', section: 'TVA de recuperat' },
  '4428': { rd: 'rd28', col: 'debit', section: 'TVA neexigibilă' },
  '445': { rd: 'rd28', col: 'debit', section: 'Subvenții' },
  '461': { rd: 'rd27', col: 'debit', section: 'Debitori diverși' },
  
  // DISPONIBILITĂȚI
  '5121': { rd: 'rd29', col: 'debit', section: 'Conturi la bănci în lei' },
  '5124': { rd: 'rd29', col: 'debit', section: 'Conturi la bănci în valută' },
  '5311': { rd: 'rd29', col: 'debit', section: 'Casa în lei' },
  '5314': { rd: 'rd29', col: 'debit', section: 'Casa în valută' },
  '508': { rd: 'rd29', col: 'debit', section: 'Alte investiții pe termen scurt' },
  
  // DATORII
  '401': { rd: 'rd31', col: 'credit', section: 'Furnizori' },
  '403': { rd: 'rd31', col: 'credit', section: 'Efecte de plătit' },
  '404': { rd: 'rd31', col: 'credit', section: 'Furnizori de imobilizări' },
  '419': { rd: 'rd32', col: 'credit', section: 'Clienți-creditori' },
  '421': { rd: 'rd33', col: 'credit', section: 'Personal - salarii datorate' },
  '431': { rd: 'rd34', col: 'credit', section: 'Asigurări sociale' },
  '437': { rd: 'rd34', col: 'credit', section: 'Ajutor de șomaj' },
  '4411': { rd: 'rd35', col: 'credit', section: 'Impozit pe profit' },
  '4423': { rd: 'rd36', col: 'credit', section: 'TVA de plată' },
  '446': { rd: 'rd35', col: 'credit', section: 'Alte impozite și taxe' },
  '462': { rd: 'rd37', col: 'credit', section: 'Creditori diverși' },
  '1621': { rd: 'rd38', col: 'credit', section: 'Credite bancare pe termen lung' },
  '167': { rd: 'rd39', col: 'credit', section: 'Alte împrumuturi' },
  '4551': { rd: 'rd40', col: 'credit', section: 'Asociați - conturi curente' },
  
  // CAPITALURI
  '1012': { rd: 'rd64', col: 'credit', section: 'Capital subscris vărsat' },
  '1011': { rd: 'rd65', col: 'credit', section: 'Capital subscris nevărsat' },
  '104': { rd: 'rd68', col: 'credit', section: 'Prime de capital' },
  '105': { rd: 'rd69', col: 'credit', section: 'Rezerve din reevaluare' },
  '1061': { rd: 'rd70', col: 'credit', section: 'Rezerve legale' },
  '1063': { rd: 'rd71', col: 'credit', section: 'Rezerve statutare' },
  '1068': { rd: 'rd72', col: 'credit', section: 'Alte rezerve' },
  '117': { rd: 'rd76', col: 'credit', section: 'Rezultatul reportat' },
  '121': { rd: 'rd78', col: 'credit', section: 'Profit sau pierdere' },
  '129': { rd: 'rd82', col: 'credit', section: 'Repartizarea profitului' },
  
  // AMORTIZĂRI (se scad)
  '2801': { rd: 'rd01', col: 'credit', section: 'Amortizare cheltuieli constituire' },
  '2803': { rd: 'rd02', col: 'credit', section: 'Amortizare cheltuieli dezvoltare' },
  '2805': { rd: 'rd03', col: 'credit', section: 'Amortizare concesiuni' },
  '2808': { rd: 'rd04', col: 'credit', section: 'Amortizare alte imobilizări necorporale' },
  '2811': { rd: 'rd07', col: 'credit', section: 'Amortizare terenuri' },
  '2812': { rd: 'rd08', col: 'credit', section: 'Amortizare construcții' },
  '2813': { rd: 'rd08', col: 'credit', section: 'Amortizare instalații' },
};

// ═══════════════════════════════════════
// MAPARE CONTURI → RÂNDURI CPP
// ═══════════════════════════════════════
export const ACCOUNT_TO_CPP_MAP: Record<string, { rd: string; type: 'venit' | 'cheltuiala'; section: string }> = {
  // VENITURI DIN EXPLOATARE
  '701': { rd: 'rd02', type: 'venit', section: 'Vânzări de produse finite' },
  '702': { rd: 'rd02', type: 'venit', section: 'Vânzări de semifabricate' },
  '703': { rd: 'rd03', type: 'venit', section: 'Venituri din vânzarea produselor reziduale' },
  '704': { rd: 'rd03', type: 'venit', section: 'Venituri din lucrări/servicii' },
  '705': { rd: 'rd03', type: 'venit', section: 'Venituri din studii și cercetări' },
  '706': { rd: 'rd04', type: 'venit', section: 'Venituri din redevențe' },
  '707': { rd: 'rd05', type: 'venit', section: 'Venituri din vânzarea mărfurilor' },
  '711': { rd: 'rd06', type: 'venit', section: 'Venituri aferente costurilor stocurilor' },
  '721': { rd: 'rd08', type: 'venit', section: 'Venituri din producția de imobilizări' },
  '758': { rd: 'rd09', type: 'venit', section: 'Alte venituri din exploatare' },
  '7588': { rd: 'rd09', type: 'venit', section: 'Alte venituri din exploatare' },
  
  // CHELTUIELI DE EXPLOATARE
  '601': { rd: 'rd11', type: 'cheltuiala', section: 'Cheltuieli cu materiile prime' },
  '602': { rd: 'rd11', type: 'cheltuiala', section: 'Cheltuieli cu materialele consumabile' },
  '604': { rd: 'rd11', type: 'cheltuiala', section: 'Cheltuieli cu materialele nestocate' },
  '605': { rd: 'rd11', type: 'cheltuiala', section: 'Cheltuieli privind energia' },
  '607': { rd: 'rd12', type: 'cheltuiala', section: 'Cheltuieli privind mărfurile' },
  '611': { rd: 'rd13', type: 'cheltuiala', section: 'Cheltuieli cu întreținerea' },
  '612': { rd: 'rd13', type: 'cheltuiala', section: 'Cheltuieli cu redevențe' },
  '613': { rd: 'rd13', type: 'cheltuiala', section: 'Cheltuieli cu primele de asigurare' },
  '621': { rd: 'rd14', type: 'cheltuiala', section: 'Cheltuieli cu colaboratorii' },
  '622': { rd: 'rd14', type: 'cheltuiala', section: 'Cheltuieli privind comisioanele' },
  '623': { rd: 'rd14', type: 'cheltuiala', section: 'Cheltuieli de protocol' },
  '624': { rd: 'rd14', type: 'cheltuiala', section: 'Cheltuieli cu transportul' },
  '625': { rd: 'rd14', type: 'cheltuiala', section: 'Cheltuieli cu deplasări' },
  '626': { rd: 'rd14', type: 'cheltuiala', section: 'Cheltuieli poștale și telecomunicații' },
  '627': { rd: 'rd14', type: 'cheltuiala', section: 'Cheltuieli cu servicii bancare' },
  '628': { rd: 'rd14', type: 'cheltuiala', section: 'Alte cheltuieli cu servicii' },
  '635': { rd: 'rd25', type: 'cheltuiala', section: 'Cheltuieli cu alte impozite' },
  '641': { rd: 'rd16', type: 'cheltuiala', section: 'Cheltuieli cu salariile' },
  '6451': { rd: 'rd17', type: 'cheltuiala', section: 'Contribuții la asigurări sociale' },
  '6452': { rd: 'rd17', type: 'cheltuiala', section: 'Contribuții la fondul de șomaj' },
  '6453': { rd: 'rd17', type: 'cheltuiala', section: 'Contribuții la asigurări de sănătate' },
  '6458': { rd: 'rd17', type: 'cheltuiala', section: 'Alte cheltuieli privind asigurările' },
  '6811': { rd: 'rd19', type: 'cheltuiala', section: 'Cheltuieli de exploatare privind amortizarea' },
  '6813': { rd: 'rd22', type: 'cheltuiala', section: 'Cheltuieli de exploatare privind provizioanele pt. deprecierea activelor circulante' },
  '6814': { rd: 'rd30', type: 'cheltuiala', section: 'Cheltuieli de exploatare privind provizioanele' },
  '654': { rd: 'rd25', type: 'cheltuiala', section: 'Pierderi din creanțe' },
  '658': { rd: 'rd26', type: 'cheltuiala', section: 'Alte cheltuieli de exploatare' },
  '6588': { rd: 'rd26', type: 'cheltuiala', section: 'Alte cheltuieli de exploatare' },
  '691': { rd: 'rd62', type: 'cheltuiala', section: 'Cheltuieli cu impozitul pe profit' },
  
  // VENITURI FINANCIARE
  '761': { rd: 'rd35', type: 'venit', section: 'Venituri din imobilizări financiare' },
  '762': { rd: 'rd35', type: 'venit', section: 'Venituri din investiții pe termen scurt' },
  '763': { rd: 'rd37', type: 'venit', section: 'Venituri din creanțe imobilizate' },
  '764': { rd: 'rd37', type: 'venit', section: 'Venituri din investiții cedate' },
  '765': { rd: 'rd39', type: 'venit', section: 'Venituri din diferențe de curs valutar' },
  '766': { rd: 'rd35', type: 'venit', section: 'Venituri din dobânzi' },
  '767': { rd: 'rd41', type: 'venit', section: 'Venituri din sconturi obținute' },
  '768': { rd: 'rd41', type: 'venit', section: 'Alte venituri financiare' },
  
  // CHELTUIELI FINANCIARE
  '663': { rd: 'rd44', type: 'cheltuiala', section: 'Pierderi din creanțe legate de participații' },
  '664': { rd: 'rd44', type: 'cheltuiala', section: 'Cheltuieli privind investițiile cedate' },
  '665': { rd: 'rd46', type: 'cheltuiala', section: 'Cheltuieli din diferențe de curs valutar' },
  '666': { rd: 'rd46', type: 'cheltuiala', section: 'Cheltuieli privind dobânzile' },
  '667': { rd: 'rd48', type: 'cheltuiala', section: 'Cheltuieli privind sconturile acordate' },
  '668': { rd: 'rd48', type: 'cheltuiala', section: 'Alte cheltuieli financiare' },
};

/**
 * Generează promptul complet pentru AI cu regulile de corelație
 */
export function getBilantCorrelationsPrompt(): string {
  return `
=== REGULI DE GENERARE BILANȚ CONTABIL (F10) ===

EȘTI un expert contabil. Generezi BILANȚUL (F10) și CONTUL DE PROFIT ȘI PIERDERE (F20) pe baza datelor din BALANȚA de verificare.

## PRINCIPII FUNDAMENTALE

1. BILANȚUL se completează din SOLDURILE FINALE ale balanței (clasele 1-5)
2. CONTUL DE PROFIT ȘI PIERDERE se completează din RULAJELE/TOTALURILE claselor 6-7
3. Amortizările (clasa 28) se SCAD din valoarea brută a imobilizărilor
4. Provizioanele (clasa 29) se SCAD din activele respective

## CORELAȚII BILANȚ (F10) — VERIFICARE OBLIGATORIE

### Totaluri verticale:
- Rd.06 = Rd.01 + Rd.02 + Rd.03 + Rd.04 + Rd.05 (Imobilizări TOTAL)
- Rd.11 = Rd.07 + Rd.08 + Rd.09 + Rd.10 (Stocuri)
- Rd.18 = Rd.12 + Rd.13 + Rd.14 + Rd.15 + Rd.16 + Rd.17 (Creanțe)
- Rd.19 = Rd.06 + Rd.11 + Rd.18 (Active circulante TOTAL)
- Rd.24 = Rd.20 + Rd.21 + Rd.22 + Rd.23 (Cheltuieli în avans)
- Rd.30 = Rd.25 + Rd.26 + Rd.27 + Rd.28 + Rd.29 (Datorii sub 1 an)
- Rd.35 = Rd.24 + Rd.30 + Rd.33 + Rd.34 (Active minus datorii curente)
- Rd.45 = Rd.37 la Rd.44 (Datorii peste 1 an)
- Rd.56 = Rd.48 la Rd.55 (Provizioane)
- Rd.67 = Rd.64 + Rd.65 + Rd.66 (Capital subscris)
- Rd.74 = Rd.70 + Rd.71 + Rd.72 + Rd.73 (Rezerve)
- Rd.83 = Rd.67 + Rd.68 + Rd.69 + Rd.74 - Rd.75 + Rd.76 - Rd.77 + Rd.78 - Rd.79 + Rd.80 - Rd.81 - Rd.82 (Capitaluri proprii)
- Rd.85 = Rd.83 + Rd.84 (Capitaluri TOTAL)

### ECHILIBRU BILANȚIER (OBLIGATORIU):
Rd.85 = Rd.47 - Rd.56 - Rd.60 - Rd.61

### Constrângeri:
- Rd.67 + Rd.84 >= 0 (col.1 - sold inițial)
- Rd.67 + Rd.84 > 0 (col.2 - sold final, posibil =0 la sucursale)
- Capital subscris vărsat (Rd.64) >= 0
- Prime de capital (Rd.68) >= 0
- Rezerve (Rd.70-73) >= 0

## CONT PROFIT ȘI PIERDERE (F20) — CORELAȚII

- Rd.01 = Rd.02 + Rd.03 + Rd.04 + Rd.05 (Cifra de afaceri netă) >= 0
- Rd.10 = Rd.01 + Rd.06 - Rd.07 + Rd.08 + Rd.09 (Venituri exploatare TOTAL)
- Rd.32 = Rd.11 + ... + Rd.29 (Cheltuieli exploatare TOTAL)
- Rd.33 = Rd.10 - Rd.32 dacă > 0 (PROFIT exploatare)
- Rd.34 = Rd.32 - Rd.10 dacă > 0 (PIERDERE exploatare)
- Rd.58 = Rd.10 + Rd.42 + Rd.54 (Venituri TOTALE)
- Rd.59 = Rd.32 + Rd.49 + Rd.55 (Cheltuieli TOTALE)
- Rd.64 = Rd.60 - Rd.61 - Rd.62 - Rd.63 dacă > 0 (PROFIT NET)
- Rd.65 = Rd.61 + Rd.62 + Rd.63 - Rd.60 dacă > 0 (PIERDERE NETĂ)

## CORELAȚII INTER-FORMULARE

### Bilanț ↔ CPP:
- F10.Rd.80 col.2 = F20.Rd.64 col.2 (Profit)
- F10.Rd.81 col.2 = F20.Rd.65 col.2 (Pierdere)

## FORMAT OUTPUT

Returnează un JSON cu structura:
{
  "bilant": {
    "activ": { "rd01": {"initial": X, "final": Y}, ... },
    "pasiv": { "rd64": {"initial": X, "final": Y}, ... }
  },
  "cpp": {
    "rd01": {"precedent": X, "curent": Y}, ...
  },
  "validari": [
    {"regula": "Rd.06 = sum(01-05)", "status": "OK|EROARE", "detalii": "..."}
  ],
  "echilibru": true/false,
  "companyName": "...",
  "period": "...",
  "cui": "..."
}
`;
}
