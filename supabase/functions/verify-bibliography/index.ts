import { corsHeaders } from '@supabase/supabase-js/cors';

// Verifică o bibliografie / proiect de cercetare:
// - extrage URL-uri și DOI-uri
// - le accesează (HTTP) pentru a verifica că există + extrage <title>
// - extrage referințe textuale (Autor, AAAA) și le caută pe Crossref
// - folosește Lovable AI pentru verdict final (real / suspect / halucinat)

type Citation = {
  raw: string;
  url?: string;
  doi?: string;
  authors?: string;
  year?: string;
  title?: string;
};

type Verdict = {
  citation: string;
  url?: string;
  doi?: string;
  http_status?: number;
  fetched_title?: string;
  crossref_match?: { title: string; doi: string; authors: string; year: string } | null;
  status: 'real' | 'suspect' | 'hallucinated' | 'unreachable';
  confidence: number;
  reason: string;
};

const URL_RE = /\bhttps?:\/\/[^\s<>"'\)\]]+/gi;
const DOI_RE = /\b10\.\d{4,9}\/[^\s"'<>\)\]]+/gi;

function splitCitations(text: string): string[] {
  // Împarte după linii sau după tipare numerotate "[1]", "1. ", "•"
  return text
    .split(/\n+|(?=\[\d+\])|(?=^\d+\.\s)/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function parseCitation(raw: string): Citation {
  const url = raw.match(URL_RE)?.[0];
  const doi = raw.match(DOI_RE)?.[0]?.replace(/[.,;]+$/, '');
  const yearMatch = raw.match(/\((\d{4})\)|\b(19|20)\d{2}\b/);
  const year = yearMatch?.[1] || yearMatch?.[0];
  const authors = raw.split(/\(\d{4}\)/)[0]?.trim().slice(0, 200);
  return { raw, url, doi, authors, year };
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'YANA-BibliographyVerifier/1.0' },
    });
    return r;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function checkUrl(url: string): Promise<{ status?: number; title?: string }> {
  const r = await fetchWithTimeout(url);
  if (!r) return {};
  let title: string | undefined;
  try {
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      const html = (await r.text()).slice(0, 50000);
      title =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
      title = title?.trim().slice(0, 300);
    }
  } catch {}
  return { status: r.status, title };
}

async function lookupDoi(doi: string) {
  const r = await fetchWithTimeout(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (!r || !r.ok) return null;
  try {
    const j = await r.json();
    const m = j.message;
    return {
      title: m.title?.[0] || '',
      doi: m.DOI,
      authors: (m.author || []).map((a: any) => `${a.family || ''} ${a.given || ''}`.trim()).join(', '),
      year: String(m.issued?.['date-parts']?.[0]?.[0] || ''),
    };
  } catch {
    return null;
  }
}

async function searchCrossref(query: string) {
  const r = await fetchWithTimeout(
    `https://api.crossref.org/works?rows=1&query.bibliographic=${encodeURIComponent(query.slice(0, 300))}`,
  );
  if (!r || !r.ok) return null;
  try {
    const j = await r.json();
    const m = j.message?.items?.[0];
    if (!m) return null;
    return {
      title: m.title?.[0] || '',
      doi: m.DOI,
      authors: (m.author || []).map((a: any) => `${a.family || ''} ${a.given || ''}`.trim()).join(', '),
      year: String(m.issued?.['date-parts']?.[0]?.[0] || ''),
    };
  } catch {
    return null;
  }
}

function similarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9ăâîșț\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
  const A = new Set(norm(a));
  const B = new Set(norm(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  return inter / Math.min(A.size, B.size);
}

async function verifyOne(c: Citation): Promise<Verdict> {
  const v: Verdict = { citation: c.raw, url: c.url, doi: c.doi, status: 'suspect', confidence: 0, reason: '' };

  // 1. URL check
  if (c.url) {
    const r = await checkUrl(c.url);
    v.http_status = r.status;
    v.fetched_title = r.title;
    if (!r.status) {
      v.status = 'unreachable';
      v.reason = 'URL nu poate fi accesat (timeout sau eroare rețea).';
      v.confidence = 0.7;
      return v;
    }
    if (r.status >= 400) {
      v.status = 'hallucinated';
      v.reason = `URL returnează ${r.status}. Posibil link inventat sau șters.`;
      v.confidence = 0.85;
      return v;
    }
  }

  // 2. DOI check
  if (c.doi) {
    const meta = await lookupDoi(c.doi);
    if (!meta) {
      v.status = 'hallucinated';
      v.reason = `DOI ${c.doi} nu există în Crossref.`;
      v.confidence = 0.95;
      return v;
    }
    v.crossref_match = meta;
    const sim = similarity(c.raw, `${meta.title} ${meta.authors} ${meta.year}`);
    if (sim > 0.4) {
      v.status = 'real';
      v.reason = `DOI valid, metadate Crossref se potrivesc cu citarea (similaritate ${(sim * 100).toFixed(0)}%).`;
      v.confidence = 0.95;
    } else {
      v.status = 'suspect';
      v.reason = `DOI există dar metadatele Crossref ("${meta.title}") nu se potrivesc bine cu citarea.`;
      v.confidence = 0.7;
    }
    return v;
  }

  // 3. Doar URL fără DOI
  if (c.url && v.fetched_title) {
    const sim = similarity(c.raw, v.fetched_title);
    if (sim > 0.25) {
      v.status = 'real';
      v.reason = `URL accesibil (HTTP ${v.http_status}), titlu: "${v.fetched_title}".`;
      v.confidence = 0.8;
    } else {
      v.status = 'suspect';
      v.reason = `URL accesibil dar titlul paginii ("${v.fetched_title}") nu corespunde cu referința.`;
      v.confidence = 0.6;
    }
    return v;
  }

  if (c.url) {
    v.status = 'real';
    v.reason = `URL accesibil (HTTP ${v.http_status}).`;
    v.confidence = 0.6;
    return v;
  }

  // 4. Doar text → Crossref search
  const found = await searchCrossref(c.raw);
  if (!found) {
    v.status = 'hallucinated';
    v.reason = 'Nicio lucrare similară găsită pe Crossref. Posibil fabricată.';
    v.confidence = 0.75;
    return v;
  }
  v.crossref_match = found;
  const sim = similarity(c.raw, `${found.title} ${found.authors} ${found.year}`);
  if (sim > 0.45) {
    v.status = 'real';
    v.reason = `Găsit pe Crossref: "${found.title}" (DOI: ${found.doi}).`;
    v.confidence = 0.85;
  } else if (sim > 0.2) {
    v.status = 'suspect';
    v.reason = `Posibil match pe Crossref ("${found.title}") dar diferențe semnificative față de citare.`;
    v.confidence = 0.5;
  } else {
    v.status = 'hallucinated';
    v.reason = `Crossref returnează un rezultat foarte diferit ("${found.title}"). Citare probabil inventată.`;
    v.confidence = 0.7;
  }
  return v;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text, citations: rawCitations } = await req.json();
    if (!text && !Array.isArray(rawCitations)) {
      return new Response(JSON.stringify({ error: 'Trimite "text" sau "citations[]"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let lines: string[] = [];
    if (Array.isArray(rawCitations)) lines = rawCitations.filter((s: any) => typeof s === 'string' && s.trim().length > 10);
    else lines = splitCitations(text);

    // limită rezonabilă
    lines = lines.slice(0, 60);

    const parsed = lines.map(parseCitation);

    // Procesează în paralel cu concurență limitată
    const results: Verdict[] = [];
    const concurrency = 6;
    for (let i = 0; i < parsed.length; i += concurrency) {
      const batch = parsed.slice(i, i + concurrency);
      const r = await Promise.all(batch.map((c) => verifyOne(c).catch((e) => ({
        citation: c.raw,
        status: 'suspect' as const,
        confidence: 0,
        reason: `Eroare verificare: ${e?.message || e}`,
      }))));
      results.push(...r);
    }

    const summary = {
      total: results.length,
      real: results.filter((r) => r.status === 'real').length,
      suspect: results.filter((r) => r.status === 'suspect').length,
      hallucinated: results.filter((r) => r.status === 'hallucinated').length,
      unreachable: results.filter((r) => r.status === 'unreachable').length,
    };

    return new Response(JSON.stringify({ summary, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Eroare necunoscută' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
