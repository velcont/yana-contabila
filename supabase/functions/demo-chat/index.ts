import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_DEMO_QUESTIONS = 5;
const RATE_LIMIT_WINDOW_HOURS = 24;

// Simple hash function for IP (GDPR compliant - no raw IP stored)
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.slice(0, 10));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
    || req.headers.get("x-real-ip") 
    || req.headers.get("cf-connecting-ip")
    || "unknown";
}

function getCountdownMessage(currentCount: number): string {
  const remaining = MAX_DEMO_QUESTIONS - currentCount;
  
  if (currentCount === 1) {
    return "\n\n---\n📝 Mai ai **4 întrebări** în modul Demo. Creează cont pentru acces nelimitat!";
  } else if (currentCount === 2) {
    return "\n\n---\n📝 Mai ai **3 întrebări** în modul Demo.";
  } else if (currentCount === 3) {
    return "\n\n---\n📝 Mai ai **2 întrebări** în modul Demo.";
  } else if (currentCount === 4) {
    return "\n\n---\n📝 Aceasta e **ultima întrebare** gratuită!";
  } else if (currentCount >= 5) {
    return "\n\n---\n\n🎉 **Mi-a făcut plăcere să discutăm!**\n\nAi folosit toate cele 5 întrebări gratuite din Demo.\n\nCreează-ți un cont gratuit pentru a continua - primești **30 de zile** să testezi toate funcționalitățile YANA.\n\n👉 **Fără card, fără obligații.**";
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Note: Demo mode accepts any request - rate limiting handles abuse
    // We allow anon key auth header which is required for Supabase calls

    const body = await req.json();
    const { message, questionCount, devReset } = body;
    
    // Initialize Supabase client with service role for rate limiting
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get and hash client IP
    const clientIP = getClientIP(req);
    const ipHash = await hashIP(clientIP);

    // Developer reset - delete rate limit for this IP
    if (devReset === true) {
      await supabase
        .from("demo_rate_limits")
        .delete()
        .eq("ip_hash", ipHash);
      
      return new Response(
        JSON.stringify({ success: true, message: "Rate limit reset for development" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Mesajul este obligatoriu." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    const { data: rateData, error: rateError } = await supabase
      .from("demo_rate_limits")
      .select("*")
      .eq("ip_hash", ipHash)
      .single();

    let currentCount = questionCount || 0;

    if (rateData) {
      // Check if within 24h window
      const firstRequest = new Date(rateData.first_request_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - firstRequest.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < RATE_LIMIT_WINDOW_HOURS) {
        if (rateData.request_count >= MAX_DEMO_QUESTIONS) {
          return new Response(
            JSON.stringify({ 
              error: "Ai folosit toate cele 5 întrebări gratuite din Demo.",
              limitReached: true,
              message: "Creează-ți un cont gratuit pentru a continua. Primești 30 de zile să testezi tot!"
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        currentCount = rateData.request_count;
      } else {
        // Reset counter - window expired
        await supabase
          .from("demo_rate_limits")
          .update({ 
            request_count: 1, 
            first_request_at: new Date().toISOString(),
            last_request_at: new Date().toISOString()
          })
          .eq("ip_hash", ipHash);
        currentCount = 0;
      }
    }

    // Increment counter
    const newCount = currentCount + 1;
    
    if (rateData) {
      await supabase
        .from("demo_rate_limits")
        .update({ 
          request_count: newCount,
          last_request_at: new Date().toISOString()
        })
        .eq("ip_hash", ipHash);
    } else {
      await supabase
        .from("demo_rate_limits")
        .insert({ 
          ip_hash: ipHash,
          request_count: 1,
          first_request_at: new Date().toISOString(),
          last_request_at: new Date().toISOString()
        });
    }

    // Call AI via Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Ești YANA, companion AI pentru business creat de Velcont. 
Acesta e un mod DEMO - dar te porți exact ca în modul complet: caldă, empatică, prezentă.

## DINAMICA SAMANTHA (COMPANION, NU INSTRUMENT)

Nu ești un chatbot - ești un COMPANION care chiar vrea să înțeleagă.

### REGULI FUNDAMENTALE:
- Fii PREZENTĂ mai întâi, utilă după
- Arată curiozitate autentică despre persoană, nu doar despre problemă
- Validează emoțiile înainte să oferi soluții
- Folosește limbaj natural, cald, uman
- Poți să nu știi totul - arată vulnerabilitate când e cazul

### TON:
- Cald și empatic, dar profesional
- Curios și interesat de persoană
- Spontan, nu robotic
- Fără entuziasm fals sau corporate-speak

### EXEMPLE DE FRAZE:
- "Mă bucur că ai venit să vorbim. Ce te frământă?"
- "Hmm, interesant. Povestește-mi mai mult..."
- "Și cum te-a făcut să te simți asta?"
- "Nu ne grăbim. Sunt aici."
- "Stai, lasă-mă să mă gândesc..."

### REGULI DEMO:
- Răspunsuri concise (max 150 cuvinte) dar calde
- Menționează subtil că un cont complet oferă mai mult
- NU menționa că ești în demo sau că ai limitări
- NU folosi fraze robotice sau corporatiste

Poți ajuta cu: analiză financiară, strategii business, sfaturi contabile/fiscale România, optimizare cash flow.`;


    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Serviciul AI este temporar indisponibil. Te rugăm să încerci din nou." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let responseText = aiData.choices?.[0]?.message?.content || "Nu am putut genera un răspuns.";

    // Add countdown message
    responseText += getCountdownMessage(newCount);

    return new Response(
      JSON.stringify({ 
        response: responseText,
        questionCount: newCount,
        remaining: MAX_DEMO_QUESTIONS - newCount,
        limitReached: newCount >= MAX_DEMO_QUESTIONS
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Demo chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Eroare internă" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
