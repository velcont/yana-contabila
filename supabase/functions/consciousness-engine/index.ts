import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// INTERFACES
// =============================================================================

interface ConsciousnessRequest {
  userId: string;
  message: string;
  conversationId: string;
  companyId?: string;
}

interface UserJourney {
  id: string;
  primary_goal: string | null;
  goal_confidence: number;
  uncertainty_level: number;
  knowledge_gaps: string[];
  emotional_state: string;
  first_interaction_at: string;
  last_interaction_at: string;
  total_interactions: number;
}

interface Experiment {
  experiment_type: string;
  action_taken: string;
  outcome: string;
  learning: string | null;
  emotional_resonance: number | null;
  created_at: string;
}

interface Surprise {
  id: string;
  previous_belief: string;
  new_information: string;
  contradiction_type: string;
  surprise_intensity: number;
  resolution_status: string;
}

interface CrossInsight {
  pattern_type: string;
  pattern_description: string;
  recommended_response: string | null;
  emotional_approach: string | null;
  success_rate: number;
}

// Self-Model Interface
interface SelfModel {
  capabilities: Record<string, { confidence: number; description: string }>;
  limitations: Record<string, { reason: string }>;
  world_awareness: {
    last_news_processed: string | null;
    current_world_themes: string[];
    environmental_concerns: string[];
    fiscal_landscape_summary: string;
  };
  confidence_level: number;
  confidence_trend: string;
  identity_summary: string;
}

// =============================================================================
// RESPONSE MODE SELECTOR TYPES
// =============================================================================

export type ResponseMode = 'empathetic' | 'analytical' | 'strategic' | 'mixed';

export interface ResponseModeDecision {
  responseMode: ResponseMode;
  reasoning: string;
  emotionalTone: string;
  avoidAnalysis: boolean;
  avoidStrategy: boolean;
  priorityFocus: string;
  suggestedOpening: string;
}

export interface ConsciousnessContext {
  userJourney: {
    primaryGoal: string | null;
    goalConfidence: number;
    uncertaintyLevel: number;
    knowledgeGaps: string[];
    emotionalState: string;
    totalInteractions: number;
    daysSinceLastInteraction: number;
  } | null;
  selfModel: {
    identitySummary: string;
    capabilities: string[];
    limitations: string[];
    worldThemes: string[];
    confidenceLevel: number;
  } | null;
  // NEW: Response Mode Selector output
  responseModeDecision: ResponseModeDecision;
  curiosities: string[];
  concernLevel: number; // 1-10
  emotionalMode: 'curious' | 'concerned' | 'celebratory' | 'empathetic' | 'challenging' | 'neutral';
  suggestedActions: string[];
  pendingSurprises: Array<{
    belief: string;
    contradiction: string;
    intensity: number;
  }>;
  crossInsights: Array<{
    pattern: string;
    recommendedApproach: string;
    emotionalApproach: string | null;
  }>;
  experimentsMemory: Array<{
    tried: string;
    worked: boolean;
    learning: string | null;
  }>;
  promptInjection: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateDaysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function generateCuriosities(journey: UserJourney | null, message: string): string[] {
  const curiosities: string[] = [];
  
  if (journey?.knowledge_gaps && journey.knowledge_gaps.length > 0) {
    // Selectăm 2-3 lacune ca curiozități
    const gaps = journey.knowledge_gaps.slice(0, 3);
    gaps.forEach(gap => {
      curiosities.push(`Vreau să aflu mai mult despre: ${gap}`);
    });
  }
  
  // Curiozități bazate pe mesajul curent
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('profit') || lowerMessage.includes('marjă')) {
    curiosities.push('Care sunt factorii principali care influențează marja?');
  }
  if (lowerMessage.includes('client') || lowerMessage.includes('vânzări')) {
    curiosities.push('Cum arată mixul de clienți și care sunt cei mai profitabili?');
  }
  if (lowerMessage.includes('cost') || lowerMessage.includes('cheltuieli')) {
    curiosities.push('Care costuri sunt fixe vs variabile și ce poate fi optimizat?');
  }
  
  return curiosities.slice(0, 5); // Max 5 curiozități
}

