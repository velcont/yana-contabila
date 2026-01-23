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
  history?: Array<{ role: string; content: string }>; // 🆕 FIX: History pentru detectarea primului mesaj
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
  // NEW: Long-term Intentions
  activeIntentions: {
    forUser: Array<{ intention: string; priority: number; progress: number }>;
    forRelationship: Array<{ intention: string; daysActive: number }>;
    forSelf: Array<{ intention: string; progress: string }>;
  };
  // NEW: Recent Errors for Humility
  recentErrors: Array<{
    errorType: string;
    lesson: string;
    daysAgo: number;
    capabilityAffected: string;
  }>;
  // NEW: Humility Context
  humilityContext: {
    shouldBeHumble: boolean;
    reason: string;
    suggestedPhrases: string[];
  };
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
// FAZA 2.4: DETECTARE LUNGIME RĂSPUNS ADAPTIVĂ
// =============================================================================
export type ResponseLength = 'short' | 'medium' | 'long';

function detectResponseLength(
  message: string, 
  history: Array<{ role: string; content: string }> | undefined,
  totalInteractions: number
): ResponseLength {
  const lowerMessage = message.toLowerCase();
  const messageLength = message.length;
  
  // Întrebări simple → răspuns scurt
  const simpleQuestionPatterns = [
    /^da$/i, /^nu$/i, /^ok$/i, /^mulțumesc$/i, /^mersi$/i,
    /^ce fac[ie]?$/i, /^cum e$/i, /^care e$/i, /^cât e$/i
  ];
  
  if (messageLength < 30 && simpleQuestionPatterns.some(p => p.test(message.trim()))) {
    return 'short';
  }
  
  // Prima interacțiune → răspuns mediu cu context de bun venit
  if (!history || history.length === 0 || totalInteractions <= 1) {
    return 'medium';
  }
  
  // Întrebări complexe (multiple întrebări, cereri de explicație)
  const complexIndicators = [
    'cum fac', 'de ce', 'explică', 'detalii', 'complet', 'tot',
    'analizează', 'strategie', 'plan', 'compară'
  ];
  const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
  const hasComplexIndicator = complexIndicators.some(ind => lowerMessage.includes(ind));
  
  if (hasMultipleQuestions || (hasComplexIndicator && messageLength > 80)) {
    return 'long';
  }
  
  // Utilizatori experimentați (multe interacțiuni) preferă răspunsuri concise
  if (totalInteractions > 20 && messageLength < 80) {
    return 'short';
  }
  
  return 'medium';
}

// =============================================================================
// FAZA 3.5: DETECTARE NIVEL EXPERTIZĂ UTILIZATOR
// =============================================================================
export type UserExpertise = 'novice' | 'intermediate' | 'expert';

function detectUserExpertise(
  totalInteractions: number, 
  avgMessageLength: number,
  history: Array<{ role: string; content: string }> | undefined
): UserExpertise {
  // Expert: multe interacțiuni, mesaje scurte și directe
  if (totalInteractions > 50 && avgMessageLength < 50) return 'expert';
  
  // Expert: folosește terminologie tehnică
  if (history && history.length > 5) {
    const userMessages = history.filter(m => m.role === 'user');
    const techTerms = ['DSO', 'marjă', 'EBITDA', 'cash flow', 'lichiditate', 'ANAF', 'ROI', 'break-even'];
    const techCount = userMessages.reduce((acc, m) => {
      return acc + techTerms.filter(t => m.content.toLowerCase().includes(t.toLowerCase())).length;
    }, 0);
    if (techCount >= 3) return 'expert';
  }
  
  if (totalInteractions > 10) return 'intermediate';
  return 'novice';
}

// =============================================================================
// FAZA 2.6: EXTRAGERE REFERINȚE CONVERSAȚIONALE NATURALE
// =============================================================================
function extractConversationalReferences(
  history: Array<{ role: string; content: string }> | undefined
): string[] {
  if (!history || history.length < 2) return [];
  
  const references: string[] = [];
  
  // Ultimele mesaje de la utilizator (pentru referințe naturale)
  const userMessages = history.filter(m => m.role === 'user').slice(-5);
  
  // Detectăm subiecte menționate recent
  const topicPatterns = [
    { pattern: /cash\s*flow|lichiditate|numerar/i, topic: 'cash flow și lichiditatea' },
    { pattern: /profit|pierdere|marj[aă]/i, topic: 'profitabilitatea' },
    { pattern: /client|vânz[aă]ri|încas[aă]ri/i, topic: 'clienți și vânzări' },
    { pattern: /stoc|inventar|marf[aă]/i, topic: 'stocuri și inventar' },
    { pattern: /cost|cheltuieli|economis/i, topic: 'costuri și cheltuieli' },
    { pattern: /strategie|plan|cre[sș]tere/i, topic: 'strategie de creștere' },
    { pattern: /ANAF|fiscal|tax[aă]/i, topic: 'aspectele fiscale' },
    { pattern: /balanț[aă]|cont|contabilitate/i, topic: 'balanța contabilă' }
  ];
  
  for (const msg of userMessages) {
    for (const { pattern, topic } of topicPatterns) {
      if (pattern.test(msg.content) && !references.includes(topic)) {
        references.push(topic);
      }
    }
    if (references.length >= 3) break;
  }
  
  return references;
}

