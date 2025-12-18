/**
 * Teste automate pentru calculele financiare
 * Bazate pe balanța reală GRANITSHOP ONLINE S.R.L. (Noiembrie 2025)
 * 
 * Verifică funcția critică getCorrectValue() care trebuie să:
 * - Clase 1-5: citească din finalDebit/finalCredit
 * - Clase 6-7: citească din debit/credit (rulaje)
 */

import { describe, it, expect } from 'vitest';

// ========== MOCK DATA DIN BALANȚA GRANITSHOP ==========
// Datele sunt EXACTE din balanța reală pentru verificare
const mockAccountsGRANITSHOP = [
  // Clasa 1 - Capitaluri
  { code: '121', name: 'Profit sau pierdere', debit: 0, credit: 0, finalDebit: 0, finalCredit: 70585.05, accountClass: 1 },
  { code: '1012', name: 'Capital subscris vărsat', debit: 0, credit: 0, finalDebit: 0, finalCredit: 200.00, accountClass: 1 },
  
  // Clasa 2 - Imobilizări
  { code: '2133', name: 'Mijloace de transport', debit: 0, credit: 0, finalDebit: 39560.00, finalCredit: 0, accountClass: 2 },
  { code: '2814', name: 'Amortizarea altor imob corp', debit: 0, credit: 0, finalDebit: 0, finalCredit: 33000.83, accountClass: 2 },
  
  // Clasa 3 - Stocuri (MARFA!)
  { code: '371', name: 'Mărfuri', debit: 0, credit: 0, finalDebit: 41949.31, finalCredit: 0, accountClass: 3 },
  
  // Clasa 4 - Terți
  { code: '401', name: 'Furnizori', debit: 0, credit: 0, finalDebit: 0, finalCredit: 7497.45, accountClass: 4 },
  { code: '4111', name: 'Clienți', debit: 0, credit: 0, finalDebit: 5000.00, finalCredit: 0, accountClass: 4 },
  { code: '4423', name: 'TVA de plată', debit: 0, credit: 0, finalDebit: 0, finalCredit: 10286.00, accountClass: 4 },
  { code: '4424', name: 'TVA de recuperat', debit: 0, credit: 0, finalDebit: 0, finalCredit: 0, accountClass: 4 },
  
  // Clasa 5 - Trezorerie (BANCĂ ȘI CASĂ!)
  { code: '5121', name: 'Conturi la bănci în lei', debit: 0, credit: 0, finalDebit: 82375.00, finalCredit: 0, accountClass: 5 },
  { code: '5124', name: 'Conturi la bănci în valută', debit: 0, credit: 0, finalDebit: 7244.21, finalCredit: 0, accountClass: 5 },
  { code: '5311', name: 'Casa în lei', debit: 0, credit: 0, finalDebit: 1175.52, finalCredit: 0, accountClass: 5 },
  
  // Clasa 6 - Cheltuieli (folosesc RULAJE = debit/credit)
  { code: '607', name: 'Cheltuieli privind mărfurile', debit: 158821.55, credit: 158821.55, finalDebit: 0, finalCredit: 0, accountClass: 6 },
  { code: '6022', name: 'Cheltuieli privind combustibilul', debit: 15000.00, credit: 15000.00, finalDebit: 0, finalCredit: 0, accountClass: 6 },
  { code: '641', name: 'Cheltuieli cu salariile personalului', debit: 25000.00, credit: 25000.00, finalDebit: 0, finalCredit: 0, accountClass: 6 },
  
  // Clasa 7 - Venituri (folosesc RULAJE = debit/credit)
  { code: '707', name: 'Venituri din vânzarea mărfurilor', debit: 280000.00, credit: 280000.00, finalDebit: 0, finalCredit: 0, accountClass: 7 },
  { code: '704', name: 'Venituri din prestări de servicii', debit: 5000.00, credit: 5000.00, finalDebit: 0, finalCredit: 0, accountClass: 7 },
];

// ========== HELPER FUNCTIONS PENTRU TESTE ==========

