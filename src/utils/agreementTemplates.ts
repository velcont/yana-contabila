/**
 * Legal Agreement Template Engine
 * Adapted from: github.com/open-agreements/open-agreements (MIT)
 * Localized for Romanian market with common business agreement types
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgreementField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  group?: string;
}

export interface AgreementTemplate {
  id: string;
  name: string;
  nameRO: string;
  category: AgreementCategory;
  description: string;
  fields: AgreementField[];
  generateContent: (data: Record<string, string>) => string;
  legalBasis?: string;
}

export type AgreementCategory = 
  | 'nda'
  | 'service'
  | 'employment'
  | 'partnership'
  | 'sale'
  | 'consulting'
  | 'loan'
  | 'lease';

export interface GeneratedAgreement {
  templateId: string;
  templateName: string;
  content: string;
  generatedAt: string;
  fields: Record<string, string>;
  disclaimer: string;
}

// ─── Field Definitions ──────────────────────────────────────────────────────

const commonPartyFields = (prefix: string, label: string): AgreementField[] => [
  { key: `${prefix}_name`, label: `${label} - Nume/Denumire`, type: 'text', required: true, group: label },
  { key: `${prefix}_cui`, label: `${label} - CUI/CNP`, type: 'text', required: true, group: label },
  { key: `${prefix}_reg_com`, label: `${label} - Nr. Reg. Com.`, type: 'text', required: false, group: label },
  { key: `${prefix}_address`, label: `${label} - Adresă`, type: 'text', required: true, group: label },
  { key: `${prefix}_representative`, label: `${label} - Reprezentant`, type: 'text', required: true, group: label },
  { key: `${prefix}_role`, label: `${label} - Funcție reprezentant`, type: 'text', required: false, placeholder: 'Administrator', group: label },
];

// ─── Templates ──────────────────────────────────────────────────────────────

export const agreementTemplates: AgreementTemplate[] = [
  // 1. NDA - Acord de Confidențialitate
  {
    id: 'nda-mutual',
    name: 'Mutual NDA',
    nameRO: 'Acord de Confidențialitate Reciproc',
    category: 'nda',
    description: 'Acord bilateral de protecție a informațiilor confidențiale între două părți.',
    legalBasis: 'Art. 1169-1170 Cod Civil, Legea 11/1991 privind combaterea concurenței neloiale',
    fields: [
      ...commonPartyFields('party_a', 'Partea A'),
      ...commonPartyFields('party_b', 'Partea B'),
      { key: 'effective_date', label: 'Data intrării în vigoare', type: 'date', required: true, group: 'Contract' },
      { key: 'duration_months', label: 'Durata (luni)', type: 'number', required: true, placeholder: '24', group: 'Contract' },
      { key: 'confidential_scope', label: 'Obiectul informațiilor confidențiale', type: 'textarea', required: true, placeholder: 'Descrieți tipul de informații protejate...', group: 'Contract' },
      { key: 'penalty_amount', label: 'Clauza penală (RON)', type: 'number', required: false, placeholder: '50000', group: 'Contract' },
      { key: 'governing_law', label: 'Legea aplicabilă', type: 'text', required: false, defaultValue: 'Legislația română', group: 'Contract' },
    ],
    generateContent: (d) => `
ACORD DE CONFIDENȚIALITATE RECIPROC
(Non-Disclosure Agreement – NDA)

Nr. _____ / ${d.effective_date || '___________'}

Între:

1. ${d.party_a_name || '_______________'}, cu sediul în ${d.party_a_address || '_______________'}, CUI: ${d.party_a_cui || '_______________'}, Nr. Reg. Com.: ${d.party_a_reg_com || '_______________'}, reprezentată legal prin ${d.party_a_representative || '_______________'}, în calitate de ${d.party_a_role || 'Administrator'}, denumită în continuare „Partea A",

și

2. ${d.party_b_name || '_______________'}, cu sediul în ${d.party_b_address || '_______________'}, CUI: ${d.party_b_cui || '_______________'}, Nr. Reg. Com.: ${d.party_b_reg_com || '_______________'}, reprezentată legal prin ${d.party_b_representative || '_______________'}, în calitate de ${d.party_b_role || 'Administrator'}, denumită în continuare „Partea B",

denumite individual „Partea" și împreună „Părțile",

au convenit încheierea prezentului Acord de Confidențialitate, în următoarele condiții:

Art. 1. OBIECTUL ACORDULUI
Prezentul acord are ca obiect protejarea informațiilor confidențiale pe care Părțile le divulgă reciproc în cadrul relației lor de afaceri.

Informații confidențiale înseamnă: ${d.confidential_scope || 'orice informații tehnice, comerciale, financiare, organizatorice sau de altă natură, comunicate de o Parte celeilalte, indiferent de forma sau suportul pe care sunt furnizate.'}

Art. 2. OBLIGAȚII
2.1. Fiecare Parte se obligă să nu dezvăluie Informațiile Confidențiale primite de la cealaltă Parte niciunui terț, fără acordul prealabil scris al Părții care le-a furnizat.
2.2. Informațiile Confidențiale vor fi utilizate exclusiv în scopul colaborării dintre Părți.
2.3. Fiecare Parte va lua toate măsurile rezonabile pentru a proteja confidențialitatea informațiilor primite.

Art. 3. EXCEPȚII
Nu constituie Informații Confidențiale cele care:
a) sunt sau devin publice fără culpa Părții receptoare;
b) erau deja cunoscute de Partea receptoare la momentul divulgării;
c) sunt primite în mod legal de la terți, fără obligație de confidențialitate;
d) sunt dezvoltate independent de Partea receptoare.

Art. 4. DURATA
Prezentul acord este valabil pe o perioadă de ${d.duration_months || '24'} luni de la data semnării. Obligațiile de confidențialitate supraviețuiesc încetării acordului pe o perioadă suplimentară de 12 luni.

${d.penalty_amount ? `Art. 5. CLAUZA PENALĂ
În cazul încălcării obligațiilor de confidențialitate, Partea în culpă se obligă la plata sumei de ${d.penalty_amount} RON cu titlu de daune-interese, fără a aduce atingere dreptului Părții prejudiciate de a solicita repararea integrală a prejudiciului suferit.` : ''}

Art. ${d.penalty_amount ? '6' : '5'}. LEGEA APLICABILĂ
Prezentul acord este guvernat de ${d.governing_law || 'legislația română'}. Orice litigiu va fi soluționat pe cale amiabilă sau, în caz contrar, de instanțele competente din România.

Încheiat astăzi, ${d.effective_date || '___________'}, în două exemplare originale, câte unul pentru fiecare Parte.

Partea A: ${d.party_a_name || '_______________'}              Partea B: ${d.party_b_name || '_______________'}
Prin: ${d.party_a_representative || '_______________'}         Prin: ${d.party_b_representative || '_______________'}
Semnătura: _______________                                     Semnătura: _______________
    `.trim(),
  },

  // 2. Contract de Prestări Servicii
  {
    id: 'service-agreement',
    name: 'Service Agreement',
    nameRO: 'Contract de Prestări Servicii',
    category: 'service',
    description: 'Contract standard pentru prestarea de servicii între un prestator și un beneficiar.',
    legalBasis: 'Art. 2012-2063 Cod Civil (Contractul de antrepriză)',
    fields: [
      ...commonPartyFields('provider', 'Prestator'),
      ...commonPartyFields('client', 'Beneficiar'),
      { key: 'effective_date', label: 'Data contractului', type: 'date', required: true, group: 'Contract' },
      { key: 'service_description', label: 'Descrierea serviciilor', type: 'textarea', required: true, group: 'Contract' },
      { key: 'price', label: 'Prețul serviciilor (RON)', type: 'number', required: true, group: 'Financiar' },
      { key: 'payment_terms', label: 'Condiții de plată', type: 'select', required: true, options: ['La finalizare', '50% avans + 50% la finalizare', 'Lunar', 'La 30 de zile de la facturare'], group: 'Financiar' },
      { key: 'duration', label: 'Durata contractului', type: 'text', required: true, placeholder: '12 luni', group: 'Contract' },
      { key: 'penalty_delay', label: 'Penalitate întârziere plată (%/zi)', type: 'number', required: false, placeholder: '0.1', group: 'Financiar' },
    ],
    generateContent: (d) => `
CONTRACT DE PRESTĂRI SERVICII
Nr. _____ / ${d.effective_date || '___________'}

Între:

1. PRESTATOR: ${d.provider_name || '_______________'}, cu sediul în ${d.provider_address || '_______________'}, CUI: ${d.provider_cui || '_______________'}, Nr. Reg. Com.: ${d.provider_reg_com || '_______________'}, reprezentată prin ${d.provider_representative || '_______________'}, în calitate de ${d.provider_role || 'Administrator'},

și

2. BENEFICIAR: ${d.client_name || '_______________'}, cu sediul în ${d.client_address || '_______________'}, CUI: ${d.client_cui || '_______________'}, Nr. Reg. Com.: ${d.client_reg_com || '_______________'}, reprezentată prin ${d.client_representative || '_______________'}, în calitate de ${d.client_role || 'Administrator'},

Art. 1. OBIECTUL CONTRACTULUI
Prestatorul se obligă să furnizeze Beneficiarului următoarele servicii:
${d.service_description || '_______________'}

Art. 2. DURATA CONTRACTULUI
Prezentul contract se încheie pe o durată de ${d.duration || '_______________'}, începând cu data semnării.

Art. 3. PREȚUL ȘI MODALITATEA DE PLATĂ
3.1. Prețul total al serviciilor este de ${d.price || '_______________'} RON + TVA (dacă este cazul).
3.2. Plata se va efectua ${d.payment_terms || '_______________'}.
${d.penalty_delay ? `3.3. Pentru întârzieri la plată, Beneficiarul va datora penalități de ${d.penalty_delay}% pe zi de întârziere din suma datorată.` : ''}

Art. 4. OBLIGAȚIILE PRESTATORULUI
4.1. Să execute serviciile cu profesionalism și în termenele convenite.
4.2. Să informeze Beneficiarul despre progresul lucrărilor.
4.3. Să respecte toate normele legale aplicabile.

Art. 5. OBLIGAȚIILE BENEFICIARULUI
5.1. Să pună la dispoziția Prestatorului informațiile necesare.
5.2. Să efectueze plata la termenele stabilite.
5.3. Să recepționeze serviciile în termen de 5 zile lucrătoare.

Art. 6. RĂSPUNDEREA CONTRACTUALĂ
Partea care nu își îndeplinește obligațiile răspunde pentru prejudiciile cauzate celeilalte Părți.

Art. 7. FORȚA MAJORĂ
Forța majoră exonerează de răspundere partea care o invocă, în condițiile legii.

Art. 8. ÎNCETAREA CONTRACTULUI
Contractul încetează prin: ajungere la termen, acord mutual, reziliere pentru neîndeplinire.

Art. 9. LITIGII
Orice litigiu se soluționează pe cale amiabilă sau de instanțele competente.

Încheiat în două exemplare originale.

PRESTATOR: ${d.provider_name || '_______________'}          BENEFICIAR: ${d.client_name || '_______________'}
Prin: ${d.provider_representative || '_______________'}      Prin: ${d.client_representative || '_______________'}
    `.trim(),
  },

  // 3. Contract de Consultanță
  {
    id: 'consulting-agreement',
    name: 'Consulting Agreement',
    nameRO: 'Contract de Consultanță',
    category: 'consulting',
    description: 'Contract de consultanță pentru servicii de expertiză.',
    legalBasis: 'Art. 2012-2063 Cod Civil',
    fields: [
      ...commonPartyFields('consultant', 'Consultant'),
      ...commonPartyFields('client', 'Client'),
      { key: 'effective_date', label: 'Data contractului', type: 'date', required: true, group: 'Contract' },
      { key: 'scope', label: 'Domeniul de consultanță', type: 'textarea', required: true, group: 'Contract' },
      { key: 'hourly_rate', label: 'Tarif orar (RON)', type: 'number', required: false, group: 'Financiar' },
      { key: 'monthly_fee', label: 'Onorariu lunar fix (RON)', type: 'number', required: false, group: 'Financiar' },
      { key: 'duration', label: 'Durata', type: 'text', required: true, placeholder: '6 luni', group: 'Contract' },
      { key: 'deliverables', label: 'Livrabile', type: 'textarea', required: false, group: 'Contract' },
    ],
    generateContent: (d) => `
CONTRACT DE CONSULTANȚĂ
Nr. _____ / ${d.effective_date || '___________'}

Între:
1. CONSULTANT: ${d.consultant_name || '_______________'}, CUI: ${d.consultant_cui || '_______________'}, cu sediul în ${d.consultant_address || '_______________'}, reprezentat prin ${d.consultant_representative || '_______________'},

2. CLIENT: ${d.client_name || '_______________'}, CUI: ${d.client_cui || '_______________'}, cu sediul în ${d.client_address || '_______________'}, reprezentat prin ${d.client_representative || '_______________'},

Art. 1. OBIECT
Consultantul se obligă să furnizeze servicii de consultanță în domeniul:
${d.scope || '_______________'}

${d.deliverables ? `Livrabile convenite:\n${d.deliverables}` : ''}

Art. 2. DURATA
Contractul este valabil pe ${d.duration || '_______________'} de la data semnării.

Art. 3. REMUNERAȚIA
${d.hourly_rate ? `Tarif orar: ${d.hourly_rate} RON/oră + TVA.` : ''}
${d.monthly_fee ? `Onorariu lunar fix: ${d.monthly_fee} RON + TVA.` : ''}
Plata se efectuează lunar, în baza raportului de activitate și a facturii emise.

Art. 4. PROPRIETATE INTELECTUALĂ
Toate materialele create în cadrul prezentului contract aparțin Clientului după achitarea integrală a onorariului.

Art. 5. CONFIDENȚIALITATE
Consultantul se obligă să păstreze confidențialitatea tuturor informațiilor primite de la Client.

Art. 6. DISPOZIȚII FINALE
Prezentul contract se completează cu dispozițiile Codului Civil. Modificările se fac numai prin acte adiționale semnate de ambele părți.

CONSULTANT: ${d.consultant_name || '_______________'}          CLIENT: ${d.client_name || '_______________'}
    `.trim(),
  },

  // 4. Contract de Împrumut
  {
    id: 'loan-agreement',
    name: 'Loan Agreement',
    nameRO: 'Contract de Împrumut',
    category: 'loan',
    description: 'Contract de împrumut între persoane juridice sau fizice.',
    legalBasis: 'Art. 2158-2170 Cod Civil (Contractul de împrumut)',
    fields: [
      ...commonPartyFields('lender', 'Împrumutător'),
      ...commonPartyFields('borrower', 'Împrumutat'),
      { key: 'effective_date', label: 'Data contractului', type: 'date', required: true, group: 'Contract' },
      { key: 'amount', label: 'Suma împrumutată (RON)', type: 'number', required: true, group: 'Financiar' },
      { key: 'interest_rate', label: 'Dobânda anuală (%)', type: 'number', required: false, placeholder: '0', group: 'Financiar' },
      { key: 'repayment_date', label: 'Data scadenței', type: 'date', required: true, group: 'Financiar' },
      { key: 'repayment_schedule', label: 'Grafic de rambursare', type: 'select', required: true, options: ['Integral la scadență', 'Rate lunare egale', 'Rate trimestriale'], group: 'Financiar' },
    ],
    generateContent: (d) => `
CONTRACT DE ÎMPRUMUT
Nr. _____ / ${d.effective_date || '___________'}

Între:
1. ÎMPRUMUTĂTOR: ${d.lender_name || '_______________'}, CUI/CNP: ${d.lender_cui || '_______________'}, cu sediul/domiciliul în ${d.lender_address || '_______________'}, reprezentat prin ${d.lender_representative || '_______________'},

2. ÎMPRUMUTAT: ${d.borrower_name || '_______________'}, CUI/CNP: ${d.borrower_cui || '_______________'}, cu sediul/domiciliul în ${d.borrower_address || '_______________'}, reprezentat prin ${d.borrower_representative || '_______________'},

Art. 1. OBIECTUL CONTRACTULUI
Împrumutătorul acordă Împrumutatului un împrumut în sumă de ${d.amount || '_______________'} RON (în litere: _______________).

Art. 2. DOBÂNDA
${d.interest_rate && Number(d.interest_rate) > 0 ? `Dobânda anuală este de ${d.interest_rate}% aplicată la soldul rămas.` : 'Împrumutul este acordat fără dobândă.'}

Art. 3. RESTITUIREA
3.1. Suma împrumutată va fi restituită până la data de ${d.repayment_date || '_______________'}.
3.2. Restituirea se face ${d.repayment_schedule || '_______________'}.

Art. 4. ÎNTÂRZIERI
Pentru fiecare zi de întârziere, Împrumutatul datorează penalități de 0.05% din suma restantă.

Art. 5. DISPOZIȚII FINALE
Prezentul contract constituie titlu executoriu conform Art. 2157 Cod Civil.

ÎMPRUMUTĂTOR: ${d.lender_name || '_______________'}          ÎMPRUMUTAT: ${d.borrower_name || '_______________'}
    `.trim(),
  },

  // 5. Scrisoare de Intenție
  {
    id: 'letter-of-intent',
    name: 'Letter of Intent',
    nameRO: 'Scrisoare de Intenție',
    category: 'partnership',
    description: 'Scrisoare de intenție pentru inițierea unei colaborări de afaceri.',
    legalBasis: 'Art. 1183 Cod Civil (Buna-credință în negocieri)',
    fields: [
      ...commonPartyFields('party_a', 'Inițiator'),
      ...commonPartyFields('party_b', 'Destinatar'),
      { key: 'effective_date', label: 'Data', type: 'date', required: true, group: 'Document' },
      { key: 'purpose', label: 'Scopul colaborării', type: 'textarea', required: true, group: 'Document' },
      { key: 'terms_summary', label: 'Termeni propuși (rezumat)', type: 'textarea', required: true, group: 'Document' },
      { key: 'exclusivity_period', label: 'Perioadă de exclusivitate (zile)', type: 'number', required: false, group: 'Document' },
      { key: 'binding', label: 'Caracter obligatoriu', type: 'select', required: true, options: ['Non-obligatoriu', 'Parțial obligatoriu'], group: 'Document' },
    ],
    generateContent: (d) => `
SCRISOARE DE INTENȚIE
(Letter of Intent)

Data: ${d.effective_date || '___________'}

Către: ${d.party_b_name || '_______________'}
${d.party_b_address || '_______________'}
În atenția: ${d.party_b_representative || '_______________'}

De la: ${d.party_a_name || '_______________'}
${d.party_a_address || '_______________'}

Stimată Doamnă / Stimate Domnule ${d.party_b_representative || '_______________'},

Prin prezenta, vă comunicăm intenția noastră fermă de a iniția o colaborare cu ${d.party_b_name || '_______________'} în următorul domeniu:

${d.purpose || '_______________'}

TERMENI PROPUȘI:
${d.terms_summary || '_______________'}

${d.exclusivity_period ? `EXCLUSIVITATE: Pe o perioadă de ${d.exclusivity_period} zile de la semnarea prezentei, ambele Părți se angajează să nu inițieze negocieri similare cu terți.` : ''}

CARACTER: Prezenta scrisoare de intenție este ${d.binding === 'Non-obligatoriu' ? 'non-obligatorie și nu creează obligații juridice, cu excepția clauzelor de confidențialitate și exclusivitate' : 'parțial obligatorie, conform clauzelor specificate'}.

CONFIDENȚIALITATE: Discuțiile și informațiile schimbate în cadrul acestei negocieri sunt confidențiale.

Cu stimă,

${d.party_a_name || '_______________'}
Prin: ${d.party_a_representative || '_______________'}
${d.party_a_role || 'Administrator'}
    `.trim(),
  },
];

// ─── Engine ─────────────────────────────────────────────────────────────────

const DISCLAIMER = `
⚠️ ATENȚIE: Acest document a fost generat automat de YANA și are caracter orientativ. 
NU constituie consultanță juridică. Vă recomandăm consultarea unui avocat sau jurist 
calificat înainte de semnarea oricărui document cu valoare juridică.
Generatorul se bazează pe modele inspirate din OpenAgreements (MIT License).
`.trim();

/**
 * Generate an agreement from a template
 */
export function generateAgreement(
  templateId: string,
  fieldValues: Record<string, string>
): GeneratedAgreement | null {
  const template = agreementTemplates.find(t => t.id === templateId);
  if (!template) return null;

  return {
    templateId: template.id,
    templateName: template.nameRO,
    content: template.generateContent(fieldValues),
    generatedAt: new Date().toISOString(),
    fields: fieldValues,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Get all templates by category
 */
export function getTemplatesByCategory(category?: AgreementCategory): AgreementTemplate[] {
  if (!category) return agreementTemplates;
  return agreementTemplates.filter(t => t.category === category);
}

/**
 * Get category labels in Romanian
 */
export const categoryLabels: Record<AgreementCategory, string> = {
  nda: 'Confidențialitate (NDA)',
  service: 'Prestări Servicii',
  employment: 'Muncă / HR',
  partnership: 'Parteneriat',
  sale: 'Vânzare-Cumpărare',
  consulting: 'Consultanță',
  loan: 'Împrumut',
  lease: 'Închiriere',
};
