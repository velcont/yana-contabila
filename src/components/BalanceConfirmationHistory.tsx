import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2, Calendar, Building2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BalanceConfirmation {
  id: string;
  cui: string | null;
  company_name: string;
  accounts_data: Record<string, { debit: number; credit: number }>;
  created_at: string;
}

const accountExplanations: Record<string, { name: string; explanation: string; implications: string; accountantDescription: string }> = {
  "1012": {
    name: "Capital social subscris și vărsat",
    explanation: "Reprezintă valoarea capitalului social pe care asociații/acționarii s-au angajat să-l aducă în societate și care a fost efectiv vărsat.",
    implications: "Capitalul social trebuie să corespundă cu cel înscris în actul constitutiv și în Registrul Comerțului.",
    accountantDescription: "banii pe care asociații i-au pus efectiv în firmă la înființare, înscriși la Registrul Comerțului."
  },
  "1171": {
    name: "Rezultat reportat",
    explanation: "Profitul sau pierderea din anii anteriori care nu a fost distribuită sau acoperită.",
    implications: "Pierderile reportate trebuie acoperite din profiturile viitoare pentru a îmbunătăți situația financiară.",
    accountantDescription: "profit sau pierdere din anii trecuți reportată în anul curent. Pierdere veche neacoperită - trebuie acoperită din profituri viitoare."
  },
  "121": {
    name: "Profit sau pierdere",
    explanation: "Rezultatul financiar al perioadei: diferența dintre venituri și cheltuieli.",
    implications: "Un profit pozitiv este supus impozitării (16% impozit pe profit sau 1-3% pentru micro).",
    accountantDescription: "rezultat curent - cheltuielile (clasa 6) au depășit/fost mai mici decât veniturile (clasa 7). Pierderi repetate pot atrage control ANAF."
  },
  "21": {
    name: "Imobilizări corporale",
    explanation: "Bunuri tangibile pe care firma le deține și le folosește pe termen lung (clădiri, mașini, echipamente, mobilier).",
    implications: "Valoarea zero indică că firma nu deține active fixe proprii sau acestea au fost deja amortizate complet.",
    accountantDescription: "clădiri, mașini, echipamente, mobilier deținute pe termen lung."
  },
  "357": {
    name: "Stocuri",
    explanation: "Mărfuri, materii prime sau alte stocuri deținute pentru activitate.",
    implications: "Stocurile trebuie gestionate eficient pentru optimizarea capitalului de lucru.",
    accountantDescription: "mărfuri și materiale pentru activitate."
  },
  "371": {
    name: "Mărfuri în stoc",
    explanation: "Produse pe care firma le cumpără pentru revânzare, aflate în depozit la sfârșitul perioadei.",
    implications: "Dacă valoarea este zero, înseamnă că firma nu deține stocuri de mărfuri la momentul respectiv.",
    accountantDescription: "produse pentru revânzare aflate în depozit."
  },
  "401": {
    name: "Datorii către furnizori",
    explanation: "Sume pe care firma le datorează furnizorilor pentru bunuri/servicii primite dar neachitate încă.",
    implications: "Aceste datorii trebuie plătite la scadență. Întârzieri pot afecta relațiile comerciale.",
    accountantDescription: "datorii pentru bunuri/servicii primite și NEACHITATE. VERIFICĂ SCADENȚELE - întârzieri = penalități!"
  },
  "4111": {
    name: "Creanțe de la clienți",
    explanation: "Sume pe care clienții le datorează firmei pentru bunuri/servicii livrate dar neîncasate încă.",
    implications: "Pentru sănătatea financiară, este ideal să se mențină termenele de încasare cât mai scurte.",
    accountantDescription: "sume pe care clienții LE DATOREAZĂ pentru livrări efectuate. URMĂREȘTE-I ACTIV! Cash-flow blocat dacă nu plătesc."
  },
  "4424": {
    name: "TVA de recuperat",
    explanation: "TVA deductibil care urmează a fi recuperat de la ANAF prin decontul de TVA.",
    implications: "Depune decontul la timp. Sume mari pot necesita verificări suplimentare de la ANAF.",
    accountantDescription: "TVA deductibil de RECUPERAT de la ANAF. Depune decontul la timp (până la 25)."
  },
  "4426": {
    name: "TVA deductibilă - imobilizări",
    explanation: "TVA aferentă achizițiilor de imobilizări care se poate deduce.",
    implications: "TVA-ul pentru imobilizări se recuperează conform regulilor fiscale.",
    accountantDescription: "TVA pentru echipamente/utilaje. Aceleași reguli ca TVA-ul curent."
  },
  "4427": {
    name: "TVA colectată",
    explanation: "TVA încasat de la clienți care trebuie virat la bugetul de stat.",
    implications: "TVA colectată trebuie declarată și plătită lunar/trimestrial conform regimului fiscal.",
    accountantDescription: "TVA încasat de la clienți, de virat la ANAF."
  },
  "4428": {
    name: "TVA neexigibilă",
    explanation: "TVA pentru care termenul de exigibilitate nu a survenit încă.",
    implications: "Devine TVA exigibilă la data scadenței conform facturii.",
    accountantDescription: "TVA pentru care termenul de plată nu a venit. Devine 4427 la scadență."
  },
  "4551": {
    name: "Conturi curente ale asociaților",
    explanation: "Împrumuturi acordate de asociați către firmă sau datorii ale firmei către asociați.",
    implications: "Datoria poate fi rambursată când firma are lichidități, fără dobânzi sau scadențe stricte de obicei.",
    accountantDescription: "împrumuturi de la asociați. NU sunt cheltuieli - datorie internă care poate fi rambursată când firma are lichidități."
  },
  "5121": {
    name: "Conturi bancare",
    explanation: "Banii deținuți în conturile bancare ale firmei. Rulajul debitor reprezintă intrările de bani.",
    implications: "Rulajul arată activitatea financiară a companiei. Intrări mari indică venituri sănătoase.",
    accountantDescription: "bani disponibili EFECTIV în cont ACUM. Compară cu extrasul! Dacă prea puțin → risc cash-flow."
  },
  "5124": {
    name: "Conturi în valută",
    explanation: "Disponibilități în conturi bancare în valută (EUR, USD, etc.).",
    implications: "Diferențele de curs valutar pot genera câștiguri sau pierderi.",
    accountantDescription: "echivalent în euro/dolari. Atenție la cursul de schimb - fluctuații pot genera câștiguri/pierderi."
  },
  "5311": {
    name: "Casa (numerar cash)",
    explanation: "Bani lichizi deținuți fizic în casieria firmei.",
    implications: "Valoarea trebuie să corespundă cu registrul de casă și cu realitatea. ANAF verifică cu atenție fluxurile de casă.",
    accountantDescription: "numerar în casierie. Trebuie să corespundă cu registrul de casă."
  },
  "6022": {
    name: "Cheltuieli cu combustibil și carburanți",
    explanation: "Costuri cu combustibil pentru vehiculele firmei în perioada respectivă (pe total rulaje).",
    implications: "Aceste cheltuieli sunt deductibile fiscal dacă sunt justificate corespunzător.",
    accountantDescription: "combustibil pentru vehicule. Deductibile fiscal dacă justificate."
  },
  "6028": {
    name: "Cheltuieli cu materialele consumabile",
    explanation: "Costuri cu materiale auxiliare necesare activității (rechizite, consumabile).",
    implications: "Verifică justificarea - consum excesiv poate indica risipă.",
    accountantDescription: "materiale auxiliare. Verifică dacă sunt justificate - consum excesiv = risipă sau furt."
  },
  "607": {
    name: "Cheltuieli privind mărfurile",
    explanation: "Costul de achiziție al mărfurilor vândute în perioada respectivă.",
    implications: "Se compară cu veniturile din vânzări (707) pentru a calcula marja comercială.",
    accountantDescription: "prețul de ACHIZIȚIE al mărfurilor. COMPARĂ cu 707 (venituri) pentru marja comercială."
  },
  "624": {
    name: "Cheltuieli de transport",
    explanation: "Costuri cu transportul mărfurilor (curierat, transport rutier, etc.).",
    implications: "Verifică documentele justificative (AWB, CMR).",
    accountantDescription: "transport mărfuri (curierat, rutier). Verifică documente justificative (AWB, CMR)."
  },
  "627": {
    name: "Cheltuieli cu serviciile bancare",
    explanation: "Comisioane bancare, costuri administrare cont, etc.",
    implications: "Compară ofertele diferitelor bănci pentru a reduce costurile.",
    accountantDescription: "comisioane băncii. COMPARĂ ofertele băncilor - poți reduce costurile!"
  },
  "628": {
    name: "Alte cheltuieli cu serviciile executate de terți",
    explanation: "Servicii diverse: consultanță, contabilitate, juridic, marketing, IT, curățenie, etc.",
    implications: "Toate trebuie să aibă facturi și să fie justificate - ANAF respinge cheltuielile nejustificate.",
    accountantDescription: "servicii diverse (consultanță, contabilitate, juridic, marketing, IT). Verifică că TOATE au facturi!"
  },
  "635": {
    name: "Cheltuieli cu alte impozite și taxe",
    explanation: "Taxe locale (teren, clădiri, autovehicule), ecotaxă, etc.",
    implications: "Costuri obligatorii care trebuie plătite la timp.",
    accountantDescription: "taxe locale (teren, clădiri, auto), ecotaxă. Costuri obligatorii - plătește la timp."
  },
  "6651": {
    name: "Cheltuieli din diferențe de curs valutar",
    explanation: "Pierderi generate de modificările cursului valutar.",
    implications: "Pot fi semnificative în cazul tranzacțiilor în valută.",
    accountantDescription: "pierderi din fluctuații curs valutar."
  },
  "6811": {
    name: "Cheltuieli de exploatare privind amortizările",
    explanation: "Amortizarea lunară/anuală a mijloacelor fixe.",
    implications: "Cheltuială contabilă care reduce profitul impozabil.",
    accountantDescription: "amortizare mijloace fixe - cheltuială contabilă care reduce profitul impozabil."
  },
  "707": {
    name: "Venituri din vânzări de mărfuri",
    explanation: "Încasări din vânzarea produselor către clienți. Rulajul creditor reprezintă totalul vânzărilor.",
    implications: "Veniturile trebuie să fie declarate corect la ANAF. Toate vânzările necesită facturi fiscale.",
    accountantDescription: "prețul de VÂNZARE al mărfurilor. COMPARĂ cu 607 (cost achiziție) pentru marja brută."
  },
  "7651": {
    name: "Venituri din diferențe de curs valutar",
    explanation: "Câștiguri generate de modificările cursului valutar.",
    implications: "Pot contribui pozitiv la rezultatul financiar.",
    accountantDescription: "câștiguri din fluctuații favorabile curs valutar."
  },
  "766": {
    name: "Venituri din dobânzi",
    explanation: "Dobânzi primite de la bancă (depozite) sau de la clienți (pentru întârzieri la plată).",
    implications: "Venit financiar pasiv.",
    accountantDescription: "dobânzi de la bancă (depozite) sau clienți (întârzieri). Venit pasiv."
  }
};

