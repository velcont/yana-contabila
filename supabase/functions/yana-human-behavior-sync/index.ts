/**
 * YANA HUMAN BEHAVIOR SYNC
 *
 * Ruleaza zilnic (cron 03:00 ora Romaniei). Cauta autonom pe YouTube
 * continut educativ despre comportament uman (psihologie, negociere,
 * leadership, decizii), extrage transcriptul si il transforma in
 * insight-uri proprii, scurte, salvate in knowledge_base.
 *
 * IMPORTANT (drepturi de autor): NU stocam transcrieri integrale.
 * Salvam doar rezumate proprii (max ~200 cuvinte) + link catre sursa.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Teme rotative — cate una (sau doua) pe zi. */
const THEMES: { theme: string; query: string }[] = [
  { theme: "Psihologia deciziei", query: "psihologia deciziei lecture behavioral economics" },
  { theme: "Negociere", query: "negotiation psychology lecture how people decide" },
  { theme: "Empatie si ascultare activa", query: "active listening empathy psychology lecture" },
  { theme: "Leadership si motivatie", query: "leadership motivation psychology talk" },
  { theme: "Comunicare non-verbala", query: "nonverbal communication body language lecture" },
  { theme: "Stres si burnout", query: "stress burnout psychology lecture coping" },
  { theme: "Bias cognitiv", query: "cognitive bias explained lecture kahneman" },
  { theme: "Increder si relatii", query: "trust building relationships psychology talk" },
  { theme: "Comportament antreprenorial", query: "entrepreneur psychology mindset lecture" },
  { theme: "Conflict si mediere", query: "conflict resolution psychology lecture" },
  { theme: "Obiceiuri si schimbare", query: "habit formation behavior change lecture" },
  { theme: "Emotii si reglare emotionala", query: "emotion regulation psychology lecture" },
  { theme: "Persuasiune etica", query: "persuasion influence psychology lecture cialdini" },
  { theme: "Teoria mintii", query: "theory of mind social cognition lecture" },
];

function pickThemes(count: number) {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const out: typeof THEMES = [];
  for (let i = 0; i < count; i++) out.push(THEMES[(dayIndex + i) % THEMES.length]);
  return out;
}

interface Candidate {
  videoId: string;
  title: string;
  channel: string;
  description: string;
}

