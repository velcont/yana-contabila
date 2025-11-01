export interface Analysis {
  id: string;
  created_at: string;
  company_name?: string;
  metadata: {
    ca?: number;
    profit?: number;
    ebitda?: number;
    casa?: number;
    banca?: number;
    clienti?: number;
    furnizori?: number;
    stocuri?: number;
    cheltuieli?: number;
  };
}

export interface ResilienceScore {
  overall: number;
  anticipation: number;
  coping: number;
  adaptation: number;
  robustness: number;
  redundancy: number;
  resourcefulness: number;
  rapidity: number;
  profitStability: number;
  liquidity: number;
  efficiency: number;
  costFlexibility: number;
}

export interface AdaptabilityMetrics {
  responseTime: number;
  flexibilityScore: number;
  innovationIndex: number;
}