// Helper functions for improved report
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const generateTopProblems = (data: {
  totalCash: number;
  totalPayables: number;
  profitLoss: number;
  totalReceivables: number;
}): Paragraph[] => {
  const problems: Paragraph[] = [];
  let problemNumber = 1;

  // Problem 1: Cash flow crisis
  if (data.totalCash < data.totalPayables * 0.5 && data.totalPayables > 0) {
    problems.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${problemNumber}. 🔴 CRIZĂ DE CASH FLOW (URGENT!)`, bold: true, size: 24 })
        ],
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   Ai doar ${formatCurrency(data.totalCash)} în bancă dar ${formatCurrency(data.totalPayables)} de plătit!`,
            size: 20
          })
        ],
        spacing: { after: 50 },
        indent: { left: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   → Lipsesc ~${formatCurrency(data.totalPayables - data.totalCash)} pentru a plăti datoriile`,
            size: 20
          })
        ],
        spacing: { after: 50 },
        indent: { left: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   → ACȚIUNE: Încasează URGENT de la clienți + reduce cheltuielile`,
            size: 20
          })
        ],
        spacing: { after: 200 },
        indent: { left: 300 }
      })
    );
    problemNumber++;
  }

  // Problem 2: Loss
  if (data.profitLoss < 0) {
    problems.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${problemNumber}. 🔴 PIERDERE DE ${formatCurrency(Math.abs(data.profitLoss))}`, bold: true, size: 24 })
        ],
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   Cheltuielile depășesc veniturile → firma pierde bani!`,
            size: 20
          })
        ],
        spacing: { after: 50 },
        indent: { left: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   → RISC: ANAF poate solicita explicații după 2+ ani de pierderi`,
            size: 20
          })
        ],
        spacing: { after: 50 },
        indent: { left: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   → ACȚIUNE: Crește vânzările SAU reduce cheltuielile cu min 15%`,
            size: 20
          })
        ],
        spacing: { after: 200 },
        indent: { left: 300 }
      })
    );
    problemNumber++;
  }

  // Problem 3: Low current ratio
  const currentRatio = data.totalPayables > 0 ? (data.totalCash + data.totalReceivables) / data.totalPayables : 999;
  if (currentRatio < 1.0 && data.totalPayables > 0) {
    problems.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${problemNumber}. 🟡 LICHIDITATE SCĂZUTĂ`, bold: true, size: 24 })
        ],
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   Current Ratio: ${currentRatio.toFixed(2)} (sub 1.0 = pericol!)`,
            size: 20
          })
        ],
        spacing: { after: 50 },
        indent: { left: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   → ACȚIUNE: Negociază termene mai lungi cu furnizorii`,
            size: 20
          })
        ],
        spacing: { after: 200 },
        indent: { left: 300 }
      })
    );
  }

  if (problems.length === 0) {
    problems.push(
      new Paragraph({
        children: [
          new TextRun({ text: `✅ Nu s-au detectat probleme critice majore!`, bold: true, size: 24, color: "00AA00" })
        ],
        spacing: { before: 200, after: 200 }
      })
    );
  }

  return problems;
};

const generateTopOpportunities = (data: {
  totalRevenue: number;
  costOfGoods: number;
  totalReceivables: number;
  totalCash: number;
}): Paragraph[] => {
  const opportunities: Paragraph[] = [];
  let oppNumber = 1;

  // Opportunity 1: Good margin
  const margin = data.totalRevenue > 0 ? ((data.totalRevenue - data.costOfGoods) / data.totalRevenue) * 100 : 0;
  if (margin > 50) {
    opportunities.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${oppNumber}. ✅ MARJA COMERCIALĂ BUNĂ: ${margin.toFixed(0)}%`, bold: true, size: 24, color: "00AA00" })
        ],
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   Vinzi cu ${formatCurrency(data.totalRevenue)} ce cumperi cu ${formatCurrency(data.costOfGoods)}`,
            size: 20
          })
        ],
        spacing: { after: 50 },
        indent: { left: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   → E BINE! Media industriei = 40-50%`,
            size: 20
          })
        ],
        spacing: { after: 200 },
        indent: { left: 300 }
      })
    );
    oppNumber++;
  }

  // Opportunity 2: Clients owe money
  if (data.totalReceivables > 0) {
    opportunities.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${oppNumber}. ✅ CLIENȚI DATOREAZĂ ${formatCurrency(data.totalReceivables)}`, bold: true, size: 24, color: "00AA00" })
        ],
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   Dacă îi faci să plătească rapid → cash flow rezolvat!`,
            size: 20
          })
        ],
        spacing: { after: 50 },
        indent: { left: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   → ACȚIUNE: Sună-i ASTĂZI și cere plata în max 7 zile`,
            size: 20
          })
        ],
        spacing: { after: 200 },
        indent: { left: 300 }
      })
    );
    oppNumber++;
  }

  // Opportunity 3: Positive cash position
  if (data.totalCash > 10000) {
    opportunities.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${oppNumber}. ✅ POZIȚIE SOLIDĂ DE CASH: ${formatCurrency(data.totalCash)}`, bold: true, size: 24, color: "00AA00" })
        ],
        spacing: { before: 200, after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ 
            text: `   Poți investi în creștere sau în echipamente noi`,
            size: 20
          })
        ],
        spacing: { after: 200 },
        indent: { left: 300 }
      })
    );
  }

  if (opportunities.length === 0) {
    opportunities.push(
      new Paragraph({
        children: [
          new TextRun({ text: `💡 Focusează-te pe creșterea vânzărilor și îmbunătățirea marjei`, size: 24 })
        ],
        spacing: { before: 200, after: 200 }
      })
    );
  }

  return opportunities;
};