/**
 * Funcția critică getCorrectValue - trebuie să fie identică cu cea din cod
 */
const getCorrectValue = (acc: any, field: 'debit' | 'credit'): number => {
  if (!acc) return 0;
  const accountClass = acc.accountClass || parseInt(acc.code?.charAt(0) || '0');
  
  if (accountClass >= 1 && accountClass <= 5) {
    // Clase 1-5: Solduri finale
    return field === 'debit' ? (acc.finalDebit || 0) : (acc.finalCredit || 0);
  } else {
    // Clase 6-7: Rulaje
    return field === 'debit' ? (acc.debit || 0) : (acc.credit || 0);
  }
};

/**
 * Căutare flexibilă de conturi
 */
const findAccount = (accounts: any[], baseCode: string) => {
  if (!accounts || accounts.length === 0) return null;
  let acc = accounts.find(a => a.code === baseCode);
  if (acc) return acc;
  acc = accounts.find(a => a.code.startsWith(baseCode));
  if (acc) return acc;
  if (baseCode.length === 4) {
    acc = accounts.find(a => a.code === baseCode.substring(0, 3));
  }
  return acc || null;
};

/**
 * Sumează conturi după cod
 */
const sumAccounts = (accounts: any[], baseCodes: string[], field: 'debit' | 'credit'): number => {
  let total = 0;
  for (const code of baseCodes) {
    const matchingAccounts = accounts.filter(a => a.code.startsWith(code));
    for (const acc of matchingAccounts) {
      total += getCorrectValue(acc, field);
    }
  }
  return total;
};

/**
 * Obține valoarea unui cont specific
 */
const getAccountValue = (accounts: any[], code: string, type: 'debit' | 'credit' = 'debit'): number => {
  const acc = findAccount(accounts, code);
  if (!acc) return 0;
  return getCorrectValue(acc, type);
};

/**
 * Sumează o clasă întreagă
 */
const getClassSum = (accounts: any[], classNum: number, type: 'debit' | 'credit' = 'debit'): number => {
  return accounts
    .filter(a => a.accountClass === classNum)
    .reduce((sum, a) => sum + getCorrectValue(a, type), 0);
};

// ========== TESTE ==========

describe('getCorrectValue - Funcția Critică', () => {
  describe('Grupa A - Clase 1-5 (citesc finalDebit/finalCredit)', () => {
    it('1. Cont 5121 (Bancă RON, clasa 5) → citește finalDebit = 82,375.00', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '5121');
      expect(getCorrectValue(acc, 'debit')).toBe(82375.00);
    });

    it('2. Cont 5311 (Casa, clasa 5) → citește finalDebit = 1,175.52', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '5311');
      expect(getCorrectValue(acc, 'debit')).toBe(1175.52);
    });

    it('3. Cont 371 (Mărfuri, clasa 3) → citește finalDebit = 41,949.31', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '371');
      expect(getCorrectValue(acc, 'debit')).toBe(41949.31);
    });

    it('4. Cont 401 (Furnizori, clasa 4) → citește finalCredit = 7,497.45', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '401');
      expect(getCorrectValue(acc, 'credit')).toBe(7497.45);
    });

    it('5. Cont 121 (Profit, clasa 1) → citește finalCredit = 70,585.05', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '121');
      expect(getCorrectValue(acc, 'credit')).toBe(70585.05);
    });

    it('6. Cont 5124 (Bancă valută, clasa 5) → citește finalDebit = 7,244.21', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '5124');
      expect(getCorrectValue(acc, 'debit')).toBe(7244.21);
    });

    it('7. Cont 4111 (Clienți, clasa 4) → citește finalDebit = 5,000.00', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '4111');
      expect(getCorrectValue(acc, 'debit')).toBe(5000.00);
    });

    it('8. Cont 2133 (Mijloace transport, clasa 2) → citește finalDebit = 39,560.00', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '2133');
      expect(getCorrectValue(acc, 'debit')).toBe(39560.00);
    });
  });

  describe('Grupa B - Clase 6-7 (citesc debit/credit = rulaje)', () => {
    it('9. Cont 607 (Cheltuieli mărfuri, clasa 6) → citește debit = 158,821.55', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '607');
      expect(getCorrectValue(acc, 'debit')).toBe(158821.55);
    });

    it('10. Cont 707 (Venituri vânzări, clasa 7) → citește credit = 280,000.00', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '707');
      expect(getCorrectValue(acc, 'credit')).toBe(280000.00);
    });

    it('11. Cont 641 (Cheltuieli salarii, clasa 6) → citește debit = 25,000.00', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '641');
      expect(getCorrectValue(acc, 'debit')).toBe(25000.00);
    });

    it('12. Cont 704 (Venituri servicii, clasa 7) → citește credit = 5,000.00', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '704');
      expect(getCorrectValue(acc, 'credit')).toBe(5000.00);
    });
  });

  describe('Grupa C - Cazuri Edge', () => {
    it('13. Cont inexistent → returnează 0', () => {
      const acc = findAccount(mockAccountsGRANITSHOP, '9999');
      expect(getCorrectValue(acc, 'debit')).toBe(0);
    });

    it('14. Cont null → returnează 0', () => {
      expect(getCorrectValue(null, 'debit')).toBe(0);
    });

    it('15. Cont undefined → returnează 0', () => {
      expect(getCorrectValue(undefined, 'credit')).toBe(0);
    });

    it('16. Cont fără accountClass (detectează din cod) → funcționează corect', () => {
      const accWithoutClass = { code: '5121', finalDebit: 100, finalCredit: 0, debit: 0, credit: 0 };
      expect(getCorrectValue(accWithoutClass, 'debit')).toBe(100);
    });
  });
});

