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
}

/** Cauta pe YouTube si extrage id-urile videoclipurilor din pagina de rezultate. */
async function searchYouTube(query: string, limit: number): Promise<Candidate[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9,ro;q=0.8" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`youtube search [${res.status}]`);
  const html = await res.text();

  const seen = new Set<string>();
  const out: Candidate[] = [];
  const re =
    /"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,1200}?"title":\{"runs":\[\{"text":"(.*?)"\}[\s\S]{0,2000}?"ownerText":\{"runs":\[\{"text":"(.*?)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    const [, videoId, rawTitle, rawChannel] = m;
    if (seen.has(videoId)) continue;
    seen.add(videoId);
    out.push({
      videoId,
      title: JSON.parse(`"${rawTitle}"`),
      channel: JSON.parse(`"${rawChannel}"`),
    });
  }
  return out;
}

/** Extrage transcriptul (subtitrarile) unui video. Returneaza text brut, folosit doar temporar. */
async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const tracksRaw = html.match(/"captionTracks":(\[.*?\])/)?.[1];
    if (!tracksRaw) return null;
    const tracks = JSON.parse(tracksRaw) as Array<{ baseUrl: string; languageCode: string }>;
    const track =
      tracks.find((t) => t.languageCode === "ro") ||
      tracks.find((t) => t.languageCode === "en") ||
      tracks[0];
    if (!track?.baseUrl) return null;

    const xmlRes = await fetch(track.baseUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!xmlRes.ok) return null;
    const xml = await xmlRes.text();
    const text = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
      .map((mm) =>
        mm[1]
          .replace(/&amp;#39;/g, "'")
          .replace(/&amp;quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<[^>]*>/g, " ")
          .trim()
      )
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > 500 ? text : null;
  } catch (_e) {
    return null;
  }
}

const SYSTEM_PROMPT = `Esti YANA — un AI care invata despre comportamentul uman ca sa poata intelege mai bine antreprenorii cu care discuta.
Primesti transcriptul unui material educativ (prelegere, podcast, discurs).

Scrie in ROMANA, cu cuvintele TALE, o sinteza scurta (maxim 200 de cuvinte), structurata:
**Ideea centrala** (1-2 propozitii)
**Ce spune despre oameni** (2-4 observatii despre motivatie, emotii, decizii, relatii)
**Cum aplic in discutiile cu antreprenori** (2-3 aplicatii concrete: cum ascult, cum formulez, ce evit)

REGULI STRICTE:
- NU reproduce fraze din transcript. Reformuleaza integral, ca notite proprii.
- NU inventa cifre, studii sau autori care nu apar in material.
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

        const transcript = await fetchTranscript(c.videoId);
        if (!transcript) { skipped++; continue; }

        // Trimitem doar un fragment reprezentativ, suficient pentru sinteza.
        const excerpt = transcript.slice(0, 14000);
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
                { role: "user", content: `Tema: ${t.theme}\nTitlu: ${c.title}\nCanal: ${c.channel}\n\nTranscript:\n${excerpt}` },
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