const generateLegalNoteSectionIfNeeded = (isAccountant: boolean): Paragraph[] => {
  if (!isAccountant) {
    console.log('🚫 User este ANTREPRENOR → NU generez notă juridică');
    return [];
  }

  console.log('✅ User este CONTABIL → Generez notă juridică completă');

  return [
    new Paragraph({
      text: "",
      spacing: { before: 600, after: 400 },
      border: {
        top: {
          color: "CCCCCC",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6
        }
      }
    }),
    new Paragraph({
      text: "NOTĂ JURIDICĂ ȘI CONFIRMARE",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Prin prezentul document, cabinetul de contabilitate vă informează oficial cu privire la situația contabilă a societății dumneavoastră pentru perioada menționată.",
          size: 20,
        })
      ],
      spacing: { after: 200 },
      alignment: AlignmentType.JUSTIFIED
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "În conformitate cu prevederile contractului de prestări servicii de contabilitate și cu legislația în vigoare, vă rugăm să analizați cu atenție informațiile prezentate în acest raport.",
          size: 20,
        })
      ],
      spacing: { after: 300 },
      alignment: AlignmentType.JUSTIFIED
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "TERMEN DE RĂSPUNS: ", size: 20, bold: true }),
        new TextRun({
          text: "Aveți la dispoziție 5 (cinci) zile lucrătoare de la primirea acestui document pentru a transmite eventuale obiecțiuni, completări sau solicitări de clarificări referitoare la datele prezentate.",
          size: 20,
        })
      ],
      spacing: { after: 300 },
      alignment: AlignmentType.JUSTIFIED
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "CONFIRMARE TACITĂ: ", size: 20, bold: true }),
        new TextRun({
          text: "În absența oricărei comunicări scrise din partea dumneavoastră în termenul menționat mai sus, se consideră că:",
          size: 20,
        })
      ],
      spacing: { after: 100 },
      alignment: AlignmentType.JUSTIFIED
    }),
    new Paragraph({
      children: [ new TextRun({ text: "  • Ați luat la cunoștință situația contabilă prezentată", size: 20 }) ],
      spacing: { after: 100 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [ new TextRun({ text: "  • Confirmați corectitudinea datelor din punct de vedere al activității societății", size: 20 }) ],
      spacing: { after: 100 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [ new TextRun({ text: "  • Luna/Perioada contabilă este încheiată și validată din punct de vedere contabil", size: 20 }) ],
      spacing: { after: 300 },
      indent: { left: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "RESPONSABILITATE: ", size: 20, bold: true }),
        new TextRun({
          text: "Vă reamintim că documentele justificative (facturi, chitanțe, extrase bancare) trebuie să fie transmise cabinetului nostru în termenele stabilite contractual. Orice documente transmise după încheierea perioadei vor fi înregistrate în luna/trimestrul următor, conform prevederilor legale.",
          size: 20,
        })
      ],
      spacing: { after: 300 },
      alignment: AlignmentType.JUSTIFIED
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "OBIECȚIUNI: ", size: 20, bold: true }),
        new TextRun({
          text: "Eventualele obiecțiuni trebuie comunicate în scris (email sau scrisoare) la datele de contact menționate în contractul de prestări servicii.",
          size: 20,
        })
      ],
      spacing: { after: 400 },
      alignment: AlignmentType.JUSTIFIED
    }),
    new Paragraph({
      children: [ new TextRun({ text: `Data generării documentului: ${new Date().toLocaleDateString('ro-RO')}`, size: 18, italics: true }) ],
      spacing: { after: 100 },
    }),
  ];
};