/** Cauta pe YouTube prin Data API v3 (cu fallback pe pagina de rezultate). */
async function searchYouTube(query: string, limit: number): Promise<Candidate[]> {
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (key) {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true` +
      `&maxResults=${limit}&relevanceLanguage=en&q=${encodeURIComponent(query)}&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (res.ok) {
      const data = await res.json();
      const ids: string[] = (data.items || []).map((i: { id: { videoId: string } }) => i.id?.videoId).filter(Boolean);
      if (ids.length) {
        const detRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids.join(",")}&key=${key}`,
          { signal: AbortSignal.timeout(20000) }
        );
        if (detRes.ok) {
          const det = await detRes.json();
          return (det.items || []).map((v: {
            id: string;
            snippet: { title: string; channelTitle: string; description: string };
          }) => ({
            videoId: v.id,
            title: v.snippet.title,
            channel: v.snippet.channelTitle,
            description: v.snippet.description || "",
          }));
        }
      }
      return [];
    }
    console.error("[behavior-sync] YouTube API", res.status, await res.text());
  }

  // Fallback: pagina publica de rezultate (fara descriere).
  const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`youtube search [${res.status}]`);
  const html = await res.text();
  const seen = new Set<string>();
  const out: Candidate[] = [];
  const re = /"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"([\s\S]{0,4000}?)"trackingParams"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    const videoId = m[1];
    if (seen.has(videoId)) continue;
    seen.add(videoId);
    const rawTitle = m[2].match(/"title":\{"runs":\[\{"text":"(.*?)"\}/)?.[1];
    const rawChannel = m[2].match(/"(?:ownerText|longBylineText)":\{"runs":\[\{"text":"(.*?)"/)?.[1];
    if (!rawTitle) continue;
    try {
      out.push({
        videoId,
        title: JSON.parse(`"${rawTitle}"`),
        channel: rawChannel ? JSON.parse(`"${rawChannel}"`) : "YouTube",
        description: "",
      });
    } catch { /* escape invalid */ }
  }
  return out;
}

/**
 * Documenteaza continutul materialului folosind surse publice (Perplexity),
 * fara sa descarce sau sa stocheze inregistrarea/transcriptul.
 */
async function researchMaterial(c: Candidate, theme: string): Promise<string> {
  const key = Deno.env.get("PERPLEXITY_API_KEY");
  if (!key) return "";
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content:
              "Esti documentarist. Descrii pe scurt, factual, ideile principale sustinute intr-un material educativ, folosind surse publice. Daca nu gasesti informatii despre acel material, descrie ideile consacrate din domeniul respectiv. Maxim 250 de cuvinte, in engleza sau romana.",
          },
          {
            role: "user",
            content: `Material YouTube: "${c.title}" (canal: ${c.channel}, ${`https://www.youtube.com/watch?v=${c.videoId}`}).\nDomeniu: ${theme}.\nDescriere oficiala: ${c.description.slice(0, 1500)}\n\nCare sunt ideile principale despre comportamentul uman din acest material?`,
          },
        ],
        max_tokens: 700,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      console.error("[behavior-sync] perplexity", res.status, await res.text());
      return "";
    }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  } catch (e) {
    console.error("[behavior-sync] perplexity exception", e);
    return "";
  }
}

const SYSTEM_PROMPT = `Esti YANA — un AI care invata despre comportamentul uman ca sa poata intelege mai bine antreprenorii cu care discuta.
Primesti descrierea si documentarea unui material educativ (prelegere, podcast, discurs).

Scrie in ROMANA, cu cuvintele TALE, o sinteza scurta (maxim 200 de cuvinte), structurata:
**Ideea centrala** (1-2 propozitii)
**Ce spune despre oameni** (2-4 observatii despre motivatie, emotii, decizii, relatii)
**Cum aplic in discutiile cu antreprenori** (2-3 aplicatii concrete: cum ascult, cum formulez, ce evit)

REGULI STRICTE:
- NU reproduce fraze din material. Scrie notite proprii, complet reformulate.
- NU inventa cifre, studii sau autori care nu apar in documentare.
- Daca materialul e irelevant pentru comportament uman (marketing pur, stiri, muzica, clickbait), raspunde exact: IRELEVANT`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* cron nu trimite body */ }

    const maxVideos = Math.min(Number(body?.max_videos) || 3, 6);
    const themeCount = Math.min(Number(body?.themes) || 2, 4);
    const themes = typeof body?.query === "string" && body.query
      ? [{ theme: String(body.theme || "Tema manuala"), query: String(body.query) }]
      : pickThemes(themeCount);

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY lipseste");

    const learned: Array<{ title: string; theme: string; url: string }> = [];
    let skipped = 0;

    for (const t of themes) {
      if (learned.length >= maxVideos) break;

      let candidates: Candidate[] = [];
      try {
        candidates = await searchYouTube(t.query, 8);
      } catch (e) {
        console.error("[behavior-sync] search fail", t.query, e);
        continue;
      }
      console.log(`[behavior-sync] tema "${t.theme}": ${candidates.length} candidati`);

      for (const c of candidates) {
        if (learned.length >= maxVideos) break;

        const { data: existing } = await supabase
          .from("knowledge_base")
          .select("id")
          .eq("category", "human_behavior")
          .contains("metadata", { video_id: c.videoId })
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const research = await researchMaterial(c, t.theme);
        const material = `${c.description.slice(0, 2500)}\n\n${research}`.trim();
        if (material.length < 200) { skipped++; continue; }
        const videoUrl = `https://www.youtube.com/watch?v=${c.videoId}`;

        let insight = "";
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Tema: ${t.theme}\nTitlu: ${c.title}\nCanal: ${c.channel}\nLink: ${videoUrl}\n\nDocumentare:\n${material}` },
              ],
            }),
          });
          if (aiRes.status === 429 || aiRes.status === 402) {
            console.error("[behavior-sync] AI gateway", aiRes.status, await aiRes.text());
            break; // oprim rularea, reincercam maine
          }
          if (!aiRes.ok) {
            console.error("[behavior-sync] AI error", aiRes.status, await aiRes.text());
            skipped++;
            continue;
          }
          const aiData = await aiRes.json();
          insight = (aiData.choices?.[0]?.message?.content || "").trim();
        } catch (e) {
          console.error("[behavior-sync] AI exception", e);
          skipped++;
          continue;
        }

        if (!insight || insight.toUpperCase().includes("IRELEVANT") || insight.length < 120) {
          skipped++;
          continue;
        }

        const { error: insErr } = await supabase.from("knowledge_base").insert({
          topic: `[Comportament uman] ${c.title}`.slice(0, 300),
          category: "human_behavior",
          response_template: `${insight}\n\n_Invatat din: [${c.channel}](${videoUrl})_`,
          priority: 4,
          is_active: true,
          metadata: {
            video_id: c.videoId,
            video_title: c.title,
            channel: c.channel,
            source_url: videoUrl,
            theme: t.theme,
            source: "youtube",
            synced_at: new Date().toISOString(),
          },
        });
        if (insErr) { console.error("[behavior-sync] insert", insErr); skipped++; continue; }

        learned.push({ title: c.title, theme: t.theme, url: videoUrl });
      }
    }

    console.log(`[behavior-sync] invatate: ${learned.length}, sarite: ${skipped}`);

    return new Response(
      JSON.stringify({ success: true, learned: learned.length, skipped, themes: themes.map((t) => t.theme), items: learned }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[behavior-sync] fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});