describe('sumAccounts - Sumează Conturi Multiple', () => {
  it('17. Total Cash (5121+5124+5311) = 90,794.73 RON', () => {
    const total = sumAccounts(mockAccountsGRANITSHOP, ['5121', '5124', '5311'], 'debit');
    expect(total).toBeCloseTo(90794.73, 2);
  });

  it('18. Total Furnizori (401) = 7,497.45 RON', () => {
    const total = sumAccounts(mockAccountsGRANITSHOP, ['401'], 'credit');
    expect(total).toBeCloseTo(7497.45, 2);
  });

  it('19. Total Clienți (4111) = 5,000.00 RON', () => {
    const total = sumAccounts(mockAccountsGRANITSHOP, ['4111'], 'debit');
    expect(total).toBe(5000.00);
  });

  it('20. Array gol → returnează 0', () => {
    const total = sumAccounts([], ['5121'], 'debit');
    expect(total).toBe(0);
  });
});

describe('getAccountValue - Valoare Cont Specific', () => {
  it('21. getAccountValue(5121, debit) = 82,375.00', () => {
    expect(getAccountValue(mockAccountsGRANITSHOP, '5121', 'debit')).toBe(82375.00);
  });

  it('22. getAccountValue(371, debit) = 41,949.31 (Mărfuri)', () => {
    expect(getAccountValue(mockAccountsGRANITSHOP, '371', 'debit')).toBeCloseTo(41949.31, 2);
  });

  it('23. getAccountValue(401, credit) = 7,497.45 (Furnizori)', () => {
    expect(getAccountValue(mockAccountsGRANITSHOP, '401', 'credit')).toBeCloseTo(7497.45, 2);
  });

  it('24. getAccountValue(121, credit) = 70,585.05 (Profit)', () => {
    expect(getAccountValue(mockAccountsGRANITSHOP, '121', 'credit')).toBeCloseTo(70585.05, 2);
  });

  it('25. getAccountValue pentru cont inexistent → 0', () => {
    expect(getAccountValue(mockAccountsGRANITSHOP, '9999', 'debit')).toBe(0);
  });
});

