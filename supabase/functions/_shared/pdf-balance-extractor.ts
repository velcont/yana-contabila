/**
 * PDF Balance Extractor
 * Reads a trial balance (balanță de verificare) from a PDF using the AI Gateway
 * and converts it into a standard .xlsx (base64) so the existing Excel balance
 * pipeline (analyze-balance) can process it unchanged.
 */
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

export interface PdfBalanceResult {
  excelBase64: string;
  company: string;
  cui: string;
  accountsCount: number;
  period: string;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_balance", "company", "cui", "period", "accounts"],
  properties: {
    is_balance: { type: "boolean" },
    company: { type: "string" },
    cui: { type: "string" },
    period: { type: "string" },
    accounts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["cont", "denumire", "si_d", "si_c", "rulaj_d", "rulaj_c", "total_d", "total_c", "sf_d", "sf_c"],
        properties: {
          cont: { type: "string" },
          denumire: { type: "string" },
          si_d: { type: "number" },
          si_c: { type: "number" },
          rulaj_d: { type: "number" },
          rulaj_c: { type: "number" },
          total_d: { type: "number" },
          total_c: { type: "number" },
          sf_d: { type: "number" },
          sf_c: { type: "number" },
        },
      },
    },
  },
};

const INSTRUCTIONS = `Ești un expert contabil român. Primești o balanță de verificare în PDF.
Extrage TOATE rândurile de cont (analitice și sintetice, exact cum apar), fără a inventa nimic.
- cont: simbolul contului exact (ex: "401", "4111", "5121.01").
- denumire: denumirea contului.
- si_d/si_c: sold inițial (sau sold la începutul anului / sume precedente) debit/credit.
- rulaj_d/rulaj_c: rulaje / sume ale perioadei curente.
- total_d/total_c: total sume (cumulat de la începutul anului). Dacă lipsește, pune si + rulaj.
- sf_d/sf_c: sold final debitor/creditor.
Numerele românești: "1.234,56" = 1234.56. Valori lipsă = 0.
Exclude rândurile de total pe clasă / total general.
company = numele firmei, cui = codul fiscal (doar cifre), period = perioada.
Dacă documentul NU este o balanță de verificare, setează is_balance=false și accounts=[].`;

async function callGateway(fileName: string, pdfBase64: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY lipsește");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "Authorization": `Bearer ${key}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions: INSTRUCTIONS,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Extrage balanța din acest PDF." },
          { type: "input_file", filename: fileName, file_data: `data:application/pdf;base64,${pdfBase64}` },
        ],
      }],
      text: { format: { type: "json_schema", name: "balanta", strict: true, schema: SCHEMA } },
    }),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    console.error("[pdf-balance] gateway error", res.status, t.slice(0, 500));
    throw new Error(`AI gateway ${res.status}`);
  }

  // Consume SSE stream, accumulate output_text deltas
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") out += ev.delta;
        else if (ev.type === "error" || ev.type === "response.failed") {
          throw new Error(ev?.error?.message || ev?.response?.error?.message || "AI failed");
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return out;
}

export async function extractBalanceFromPdf(fileName: string, rawBase64: string): Promise<PdfBalanceResult | null> {
  const pdfBase64 = rawBase64.includes(";base64,") ? rawBase64.split(";base64,")[1] : rawBase64;
  const text = await callGateway(fileName, pdfBase64);
  const parsed = JSON.parse(text);
  if (!parsed?.is_balance || !Array.isArray(parsed.accounts) || parsed.accounts.length === 0) return null;

  const rows: (string | number)[][] = [
    [`${parsed.company || ""} CUI: ${parsed.cui || ""}`],
    [`Balanta de verificare ${parsed.period || ""}`],
    [],
    ["Cont", "Denumire", "Sold initial debit", "Sold initial credit", "Rulaj debit", "Rulaj credit",
      "Total sume debit", "Total sume credit", "Sold final debit", "Sold final credit"],
  ];
  for (const a of parsed.accounts) {
    rows.push([a.cont, a.denumire, a.si_d, a.si_c, a.rulaj_d, a.rulaj_c,
      a.total_d || a.si_d + a.rulaj_d, a.total_c || a.si_c + a.rulaj_c, a.sf_d, a.sf_c]);
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Balanta");
  const excelBase64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" }) as string;
  return { excelBase64, company: parsed.company || "", cui: parsed.cui || "", accountsCount: parsed.accounts.length, period: parsed.period || "" };
}