// Generate accountant-specific sections (concise professional format)
const generateAccountantSections = (
  accounts_data: Record<string, { debit: number; credit: number }>,
  cui: string | null,
  companyName: string,
  date: string
): Paragraph[] => {
  const sections: Paragraph[] = [];
  
  // Header
  sections.push(
    new Paragraph({
      text: "CONFIRMARE SOLDURI BALANȚĂ CONTABILĂ",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `CUI: ${cui || 'N/A'}`, size: 22 })],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Companie: ${companyName}`, size: 22 })],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Dată generare: ${date}`, size: 22 })],
      spacing: { after: 400 }
    })
  );
  
  // Group accounts by class
  const accountsByClass: Record<string, Array<[string, any]>> = {
    '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': []
  };
  
  Object.entries(accounts_data).forEach(([code, values]) => {
    const firstDigit = code[0];
    if (accountsByClass[firstDigit]) {
      accountsByClass[firstDigit].push([code, values]);
    }
  });
  
  const classNames: Record<string, string> = {
    '1': 'CLASA 1: CAPITALURI',
    '2': 'CLASA 2: IMOBILIZĂRI',
    '3': 'CLASA 3: STOCURI',
    '4': 'CLASA 4: TERȚI (Clienți, Furnizori, etc.)',
    '5': 'CLASA 5: TREZORERIE (Bănci, Casă)',
    '6': 'CLASA 6: CHELTUIELI',
    '7': 'CLASA 7: VENITURI'
  };
  
  Object.entries(accountsByClass).forEach(([classNum, accounts]) => {
    if (accounts.length === 0) return;
    
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `█ ${classNames[classNum]}`, bold: true, size: 24 })],
        spacing: { before: 400, after: 200 }
      })
    );
    
    accounts.forEach(([code, values]) => {
      const balance = values.debit - values.credit;
      const shortCode = code.substring(0, 4);
      const accountInfo = accountExplanations[shortCode] || accountExplanations[code.substring(0, 2)];
      
      if (!accountInfo) return;
      
      const emoji = balance >= 0 ? '💼' : balance < 0 ? '⚠️' : '📋';
      const description = accountInfo.accountantDescription || `Sold ${balance >= 0 ? 'debitor' : 'creditor'}: ${formatCurrency(Math.abs(balance))}`;
      
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: `${code} - `, size: 20 })],
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `${emoji} `, size: 20 }),
            new TextRun({ text: `${accountInfo.name}: ${formatCurrency(Math.abs(balance))} RON - ${description}`, size: 20 })
          ],
          spacing: { after: 200 },
          indent: { left: 200 }
        })
      );
    });
  });
  
  return sections;
};