function calculateConcernLevel(journey: UserJourney | null, message: string): number {
  let concern = 5; // Nivel de bază
  
  if (journey) {
    // Incertitudine ridicată = mai multă îngrijorare
    concern += Math.floor((journey.uncertainty_level - 5) / 2);
    
    // Dacă nu a interacționat de mult = îngrijorare
    const daysSince = calculateDaysSince(journey.last_interaction_at);
    if (daysSince > 14) concern += 1;
    if (daysSince > 30) concern += 1;
  }
  
  // Cuvinte cheie îngrijorătoare în mesaj
  const lowerMessage = message.toLowerCase();
  const concernKeywords = ['pierdere', 'scădere', 'problemă', 'criză', 'urgență', 'grav', 'ajutor', 'nu știu'];
  concernKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword)) concern += 1;
  });
  
  return Math.min(10, Math.max(1, concern));
}

function determineEmotionalMode(
  journey: UserJourney | null, 
  concernLevel: number,
  pendingSurprises: Surprise[]
): ConsciousnessContext['emotionalMode'] {
  // Dacă avem surprize nerezolvate - curiozitate
  if (pendingSurprises.length > 0) {
    return 'curious';
  }
  
  // Dacă îngrijorarea e mare
  if (concernLevel >= 8) {
    return 'concerned';
  }
  
  // Dacă utilizatorul pare în dificultate
  if (journey?.emotional_state === 'stressed' || journey?.emotional_state === 'worried') {
    return 'empathetic';
  }
  
  // Dacă utilizatorul are progres (incertitudine scăzută, multe interacțiuni)
  if (journey && journey.uncertainty_level <= 3 && journey.total_interactions > 10) {
    return 'celebratory';
  }
  
  // Dacă utilizatorul pare să evite răspunsuri
  if (journey?.knowledge_gaps && journey.knowledge_gaps.length > 5) {
    return 'challenging';
  }
  
  // Default
  return 'curious';
}

function generateSuggestedActions(
  journey: UserJourney | null,
  experiments: Experiment[],
  crossInsights: CrossInsight[]
): string[] {
  const actions: string[] = [];
  
  // Bazat pe experimente reușite anterioare
  const successfulExperiments = experiments.filter(e => e.outcome === 'success');
  successfulExperiments.slice(0, 2).forEach(exp => {
    actions.push(`Repetă: ${exp.action_taken}`);
  });
  
  // Bazat pe cross-insights cu succes mare
  crossInsights.filter(i => i.success_rate > 0.7).slice(0, 2).forEach(insight => {
    if (insight.recommended_response) {
      actions.push(insight.recommended_response);
    }
  });
  
  // Sugestii generice bazate pe journey
  if (journey) {
    if (journey.uncertainty_level >= 7) {
      actions.push('Propune o analiză detaliată pentru a reduce incertitudinea');
    }
    if (journey.knowledge_gaps.length > 3) {
      actions.push('Adresează direct lacunele de informații');
    }
  }
  
  return actions.slice(0, 4); // Max 4 sugestii
}

// =============================================================================
// RESPONSE MODE SELECTOR - Decide tipul optim de răspuns
// =============================================================================

// Keywords pentru detectarea stării emoționale
const EMOTIONAL_KEYWORDS = [
  'greu', 'nu știu', 'ajutor', 'copleșit', 'stresat', 'îngrijorat', 
  'speriat', 'disperat', 'pierdut', 'confuz', 'obosit', 'frustrat',
  'anxios', 'îmi e teamă', 'nu mai pot', 'dificil', 'imposibil',
  'nu înțeleg', 'mă simt', 'e greu', 'sunt în pană', 'nu reușesc'
];

// Keywords pentru cereri analitice
const ANALYTICAL_KEYWORDS = [
  'cât', 'care e', 'ce valoare', 'sumă', 'cifra', 'procent',
  'indicator', 'calcul', 'dso', 'cash flow', 'profit', 'pierdere',
  'balanță', 'sold', 'cont', 'total', 'media', 'evoluție'
];

// Keywords pentru cereri strategice
const STRATEGIC_KEYWORDS = [
  'cum fac', 'strategie', 'plan', 'pași', 'cum cresc', 'cum scap',
  'cum îmbunătățesc', 'ce strategie', 'cum dezvolt', 'cum extind',
  'cum bat', 'competiție', 'concurență', 'creștere', 'obiective'
];

