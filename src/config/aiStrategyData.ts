// Date statice pentru Strategie AI / Transformare Digitală

export const INDUSTRIES = [
  { value: 'retail', label: 'Retail' },
  { value: 'transport', label: 'Transport & Logistică' },
  { value: 'constructii', label: 'Construcții' },
  { value: 'servicii', label: 'Servicii Profesionale' },
  { value: 'horeca', label: 'HoReCa' },
  { value: 'productie', label: 'Producție' },
  { value: 'sanatate', label: 'Sănătate' },
  { value: 'educatie', label: 'Educație' },
  { value: 'it', label: 'IT & Tehnologie' },
  { value: 'altele', label: 'Altele' },
] as const;

export const DEPARTMENTS = [
  { value: 'vanzari', label: 'Vânzări' },
  { value: 'contabilitate', label: 'Contabilitate' },
  { value: 'hr', label: 'Resurse Umane' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'productie', label: 'Producție' },
  { value: 'logistica', label: 'Logistică' },
  { value: 'suport_clienti', label: 'Suport Clienți' },
] as const;

export interface AITool {
  name: string;
  category: string;
  priceUSD: number; // per user per month
  description: string;
}

export const AI_TOOLS: AITool[] = [
  { name: 'Claude Pro', category: 'AI Assistant', priceUSD: 20, description: 'Asistent AI avansat pentru analiză, redactare și strategii' },
  { name: 'Claude Team', category: 'AI Assistant', priceUSD: 30, description: 'Claude cu funcții de colaborare echipă' },
  { name: 'ChatGPT Plus', category: 'AI Assistant', priceUSD: 20, description: 'Asistent AI general cu GPT-4' },
  { name: 'Make.com Starter', category: 'Automatizare', priceUSD: 9, description: 'Automatizări simple între aplicații' },
  { name: 'Make.com Pro', category: 'Automatizare', priceUSD: 16, description: 'Automatizări avansate cu volume mari' },
  { name: 'Zapier Starter', category: 'Automatizare', priceUSD: 20, description: 'Integrări automate între 7000+ aplicații' },
  { name: 'Zapier Professional', category: 'Automatizare', priceUSD: 49, description: 'Automatizări complexe multi-step' },
  { name: 'Midjourney', category: 'Marketing Vizual', priceUSD: 10, description: 'Generare imagini AI pentru marketing' },
  { name: 'Jasper AI', category: 'Content Marketing', priceUSD: 39, description: 'Generare conținut marketing AI' },
  { name: 'HubSpot AI', category: 'CRM & Marketing', priceUSD: 45, description: 'CRM cu funcții AI integrate' },
  { name: 'Tidio AI', category: 'Chatbot', priceUSD: 29, description: 'Chatbot AI pentru suport clienți' },
  { name: 'Notion AI', category: 'Productivitate', priceUSD: 10, description: 'Spațiu de lucru cu AI integrat' },
];

// Salarii medii brute lunare pe industrie (RON) - estimări 2025-2026
export const INDUSTRY_AVG_SALARY: Record<string, number> = {
  retail: 4500,
  transport: 5000,
  constructii: 5500,
  servicii: 6500,
  horeca: 4000,
  productie: 5000,
  sanatate: 6000,
  educatie: 5500,
  it: 10000,
  altele: 5500,
};

// Benchmark-uri creștere CA cu AI pe industrie (% anual estimat)
export const INDUSTRY_GROWTH_BENCHMARKS: Record<string, number> = {
  retail: 12,
  transport: 8,
  constructii: 7,
  servicii: 15,
  horeca: 10,
  productie: 9,
  sanatate: 11,
  educatie: 8,
  it: 18,
  altele: 10,
};

// Cost reducere operațională estimat (% din cheltuieli)
export const INDUSTRY_COST_REDUCTION: Record<string, number> = {
  retail: 15,
  transport: 12,
  constructii: 8,
  servicii: 20,
  horeca: 14,
  productie: 18,
  sanatate: 10,
  educatie: 12,
  it: 22,
  altele: 12,
};

export interface Assumptions {
  usdRonRate: number;
  hourlyCost: number; // RON/oră
  growthPercent: number;
  costReductionPercent: number;
  usersPerTool: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  usdRonRate: 4.97,
  hourlyCost: 50,
  growthPercent: 10,
  costReductionPercent: 12,
  usersPerTool: 1,
};

export interface BusinessProfile {
  industry: string;
  employeesCount: number;
  annualRevenue: number;
  netProfit: number;
  departments: string[];
  businessDescription: string;
}

export interface AIOpportunity {
  title: string;
  description: string;
  impact: number; // 1-10
  priority: 'high' | 'medium' | 'low';
  recommendedTools: string[];
  timeSavingsHoursMonth: number;
  department: string;
}

export interface CostEstimate {
  toolName: string;
  monthlyCostRON: number;
  setupCostRON: number;
  trainingHours: number;
  users: number;
}

export interface RoadmapPhase {
  phase: string; // "Luna 1-2", "Luna 3-4", "Luna 5-6"
  actions: string[];
  tools: string[];
  estimatedCostRON: number;
  responsible: string;
  expectedResult: string;
}

export interface AIAnalysis {
  opportunities: AIOpportunity[];
  costEstimates: CostEstimate[];
  roadmap: RoadmapPhase[];
  industryBenchmarks: {
    avgSalary: number;
    growthEstimate: number;
    costReduction: number;
  };
}
