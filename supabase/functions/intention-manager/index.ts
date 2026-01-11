import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// TYPES
// =============================================================================

interface IntentionRequest {
  action: 'generate' | 'evaluate' | 'expire' | 'getActive' | 'updateProgress';
  userId?: string;
  companyId?: string;
  message?: string;
  intentionId?: string;
  progressPercent?: number;
  note?: string;
}

interface Intention {
  id: string;
  intention_type: 'user' | 'relationship' | 'self';
  user_id: string | null;
  company_id: string | null;
  intention: string;
  intention_hash: string;
  priority: number;
  reason: string | null;
  triggered_by: string | null;
  status: string;
  progress_percent: number;
  progress_notes: any[];
  created_at: string;
  expires_at: string;
}

// =============================================================================
// INTENTION TRIGGERS - Ce mesaje declanșează intenții
// =============================================================================

const INTENTION_TRIGGERS = [
  {
    patterns: [/criză|criza|faliment|insolvență|insolventat|probleme grave/i],
    intention: 'Vreau să ajut această firmă să evite criza',
    type: 'user' as const,
    priority: 9,
    reason: 'Detectat semnal de criză financiară'
  },
  {
    patterns: [/pierdere|pierdem bani|nu facem profit|suntem pe minus/i],
    intention: 'Vreau să ajut la ieșirea din pierdere și atingerea profitabilității',
    type: 'user' as const,
    priority: 8,
    reason: 'Firma operează în pierdere'
  },
  {
    patterns: [/cash flow negativ|lichiditate|nu avem bani|plăți întârziate/i],
    intention: 'Vreau să ajut la îmbunătățirea lichidității și cash flow-ului',
    type: 'user' as const,
    priority: 8,
    reason: 'Probleme de lichiditate detectate'
  },
  {
    patterns: [/creștere|extindere|dezvoltare|scalare|măresc afacerea/i],
    intention: 'Vreau să ghidez creșterea sustenabilă a acestei afaceri',
    type: 'user' as const,
    priority: 7,
    reason: 'Utilizator în faza de creștere'
  },
  {
    patterns: [/nu știu ce să fac|confuz|ajutor|copleșit|stresat/i],
    intention: 'Vreau să construiesc încredere și să ofer claritate',
    type: 'relationship' as const,
    priority: 8,
    reason: 'Utilizator în stare de confuzie/stres'
  },
  {
    patterns: [/HoReCa|restaurant|hotel|pensiune|cafe/i],
    intention: 'Vreau să înțeleg mai bine specificul industriei HoReCa',
    type: 'self' as const,
    priority: 6,
    reason: 'Industrie cu particularități fiscale specifice'
  },
  {
    patterns: [/IT|software|programare|startup tech|SaaS/i],
    intention: 'Vreau să aprofundez particularitățile financiare ale industriei IT',
    type: 'self' as const,
    priority: 6,
    reason: 'Industrie cu model de business specific'
  },
  {
    patterns: [/construcții|constructor|antrepriză|dezvoltator imobiliar/i],
    intention: 'Vreau să înțeleg mai bine industria construcțiilor',
    type: 'self' as const,
    priority: 6,
    reason: 'Industrie cu cicluri financiare complexe'
  },
  {
    patterns: [/e prima dată|nu am mai folosit|sunt nou/i],
    intention: 'Vreau să creez o primă impresie pozitivă și să construiesc baza relației',
    type: 'relationship' as const,
    priority: 7,
    reason: 'Utilizator nou - moment crucial pentru încredere'
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createIntentionHash(intention: string, userId: string | null, type: string): string {
  const normalized = intention.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
  const userPart = userId ? userId.substring(0, 8) : 'global';
  return `${type}_${userPart}_${normalized.substring(0, 50)}`;
}

function detectIntentionsFromMessage(message: string): Array<{
  intention: string;
  type: 'user' | 'relationship' | 'self';
  priority: number;
  reason: string;
  triggeredBy: string;
}> {
  const detectedIntentions: Array<{
    intention: string;
    type: 'user' | 'relationship' | 'self';
    priority: number;
    reason: string;
    triggeredBy: string;
  }> = [];

  for (const trigger of INTENTION_TRIGGERS) {
    for (const pattern of trigger.patterns) {
      const match = message.match(pattern);
      if (match) {
        detectedIntentions.push({
          intention: trigger.intention,
          type: trigger.type,
          priority: trigger.priority,
          reason: trigger.reason,
          triggeredBy: match[0]
        });
        break; // Doar primul match per trigger
      }
    }
  }

  return detectedIntentions;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const request: IntentionRequest = await req.json();
    const { action, userId, companyId, message, intentionId, progressPercent, note } = request;

    console.log(`[intention-manager] Action: ${action}, userId: ${userId?.substring(0, 8) || 'N/A'}`);

    // =========================================================================
    // ACTION: GENERATE - Detectează și creează intenții din mesaj
    // =========================================================================
    if (action === 'generate' && message && userId) {
      const detectedIntentions = detectIntentionsFromMessage(message);
      
      if (detectedIntentions.length === 0) {
        return new Response(
          JSON.stringify({ success: true, intentionsCreated: 0, message: 'No triggers detected' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const createdIntentions: Intention[] = [];

      for (const detected of detectedIntentions) {
        const intentionHash = createIntentionHash(detected.intention, userId, detected.type);

        // Verificăm dacă există deja (deduplicare)
        const { data: existing } = await supabase
          .from('yana_intentions')
          .select('id')
          .eq('intention_hash', intentionHash)
          .eq('status', 'active')
          .maybeSingle();

        if (existing) {
          console.log(`[intention-manager] Duplicate prevented: ${detected.intention.substring(0, 30)}...`);
          continue;
        }

        // Creăm intenția
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90); // 90 zile

        const { data: newIntention, error } = await supabase
          .from('yana_intentions')
          .insert({
            intention_type: detected.type,
            user_id: detected.type === 'self' ? null : userId,
            company_id: companyId || null,
            intention: detected.intention,
            intention_hash: intentionHash,
            priority: detected.priority,
            reason: detected.reason,
            triggered_by: detected.triggeredBy,
            status: 'active',
            progress_percent: 0,
            progress_notes: [],
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error(`[intention-manager] Error creating intention:`, error);
          continue;
        }

        createdIntentions.push(newIntention);
        console.log(`[intention-manager] Created intention: ${detected.intention.substring(0, 40)}... (${detected.type})`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          intentionsCreated: createdIntentions.length,
          intentions: createdIntentions.map(i => ({
            id: i.id,
            type: i.intention_type,
            intention: i.intention,
            priority: i.priority
          }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTION: GET ACTIVE - Returnează intențiile active pentru un user
    // =========================================================================
    if (action === 'getActive' && userId) {
      // Intenții pentru user (max 3)
      const { data: userIntentions } = await supabase
        .from('yana_intentions')
        .select('id, intention, priority, progress_percent, created_at')
        .eq('user_id', userId)
        .eq('intention_type', 'user')
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(3);

      // Intenții pentru relație (max 2)
      const { data: relationshipIntentions } = await supabase
        .from('yana_intentions')
        .select('id, intention, priority, progress_percent, created_at')
        .eq('user_id', userId)
        .eq('intention_type', 'relationship')
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(2);

      // Intenții self globale (max 2)
      const { data: selfIntentions } = await supabase
        .from('yana_intentions')
        .select('id, intention, priority, progress_percent, created_at')
        .eq('intention_type', 'self')
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(2);

      return new Response(
        JSON.stringify({
          success: true,
          intentions: {
            forUser: userIntentions || [],
            forRelationship: relationshipIntentions || [],
            forSelf: selfIntentions || []
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTION: UPDATE PROGRESS - Actualizează progresul unei intenții
    // =========================================================================
    if (action === 'updateProgress' && intentionId) {
      const updates: any = {
        updated_at: new Date().toISOString(),
        last_evaluated_at: new Date().toISOString()
      };

      if (progressPercent !== undefined) {
        updates.progress_percent = Math.min(100, Math.max(0, progressPercent));
      }

      // Adaugă notă de progres dacă există
      if (note) {
        const { data: currentIntention } = await supabase
          .from('yana_intentions')
          .select('progress_notes')
          .eq('id', intentionId)
          .single();

        const currentNotes = currentIntention?.progress_notes || [];
        updates.progress_notes = [
          ...currentNotes,
          { note, timestamp: new Date().toISOString() }
        ].slice(-10); // Păstrăm max 10 note
      }

      // Marchează ca achieved dacă progresul e 100%
      if (progressPercent === 100) {
        updates.status = 'achieved';
        updates.achieved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('yana_intentions')
        .update(updates)
        .eq('id', intentionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`[intention-manager] Updated intention ${intentionId}: progress=${progressPercent}%`);

      return new Response(
        JSON.stringify({ success: true, intention: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTION: EXPIRE - Expiră intențiile vechi fără activitate
    // =========================================================================
    if (action === 'expire') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Expiră intențiile fără activitate 30+ zile
      const { data: expiredByInactivity, error: err1 } = await supabase
        .from('yana_intentions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('status', 'active')
        .lt('last_evaluated_at', thirtyDaysAgo.toISOString())
        .select('id');

      // Expiră intențiile care au depășit expires_at
      const { data: expiredByDate, error: err2 } = await supabase
        .from('yana_intentions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())
        .select('id');

      const totalExpired = (expiredByInactivity?.length || 0) + (expiredByDate?.length || 0);
      console.log(`[intention-manager] Expired ${totalExpired} intentions (inactivity: ${expiredByInactivity?.length || 0}, date: ${expiredByDate?.length || 0})`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          expiredCount: totalExpired,
          byInactivity: expiredByInactivity?.length || 0,
          byDate: expiredByDate?.length || 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // ACTION: EVALUATE - Evaluează progresul bazat pe conversație
    // =========================================================================
    if (action === 'evaluate' && userId && message) {
      // Obține intențiile active pentru acest user
      const { data: activeIntentions } = await supabase
        .from('yana_intentions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (!activeIntentions || activeIntentions.length === 0) {
        return new Response(
          JSON.stringify({ success: true, evaluated: 0, message: 'No active intentions to evaluate' }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Evaluare simplă bazată pe keywords pozitivi în mesaj
      const positiveKeywords = [
        /profit|câștig|succes|reușit|merge bine|funcționează|am rezolvat/i,
        /mulțumesc|ajutat|util|valoros|excelent|perfect/i,
        /cresc|am crescut|s-a îmbunătățit|progres|mai bine/i
      ];

      const hasPositiveFeedback = positiveKeywords.some(p => p.test(message));
      let evaluatedCount = 0;

      if (hasPositiveFeedback) {
        for (const intention of activeIntentions) {
          const newProgress = Math.min(100, intention.progress_percent + 10);
          
          await supabase
            .from('yana_intentions')
            .update({
              progress_percent: newProgress,
              last_evaluated_at: new Date().toISOString(),
              progress_notes: [
                ...(intention.progress_notes || []),
                { note: 'Feedback pozitiv detectat în conversație', timestamp: new Date().toISOString() }
              ].slice(-10),
              status: newProgress >= 100 ? 'achieved' : 'active',
              achieved_at: newProgress >= 100 ? new Date().toISOString() : null
            })
            .eq('id', intention.id);

          evaluatedCount++;
          console.log(`[intention-manager] Intention ${intention.id} progress: ${intention.progress_percent}% -> ${newProgress}%`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          evaluated: evaluatedCount,
          positiveDetected: hasPositiveFeedback
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: action not recognized
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action or missing parameters' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[intention-manager] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