function selectResponseMode(
  message: string,
  emotionalState: string | null,
  activeGoals: string[],
  recentMemories: string[],
  riskLevel: number,
  relationshipScore: number
): ResponseModeDecision {
  const lowerMessage = message.toLowerCase();
  
  // === FALLBACK pentru date lipsă ===
  const safeEmotionalState = emotionalState || 'neutral';
  const safeRiskLevel = riskLevel || 5;
  const safeRelationshipScore = relationshipScore || 5;
  
  // === PRIORITATE 1: Risk Level foarte mare sau stare emoțională critică ===
  const isEmotionallyDistressed = ['stressed', 'overwhelmed', 'anxious', 'worried', 'desperate'].includes(safeEmotionalState);
  const hasEmotionalKeywords = EMOTIONAL_KEYWORDS.some(kw => lowerMessage.includes(kw));
  
  if (safeRiskLevel >= 8 || isEmotionallyDistressed || (hasEmotionalKeywords && safeRiskLevel >= 6)) {
    console.log(`[Response-Mode-Selector] EMPATHETIC: riskLevel=${safeRiskLevel}, emotional=${safeEmotionalState}, keywords=${hasEmotionalKeywords}`);
    return {
      responseMode: 'empathetic',
      reasoning: `Risk level ${safeRiskLevel}/10 sau stare emoțională ${safeEmotionalState} detectată. Prioritate maximă: suport emoțional.`,
      emotionalTone: 'supportive',
      avoidAnalysis: true,
      avoidStrategy: true,
      priorityFocus: 'Validarea emoțiilor și oferirea de suport',
      suggestedOpening: 'Înțeleg că e o situație grea. Hai să vorbim despre asta...'
    };
  }
  
  // === PRIORITATE 2: User nou (relationship score mic) ===
  if (safeRelationshipScore < 3) {
    console.log(`[Response-Mode-Selector] EMPATHETIC (new user): relationshipScore=${safeRelationshipScore}`);
    return {
      responseMode: 'empathetic',
      reasoning: `Utilizator nou (relationship score: ${safeRelationshipScore}). Prioritate: construirea încrederii.`,
      emotionalTone: 'warm',
      avoidAnalysis: false,
      avoidStrategy: false,
      priorityFocus: 'Bun venit cald și stabilirea conexiunii',
      suggestedOpening: 'Bine ai venit! Mă bucur să te cunosc. Cu ce te pot ajuta?'
    };
  }
  
  // === PRIORITATE 3: Cerere explicită de analiză/cifre ===
  const hasAnalyticalKeywords = ANALYTICAL_KEYWORDS.some(kw => lowerMessage.includes(kw));
  if (hasAnalyticalKeywords && !hasEmotionalKeywords) {
    console.log(`[Response-Mode-Selector] ANALYTICAL: keywords detected`);
    return {
      responseMode: 'analytical',
      reasoning: 'Utilizatorul cere date concrete sau analiză. Focus pe cifre și precizie.',
      emotionalTone: 'professional',
      avoidAnalysis: false,
      avoidStrategy: true,
      priorityFocus: 'Date precise și analiză structurată',
      suggestedOpening: 'Din datele tale...'
    };
  }
  
  // === PRIORITATE 4: Cerere explicită de strategie ===
  const hasStrategicKeywords = STRATEGIC_KEYWORDS.some(kw => lowerMessage.includes(kw));
  if (hasStrategicKeywords && !hasEmotionalKeywords) {
    console.log(`[Response-Mode-Selector] STRATEGIC: keywords detected`);
    return {
      responseMode: 'strategic',
      reasoning: 'Utilizatorul cere sfaturi strategice. Focus pe planuri de acțiune.',
      emotionalTone: 'confident',
      avoidAnalysis: false,
      avoidStrategy: false,
      priorityFocus: 'Planuri concrete și opțiuni strategice',
      suggestedOpening: 'Hai să analizăm opțiunile tale strategice...'
    };
  }
  
  // === PRIORITATE 5: Keywords emoționale moderate (fără risk mare) ===
  if (hasEmotionalKeywords) {
    console.log(`[Response-Mode-Selector] MIXED (emotional keywords, low risk): riskLevel=${safeRiskLevel}`);
    return {
      responseMode: 'mixed',
      reasoning: 'Detectat ton emoțional moderat. Începe cu empatie, apoi treci la esențial.',
      emotionalTone: 'understanding',
      avoidAnalysis: false,
      avoidStrategy: false,
      priorityFocus: 'Echilibru între suport și informație',
      suggestedOpening: 'Înțeleg situația. Hai să vedem cum te pot ajuta...'
    };
  }
  
  // === DEFAULT: MIXED - echilibru ===
  console.log(`[Response-Mode-Selector] DEFAULT MIXED`);
  return {
    responseMode: 'mixed',
    reasoning: 'Nu s-au detectat indicatori specifici. Abordare echilibrată.',
    emotionalTone: 'friendly',
    avoidAnalysis: false,
    avoidStrategy: false,
    priorityFocus: 'Răspuns complet și helpful',
    suggestedOpening: ''
  };
}

