import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FB_TOKEN = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
const FB_PAGE_ID = Deno.env.get('FACEBOOK_PAGE_ID');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const TOPICS = [
  'Cum YANA ajută antreprenorii români să înțeleagă balanța contabilă într-un limbaj simplu',
  'De ce un AI cu memorie este diferit de un chatbot generic',
  'Audit furnizori în 10 secunde cu CUI: ANAF + BPI + știri negative',
  'Calcule fiscale instant: TVA, dividende, micro 2026',
  'CFO + CRM într-un singur chat conversațional',
  'Generare automată de contracte, somații și confirmări de sold',
  'Briefing de dimineață: ce ai de făcut azi pentru firma ta',
  'Empatie peste soluții: de ce antreprenorii au nevoie să fie ascultați',
  'Predicții cash-flow și scor de reziliență pentru IMM-uri',
  'Cum YANA învață din conversațiile cu tine și se adaptează',
];

async function generatePost(): Promise<string> {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const prompt = `Scrie o postare Facebook în română pentru YANA — un AI companion pentru antreprenori români (CFO + CRM + consilier fiscal într-un singur chat).

Tema: ${topic}

Reguli:
- Maxim 500 caractere
- Ton cald, sigur, ușor tăios. NU corporate, NU motivațional ieftin
- Începe cu un hook puternic (întrebare sau afirmație contraintuitivă)
- Beneficiu concret pentru antreprenor
- Termină cu un CTA scurt: "Încearcă gratuit pe yana-contabila.lovable.app"
- 2-3 emoji discrete, max
- Fără hashtag-uri lungi (max 2: #antreprenoriRO #YANA)

Răspunde DOAR cu textul postării.`;

  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(`AI gen failed ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

async function postToFacebook(message: string) {
  const url = `https://graph.facebook.com/v21.0/${FB_PAGE_ID}/feed`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message, access_token: FB_TOKEN! }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`FB post failed: ${JSON.stringify(body)}`);
  return body;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!FB_TOKEN || !FB_PAGE_ID) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN sau FACEBOOK_PAGE_ID lipsesc');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY lipsește');

    const message = await generatePost();
    const fbResult = await postToFacebook(message);

    return new Response(JSON.stringify({ success: true, message, fbResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('facebook-daily-post error:', e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});