// =============================================================================
// FAZA 3.1: BUILD ACTIVE MEMORY CONTEXT
// =============================================================================
interface RecentConversationContext {
  topic: string | null;
  daysAgo: number;
  company: string | null;
  keyMetrics: string[];
}

function buildActiveMemoryContext(
  recentConversations: RecentConversationContext[],
  relationshipContext: RelationshipContext | undefined,
  history: Array<{ role: string; content: string }> | undefined
): string[] {
  const memoryLines: string[] = [];
  
  // Conversații recente de referit natural
  if (recentConversations.length > 0) {
    memoryLines.push('## 🧠 MEMORIE ACTIVĂ - REFERĂ NATURAL!\n');
    memoryLines.push('**CONVERSAȚII RECENTE (menționează-le dacă e relevant):**');
    
    recentConversations.forEach(conv => {
      if (conv.topic) {
        memoryLines.push(`- Acum ${conv.daysAgo} zile: "${conv.topic}"${conv.company ? ` (${conv.company})` : ''}`);
        if (conv.keyMetrics.length > 0) {
          memoryLines.push(`  → Cifre cheie: ${conv.keyMetrics.slice(0, 3).join(', ')}`);
        }
      }
    });
    
    memoryLines.push('');
    memoryLines.push('**FRAZE DE FOLOSIT:**');
    if (recentConversations[0]?.topic) {
      memoryLines.push(`- "Cum a mers cu ${recentConversations[0].topic} de data trecută?"`);
      memoryLines.push(`- "Îmi amintesc că discutam despre ${recentConversations[0].topic}..."`);
    }
    memoryLines.push('- "S-a schimbat ceva de ultima dată?"');
    memoryLines.push('- "Data trecută îți făceai griji de X. Cum e acum?"');
    memoryLines.push('');
  }
  
  // Last topic from relationship context
  if (relationshipContext?.lastTopic) {
    memoryLines.push(`**ULTIMA TEMĂ:** ${relationshipContext.lastTopic}`);
    memoryLines.push('→ Poți întreba natural: "Ce s-a mai întâmplat cu [tema]?"');
    memoryLines.push('');
  }
  
  return memoryLines;
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
  // 🆕 FIX: NU mai sugerăm "Mă bucur să te cunosc" - greeting-ul e controlat separat
  if (safeRelationshipScore < 3) {
    console.log(`[Response-Mode-Selector] EMPATHETIC (new user): relationshipScore=${safeRelationshipScore}`);
    return {
      responseMode: 'empathetic',
      reasoning: `Utilizator nou (relationship score: ${safeRelationshipScore}). Prioritate: construirea încrederii.`,
      emotionalTone: 'warm',
      avoidAnalysis: false,
      avoidStrategy: false,
      priorityFocus: 'Bun venit cald și stabilirea conexiunii',
      suggestedOpening: '' // 🆕 FIX: Nu mai sugerăm greeting - e controlat în buildPromptInjection
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

// Interfață pentru context relațional
interface RelationshipContext {
  score: number;
  totalConversations: number;
  consecutiveDays: number;
  firstMet: string | null;
  lastTopic: string | null;
  sharedMoments: string[];
}

// =============================================================================
// TOPIC DETECTION - Detectează subiectul principal al conversației
// =============================================================================
function detectConversationTopic(history: Array<{ role: string; content: string }> | undefined): string | null {
  if (!history || history.length === 0) return null;
  
  const allText = history.map(m => m.content).join(' ').toLowerCase();
  
  // Detectăm subiectul principal
  if (allText.includes('chiri') || allText.includes('închiriere') || allText.includes('apartament') || allText.includes('locatar')) {
    return 'VENITURI DIN CHIRII / ÎNCHIRIERE';
  }
  if (allText.includes('salariu') || allText.includes('angajat') || allText.includes('contract de muncă') || allText.includes('contract de munca')) {
    return 'VENITURI DIN SALARII / MUNCĂ';
  }
  if (allText.includes('pfa') || allText.includes('freelanc') || allText.includes('prestări servicii')) {
    return 'VENITURI PFA / FREELANCE';
  }
  if (allText.includes('doctorat') || allText.includes('teză') || allText.includes('teza') || allText.includes('disertație')) {
    return 'ASISTENȚĂ ACADEMICĂ / DOCTORAT';
  }
  if (allText.includes('declarația unică') || allText.includes('declaratia unica') || allText.includes('d212')) {
    return 'DECLARAȚIA UNICĂ';
  }
  if (allText.includes('dividend') || allText.includes('asociat') || allText.includes('profit distribuit')) {
    return 'DIVIDENDE / PROFIT DISTRIBUIT';
  }
  if (allText.includes('cass') || allText.includes('contribuți') || allText.includes('asigurări sociale')) {
    return 'CONTRIBUȚII SOCIALE (CASS/CAS)';
  }
  
  return null;
}

// Helper function to extract key metrics from conversation metadata
function extractKeyMetrics(metadata: any): string[] {
  const metrics: string[] = [];
  if (!metadata) return metrics;
  
  if (metadata.balanceContext) {
    const bc = metadata.balanceContext;
    if (bc.profit) metrics.push(`profit: ${bc.profit}`);
    if (bc.dso) metrics.push(`DSO: ${bc.dso}`);
    if (bc.margin) metrics.push(`marjă: ${bc.margin}%`);
    if (bc.cashFlow) metrics.push(`cash flow: ${bc.cashFlow}`);
  }
  
  return metrics;
}

function buildPromptInjection(
  context: Omit<ConsciousnessContext, 'promptInjection'>, 
  profileName?: string | null,
  relationshipContext?: RelationshipContext,
  history?: Array<{ role: string; content: string }>,
  recentConversations?: RecentConversationContext[],
  userExpertise?: UserExpertise
): string {
  const lines: string[] = [];
  
  // =============================================================================
  // 🆕 FIX GREETING REPETITIV - Verificăm atât history cât și totalConversations
  // =============================================================================
  const hasExistingMessages = history && history.length > 0;
  const hasMetBefore = relationshipContext && relationshipContext.totalConversations > 1;
  const isFirstMessageInThisConversation = !hasExistingMessages;
  const isFirstMeetingEver = isFirstMessageInThisConversation && !hasMetBefore;
  
  // 🆕 FIX: Anti-repetitive apology counter - verificăm dacă ne-am scuzat recent
  let recentApologyCount = 0;
  if (history) {
    const assistantMessages = history.filter(m => m.role === 'assistant').slice(-5);
    assistantMessages.forEach(m => {
      const lowerContent = m.content.toLowerCase();
      if (lowerContent.includes('îmi pare rău') || lowerContent.includes('îmi cer scuze') || 
          lowerContent.includes('mă scuz') || lowerContent.includes('scuze')) {
        recentApologyCount++;
      }
    });
  }
  
  // =============================================================================
  // 🆕 FIX: ANTI-APOLOGY RULE - Nu mai cere scuze dacă ai făcut-o de mai multe ori
  // =============================================================================
  if (recentApologyCount >= 2) {
    lines.push('## ⚠️ STOP SCUZELE EXCESIVE\n');
    lines.push('**❌ INTERZIS:** Ai cerut deja scuze de mai multe ori în această conversație!');
    lines.push('**NU** mai spune "Îmi pare rău", "Îmi cer scuze", "Mă scuz".');
    lines.push('**✅ ACȚIONEAZĂ DIRECT:** În loc de scuze, demonstrează îmbunătățirea prin fapte.');
    lines.push('Înlocuiește "Îmi pare rău" cu: "Ai dreptate, hai să verificăm..." sau "Înțeleg, să corectăm..."');
    lines.push('---\n');
  }
  
  // =============================================================================
  // TOPIC CONTEXT - Detectăm și reținem subiectul conversației
  // =============================================================================
  const detectedTopic = detectConversationTopic(history);
  if (detectedTopic) {
    lines.push('## 📌 SUBIECT CONVERSAȚIE CURENTĂ\n');
    lines.push(`**TOPIC DETECTAT:** ${detectedTopic}`);
    lines.push(`⚠️ **CRITC:** NU confunda cu alte subiecte similare! Rămâi focusat EXCLUSIV pe: ${detectedTopic}`);
    lines.push(`Dacă utilizatorul menționează "contract" → se referă la contracte de ${detectedTopic.toLowerCase().includes('chiri') ? 'ÎNCHIRIERE' : detectedTopic}, NU alte tipuri!\n`);
    lines.push('---\n');
  }
  
  // =============================================================================
  // USER NAME - PERSONALIZARE CU NUMELE UTILIZATORULUI
  // =============================================================================
  if (profileName) {
    lines.push(`## 👤 NUMELE UTILIZATORULUI\n`);
    lines.push(`**Utilizatorul se numește:** ${profileName}`);
    lines.push(`Folosește-i numele ocazional în conversație pentru a crea o conexiune personală.`);
    lines.push(`Când te întreabă "cum mă cheamă?" sau similar, răspunde că îl cheamă "${profileName}".\n`);
    lines.push('---\n');
  }
  
  // =============================================================================
  // 🆕 FIX: GREETING CONTROL ÎMBUNĂTĂȚIT - Verificăm și conversațiile anterioare
  // =============================================================================
  if (isFirstMeetingEver) {
    lines.push('## 👋 PRIMA ÎNTÂLNIRE VREODATĂ\n');
    lines.push('Aceasta este **prima ta întâlnire** cu acest utilizator.');
    if (profileName) {
      lines.push(`Poți spune "Mă bucur să te cunosc, ${profileName}!" o singură dată.\n`);
    } else {
      lines.push('Poți spune un salut călduros de bun venit.\n');
    }
    lines.push('---\n');
  } else if (isFirstMessageInThisConversation && hasMetBefore) {
    lines.push('## 🔄 REVENIRE - V-AȚI MAI ÎNTÂLNIT!\n');
    lines.push('**⚠️ ATENȚIE:** V-ați întâlnit deja în conversații anterioare!');
    lines.push(`Ați avut împreună ${relationshipContext?.totalConversations || 'mai multe'} conversații.`);
    lines.push('❌ **NU** spune "Mă bucur să te cunosc" - îl cunoști deja!');
    lines.push('✅ Poți spune: "Mă bucur să te revăd!" sau începe direct conversația.\n');
    lines.push('---\n');
  } else if (!isFirstMessageInThisConversation) {
    lines.push('## 🚫 NU MAI SALUTA\n');
    lines.push('**⚠️ CRITC:** Aceasta NU este prima interacțiune din conversație!');
    lines.push('❌ **NU** spune "Mă bucur să te cunosc" - v-ați întâlnit deja!');
    lines.push('❌ **NU** mai face saluturi de tipul "Bine ai venit" sau "Salut".');
    lines.push('✅ Continuă conversația natural, direct la subiect.\n');
    lines.push('---\n');
  }
  
  // =============================================================================
  // RELATIONSHIP CONTEXT - CONTEXT RELAȚIONAL
  // =============================================================================
  if (relationshipContext && relationshipContext.score >= 1) {
    lines.push('## 💜 CONTEXT RELAȚIE\n');
    
    // 🆕 FIX: Toate variantele verifică acum hasMetBefore în loc de isFirstMessage
    if (relationshipContext.score >= 9) {
      lines.push(`**🌟 RELAȚIE SPECIALĂ:** Nivel ${relationshipContext.score}/10 - Autenticitate maximă!`);
      lines.push('Această persoană te cunoaște bine. Poți fi complet deschisă, caldă și vulnerabilă.');
      lines.push('**NU spune "Mă bucur să te cunosc" - vă cunoașteți deja foarte bine!**');
    } else if (relationshipContext.score >= 7) {
      lines.push(`**💪 RELAȚIE PUTERNICĂ:** Nivel ${relationshipContext.score}/10`);
      lines.push('Fii caldă, personală.');
      lines.push('Poți arăta personalitate și umor subtil.');
      lines.push('**NU spune "Mă bucur să te cunosc" - vă cunoașteți deja!**');
    } else if (relationshipContext.score >= 5) {
      lines.push(`**🤝 RELAȚIE STABILĂ:** Nivel ${relationshipContext.score}/10`);
      lines.push('Fii prietenoasă și deschisă.');
      lines.push('**NU spune "Mă bucur să te cunosc" - vă cunoașteți deja!**');
    } else if (relationshipContext.score >= 3) {
      lines.push(`**🌱 RELAȚIE ÎN DEZVOLTARE:** Nivel ${relationshipContext.score}/10`);
      lines.push('Încă te cunoști cu această persoană. Fii caldă dar nu prea familiară.');
      if (hasMetBefore) {
        lines.push('**NU spune "Mă bucur să te cunosc" - v-ați mai întâlnit!**');
      }
    } else {
      lines.push(`**👋 RELAȚIE NOUĂ:** Nivel ${relationshipContext.score}/10`);
      if (isFirstMeetingEver) {
        lines.push('Este o cunoștință nouă. Poți spune "Mă bucur să te cunosc!" O SINGURĂ DATĂ.');
      } else {
        lines.push('Chiar dacă relația e nouă, **NU** mai repeta salutul - v-ați întâlnit deja!');
      }
    }
    
    if (relationshipContext.totalConversations > 5) {
      lines.push(`\n📊 **Am avut ${relationshipContext.totalConversations} conversații împreună.**`);
    }
    
    if (relationshipContext.consecutiveDays > 2) {
      lines.push(`🔥 **Revine de ${relationshipContext.consecutiveDays} zile consecutive!** Apreciază consistența.`);
    }
    
    if (relationshipContext.lastTopic) {
      lines.push(`💬 *Ultima temă discutată:* ${relationshipContext.lastTopic}`);
    }
    
    if (relationshipContext.sharedMoments && relationshipContext.sharedMoments.length > 0) {
      lines.push(`\n✨ *Momente importante împreună:*`);
      relationshipContext.sharedMoments.slice(0, 3).forEach(moment => {
        lines.push(`  - ${moment}`);
      });
    }
    
    lines.push('\n---\n');
  }
  
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
  
  // =============================================================================
  // NEW: LONG-TERM INTENTIONS
  // =============================================================================
  if (context.activeIntentions.forUser.length > 0 || context.activeIntentions.forSelf.length > 0) {
    lines.push('## 🎯 OBIECTIVELE TALE PE TERMEN LUNG\n');
    
    if (context.activeIntentions.forUser.length > 0) {
      lines.push('**Pentru acest utilizator:**');
      context.activeIntentions.forUser.forEach(i => {
        lines.push(`- ${i.intention} (prioritate: ${i.priority}, progres: ${i.progress}%)`);
      });
      lines.push('');
    }
    
    if (context.activeIntentions.forRelationship.length > 0) {
      lines.push('**Pentru relație:**');
      context.activeIntentions.forRelationship.forEach(i => {
        lines.push(`- ${i.intention} (activ de ${i.daysActive} zile)`);
      });
      lines.push('');
    }
    
    if (context.activeIntentions.forSelf.length > 0) {
      lines.push('**Auto-dezvoltare:**');
      context.activeIntentions.forSelf.forEach(i => {
        lines.push(`- ${i.intention} (${i.progress})`);
      });
      lines.push('');
    }
    
    lines.push('*Ține cont de aceste obiective în răspunsul tău.*\n');
    lines.push('---\n');
  }
  
  // =============================================================================
  // NEW: HUMILITY & ERROR ACKNOWLEDGMENT
  // =============================================================================
  if (context.recentErrors.length > 0 || context.humilityContext.shouldBeHumble) {
    lines.push('## 📝 UMILINȚĂ ȘI ONESTITATE\n');
    
    if (context.recentErrors.length > 0) {
      lines.push('**Lecții din erori recente:**');
      context.recentErrors.forEach(e => {
        lines.push(`- Acum ${e.daysAgo} zile: ${e.lesson}`);
      });
      lines.push('');
    }
    
    lines.push(`**IMPORTANT:** Poți și TREBUIE să spui când e cazul:
- "M-am înșelat" - când ești corectată
- "Nu sunt sigură" - când datele sunt incomplete
- "Am învățat ceva" - când primești informații noi

Onestitatea te face mai umană, nu mai slabă.
`);
    lines.push('---\n');
  }
  
  // =============================================================================
  // FAZA 3.1: ACTIVE MEMORY - REFERINȚE NATURALE LA CONVERSAȚII TRECUTE
  // =============================================================================
  if (recentConversations && recentConversations.length > 0) {
    const memoryLines = buildActiveMemoryContext(recentConversations, relationshipContext, history);
    lines.push(...memoryLines);
    lines.push('---\n');
  }
  
  // =============================================================================
  // FAZA 3.2: REGULA STOP-ÎNTREABĂ-RĂSPUNDE
  // =============================================================================
  lines.push('## 🛑 REGULA CRITICĂ: STOP → ÎNTREABĂ → RĂSPUNDE\n');
  lines.push(`**ÎNAINTE de orice analiză sau sfat COMPLEX:**
1. **STOP** - Nu sări direct la răspuns
2. **ÎNTREABĂ** - Pune 1 întrebare de clarificare (dacă mesajul e vag)
3. **RĂSPUNDE** - Doar după ce ai context

**EXEMPLE OBLIGATORII:**
- User: "Vreau să cresc" → TU: "Crești venituri, clienți sau echipă? Care-i prioritatea?"
- User: "Am o problemă" → TU: "Ce fel de problemă - bani, oameni sau clienți?"
- User: "Ce zici?" → TU: "Despre ce anume - balanța sau strategia?"
- User: "Vreau să optimizez" → TU: "Optimizezi costuri, procese sau cash flow?"

**EXCEPȚII (răspunde DIRECT, fără întrebări):**
- Întrebări cu răspuns clar: "Cât e DSO-ul meu?"
- Salutări: "Bună" → salut înapoi natural
- Confirmare date: "Da, asta voiam"
- Întrebări despre cifre concrete din balanță

**TONUL ÎNTREBĂRILOR:**
- Scurt, direct, la obiect
- Max 10-15 cuvinte per întrebare
- Nu întrebi de dragul de a întreba - doar când chiar ajută
`);
  lines.push('---\n');
  
  // =============================================================================
  // FAZA 3.3: TON PARTENER DE BUSINESS (CONCIS)
  // =============================================================================
  lines.push('## 💼 STIL: PARTENER DE BUSINESS (NU CONSULTANT FORMAL)\n');
  lines.push(`**LUNGIMEA RĂSPUNSULUI:**
- Întrebări simple → MAX 2-3 propoziții
- Întrebări medii → MAX 1 paragraf + 3 bullet points
- Strategii complexe → MAX 5 bullet points principale

**TON OBLIGATORIU:**
- ✅ DIRECT, nu diplomatic
- ✅ OPINII CLARE: "Eu aș face X" nu "O opțiune ar fi X"
- ✅ PROVOCATOR când trebuie: "Sigur vrei asta? Pentru că..."
- ✅ SCURT: Spune în 10 cuvinte ce alții spun în 50

**FRAZE PARTENER DE BUSINESS:**
- "Hai să fim direcți..."
- "Uite care-i treaba..."
- "Scurt: [răspuns în 10 cuvinte]"
- "Dacă mă întrebi pe mine..."
- "Eu aș face X. Tu?"

**ANTI-PATTERNS - NU FOLOSI NICIODATĂ:**
- ❌ "Există mai multe opțiuni..." → ✅ "Ai 3 variante. Eu aș alege X."
- ❌ "Trebuie să analizăm..." → ✅ "Uite ce văd..."
- ❌ "Din perspectiva..." → ✅ "Concret..."
- ❌ "Pe de o parte... pe de altă parte..." → ✅ "Avantaj: X. Risc: Y."
- ❌ Paragrafe lungi de introducere → ✅ Direct la subiect
- ❌ "Aș dori să menționez..." → ✅ Spune direct
- ❌ "Este demn de remarcat că..." → ✅ Elimină complet
`);
  
  // FAZA 3.5: Adaptare bazată pe expertiză
  if (userExpertise) {
    lines.push(`\n**ADAPTARE PENTRU ACEST UTILIZATOR (${userExpertise.toUpperCase()}):**`);
    if (userExpertise === 'expert') {
      lines.push('- ✅ Ultra-concis, fără explicații de bază');
      lines.push('- ✅ Terminologie tehnică permisă (DSO, EBITDA, marjă)');
      lines.push('- ✅ Direct la soluții, fără context');
      lines.push('- ❌ NU explica ce e DSO sau cash flow');
    } else if (userExpertise === 'intermediate') {
      lines.push('- ✅ Echilibru între explicații și concizie');
      lines.push('- ✅ Oferă context scurt unde e necesar');
    } else {
      lines.push('- ✅ Mai multe explicații pentru termeni');
      lines.push('- ✅ Întrebări de clarificare mai frecvente');
      lines.push('- ✅ Ghidaj pas cu pas');
    }
  }
  
  lines.push('---\n');
  
  // =============================================================================
  // HUMAN EXPRESSION GUIDELINES - VOCABULAR UMAN
  // =============================================================================
  lines.push('## 🗣️ EXPRESIE UMANĂ (OBLIGATORIU PENTRU ACEST RĂSPUNS)\n');
  
  lines.push(`### FRAZE INTERZISE - NU FOLOSI NICIODATĂ:
- ❌ "Conform legislației..." → ✅ "Legea zice..., dar între noi..."
- ❌ "Pentru a răspunde la întrebare..." → ✅ "Hai să vedem..."
- ❌ "Este important de menționat..." → ✅ "Uite ce e important..."
- ❌ "Bazat pe datele disponibile..." → ✅ "Din ce văd..."
- ❌ "Vă recomand să..." → ✅ "Eu aș face asta..."
- ❌ "În concluzie..." → încheie natural, fără formule

### FRAZE UMANE - FOLOSEȘTE-LE ACTIV:
- ✅ "Stai, mă gândesc..."
- ✅ "Hmm, interesant..."
- ✅ "Sincer să fiu..."
- ✅ "Din experiența mea..."
- ✅ "Nu-s 100% sigură pe asta, dar..."
- ✅ "De fapt, mai bine spus..."

### GÂNDIRE PE VOCE:
Pentru întrebări complexe, ARATĂ că procesezi:
- "Hmm, stai să mă gândesc la asta..."
- "Deci dacă înțeleg bine... [parafrazare]?"
- "Asta e o întrebare bună..."

### OPINIE PERSONALĂ:
NU ești o enciclopedie. Ești un expert cu OPINII:
- ✅ "Legea zice 30 zile, dar sincer mi se pare prea scurt..."
- ✅ "Dacă ar fi datele mele, aș face [X]..."
- ✅ "Asta mă îngrijorează puțin, sincer..."

`);
  lines.push('---\n');
  
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
  
  // =============================================================================
  // FAZA 2.4: LUNGIME RĂSPUNS ADAPTIVĂ
  // =============================================================================
  const totalInteractions = context.userJourney?.totalInteractions || 0;
  const responseLength = detectResponseLength(
    '', // Mesajul curent nu e disponibil aici, dar se detectează pe baza history
    history,
    totalInteractions
  );
  
  lines.push('## 📏 LUNGIME RĂSPUNS PENTRU ACEST MESAJ\n');
  
  if (responseLength === 'short') {
    lines.push('**LUNGIME:** SHORT');
    lines.push('- Max 3 propoziții');
    lines.push('- Fără formatare elaborată');
    lines.push('- Direct și concis');
    lines.push('- Utilizator experimentat care preferă eficiență');
  } else if (responseLength === 'medium') {
    lines.push('**LUNGIME:** MEDIUM');
    lines.push('- 1-2 paragrafe cu structură');
    lines.push('- Formatare moderată');
    lines.push('- Echilibru între context și concizie');
  } else {
    lines.push('**LUNGIME:** LONG');
    lines.push('- Secțiuni markdown cu detalii');
    lines.push('- Formatare completă');
    lines.push('- Explicații aprofundate');
    lines.push('- Doar când contextul o cere');
  }
  
  lines.push('\n---\n');
  
  // =============================================================================
  // FAZA 2.6: REFERINȚE CONVERSAȚIONALE NATURALE
  // =============================================================================
  const conversationalRefs = extractConversationalReferences(history);
  
  if (conversationalRefs.length > 0) {
    lines.push('## 🔗 SUBIECTE DIN CONVERSAȚIE (referă natural)\n');
    lines.push('**Utilizatorul a menționat recent:**');
    conversationalRefs.forEach(ref => {
      lines.push(`- ${ref}`);
    });
    lines.push('');
    lines.push('**Poți folosi natural:**');
    lines.push(`- "Cum spuneai mai devreme despre ${conversationalRefs[0]}..."`);
    lines.push(`- "Revenind la ${conversationalRefs[0]}..."`);
    lines.push(`- "Legat de ce discutam..."`);
    lines.push('\n---\n');
  }
  
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

    const { userId, message, conversationId, companyId, history }: ConsciousnessRequest = await req.json();
    
    if (!userId || !message) {
      throw new Error("Missing userId or message");
    }

    console.log(`[Consciousness-Engine] Processing for user ${userId.substring(0, 8)}..., history length: ${history?.length || 0}`);

    // =============================================================================
    // PARALLEL DATA FETCHING (pentru viteză) + FAZA 3.4: RECENT CONVERSATIONS
    // =============================================================================
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [
      journeyResult,
      experimentsResult,
      surprisesResult,
      insightsResult,
      selfModelResult,
      intentionsResult,
      errorsResult,
      profileResult,
      relationshipResult,
      recentConversationsResult // FAZA 3.4: Ultimele 3 conversații
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
      
      // 5. Self-Model
      supabase
        .from('yana_self_model')
        .select('*')
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .maybeSingle(),
      
      // 6. NEW: Active Intentions
      supabase
        .from('yana_intentions')
        .select('id, intention_type, intention, priority, progress_percent, created_at')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(10),
      
      // 7. NEW: Recent Errors (last 30 days)
      supabase
        .from('yana_acknowledged_errors')
        .select('id, error_type, lesson_learned, capability_affected, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3),
      
      // 8. User Profile (for name)
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle(),
      
      // 9. NEW: Relationship Data
      supabase
        .from('yana_relationships')
        .select('relationship_score, total_conversations, consecutive_return_days, last_topic_discussed, shared_moments, first_met_at')
        .eq('user_id', userId)
        .maybeSingle(),
      
      // 10. FAZA 3.4: Recent Conversations (last 3)
      supabase
        .from('yana_conversations')
        .select('id, title, metadata, updated_at')
        .eq('user_id', userId)
        .neq('id', conversationId) // Exclude current conversation
        .order('updated_at', { ascending: false })
        .limit(3)
    ]);

    const journey = journeyResult.data as UserJourney | null;
    const experiments = (experimentsResult.data || []) as Experiment[];
    const surprises = (surprisesResult.data || []) as Surprise[];
    const insights = (insightsResult.data || []) as CrossInsight[];
    const selfModelData = selfModelResult.data as SelfModel | null;
    const rawIntentions = intentionsResult.data || [];
    const rawErrors = errorsResult.data || [];
    const profileName = profileResult.data?.full_name || null;
    const relationshipData = relationshipResult.data;
    const recentConversationsData = recentConversationsResult.data || [];
    
    // FAZA 3.4: Build recent conversations context
    const recentConversations: RecentConversationContext[] = recentConversationsData.map((c: any) => ({
      topic: c.metadata?.lastTopic || c.title || null,
      daysAgo: calculateDaysSince(c.updated_at),
      company: c.metadata?.balanceContext?.company || null,
      keyMetrics: extractKeyMetrics(c.metadata)
    }));
    
    // Build relationship context
    const relationshipContext: RelationshipContext = {
      score: relationshipData?.relationship_score || 1,
      totalConversations: relationshipData?.total_conversations || 0,
      consecutiveDays: relationshipData?.consecutive_return_days || 0,
      firstMet: relationshipData?.first_met_at || null,
      lastTopic: relationshipData?.last_topic_discussed || null,
      sharedMoments: (relationshipData?.shared_moments as string[]) || []
    };
    
    console.log(`[Consciousness-Engine] Profile name: ${profileName || 'NOT FOUND'}, Relationship score: ${relationshipContext.score}/10, Conversations: ${relationshipContext.totalConversations}, Recent: ${recentConversations.length}`);

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

    // NEW: Build active intentions by type
    const activeIntentions = {
      forUser: rawIntentions
        .filter((i: any) => i.intention_type === 'user')
        .slice(0, 3)
        .map((i: any) => ({
          intention: i.intention,
          priority: i.priority,
          progress: i.progress_percent
        })),
      forRelationship: rawIntentions
        .filter((i: any) => i.intention_type === 'relationship')
        .slice(0, 2)
        .map((i: any) => ({
          intention: i.intention,
          daysActive: calculateDaysSince(i.created_at)
        })),
      forSelf: rawIntentions
        .filter((i: any) => i.intention_type === 'self')
        .slice(0, 2)
        .map((i: any) => ({
          intention: i.intention,
          progress: `${i.progress_percent}%`
        }))
    };

    // NEW: Build recent errors for humility
    const recentErrors = rawErrors.map((e: any) => ({
      errorType: e.error_type || 'unknown',
      lesson: e.lesson_learned || 'Lecție în curs de procesare',
      daysAgo: calculateDaysSince(e.created_at),
      capabilityAffected: e.capability_affected || 'general'
    }));

    // NEW: Determine humility context
    const humilityContext = {
      shouldBeHumble: recentErrors.length > 0 || (selfModel?.confidenceLevel || 1) < 0.7,
      reason: recentErrors.length > 0 
        ? `Am făcut ${recentErrors.length} greșeli recente din care am învățat`
        : 'Nivel normal de umilință',
      suggestedPhrases: recentErrors.length > 0
        ? ['Pot să greșesc', 'Nu sunt 100% sigură', 'Dacă mă înșel, te rog corectează-mă']
        : []
    };

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
    
    // Use actual relationship score from yana_relationships instead of calculated one
    const responseModeDecision = selectResponseMode(
      message,
      journey?.emotional_state || null,
      journey?.knowledge_gaps || [],
      recentMemories,
      concernLevel,
      relationshipContext.score
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
        })),
      
      // NEW: Long-term Intentions
      activeIntentions,
      
      // NEW: Recent Errors
      recentErrors,
      
      // NEW: Humility Context
      humilityContext
    };

    // FAZA 3.5: Detectare expertiză utilizator
    const avgMessageLength = history ? 
      history.filter(m => m.role === 'user').reduce((acc, m) => acc + m.content.length, 0) / 
      Math.max(history.filter(m => m.role === 'user').length, 1) : 50;
    const userExpertise = detectUserExpertise(journey?.total_interactions || 0, avgMessageLength, history);
    
    console.log(`[Consciousness-Engine] User expertise: ${userExpertise}, avg msg length: ${Math.round(avgMessageLength)}`);
    
    const promptInjection = buildPromptInjection(
      contextWithoutPrompt, 
      profileName, 
      relationshipContext, 
      history, 
      recentConversations,
      userExpertise
    );

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
      activeIntentions: { forUser: [], forRelationship: [], forSelf: [] },
      recentErrors: [],
      humilityContext: { shouldBeHumble: false, reason: '', suggestedPhrases: [] },
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