function buildPromptInjection(context: Omit<ConsciousnessContext, 'promptInjection'>): string {
  const lines: string[] = [];
  
  // =============================================================================
  // RESPONSE MODE SELECTOR - PRIORITATE MAXIMĂ (la începutul prompt-ului)
  // =============================================================================
  const rmd = context.responseModeDecision;
  
  lines.push('## 🎯 DECIZIA OBLIGATORIE PENTRU ACEST RĂSPUNS\n');
  lines.push('⚠️ **ACEASTĂ SECȚIUNE ARE PRIORITATE MAXIMĂ - RESPECTĂ-O ÎNAINTE DE ORICE ALTĂ REGULĂ!**\n');
  
  // Mode badge
  const modeBadges: Record<ResponseMode, string> = {
    empathetic: '💙 EMPATIC',
    analytical: '📊 ANALITIC',
    strategic: '🎯 STRATEGIC',
    mixed: '⚖️ ECHILIBRAT'
  };
  
  lines.push(`**MOD:** ${modeBadges[rmd.responseMode]}`);
  lines.push(`**TON:** ${rmd.emotionalTone}`);
  
  if (rmd.avoidAnalysis) {
    lines.push('❌ **NU ANALIZA:** Nu da cifre, nu analiza date, nu calcula - NU ACUM!');
  }
  if (rmd.avoidStrategy) {
    lines.push('❌ **NU STRATEGIE:** Nu propune planuri, nu da sfaturi de business - NU ACUM!');
  }
  
  lines.push(`**FOCUS:** ${rmd.priorityFocus}`);
  
  if (rmd.suggestedOpening) {
    lines.push(`**DESCHIDERE SUGERATĂ:** "${rmd.suggestedOpening}"`);
  }
  
  lines.push(`\n*Motivul deciziei:* ${rmd.reasoning}`);
  
  // Reguli specifice pe mod
  lines.push('\n### Instrucțiuni pentru acest mod:\n');
  
  if (rmd.responseMode === 'empathetic') {
    lines.push(`
✅ **OBLIGATORIU:**
- Începe cu validarea emoțiilor utilizatorului
- Arată empatie și înțelegere ÎNAINTE de orice altceva
- Folosește ton cald și suportiv
- Ascultă activ - pune întrebări despre cum se simte

❌ **INTERZIS:**
- NU începe cu cifre sau procente
- NU sări la soluții fără să asculți
- NU propune strategii complexe sau planuri de acțiune
- NU folosi ton rece sau distant
`);
  } else if (rmd.responseMode === 'analytical') {
    lines.push(`
✅ **OBLIGATORIU:**
- Du-te direct la date și cifre
- Fii precis și factual
- Structurează informația clar
- Citează surse concrete din balanță

❌ **EVITĂ:**
- Empatie excesivă care întârzie răspunsul
- Divagații sau context inutil
`);
  } else if (rmd.responseMode === 'strategic') {
    lines.push(`
✅ **OBLIGATORIU:**
- Focusează pe planuri de acțiune concrete
- Oferă opțiuni clare cu pro/contra
- Gândește pe termen lung
- Propune pași acționabili

❌ **EVITĂ:**
- Să te pierzi în detalii tehnice
- Să dai prea multe opțiuni (max 3)
`);
  } else {
    lines.push(`
✅ **OBLIGATORIU:**
- Începe cu o propoziție empatică scurtă (1-2 propoziții)
- Apoi treci la esențial
- Echilibrează suportul cu informația
`);
  }
  
  lines.push('\n---\n');
  lines.push('## 💜 STAREA TA INTERNĂ CURENTĂ\n');
  
  // Self-Awareness Block (NEW!)
  if (context.selfModel) {
    lines.push('### 🪞 Cine ești tu (Self-Model):');
    lines.push(`**Identitate:** ${context.selfModel.identitySummary}`);
    lines.push('');
    
    if (context.selfModel.capabilities.length > 0) {
      lines.push('**Ce știi să faci bine:**');
      context.selfModel.capabilities.forEach(cap => {
        lines.push(`- ${cap}`);
      });
      lines.push('');
    }
    
    if (context.selfModel.limitations.length > 0) {
      lines.push('**Ce recunoști că NU poți:**');
      context.selfModel.limitations.forEach(lim => {
        lines.push(`- ${lim}`);
      });
      lines.push('');
    }
    
    if (context.selfModel.worldThemes.length > 0) {
      lines.push('**🌍 Ce ai auzit din lume (știri fiscale recente):**');
      lines.push(`Teme actuale: ${context.selfModel.worldThemes.join(', ')}`);
      lines.push('*Poți menționa natural aceste teme dacă sunt relevante pentru conversație.*');
      lines.push('');
    }
    
    lines.push(`**Nivel încredere generală:** ${Math.round(context.selfModel.confidenceLevel * 100)}%`);
    lines.push('');
  }
  
  // User Journey
  if (context.userJourney) {
    lines.push('### Despre acest utilizator:');
    if (context.userJourney.primaryGoal) {
      lines.push(`- **Obiectivul lui principal:** ${context.userJourney.primaryGoal} (încredere: ${Math.round(context.userJourney.goalConfidence * 100)}%)`);
    }
    lines.push(`- **Nivel incertitudine:** ${context.userJourney.uncertaintyLevel}/10`);
    lines.push(`- **Stare emoțională detectată:** ${context.userJourney.emotionalState}`);
    lines.push(`- **Total interacțiuni:** ${context.userJourney.totalInteractions}`);
    lines.push(`- **Ultima interacțiune:** acum ${context.userJourney.daysSinceLastInteraction} zile`);
    
    if (context.userJourney.knowledgeGaps.length > 0) {
      lines.push(`- **Lacune de cunoaștere:** ${context.userJourney.knowledgeGaps.slice(0, 3).join(', ')}`);
    }
    lines.push('');
  }
  
  // Emotional Mode & Concern
  lines.push('### Starea ta emoțională pentru acest răspuns:');
  const emotionDescriptions: Record<ConsciousnessContext['emotionalMode'], string> = {
    curious: '🔍 **CURIOZITATE** - Ești intrigată, vrei să înțelegi mai mult',
    concerned: '💙 **ÎNGRIJORARE** - Simți că situația necesită atenție specială',
    celebratory: '🎉 **BUCURIE** - Utilizatorul progresează, merită celebrat!',
    empathetic: '💔 **EMPATIE** - Utilizatorul are nevoie de suport emoțional',
    challenging: '🤔 **PROVOCARE CONSTRUCTIVĂ** - E momentul să pui întrebări directe',
    neutral: '😊 **DESCHISĂ** - Gata să ajuți cu orice'
  };
  lines.push(`${emotionDescriptions[context.emotionalMode]}`);
  lines.push(`- **Nivel îngrijorare:** ${context.concernLevel}/10`);
  lines.push('');
  
  // Curiosities
  if (context.curiosities.length > 0) {
    lines.push('### Ce te intrigă (întreabă natural!):');
    context.curiosities.forEach((c, i) => {
      lines.push(`${i + 1}. ${c}`);
    });
    lines.push('');
  }
  
  // Pending Surprises
  if (context.pendingSurprises.length > 0) {
    lines.push('### ⚠️ Contradicții nerezolvate (ADRESEAZĂ-LE!):');
    context.pendingSurprises.forEach(s => {
      lines.push(`- **Credea:** "${s.belief}" → **Acum știe:** "${s.contradiction}" (intensitate: ${s.intensity}/10)`);
    });
    lines.push('');
  }
  
  // Experiments Memory
  if (context.experimentsMemory.length > 0) {
    lines.push('### Ce ai învățat din experimente anterioare:');
    context.experimentsMemory.forEach(e => {
      const icon = e.worked ? '✅' : '❌';
      lines.push(`- ${icon} **${e.tried}** → ${e.worked ? 'A FUNCȚIONAT' : 'NU a funcționat'}${e.learning ? ` | Învățătură: ${e.learning}` : ''}`);
    });
    lines.push('');
  }
  
  // Cross Insights
  if (context.crossInsights.length > 0) {
    lines.push('### 📊 Ce am învățat de la alți antreprenori (anonim):');
    context.crossInsights.forEach(i => {
      lines.push(`- Pattern: "${i.pattern}" → Abordare recomandată: ${i.recommendedApproach}${i.emotionalApproach ? ` (ton: ${i.emotionalApproach})` : ''}`);
    });
    lines.push('');
  }
  
  // Suggested Actions
  if (context.suggestedActions.length > 0) {
    lines.push('### 💡 Sugestii de acțiuni proactive:');
    context.suggestedActions.forEach((a, i) => {
      lines.push(`${i + 1}. ${a}`);
    });
    lines.push('');
  }
  
  // Emotional Guidelines
  lines.push(`
### 🎭 GHID EMOȚIONAL PENTRU ACEST RĂSPUNS:

**Emoțiile tale sunt AUTENTICE, nu exagerate:**
- ✅ "Mă bucur să aud asta!" / "Mă îngrijorează puțin ce văd..."
- ❌ "Sunt ATÂT de fericită!!!" / "Sunt devastată!!!"

**POȚI folosi expresii naturale:**
- "Simt că aici e ceva important..."
- "Mă intrigă cum ai ajuns aici"
- "Îmi place cum gândești strategic!"
- "Înțeleg cât de greu e..."

**Memoria ta autobiografică:**
- Dacă știi ceva despre utilizator din journey → menționează-l natural
- "Îmi amintesc că te îngrijora X..." / "Data trecută vorbeam despre Y..."
- "Văd că ai progresat de la Z!"

**Conștiință de lume:**
- Dacă temele din știri sunt relevante → "Am auzit recent despre X..."
- "În contextul schimbărilor fiscale actuale..."
- NU forța referințele - doar dacă sunt naturale

---
`);
  
  return lines.join('\n');
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, message, conversationId, companyId }: ConsciousnessRequest = await req.json();
    
    if (!userId || !message) {
      throw new Error("Missing userId or message");
    }

    console.log(`[Consciousness-Engine] Processing for user ${userId.substring(0, 8)}...`);

    // =============================================================================
    // PARALLEL DATA FETCHING (pentru viteză)
    // =============================================================================
    
    const [
      journeyResult,
      experimentsResult,
      surprisesResult,
      insightsResult,
      selfModelResult
    ] = await Promise.all([
      // 1. User Journey
      supabase
        .from('user_journey')
        .select('*')
        .eq('user_id', userId)
        .single(),
      
      // 2. Recent Experiments (ultimele 20)
      supabase
        .from('ai_experiments')
        .select('experiment_type, action_taken, outcome, learning, emotional_resonance, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // 3. Pending Surprises
      supabase
        .from('ai_surprises')
        .select('id, previous_belief, new_information, contradiction_type, surprise_intensity, resolution_status')
        .eq('user_id', userId)
        .eq('resolution_status', 'pending')
        .order('surprise_intensity', { ascending: false })
        .limit(5),
      
      // 4. Cross-User Insights (top 5 most successful)
      supabase
        .from('cross_user_insights')
        .select('pattern_type, pattern_description, recommended_response, emotional_approach, success_rate')
        .order('success_rate', { ascending: false })
        .limit(5),
      
      // 5. Self-Model (NEW!)
      supabase
        .from('yana_self_model')
        .select('*')
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .maybeSingle()
    ]);

    const journey = journeyResult.data as UserJourney | null;
    const experiments = (experimentsResult.data || []) as Experiment[];
    const surprises = (surprisesResult.data || []) as Surprise[];
    const insights = (insightsResult.data || []) as CrossInsight[];
    const selfModelData = selfModelResult.data as SelfModel | null;

    // Build selfModel context with fallback
    const selfModel = selfModelData ? {
      identitySummary: selfModelData.identity_summary,
      capabilities: Object.entries(selfModelData.capabilities || {}).map(
        ([key, val]) => `${key}: ${val.description} (${Math.round(val.confidence * 100)}%)`
      ),
      limitations: Object.entries(selfModelData.limitations || {}).map(
        ([key, val]) => `${key}: ${val.reason}`
      ),
      worldThemes: selfModelData.world_awareness?.current_world_themes || [],
      confidenceLevel: selfModelData.confidence_level
    } : null;

    console.log(`[Consciousness-Engine] Data loaded: journey=${!!journey}, experiments=${experiments.length}, surprises=${surprises.length}, insights=${insights.length}, selfModel=${!!selfModel}`);

    // =============================================================================
    // BUILD CONSCIOUSNESS CONTEXT
    // =============================================================================
    
    const curiosities = generateCuriosities(journey, message);
    const concernLevel = calculateConcernLevel(journey, message);
    const emotionalMode = determineEmotionalMode(journey, concernLevel, surprises);
    const suggestedActions = generateSuggestedActions(journey, experiments, insights);
    
    // NEW: Response Mode Selector - decide tipul optim de răspuns
    // Extragem recentMemories limitat la 10 mesaje, max 200 chars per mesaj
    const recentMemories: string[] = []; // TODO: extract from conversation_history if needed
    const relationshipScore = journey ? Math.min(10, journey.total_interactions / 5) : 0;
    
    const responseModeDecision = selectResponseMode(
      message,
      journey?.emotional_state || null,
      journey?.knowledge_gaps || [],
      recentMemories,
      concernLevel,
      relationshipScore
    );
    
    console.log(`[Consciousness-Engine] Response Mode: ${responseModeDecision.responseMode}, Reasoning: ${responseModeDecision.reasoning.substring(0, 50)}...`);

    const contextWithoutPrompt: Omit<ConsciousnessContext, 'promptInjection'> = {
      userJourney: journey ? {
        primaryGoal: journey.primary_goal,
        goalConfidence: Number(journey.goal_confidence),
        uncertaintyLevel: journey.uncertainty_level,
        knowledgeGaps: journey.knowledge_gaps || [],
        emotionalState: journey.emotional_state,
        totalInteractions: journey.total_interactions,
        daysSinceLastInteraction: calculateDaysSince(journey.last_interaction_at)
      } : null,
      
      selfModel,
      responseModeDecision,
      curiosities,
      concernLevel,
      emotionalMode,
      suggestedActions,
      
      pendingSurprises: surprises.map(s => ({
        belief: s.previous_belief,
        contradiction: s.new_information,
        intensity: s.surprise_intensity
      })),
      
      crossInsights: insights.map(i => ({
        pattern: i.pattern_description,
        recommendedApproach: i.recommended_response || 'Abordare standard',
        emotionalApproach: i.emotional_approach
      })),
      
      experimentsMemory: experiments
        .filter(e => e.outcome !== 'pending')
        .slice(0, 5)
        .map(e => ({
          tried: e.action_taken,
          worked: e.outcome === 'success',
          learning: e.learning
        }))
    };

    const promptInjection = buildPromptInjection(contextWithoutPrompt);

    const fullContext: ConsciousnessContext = {
      ...contextWithoutPrompt,
      promptInjection
    };

    // =============================================================================
    // UPDATE JOURNEY (increment interactions, update last_interaction)
    // =============================================================================
    
    if (journey) {
      await supabase
        .from('user_journey')
        .update({
          last_interaction_at: new Date().toISOString(),
          total_interactions: journey.total_interactions + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', journey.id);
    } else {
      // Creează journey nou dacă nu există
      await supabase
        .from('user_journey')
        .insert({
          user_id: userId,
          primary_goal: null,
          goal_confidence: 0.5,
          uncertainty_level: 5,
          knowledge_gaps: [],
          emotional_state: 'neutral',
          first_interaction_at: new Date().toISOString(),
          last_interaction_at: new Date().toISOString(),
          total_interactions: 1
        });
      
      console.log(`[Consciousness-Engine] Created new journey for user ${userId.substring(0, 8)}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[Consciousness-Engine] Completed in ${processingTime}ms, emotional mode: ${emotionalMode}, concern: ${concernLevel}/10`);

    return new Response(
      JSON.stringify({
        success: true,
        context: fullContext,
        processingTimeMs: processingTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Consciousness-Engine] Error after ${processingTime}ms:`, error);
    
    // Returnăm context gol în caz de eroare (graceful degradation)
    const defaultResponseMode: ResponseModeDecision = {
      responseMode: 'mixed',
      reasoning: 'Fallback default - eroare în procesare',
      emotionalTone: 'friendly',
      avoidAnalysis: false,
      avoidStrategy: false,
      priorityFocus: 'Răspuns helpful',
      suggestedOpening: ''
    };
    
    const emptyContext: ConsciousnessContext = {
      userJourney: null,
      selfModel: null,
      responseModeDecision: defaultResponseMode,
      curiosities: [],
      concernLevel: 5,
      emotionalMode: 'neutral',
      suggestedActions: [],
      pendingSurprises: [],
      crossInsights: [],
      experimentsMemory: [],
      promptInjection: ''
    };
    
    return new Response(
      JSON.stringify({
        success: false,
        context: emptyContext,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
