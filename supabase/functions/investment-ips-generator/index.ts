import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const {
      age,
      monthly_income,
      monthly_savings,
      risk_tolerance = "moderate", // "conservative" | "moderate" | "aggressive"
      investment_horizon_years = 10,
      goals = [],
      existing_portfolio_value = 0,
      has_emergency_fund = false,
      tax_status = "resident_ro", // resident_ro, non_resident
      preferred_platforms = [],
      preferred_asset_types = [],
      exclude_sectors = []
    } = body;

    if (!age || !monthly_income) {
      return new Response(JSON.stringify({ error: "Missing required: age, monthly_income" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Determine allocation based on risk profile and age
    const stockAllocation = calculateStockAllocation(age, risk_tolerance);
    const bondAllocation = 100 - stockAllocation - 5; // 5% cash reserve
    const cashAllocation = 5;

    // Sub-allocations
    const subAllocations = getSubAllocations(risk_tolerance, preferred_asset_types, exclude_sectors);

    // Calculate projections
    const annualSavings = (monthly_savings || monthly_income * 0.2) * 12;
    const projections = calculateProjections(
      existing_portfolio_value,
      annualSavings,
      investment_horizon_years,
      risk_tolerance
    );

    // Emergency fund recommendation
    const emergencyFundTarget = monthly_income * 6;
    const emergencyFundNote = has_emergency_fund
      ? "✅ Ai fond de urgență — poți investi cu încredere."
      : `⚠️ Recomandare: constituie un fond de urgență de ${emergencyFundTarget.toLocaleString()} RON (6 luni de venituri) ÎNAINTE de a investi.`;

    // Tax optimization notes for Romania
    const taxNotes = generateTaxNotes(tax_status, projections);

    // Rebalancing rules
    const rebalancingRules = [
      "📅 Rebalansare trimestrială (în fiecare ianuarie, aprilie, iulie, octombrie)",
      "⚖️ Rebalansează dacă orice clasă de active deviază cu >5% de la alocare",
      "🔄 Folosește contribuții noi pentru rebalansare (evită vânzarea — implicații fiscale)",
      "📊 Review anual complet al IPS-ului (fiecare ianuarie)"
    ];

    // Platform recommendations
    const platformRecs = getPlatformRecommendations(risk_tolerance, preferred_platforms);

    const ips = {
      success: true,
      title: "Investment Policy Statement (IPS) — Personalizat",
      generated_at: new Date().toISOString(),
      investor_profile: {
        age,
        risk_tolerance,
        risk_label: risk_tolerance === "conservative" ? "Conservator" : risk_tolerance === "moderate" ? "Moderat" : "Agresiv",
        investment_horizon: `${investment_horizon_years} ani`,
        monthly_savings: monthly_savings || monthly_income * 0.2,
        goals: goals.length > 0 ? goals : ["Creștere pe termen lung", "Protecție contra inflației"]
      },
      emergency_fund: {
        target: emergencyFundTarget,
        status: has_emergency_fund ? "constituit" : "necesar",
        note: emergencyFundNote
      },
      asset_allocation: {
        stocks_pct: stockAllocation,
        bonds_pct: bondAllocation,
        cash_pct: cashAllocation,
        sub_allocations: subAllocations,
        rationale: `Alocare bazată pe vârsta de ${age} ani, profil ${risk_tolerance}, orizont ${investment_horizon_years} ani. Regula generală: ${risk_tolerance === 'aggressive' ? '90 - vârstă/2' : risk_tolerance === 'conservative' ? '100 - vârstă' : '110 - vârstă'} = ${stockAllocation}% acțiuni.`
      },
      projections: {
        scenarios: projections,
        disclaimer: "Proiecțiile sunt estimative bazate pe randamente istorice medii. Performanța trecută nu garantează rezultate viitoare."
      },
      rebalancing_rules: rebalancingRules,
      tax_optimization: taxNotes,
      recommended_platforms: platformRecs,
      investment_rules: [
        "📌 Investește LUNAR o sumă fixă (DCA) — nu încerca să temporizezi piața",
        "🚫 Nu investi bani de care ai nevoie în următoarele 3-5 ani",
        "📉 Nu vinde în panică la scăderi — sunt oportunități de cumpărare",
        `💰 Contribuție lunară recomandată: ${(monthly_savings || monthly_income * 0.2).toLocaleString()} RON`,
        "📊 Diversifică pe minimum 3 sectoare și 2 geografii",
        "⚠️ Nicio poziție individuală nu trebuie să depășească 10% din portofoliu",
        "🔄 Reinvestește dividendele automat (DRIP)"
      ],
      review_schedule: {
        monthly: "Verifică contribuțiile și P&L",
        quarterly: "Rebalansare dacă e necesar",
        annually: "Review complet IPS, ajustare obiective",
        trigger: "Review imediat la schimbări majore: job nou, copil, moștenire, pierdere >20%"
      }
    };

    return new Response(JSON.stringify(ips), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("IPS generator error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function calculateStockAllocation(age: number, risk: string): number {
  switch (risk) {
    case "conservative": return Math.max(20, Math.min(60, 100 - age));
    case "aggressive": return Math.max(50, Math.min(95, 110 - Math.floor(age / 2)));
    default: return Math.max(30, Math.min(80, 110 - age)); // moderate
  }
}

function getSubAllocations(risk: string, preferred: string[], exclude: string[]) {
  const base: Record<string, any> = {
    conservative: {
      stocks: { "ETF-uri globale (VWCE/IWDA)": 50, "Dividend Aristocrats": 30, "ETF piețe emergente": 10, "REITs": 10 },
      bonds: { "Obligațiuni stat RO/EU": 60, "ETF obligațiuni (AGG)": 30, "Obligațiuni corporative": 10 }
    },
    moderate: {
      stocks: { "ETF-uri globale (VWCE/IWDA)": 40, "Acțiuni growth (tech, AI)": 25, "Dividend Aristocrats": 20, "ETF piețe emergente": 15 },
      bonds: { "Obligațiuni stat RO/EU": 50, "ETF obligațiuni (AGG)": 30, "Obligațiuni corporative": 20 }
    },
    aggressive: {
      stocks: { "ETF-uri globale (VWCE/IWDA)": 30, "Acțiuni growth (tech, AI, biotech)": 35, "Small/Mid caps": 15, "ETF piețe emergente": 10, "Crypto (BTC/ETH)": 10 },
      bonds: { "Obligațiuni stat RO": 50, "ETF obligațiuni high yield": 50 }
    }
  };

  return base[risk] || base.moderate;
}

function calculateProjections(currentValue: number, annualSavings: number, years: number, risk: string) {
  const returns: Record<string, { optimist: number; neutral: number; pesimist: number }> = {
    conservative: { optimist: 0.08, neutral: 0.05, pesimist: 0.02 },
    moderate: { optimist: 0.12, neutral: 0.07, pesimist: 0.03 },
    aggressive: { optimist: 0.15, neutral: 0.10, pesimist: -0.02 }
  };

  const rates = returns[risk] || returns.moderate;
  const scenarios: Record<string, any> = {};

  for (const [scenario, rate] of Object.entries(rates)) {
    let value = currentValue;
    for (let i = 0; i < years; i++) {
      value = (value + annualSavings) * (1 + rate);
    }
    const totalInvested = currentValue + annualSavings * years;
    scenarios[scenario] = {
      final_value: Math.round(value),
      total_invested: Math.round(totalInvested),
      total_gain: Math.round(value - totalInvested),
      annualized_return: `${(rate * 100).toFixed(1)}%`
    };
  }

  return scenarios;
}

function generateTaxNotes(taxStatus: string, projections: any) {
  return [
    "🇷🇴 **Impozit câștiguri de capital**: 10% pe profitul realizat (la vânzare)",
    "💊 **CASS (10%)**: se aplică dacă câștigurile anuale depășesc 6 salarii minime brute (~22.800 RON în 2025)",
    "📝 **Declarația Unică (D212)**: se depune până pe 25 mai anul următor",
    "🔄 **Compensare pierderi**: pierderile se pot reporta 7 ani fiscal",
    "🌍 **Dividende străine**: credit fiscal pentru impozitul reținut la sursă (formularul W-8BEN pentru SUA = 15%)",
    "💡 **Optimizare**: evită vânzările pe termen scurt; păstrează >1 an pentru a acumula mai mult",
    "📋 **Păstrează**: toate statement-urile anuale de la broker pentru ANAF"
  ];
}

function getPlatformRecommendations(risk: string, preferred: string[]) {
  const allPlatforms = [
    { name: "XTB", type: "Acțiuni, ETF-uri", comision: "0% pe acțiuni reale", pro: "0 comision, platformă xStation5", contra: "Fără acțiuni fracționate" },
    { name: "Trading 212", type: "Acțiuni, ETF-uri", comision: "0% pe Invest", pro: "Acțiuni fracționate, Pies (auto-invest)", contra: "Spread-uri pe CFD" },
    { name: "Interactive Brokers", type: "Toate clasele", comision: "0.005$/acțiune", pro: "Cel mai complet, acces global", contra: "Interfață complexă" },
    { name: "Revolut", type: "Acțiuni, Crypto", comision: "1-3 tranzacții gratuite/lună", pro: "Simplu, integrat cu banking", contra: "Selecție limitată, comisioane peste limită" },
    { name: "TradeVille", type: "BVB, obligațiuni RO", comision: "0.4-0.65%", pro: "Acces BVB direct, obligațiuni RO", contra: "Comisioane mai mari" },
    { name: "eToro", type: "Acțiuni, ETF, Crypto", comision: "0% acțiuni, spread crypto", pro: "Copy trading, social", contra: "Spread-uri mari, retragere 5$" }
  ];

  if (preferred.length > 0) {
    return allPlatforms.filter(p => preferred.some(pref => p.name.toLowerCase().includes(pref.toLowerCase())));
  }

  // Return top 3 based on risk profile
  if (risk === "conservative") return allPlatforms.filter(p => ["XTB", "Interactive Brokers", "TradeVille"].includes(p.name));
  if (risk === "aggressive") return allPlatforms.filter(p => ["Trading 212", "Interactive Brokers", "eToro"].includes(p.name));
  return allPlatforms.filter(p => ["XTB", "Trading 212", "Interactive Brokers"].includes(p.name));
}