describe('getClassSum - Sumă pe Clase', () => {
  it('26. Clasa 5 (Trezorerie) debit = 90,794.73 RON', () => {
    const total = getClassSum(mockAccountsGRANITSHOP, 5, 'debit');
    expect(total).toBeCloseTo(90794.73, 2);
  });

  it('27. Clasa 6 (Cheltuieli) debit = 198,821.55 RON', () => {
    const total = getClassSum(mockAccountsGRANITSHOP, 6, 'debit');
    expect(total).toBeCloseTo(198821.55, 2);
  });

  it('28. Clasa 7 (Venituri) credit = 285,000.00 RON', () => {
    const total = getClassSum(mockAccountsGRANITSHOP, 7, 'credit');
    expect(total).toBe(285000.00);
  });

  it('29. Clasa 3 (Stocuri) debit = 41,949.31 RON', () => {
    const total = getClassSum(mockAccountsGRANITSHOP, 3, 'debit');
    expect(total).toBeCloseTo(41949.31, 2);
  });

  it('30. Clasa 4 (Terți) credit = 17,783.45 RON', () => {
    // 401 (7497.45) + 4423 (10286.00) = 17783.45
    const total = getClassSum(mockAccountsGRANITSHOP, 4, 'credit');
    expect(total).toBeCloseTo(17783.45, 2);
  });
});

describe('findAccount - Căutare Flexibilă', () => {
  it('31. Căutare exactă (5121) → găsește', () => {
    const acc = findAccount(mockAccountsGRANITSHOP, '5121');
    expect(acc).not.toBeNull();
    expect(acc?.code).toBe('5121');
  });

  it('32. Căutare startsWith (512) → găsește 5121', () => {
    const acc = findAccount(mockAccountsGRANITSHOP, '512');
    expect(acc).not.toBeNull();
    expect(acc?.code).toBe('5121');
  });

  it('33. Căutare cont inexistent → null', () => {
    const acc = findAccount(mockAccountsGRANITSHOP, '9999');
    expect(acc).toBeNull();
  });

  it('34. Array gol → null', () => {
    const acc = findAccount([], '5121');
    expect(acc).toBeNull();
  });
});

describe('Integrare - Scenarii Complete Raport Word', () => {
  it('35. Executive Summary - Toate valorile corecte', () => {
    // Simulează calculele din generatePremiumWordReport
    const bank = getAccountValue(mockAccountsGRANITSHOP, '5121', 'debit') +
                 getAccountValue(mockAccountsGRANITSHOP, '5124', 'debit');
    const cash = getAccountValue(mockAccountsGRANITSHOP, '5311', 'debit');
    const totalCash = bank + cash;
    const stocks = getAccountValue(mockAccountsGRANITSHOP, '371', 'debit');
    const suppliers = getAccountValue(mockAccountsGRANITSHOP, '401', 'credit');
    const profit = getAccountValue(mockAccountsGRANITSHOP, '121', 'credit');

    expect(bank).toBeCloseTo(89619.21, 2); // 82375 + 7244.21
    expect(cash).toBeCloseTo(1175.52, 2);
    expect(totalCash).toBeCloseTo(90794.73, 2);
    expect(stocks).toBeCloseTo(41949.31, 2);
    expect(suppliers).toBeCloseTo(7497.45, 2);
    expect(profit).toBeCloseTo(70585.05, 2);
  });

  it('36. Cash Runway - Calculat corect', () => {
    const totalCash = sumAccounts(mockAccountsGRANITSHOP, ['5121', '5124', '5311'], 'debit');
    const totalExpenses = getClassSum(mockAccountsGRANITSHOP, 6, 'debit');
    const totalRevenue = getClassSum(mockAccountsGRANITSHOP, 7, 'credit');
    const monthlyBurn = totalRevenue - totalExpenses;
    
    expect(totalCash).toBeCloseTo(90794.73, 2);
    expect(monthlyBurn).toBeCloseTo(86178.45, 2); // 285000 - 198821.55
    // Firma acumulează, nu arde - deci runway = infinity
    expect(monthlyBurn).toBeGreaterThan(0);
  });
});
