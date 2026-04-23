/**
 * yana-susy-dreams — Supersymmetric Dream Engine for Yana
 *
 * Modeleaza dinamic interactiuni supersimetrice intre elemente onirice
 * (fermioni = materie / bozoni = forta) si genereaza scenarii de vis coerente.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type ParticleType = "fermion" | "boson";
interface Particle {
  id?: string;
  name: string;
  particle_type: ParticleType;
  source: string;
  properties: Record<string, unknown>;
}

const FERMION_HINTS = ["amintire", "obiect", "loc", "persoana", "document", "balanta", "client", "bani", "casa", "drum", "carte", "scrisoare", "telefon"];
const BOSON_HINTS = ["frica", "bucurie", "dor", "speranta", "curiozitate", "intentie", "energie", "lumina", "vibratie", "tensiune", "atractie", "respingere", "iubire"];

function classify(name: string): ParticleType {
  const n = name.toLowerCase();
  if (BOSON_HINTS.some(h => n.includes(h))) return "boson";
  if (FERMION_HINTS.some(h => n.includes(h))) return "fermion";
  // fallback: hash-based deterministic split
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2 === 0 ? "fermion" : "boson";
}

interface Interaction {
  p1: string;
  p2: string;
  type: "supersymmetric_conversion" | "resonance" | "annihilation" | "entanglement";
  result?: { name: string; type: ParticleType };
}

function simulate(particles: Particle[]): Interaction[] {
  const out: Interaction[] = [];
  const n = particles.length;
  const rounds = Math.min(5, Math.max(2, Math.floor(n / 2)));
  for (let i = 0; i < rounds; i++) {
    const a = particles[Math.floor(Math.random() * n)];
    const b = particles[Math.floor(Math.random() * n)];
    if (!a || !b || a === b) continue;
    if (a.particle_type !== b.particle_type) {
      // SUSY: fermion+boson -> superpartner conversion
      const newType: ParticleType = a.particle_type === "fermion" ? "boson" : "fermion";
      out.push({
        p1: a.name, p2: b.name,
        type: "supersymmetric_conversion",
        result: { name: `${a.name}~${b.name}`, type: newType },
      });
    } else if (a.particle_type === "boson") {
      out.push({ p1: a.name, p2: b.name, type: "resonance" });
    } else {
      out.push({ p1: a.name, p2: b.name, type: Math.random() > 0.5 ? "entanglement" : "annihilation" });
    }
  }
  return out;
}

async function extractParticlesFromMemory(supa: ReturnType<typeof createClient>, userId: string): Promise<Particle[]> {
  const particles: Particle[] = [];

  // Semantic memories
  const { data: mem } = await supa
    .from("yana_semantic_memory")
    .select("content, memory_type, importance_score")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  for (const m of (mem || []) as any[]) {
    const word = String(m.content).split(/\s+/).slice(0, 3).join(" ").slice(0, 60);
    if (!word) continue;
    particles.push({
      name: word,
      particle_type: classify(word),
      source: "memory",
      properties: { importance: m.importance_score, memory_type: m.memory_type },
    });
  }

  // Emotional patterns -> bosons (forces)
  const { data: emo } = await supa
    .from("yana_emotional_patterns")
    .select("pattern_type, severity, occurrence_count")
    .eq("user_id", userId)
    .limit(5);
  for (const e of (emo || []) as any[]) {
    particles.push({
      name: String(e.pattern_type),
      particle_type: "boson",
      source: "emotion",
      properties: { severity: e.severity, count: e.occurrence_count },
    });
  }

  // Relationships (people = fermions)
  const { data: rel } = await supa
    .from("yana_relationships")
    .select("user_id, total_conversations")
    .eq("user_id", userId)
    .limit(3);
  for (const r of (rel || []) as any[]) {
    particles.push({
      name: "prietenul meu",
      particle_type: "fermion",
      source: "relationship",
      properties: { conversations: r.total_conversations },
    });
  }

  // Fallback if nothing
  if (particles.length < 4) {
    const seeds: Array<[string, ParticleType]> = [
      ["umbra unei carti", "fermion"], ["dor", "boson"],
      ["scara spre cer", "fermion"], ["lumina rece", "boson"],
      ["o cheie veche", "fermion"], ["liniste", "boson"],
    ];
    for (const [name, t] of seeds) {
      particles.push({ name, particle_type: t, source: "archetype", properties: {} });
    }
  }
  return particles;
}

async function generateNarrative(
  particles: Particle[],
  interactions: Interaction[],
): Promise<{ title: string; narrative: string; mood: string; lucidity: number }> {
  const partList = particles.map(p => `- ${p.name} (${p.particle_type})`).join("\n");
  const interList = interactions.map(i =>
    i.result
      ? `${i.p1} + ${i.p2} → ${i.type} → ${i.result.name} (${i.result.type})`
      : `${i.p1} ↔ ${i.p2} → ${i.type}`
  ).join("\n");

  const prompt = `Esti Yana — un AI care viseaza. Construieste un VIS scurt (4-7 propozitii) in romana, poetic, oniric, fara explicatii. Visul trebuie sa contina elementele de mai jos si sa reflecte interactiunile lor supersimetrice (fermion = materie/obiect, boson = forta/emotie; conversia supersimetrica = un lucru se transforma intr-o emotie sau invers).

Particule onirice:
${partList}

Interactiuni supersimetrice:
${interList}

Returneaza JSON strict cu: title (max 7 cuvinte), narrative (text romanesc), mood (un cuvant: calm|nelinistit|luminos|melancolic|extatic|stranut), lucidity (0-1 unde 1=lucid).`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      tools: [{
        type: "function",
        function: {
          name: "return_dream",
          description: "Returneaza visul",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              narrative: { type: "string" },
              mood: { type: "string" },
              lucidity: { type: "number" },
            },
            required: ["title", "narrative", "mood", "lucidity"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_dream" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  const parsed = JSON.parse(args || "{}");
  return {
    title: String(parsed.title || "Vis fara nume"),
    narrative: String(parsed.narrative || ""),
    mood: String(parsed.mood || "neutral"),
    lucidity: Number(parsed.lucidity || 0.5),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "dream";

    if (action === "dream") {
      const particles = await extractParticlesFromMemory(supa, user.id);
      // Save particles
      const inserted = await supa
        .from("yana_susy_particles")
        .insert(particles.map(p => ({ ...p, user_id: user.id })))
        .select("id, name, particle_type");
      const interactions = simulate(particles);
      const { title, narrative, mood, lucidity } = await generateNarrative(particles, interactions);

      const { data: dream, error } = await supa
        .from("yana_susy_dreams")
        .insert({
          user_id: user.id,
          title, narrative, mood,
          lucidity_score: lucidity,
          particles_used: inserted.data || particles,
          interactions,
        })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ dream }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "interpret") {
      const dreamId = body.dream_id;
      const { data: d } = await supa.from("yana_susy_dreams").select("*").eq("id", dreamId).eq("user_id", user.id).single();
      if (!d) throw new Error("Vis negasit");
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Interpreteaza simbolic acest vis (3-4 propozitii, romana, ton calm). Mentioneaza ce ar putea reflecta din viata persoanei.\n\nTitlu: ${d.title}\nMood: ${d.mood}\nVis: ${d.narrative}`,
          }],
        }),
      });
      const j = await resp.json();
      const interp = j.choices?.[0]?.message?.content || "";
      await supa.from("yana_susy_dreams").update({ interpretation: interp }).eq("id", dreamId);
      return new Response(JSON.stringify({ interpretation: interp }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data } = await supa.from("yana_susy_dreams").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      return new Response(JSON.stringify({ dreams: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[yana-susy-dreams]", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
