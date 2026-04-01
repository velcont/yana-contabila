import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FiscalDeadline {
  name: string;
  description: string;
  day: number;
  months: number[] | 'all' | 'quarterly' | 'annual';
  category: 'TVA' | 'salarii' | 'impozit' | 'raportare' | 'declaratie';
  importance: 'critical' | 'high' | 'medium';
}

// Calendar fiscal România 2026 - Termene obligatorii
const FISCAL_DEADLINES: FiscalDeadline[] = [
  // TVA
  {
    name: 'D300 - Decont TVA',
    description: 'Depunere decont TVA (plătitori lunari)',
    day: 25,
    months: 'all',
    category: 'TVA',
    importance: 'critical'
  },
  {
    name: 'D300 - Decont TVA trimestrial',
    description: 'Depunere decont TVA (plătitori trimestriali)',
    day: 25,
    months: 'quarterly', // Jan, Apr, Jul, Oct
    category: 'TVA',
    importance: 'critical'
  },
  {
    name: 'D390 - Declarație recapitulativă',
    description: 'Declarație recapitulativă privind livrările/achizițiile intracomunitare',
    day: 25,
    months: 'all',
    category: 'TVA',
    importance: 'high'
  },
  // Salarii
  {
    name: 'D112 - Contribuții sociale',
    description: 'Declarație privind obligațiile de plată a contribuțiilor sociale, impozitului pe venit și evidența nominală',
    day: 25,
    months: 'all',
    category: 'salarii',
    importance: 'critical'
  },
  // Impozit pe profit
  {
    name: 'D100 - Impozit pe profit trimestrial',
    description: 'Declarație privind obligațiile de plată la bugetul de stat (impozit profit trimestrial)',
    day: 25,
    months: 'quarterly',
    category: 'impozit',
    importance: 'critical'
  },
  // Impozit micro
  {
    name: 'Impozit microîntreprinderi',
    description: 'Plata impozitului pe veniturile microîntreprinderilor (trimestrial)',
    day: 25,
    months: 'quarterly',
    category: 'impozit',
    importance: 'critical'
  },
  // Declarație unică
  {
    name: 'D212 - Declarația unică',
    description: 'Declarația unică privind impozitul pe venit și contribuțiile sociale (PFA, Profesii liberale)',
    day: 25,
    months: [5], // Mai
    category: 'declaratie',
    importance: 'critical'
  },
  // Bilanț
  {
    name: 'Situații financiare anuale',
    description: 'Depunere bilanț contabil și situații financiare anuale',
    day: 30,
    months: [5], // Mai
    category: 'raportare',
    importance: 'critical'
  },
  // SAF-T
  {
    name: 'SAF-T D406',
    description: 'Fișierul standard de audit fiscal (contribuabili mari)',
    day: 30,
    months: 'all',
    category: 'raportare',
    importance: 'high'
  },
  // e-Factura
  {
    name: 'e-Factura - termen trimitere',
    description: 'Trimiterea facturilor în sistemul e-Factura (5 zile lucrătoare de la emitere)',
    day: 5,
    months: 'all',
    category: 'raportare',
    importance: 'high'
  },
  // Dividende
  {
    name: 'Plata impozit dividende',
    description: 'Plata impozitului pe dividende (25 ale lunii următoare distribuirii)',
    day: 25,
    months: 'all',
    category: 'impozit',
    importance: 'medium'
  },
  // Intrastat
  {
    name: 'Intrastat',
    description: 'Declarație Intrastat (operațiuni intracomunitare peste prag)',
    day: 15,
    months: 'all',
    category: 'declaratie',
    importance: 'medium'
  }
];

function getQuarterlyMonths(): number[] {
  return [1, 4, 7, 10]; // Lunile de depunere (pentru trimestrul anterior)
}

function getUpcomingDeadlines(daysAhead: number = 14): { date: string; name: string; description: string; category: string; importance: string; daysUntil: number }[] {
  const now = new Date();
  const results: any[] = [];

  for (let i = 0; i <= daysAhead; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + i);
    const month = checkDate.getMonth() + 1; // 1-indexed
    const day = checkDate.getDate();

    for (const deadline of FISCAL_DEADLINES) {
      if (deadline.day !== day) continue;

      let applies = false;
      if (deadline.months === 'all') {
        applies = true;
      } else if (deadline.months === 'quarterly') {
        applies = getQuarterlyMonths().includes(month);
      } else if (deadline.months === 'annual') {
        applies = true; // Will be filtered by specific months
      } else if (Array.isArray(deadline.months)) {
        applies = deadline.months.includes(month);
      }

      if (applies) {
        results.push({
          date: checkDate.toISOString().split('T')[0],
          name: deadline.name,
          description: deadline.description,
          category: deadline.category,
          importance: deadline.importance,
          daysUntil: i
        });
      }
    }
  }

  // Sort by date, then importance
  const importanceOrder = { critical: 0, high: 1, medium: 2 };
  results.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return (importanceOrder[a.importance as keyof typeof importanceOrder] || 3) - (importanceOrder[b.importance as keyof typeof importanceOrder] || 3);
  });

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const daysAhead = parseInt(url.searchParams.get('days') || '14');
    
    const deadlines = getUpcomingDeadlines(Math.min(daysAhead, 30));

    return new Response(
      JSON.stringify({
        success: true,
        currentDate: new Date().toISOString().split('T')[0],
        daysAhead,
        deadlines,
        count: deadlines.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fiscal-calendar:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
