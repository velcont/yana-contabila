import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Database de comisioane și caracteristici brokeri - actualizat 2025/2026
const BROKER_DATA: Record<string, any> = {
  "XTB": {
    name: "XTB (xStation 5)",
    country: "Polonia",
    regulated_by: ["KNF (Polonia)", "FCA (UK)", "CySEC"],
    account_types: ["Standard"],
    min_deposit: 0,
    stocks: {
      commission: "0% (sub 100.000 EUR/lună)",
      commission_over_limit: "0.2% (min 10 EUR) peste 100.000 EUR/lună",
      fractional: false,
      exchanges: ["NYSE", "NASDAQ", "LSE", "Xetra", "Euronext", "BVB (via CFD)"],
      real_stocks: true
    },
    etfs: {
      commission: "0% (sub 100.000 EUR/lună)",
      available: 400,
      fractional: false
    },
    crypto: {
      available: true,
      type: "CFD",
      commission: "Spread variabil"
    },
    forex: { commission: "Spread de la 0.1 pips", leverage: "1:30" },
    deposit_fee: "0 RON/EUR/USD",
    withdrawal_fee: "0 (min 50 RON/echivalent)",
    inactivity_fee: "10 EUR/lună după 12 luni fără tranzacții",
    currency_conversion: "0.5%",
    tax_report: "Raport anual disponibil pentru ANAF",
    mobile_app: true,
    demo_account: true,
    pros: ["0 comision acțiuni reale", "Platformă xStation excelentă", "Analiză integrată", "Suport în limba română"],
    cons: ["Fără acțiuni fracționate", "Inactivity fee", "Selecție ETF limitată vs IBKR"]
  },
  "Trading 212": {
    name: "Trading 212",
    country: "Bulgaria/UK",
    regulated_by: ["FCA (UK)", "FSC (Bulgaria)"],
    account_types: ["Invest (acțiuni reale)", "CFD", "ISA (doar UK)"],
    min_deposit: 1,
    stocks: {
      commission: "0%",
      commission_over_limit: "0% (nelimitat)",
      fractional: true,
      exchanges: ["NYSE", "NASDAQ", "LSE", "Xetra", "Euronext"],
      real_stocks: true
    },
    etfs: {
      commission: "0%",
      available: 2000,
      fractional: true
    },
    crypto: {
      available: false,
      type: "N/A",
      commission: "N/A"
    },
    forex: { commission: "Spread variabil (cont CFD)", leverage: "1:30" },
    deposit_fee: "0",
    withdrawal_fee: "0",
    inactivity_fee: "0",
    currency_conversion: "0.15% (FX impact)",
    tax_report: "Raport anual descărcabil",
    mobile_app: true,
    demo_account: true,
    pros: ["0 comision nelimitat", "Acțiuni fracționate", "Pies (auto-invest/rebalansare)", "Interfață simplă", "Fără inactivity fee"],
    cons: ["Fără acces BVB", "Currency conversion 0.15%", "Fără crypto pe Invest"]
  },
  "Interactive Brokers": {
    name: "Interactive Brokers (IBKR)",
    country: "SUA",
    regulated_by: ["SEC (SUA)", "FCA (UK)", "MNB (Ungaria)"],
    account_types: ["Individual", "Joint", "IRA"],
    min_deposit: 0,
    stocks: {
      commission: "0.005$/acțiune (min 1$) sau Tiered: 0.0035$/acțiune",
      commission_over_limit: "Scade cu volumul",
      fractional: true,
      exchanges: ["150+ burse în 33 țări", "NYSE", "NASDAQ", "LSE", "Xetra", "BVB", "TSE"],
      real_stocks: true
    },
    etfs: {
      commission: "La fel ca acțiunile",
      available: 13000,
      fractional: true
    },
    crypto: {
      available: true,
      type: "Real + Futures",
      commission: "0.12-0.18%"
    },
    forex: { commission: "0.08-0.20 bps", leverage: "1:30" },
    deposit_fee: "0",
    withdrawal_fee: "1 retragere gratuită/lună, apoi variabil",
    inactivity_fee: "0 (eliminat din 2021)",
    currency_conversion: "0.002% (cel mai mic din industrie)",
    tax_report: "Raport complet, formular 1042-S",
    mobile_app: true,
    demo_account: true,
    pros: ["Acces la 150+ burse globale", "Cel mai mic currency conversion", "Instrumente profesionale", "Margin loans competitive", "Acces BVB direct"],
    cons: ["Interfață complexă (TWS)", "Comision per tranzacție", "Curba de învățare abruptă"]
  },
  "Revolut": {
    name: "Revolut",
    country: "UK/Lituania",
    regulated_by: ["FCA (UK)", "Banca Lituaniei"],
    account_types: ["Standard", "Plus", "Premium", "Metal", "Ultra"],
    min_deposit: 0,
    stocks: {
      commission: "1-3 tranzacții gratuite/lună (Standard), nelimitat (Metal/Ultra)",
      commission_over_limit: "1 EUR/tranzacție (Standard) sau 0.25% (ce e mai mare)",
      fractional: true,
      exchanges: ["NYSE", "NASDAQ", "LSE"],
      real_stocks: true
    },
    etfs: {
      commission: "La fel ca acțiunile",
      available: 500,
      fractional: true
    },
    crypto: {
      available: true,
      type: "Real (cu transfer extern pe unele)",
      commission: "1.49-2.49% (Standard), 0.49% (Metal)"
    },
    forex: { commission: "0% în orele de piață (weekday), 1% weekend", leverage: "N/A" },
    deposit_fee: "0",
    withdrawal_fee: "0",
    inactivity_fee: "0",
    currency_conversion: "0% în timpul programului (Standard: 1000 EUR/lună), apoi 0.5%",
    tax_report: "Raport tranzacții disponibil",
    mobile_app: true,
    demo_account: false,
    pros: ["Integrat cu banking", "Acțiuni fracționate", "Crypto disponibil", "Interfață foarte simplă", "Multi-currency"],
    cons: ["Comisioane ascunse la planul Standard", "Selecție limitată acțiuni/ETF-uri", "Nu e broker dedicat", "Fără acces la burse europene mici"]
  },
  "eToro": {
    name: "eToro",
    country: "Israel/Cipru",
    regulated_by: ["CySEC", "FCA (UK)", "ASIC (Australia)"],
    account_types: ["Retail", "Professional"],
    min_deposit: 50,
    stocks: {
      commission: "0% (acțiuni reale)",
      commission_over_limit: "0%",
      fractional: true,
      exchanges: ["NYSE", "NASDAQ", "LSE", "Hong Kong", "Paris"],
      real_stocks: true
    },
    etfs: {
      commission: "0%",
      available: 700,
      fractional: true
    },
    crypto: {
      available: true,
      type: "Real + CFD",
      commission: "1% spread"
    },
    forex: { commission: "Spread de la 1 pip", leverage: "1:30" },
    deposit_fee: "0",
    withdrawal_fee: "5 USD",
    inactivity_fee: "10 USD/lună după 12 luni",
    currency_conversion: "0.5% (1.5% pentru unele monede)",
    tax_report: "Account statement anual",
    mobile_app: true,
    demo_account: true,
    pros: ["Copy Trading (copiază investitori)", "Social trading", "0% comision acțiuni", "Interfață prietenoasă"],
    cons: ["5$ withdrawal fee", "Spread-uri mari pe crypto/forex", "Currency conversion 0.5-1.5%", "Inactivity fee"]
  },
  "TradeVille": {
    name: "TradeVille",
    country: "România",
    regulated_by: ["ASF (România)"],
    account_types: ["Individual"],
    min_deposit: 0,
    stocks: {
      commission: "0.4% BVB (min 4 RON), 0.65% piețe internaționale",
      commission_over_limit: "Negociabil la volume mari",
      fractional: false,
      exchanges: ["BVB", "NYSE", "NASDAQ", "LSE", "Xetra"],
      real_stocks: true
    },
    etfs: {
      commission: "La fel ca acțiunile",
      available: 200,
      fractional: false
    },
    crypto: {
      available: false,
      type: "N/A",
      commission: "N/A"
    },
    forex: { commission: "N/A", leverage: "N/A" },
    deposit_fee: "0",
    withdrawal_fee: "0",
    inactivity_fee: "0",
    currency_conversion: "BNR + markup",
    tax_report: "Reținere la sursă pentru BVB, raport ANAF automat",
    mobile_app: true,
    demo_account: false,
    pros: ["Acces direct BVB", "Reținere impozit la sursă (BVB)", "Obligațiuni de stat RO", "Suport local în română", "IPO-uri BVB"],
    cons: ["Comisioane mai mari vs XTB/T212", "Fără acțiuni fracționate", "Platformă mai veche", "Fără crypto"]
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      brokers, // Array of broker names to compare, or empty for all
      compare_by, // "stocks" | "etfs" | "crypto" | "fees" | "all"
      investment_amount = 10000,
      monthly_trades = 10,
      currency = "EUR"
    } = body;

    const selectedBrokers = brokers && brokers.length > 0
      ? brokers.map((b: string) => {
          const key = Object.keys(BROKER_DATA).find(k => k.toLowerCase() === b.toLowerCase());
          return key ? BROKER_DATA[key] : null;
        }).filter(Boolean)
      : Object.values(BROKER_DATA);

    // Estimate annual costs
    const costComparison = selectedBrokers.map((broker: any) => {
      const annualTrades = monthly_trades * 12;
      let estimatedAnnualCost = 0;
      
      // Stock trading cost estimation
      if (broker.stocks.commission.includes("0%")) {
        estimatedAnnualCost = 0;
      } else if (broker.stocks.commission.includes("0.005$")) {
        estimatedAnnualCost = annualTrades * 1; // ~1$ per trade minimum
      } else if (broker.stocks.commission.includes("0.4%")) {
        estimatedAnnualCost = annualTrades * (investment_amount / annualTrades * 0.004);
      } else {
        estimatedAnnualCost = annualTrades * 1.5; // generic estimate
      }

      // Currency conversion cost
      const conversionRate = parseFloat(broker.currency_conversion.match(/[\d.]+/)?.[0] || "0") / 100;
      const conversionCost = investment_amount * conversionRate;

      // Withdrawal/inactivity
      let extraFees = 0;
      if (broker.withdrawal_fee.includes("5")) extraFees += 10; // ~2 withdrawals
      if (broker.inactivity_fee.includes("10")) extraFees += 0; // Assuming active

      return {
        broker: broker.name,
        trading_cost: Math.round(estimatedAnnualCost * 100) / 100,
        conversion_cost: Math.round(conversionCost * 100) / 100,
        extra_fees: extraFees,
        total_annual_cost: Math.round((estimatedAnnualCost + conversionCost + extraFees) * 100) / 100,
        cost_pct_of_portfolio: parseFloat(((estimatedAnnualCost + conversionCost + extraFees) / investment_amount * 100).toFixed(3))
      };
    });

    costComparison.sort((a: any, b: any) => a.total_annual_cost - b.total_annual_cost);

    const result = {
      success: true,
      comparison_date: new Date().toISOString(),
      parameters: {
        investment_amount,
        monthly_trades,
        currency,
        brokers_compared: selectedBrokers.length
      },
      brokers: selectedBrokers.map((b: any) => ({
        name: b.name,
        country: b.country,
        regulated_by: b.regulated_by,
        min_deposit: b.min_deposit,
        stocks: b.stocks,
        etfs: b.etfs,
        crypto: b.crypto,
        fees: {
          deposit: b.deposit_fee,
          withdrawal: b.withdrawal_fee,
          inactivity: b.inactivity_fee,
          currency_conversion: b.currency_conversion
        },
        tax_report: b.tax_report,
        fractional_shares: b.stocks.fractional,
        pros: b.pros,
        cons: b.cons
      })),
      cost_ranking: costComparison,
      cheapest: costComparison[0]?.broker || "N/A",
      recommendation: generateBrokerRecommendation(costComparison, selectedBrokers),
      disclaimer: "Comisioanele pot varia. Verifică întotdeauna pe site-ul oficial al brokerului. Ultimul update: aprilie 2026."
    };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Broker comparison error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function generateBrokerRecommendation(costs: any[], brokers: any[]): string {
  if (costs.length === 0) return "Nu am date suficiente pentru recomandare.";
  
  const cheapest = costs[0];
  const hasFractional = brokers.find((b: any) => b.name === cheapest.broker)?.stocks?.fractional;
  
  let rec = `🏆 ${cheapest.broker} are cele mai mici costuri estimate (${cheapest.total_annual_cost} ${cheapest.broker === 'TradeVille' ? 'RON' : 'EUR'}/an).`;
  
  if (!hasFractional) {
    rec += " Totuși, nu oferă acțiuni fracționate — dacă vrei să investești sume mici, Trading 212 sau Revolut pot fi mai potrivite.";
  }
  
  return rec;
}