export const BalanceConfirmationHistory = () => {
  const [confirmations, setConfirmations] = useState<BalanceConfirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [userSubscriptionType, setUserSubscriptionType] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfirmations();
    fetchUserSubscriptionType();
  }, []);

  const fetchUserSubscriptionType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('subscription_type')
        .eq('id', user.id)
        .single();

      setUserSubscriptionType(data?.subscription_type || null);
      console.log('🔍 User subscription type:', data?.subscription_type);
    } catch (error) {
      console.error('Error fetching user subscription type:', error);
    }
  };

  const fetchConfirmations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('balance_confirmations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfirmations((data || []).map(item => ({
        ...item,
        accounts_data: item.accounts_data as Record<string, { debit: number; credit: number }>
      })));
    } catch (error) {
      console.error('Error fetching confirmations:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca confirmările.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateWordFromHistory = async (confirmation: BalanceConfirmation) => {
    try {
      // Calculate key financial metrics
      const totalRevenue = Object.entries(confirmation.accounts_data)
        .filter(([code]) => code.startsWith('7'))
        .reduce((sum, [_, values]) => sum + (values.credit || 0), 0);

      const totalExpenses = Object.entries(confirmation.accounts_data)
        .filter(([code]) => code.startsWith('6'))
        .reduce((sum, [_, values]) => sum + (values.debit || 0), 0);

      const costOfGoods = confirmation.accounts_data['607']?.debit || 0;
      const profitLoss = totalRevenue - totalExpenses;
      const totalCash = (confirmation.accounts_data['5121']?.debit || 0) + (confirmation.accounts_data['5311']?.debit || 0);
      const totalPayables = confirmation.accounts_data['401']?.credit || 0;
      const totalReceivables = confirmation.accounts_data['4111']?.debit || 0;

      // Calculate financial indicators
      const margin = totalRevenue > 0 ? ((totalRevenue - costOfGoods) / totalRevenue) * 100 : 0;
      const currentRatio = totalPayables > 0 ? (totalCash + totalReceivables) / totalPayables : 999;
      const dso = totalRevenue > 0 ? (totalReceivables / totalRevenue) * 365 : 0;
      const dpo = totalExpenses > 0 ? (totalPayables / totalExpenses) * 365 : 0;

      const isAccountant = userSubscriptionType === 'accounting_firm';

      let documentSections: Paragraph[];
      
      if (isAccountant) {
        // ✅ VERSIUNE CONTABIL - Concisă, profesională
        documentSections = [
          ...generateAccountantSections(
            confirmation.accounts_data,
            confirmation.cui,
            confirmation.company_name,
            new Date(confirmation.created_at).toLocaleDateString('ro-RO')
          ),
          ...generateLegalNoteSectionIfNeeded(true)
        ];
      } else {
        // ✅ VERSIUNE ANTREPRENOR - Detaliată, educațională
        documentSections = [
          new Paragraph({
            text: "CONFIRMARE DATE FINANCIARE",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Companie: ", bold: true }),
                new TextRun(confirmation.company_name),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "CUI: ", bold: true }),
                new TextRun(confirmation.cui || "N/A"),
              ],
              spacing: { after: 400 },
            }),

            // ========== REZUMAT EXECUTIV ==========
            new Paragraph({
              text: "REZUMAT EXECUTIV - SĂNĂTATEA FINANCIARĂ ÎN 30 SECUNDE",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
              border: {
                top: { color: "4472C4", space: 8, style: BorderStyle.SINGLE, size: 12 },
                bottom: { color: "4472C4", space: 8, style: BorderStyle.SINGLE, size: 12 },
              }
            }),
            
            new Paragraph({
              children: [
                new TextRun({ 
                  text: profitLoss < 0 ? "🔴 STATUS GENERAL: ATENȚIE - Situație financiară dificilă" : "✅ STATUS GENERAL: Situație financiară pozitivă",
                  bold: true,
                  size: 24
                })
              ],
              spacing: { before: 200, after: 200 }
            }),

            new Paragraph({
              children: [ new TextRun({ text: "CIFRELE CHEIE:", bold: true, size: 24 }) ],
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `💰 VENITURI (Vânzări):        ${formatCurrency(totalRevenue)}`, size: 20 }) ],
              spacing: { after: 50 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `💸 CHELTUIELI (Costuri):      ${formatCurrency(totalExpenses)}`, size: 20 }) ],
              spacing: { after: 50 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ 
                new TextRun({ 
                  text: `📉 PROFIT/PIERDERE:           ${formatCurrency(profitLoss)} ${profitLoss < 0 ? "(PIERDERE!)" : "(PROFIT)"}`,
                  size: 20,
                  bold: profitLoss < 0
                })
              ],
              spacing: { after: 50 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `🏦 BANI DISPONIBILI:          ${formatCurrency(totalCash)}`, size: 20 }) ],
              spacing: { after: 50 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `💳 DATORII DE PLATĂ:          ${formatCurrency(totalPayables)}`, size: 20 }) ],
              spacing: { after: 50 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `💰 BANI DE ÎNCASAT:           ${formatCurrency(totalReceivables)}`, size: 20 }) ],
              spacing: { after: 200 },
              indent: { left: 200 }
            }),

            new Paragraph({
              text: "🚨 CELE MAI MARI 3 PROBLEME ACUM:",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 }
            }),
            ...generateTopProblems({ totalCash, totalPayables, profitLoss, totalReceivables }),

            new Paragraph({
              text: "✅ CELE MAI MARI 3 OPORTUNITĂȚI:",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 }
            }),
            ...generateTopOpportunities({ totalRevenue, costOfGoods, totalReceivables, totalCash }),

            new Paragraph({
              text: "🎯 PLAN DE ACȚIUNE - URMĂTOARELE 7 ZILE:",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📅 ZIUA 1-2 (URGENT):", bold: true, size: 20 }) ],
              spacing: { before: 100, after: 50 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "☐ Sună TOȚI clienții care datorează și cere plata în 3-7 zile", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 400 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "☐ Verifică scadențele furnizori - identifică pe cei cu penalități", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 400 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "☐ Plătește facturile cu scadență depășită (dacă ai bani)", size: 20 }) ],
              spacing: { after: 100 },
              indent: { left: 400 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📅 ZIUA 3-5:", bold: true, size: 20 }) ],
              spacing: { before: 100, after: 50 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "☐ Analizează cheltuielile mari - sunt toate necesare?", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 400 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "☐ Identifică servicii care pot fi REDUSE sau ELIMINATE", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 400 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "☐ Caută furnizori mai ieftini", size: 20 }) ],
              spacing: { after: 100 },
              indent: { left: 400 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📅 ZIUA 6-7:", bold: true, size: 20 }) ],
              spacing: { before: 100, after: 50 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "☐ Depune decontul TVA pentru recuperare", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 400 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "☐ Planifică strategia de creștere vânzări", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 400 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "☐ Stabilește TARGET: crește vânzările cu 15% luna viitoare", size: 20 }) ],
              spacing: { after: 400 },
              indent: { left: 400 }
            }),

            // Generate sections for each account
            ...Object.entries(confirmation.accounts_data).flatMap(([code, values]) => {
              const accountClass = parseInt(code[0]);
              const shortCode = code.substring(0, 4);
              const explanation = accountExplanations[shortCode] || accountExplanations[code.substring(0, 2)];
              
              if (!explanation) return [];

              let displayValue = 0;
              let valueType = "";

              // Logica în funcție de clasa contului
              if (accountClass >= 1 && accountClass <= 5) {
                // Clasa 1-5: Solduri finale
                displayValue = values.debit || values.credit || 0;
                valueType = values.debit ? "(sold final debitor)" : values.credit ? "(sold final creditor)" : "";
              } else if (accountClass === 6) {
                // Clasa 6: Rulaje debitoare
                displayValue = values.debit || 0;
                valueType = "(total rulaje cheltuieli)";
              } else if (accountClass === 7) {
                // Clasa 7: Rulaje creditoare
                displayValue = values.credit || 0;
                valueType = "(total rulaje venituri)";
              }

              return [
                new Paragraph({
                  text: explanation.name,
                  heading: HeadingLevel.HEADING_2,
                  spacing: { before: 400, after: 200 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `💰 SOLD: `, bold: true, size: 24 }),
                    new TextRun({ text: `${formatCurrency(displayValue)}`, size: 24 })
                  ],
                  spacing: { after: 200 },
                }),
                new Paragraph({
                  children: [ new TextRun({ text: "📖 CE ÎNSEAMNĂ:", bold: true, size: 20 }) ],
                  spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                  children: [ new TextRun({ text: explanation.explanation, size: 20 }) ],
                  spacing: { after: 200 },
                  indent: { left: 300 },
                  alignment: AlignmentType.JUSTIFIED
                }),
                new Paragraph({
                  children: [ new TextRun({ text: "🎯 DE CE E IMPORTANT:", bold: true, size: 20 }) ],
                  spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                  children: [ new TextRun({ text: explanation.implications, size: 20 }) ],
                  spacing: { after: 200 },
                  indent: { left: 300 },
                  alignment: AlignmentType.JUSTIFIED
                }),
                new Paragraph({
                  children: [ new TextRun({ text: "✅ CE SĂ FACI ACUM:", bold: true, size: 20 }) ],
                  spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                  children: [ new TextRun({ 
                    text: code === '401' ? "1. Verifică scadențele: sună fiecare furnizor și întreabă 'când trebuie să plătesc?'" :
                          code === '4111' ? "1. Apelează fiecare client și stabilește o dată clară de plată (ideal în max 7 zile)" :
                          code === '5121' ? "1. Monitorizează zilnic intrările și ieșirile de bani din cont" :
                          code === '707' ? "1. Asigură-te că toate vânzările au factură fiscală emisă corect" :
                          "1. Verifică lunar această poziție împreună cu contabilul tău",
                    size: 20 
                  }) ],
                  spacing: { after: 50 },
                  indent: { left: 300 }
                }),
                new Paragraph({
                  children: [ new TextRun({ 
                    text: code === '401' ? "2. Prioritizează: plătește URGENT pe cei cu scadență depășită" :
                          code === '4111' ? "2. Oferă discount 5% pentru plată anticipată (îmbunătățește cash flow-ul)" :
                          code === '5121' ? "2. Păstrează un buffer minim de siguranță (ideal 10-20% din cheltuieli lunare)" :
                          code === '707' ? "2. Compară cu lunile anterioare - crește sau scade activitatea?" :
                          "2. Analizează tendințele - se îmbunătățește sau se înrăutățește?",
                    size: 20 
                  }) ],
                  spacing: { after: 50 },
                  indent: { left: 300 }
                }),
                new Paragraph({
                  children: [ new TextRun({ 
                    text: code === '401' ? "3. Negociază: dacă nu ai bani, cere amânare 30 zile (mai bine decât penalități)" :
                          code === '4111' ? "3. Pentru clienți întârziați >60 zile, ia în considerare proceduri de recuperare" :
                          code === '5121' ? "3. Planifică mișcările mari de bani (salarii, furnizori) pentru când intră încasări" :
                          code === '707' ? "3. Stabilește obiective clare: +15% creștere față de luna trecută" :
                          "3. Consultă cu contabilul pentru strategii de optimizare",
                    size: 20 
                  }) ],
                  spacing: { after: 400 },
                  indent: { left: 300 }
                }),
              ];
            }),

            // ========== INDICATORI FINANCIARI ==========
            new Paragraph({
              text: "INDICATORI FINANCIARI - CE SPUN CIFRELE DESPRE AFACEREA TA",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 600, after: 200 },
              border: {
                top: { color: "4472C4", space: 8, style: BorderStyle.SINGLE, size: 12 },
                bottom: { color: "4472C4", space: 8, style: BorderStyle.SINGLE, size: 12 },
              }
            }),

            // Indicator 1: Marja Comercială
            new Paragraph({
              text: "1. 💰 MARJA COMERCIALĂ (Profitabilitate)",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "FORMULA: (Venituri - Cost mărfuri) / Venituri × 100", size: 20 }) ],
              spacing: { after: 50 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `CALCULUL TĂU: (${formatCurrency(totalRevenue)} - ${formatCurrency(costOfGoods)}) / ${formatCurrency(totalRevenue)} × 100 = ${margin.toFixed(1)}%`,
                size: 20 
              }) ],
              spacing: { after: 100 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📖 CE ÎNSEAMNĂ:", bold: true, size: 20 }) ],
              spacing: { before: 100, after: 50 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `Din fiecare 100 RON vânzări, rămân ${margin.toFixed(1)} RON după ce scazi costul mărfii.`,
                size: 20 
              }) ],
              spacing: { after: 100 },
              indent: { left: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📊 COMPARAȚIE:", bold: true, size: 20 }) ],
              spacing: { before: 100, after: 50 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `${margin > 60 ? "✅" : margin > 40 ? "🟡" : "🔴"} TU: ${margin.toFixed(1)}% → ${margin > 60 ? "FOARTE BINE!" : margin > 40 ? "ACCEPTABIL" : "SUB MEDIE"}`,
                size: 20 
              }) ],
              spacing: { after: 30 },
              indent: { left: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📍 Media industriei: 40-50%", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "🎯 Țintă optimă: 50-70%", size: 20 }) ],
              spacing: { after: 200 },
              indent: { left: 300 }
            }),

            // Indicator 2: Current Ratio
            new Paragraph({
              text: "2. 🏦 CURRENT RATIO (Capacitate de plată)",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "FORMULA: (Cash + Creanțe) / Datorii", size: 20 }) ],
              spacing: { after: 50 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `CALCULUL TĂU: (${formatCurrency(totalCash)} + ${formatCurrency(totalReceivables)}) / ${formatCurrency(totalPayables)} = ${currentRatio >= 999 ? "N/A" : currentRatio.toFixed(2)}`,
                size: 20 
              }) ],
              spacing: { after: 100 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📖 CE ÎNSEAMNĂ:", bold: true, size: 20 }) ],
              spacing: { before: 100, after: 50 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: currentRatio >= 999 ? "Nu ai datorii active (excelent!)" : `Pentru fiecare 1 RON datorie, ai ${currentRatio.toFixed(2)} RON disponibil (sau de încasat rapid).`,
                size: 20 
              }) ],
              spacing: { after: 100 },
              indent: { left: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📊 COMPARAȚIE:", bold: true, size: 20 }) ],
              spacing: { before: 100, after: 50 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: currentRatio >= 999 ? "✅ N/A - Nicio datorie" : `${currentRatio >= 1.5 ? "✅" : currentRatio >= 1.0 ? "🟡" : "🔴"} TU: ${currentRatio.toFixed(2)} → ${currentRatio >= 1.5 ? "EXCELENT" : currentRatio >= 1.0 ? "ACCEPTABIL" : "PERICOL!"}`,
                size: 20 
              }) ],
              spacing: { after: 30 },
              indent: { left: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📍 Minim necesar: 1,0", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "🎯 Țintă optimă: 1,5-2,0", size: 20 }) ],
              spacing: { after: 200 },
              indent: { left: 300 }
            }),

            // Indicator 3: DSO
            new Paragraph({
              text: "3. 📅 DSO - Days Sales Outstanding (Zile încasare clienți)",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "FORMULA: (Clienți / Venituri) × 365", size: 20 }) ],
              spacing: { after: 50 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `CALCULUL TĂU: (${formatCurrency(totalReceivables)} / ${formatCurrency(totalRevenue)}) × 365 = ${dso.toFixed(0)} zile`,
                size: 20 
              }) ],
              spacing: { after: 100 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📖 CE ÎNSEAMNĂ:", bold: true, size: 20 }) ],
              spacing: { before: 100, after: 50 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `În medie, clienții plătesc după ${dso.toFixed(0)} de zile de la livrare.`,
                size: 20 
              }) ],
              spacing: { after: 100 },
              indent: { left: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📊 COMPARAȚIE:", bold: true, size: 20 }) ],
              spacing: { before: 100, after: 50 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `${dso <= 45 ? "✅" : dso <= 60 ? "🟡" : "🔴"} TU: ${dso.toFixed(0)} zile → ${dso <= 45 ? "EXCELENT" : dso <= 60 ? "ACCEPTABIL" : "PREA MULT"}`,
                size: 20 
              }) ],
              spacing: { after: 30 },
              indent: { left: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "📍 Best practice: 30-45 zile", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "🔴 Pericol: >90 zile", size: 20 }) ],
              spacing: { after: 200 },
              indent: { left: 300 }
            }),

            // ========== SCENARII "DACĂ..." ==========
            new Paragraph({
              text: "🎮 SCENARII - CE SE ÎNTÂMPLĂ DACĂ...",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 600, after: 200 },
              border: {
                top: { color: "4472C4", space: 8, style: BorderStyle.SINGLE, size: 12 },
                bottom: { color: "4472C4", space: 8, style: BorderStyle.SINGLE, size: 12 },
              }
            }),

            // Scenariul #1
            new Paragraph({
              text: 'SCENARIUL #1: "Dacă încasez de la toți clienții ACUM"',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `Cash disponibil ACUM:        ${formatCurrency(totalCash)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `+ Încasări clienți:          ${formatCurrency(totalReceivables)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "─────────────────────────────────────", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `= TOTAL cash:                ${formatCurrency(totalCash + totalReceivables)}`, bold: true, size: 20 }) ],
              spacing: { after: 100 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `Datorii de plătit:           ${formatCurrency(totalPayables)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "─────────────────────────────────────", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `${(totalCash + totalReceivables) >= totalPayables ? "SURPLUS rămâne:" : "DEFICIT rămâne:"} ${formatCurrency(Math.abs((totalCash + totalReceivables) - totalPayables))}`,
                bold: true,
                size: 20
              }) ],
              spacing: { after: 100 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `✅ REZULTAT: ${(totalCash + totalReceivables) >= totalPayables ? "Cash flow rezolvat!" : "Mai bine, dar ÎNCĂ insuficient!"}`,
                size: 20
              }) ],
              spacing: { after: 200 },
              indent: { left: 200 }
            }),

            // Scenariul #2
            new Paragraph({
              text: 'SCENARIUL #2: "Dacă cresc vânzările cu 20% luna viitoare"',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `Venituri actuale:            ${formatCurrency(totalRevenue)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `+ 20% creștere:              ${formatCurrency(totalRevenue * 0.2)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "─────────────────────────────────────", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `= Venituri noi:              ${formatCurrency(totalRevenue * 1.2)}`, bold: true, size: 20 }) ],
              spacing: { after: 100 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `Cost mărfuri (+20%):         ${formatCurrency(costOfGoods * 1.2)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `Alte cheltuieli (fixe):      ${formatCurrency(totalExpenses - costOfGoods)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "─────────────────────────────────────", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `PROFIT NET:                  ${formatCurrency((totalRevenue * 1.2) - (costOfGoods * 1.2) - (totalExpenses - costOfGoods))}`,
                bold: true,
                size: 20
              }) ],
              spacing: { after: 200 },
              indent: { left: 200 }
            }),

            // Scenariul #3
            new Paragraph({
              text: 'SCENARIUL #3: "Dacă reduc cheltuielile cu 15%"',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `Cheltuieli actuale:          ${formatCurrency(totalExpenses)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `- 15% reducere:              ${formatCurrency(totalExpenses * 0.15)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "─────────────────────────────────────", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `= Cheltuieli noi:            ${formatCurrency(totalExpenses * 0.85)}`, bold: true, size: 20 }) ],
              spacing: { after: 100 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: `Venituri:                    ${formatCurrency(totalRevenue)}`, size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "─────────────────────────────────────", size: 20 }) ],
              spacing: { after: 30 },
              indent: { left: 200 }
            }),
            new Paragraph({
              children: [ new TextRun({ 
                text: `PROFIT NET:                  ${formatCurrency(totalRevenue - (totalExpenses * 0.85))}`,
                bold: true,
                size: 20
              }) ],
              spacing: { after: 200 },
              indent: { left: 200 }
            }),

            new Paragraph({
              text: "DECLARAȚIE DE CONFIRMARE",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 600, after: 300 },
            }),
            new Paragraph({
              text: "Subsemnatul/Subsemnata, în calitate de administrator/asociat al societății menționate mai sus, declar că:",
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: "✓ Am înțeles explicațiile furnizate pentru fiecare cont din balanța contabilă",
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: "✓ Confirm că datele financiare prezentate sunt corecte și complete",
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: "✓ Înțeleg implicațiile fiscale și comerciale ale acestor cifre",
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: "✓ Îmi asum responsabilitatea pentru orice date neprecizate contabilului",
              spacing: { after: 400 },
            }),

            // ========== NOTĂ JURIDICĂ CONDIȚIONATĂ ==========
            ...generateLegalNoteSectionIfNeeded(isAccountant),

            // Semnătură la final
            new Paragraph({
              text: "Semnătura: _________________________     Data: _________________",
              spacing: { before: 400 },
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Confirmare_Balanta_${confirmation.company_name}_${new Date(confirmation.created_at).toISOString().split('T')[0]}.docx`);
      
      toast({
        title: "Document generat",
        description: "Documentul Word a fost descărcat cu succes.",
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut genera documentul.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('balance_confirmations')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setConfirmations(prev => prev.filter(c => c.id !== deleteId));
      toast({
        title: "Șters cu succes",
        description: "Confirmarea a fost ștearsă.",
      });
    } catch (error) {
      console.error('Error deleting confirmation:', error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge confirmarea.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Istoric Confirmări Balanță</strong><br />
          Aici găsești toate confirmările generate din ChatAI. Poți regenera documentul Word oricând.
        </AlertDescription>
      </Alert>

      {confirmations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nu există confirmări în istoric.<br />
              Generează prima confirmare din <strong>ChatAI</strong> → Încarcă balanță Excel → Generează Word.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {confirmations.map((confirmation) => (
              <Card key={confirmation.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {confirmation.company_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          CUI: {confirmation.cui || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(confirmation.created_at).toLocaleDateString('ro-RO')}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => generateWordFromHistory(confirmation)}
                        className="btn-hover-lift"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descarcă Word
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteId(confirmation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>📊 Conturi detectate: <strong>{Object.keys(confirmation.accounts_data).length}</strong></span>
                    <span>💰 Total sold final: <strong>
                      {Object.values(confirmation.accounts_data)
                        .reduce((sum, acc) => sum + (acc.debit || 0) + (acc.credit || 0), 0)
                        .toFixed(2)} RON
                    </strong></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi această confirmare?</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune nu poate fi anulată. Confirmarea va fi ștearsă permanent din istoricul tău.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
