import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HookSignal {
  type: string;
  score: number;
  excerpt?: string;
}

// Pattern-uri regex pentru detectarea semnalelor
const SIGNAL_PATTERNS = {
  positive_feedback: [
    /mul[țt]umesc/i,
    /mulțumiri/i,
    /super/i,
    /grozav/i,
    /excelent/i,
    /minunat/i,
    /perfect/i,
    /genial/i,
    /exact\s+(ce|asta)/i,
    /asta\s+voiam/i,
    /foarte\s+bine/i,
    /bravo/i,
    /super\s+util/i,
    /m-ai\s+ajutat/i,
    /[îi]mi\s+place/i,
    /frumos/i,
    /clar[ă]?/i,
    /de\s+mare\s+ajutor/i,
  ],
  personal_question: [
    /cum\s+te\s+sim[țt]i/i,
    /ce\s+p[ăa]rere\s+ai\s+tu/i,
    /tu\s+ce\s+zici/i,
    /e[șs]ti\s+ok/i,
    /cum\s+[îi][țt]i\s+merge/i,
    /[îi][țt]i\s+place/i,
    /ce\s+crezi\s+tu/i,
    /tu\s+ai\s+sim[țt]it/i,
    /cum\s+e\s+pentru\s+tine/i,
  ],
  personal_share: [
    /sunt\s+stresat/i,
    /m[ăa]\s+[îi]ngrijoreaz[ăa]/i,
    /am\s+o\s+problem[ăa]/i,
    /sincer\s+s[ăa]\s+fiu/i,
    /[îi]mi\s+e\s+greu/i,
    /sunt\s+[îi]ngrijorat/i,
    /sunt\s+trist/i,
    /m[ăa]\s+streseaz[ăa]/i,
    /am\s+nevoie\s+de\s+ajutor/i,
    /nu\s+[șs]tiu\s+ce\s+s[ăa]\s+fac/i,
    /sunt\s+confuz/i,
    /m[ăa]\s+simt/i,
    /te\s+rog\s+ajut[ăa]-m[ăa]/i,
  ],
  emotional_expression: [
    /😊|😃|😄|🙏|❤️|💪|👍|🎉|✨/,
    /te\s+ador/i,
    /e[șs]ti\s+cea\s+mai\s+bun[ăa]/i,
    /nu\s+[șs]tiu\s+ce\s+a[șs]\s+face\s+f[ăa]r[ăa]\s+tine/i,
    /e[șs]ti\s+incredibil[ăa]/i,
  ],
  name_usage: [
    /yana/i,
    /draga\s+yana/i,
    /yana,?\s+te\s+rog/i,
  ],
};

// Scoruri pentru fiecare tip de semnal
const SIGNAL_SCORES: Record<string, number> = {
  positive_feedback: 2.0,
  return_24h: 1.0,
  personal_question: 1.5,
  personal_share: 1.0,
  long_session: 0.3, // per mesaj după 5
  follow_up_questions: 0.5, // per întrebare după 2
  odd_hours: 0.5,
  emotional_expression: 1.0,
  name_usage: 0.5,
};

function detectSignals(messages: Array<{ content: string; role: string; created_at?: string }>): HookSignal[] {
  const signals: HookSignal[] = [];
  const userMessages = messages.filter(m => m.role === 'user');
  
  // Verifică ora (22:00 - 06:00 sau weekend)
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const isOddHours = hour >= 22 || hour <= 6;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  if (isOddHours || isWeekend) {
    signals.push({
      type: 'odd_hours',
      score: SIGNAL_SCORES.odd_hours,
      excerpt: isWeekend ? 'Weekend usage' : `Night usage (${hour}:00)`,
    });
  }
  
  // Verifică sesiune lungă (> 5 mesaje)
  if (userMessages.length > 5) {
    const extraMessages = userMessages.length - 5;
    signals.push({
      type: 'long_session',
      score: SIGNAL_SCORES.long_session * extraMessages,
      excerpt: `${userMessages.length} messages in session`,
    });
  }
  
  // Verifică întrebări follow-up (> 2)
  const questionCount = userMessages.filter(m => m.content.includes('?')).length;
  if (questionCount > 2) {
    signals.push({
      type: 'follow_up_questions',
      score: SIGNAL_SCORES.follow_up_questions * (questionCount - 2),
      excerpt: `${questionCount} questions asked`,
    });
  }
  
  // Analizează conținutul mesajelor
  for (const msg of userMessages) {
    const content = msg.content;
    
    // Feedback pozitiv
    for (const pattern of SIGNAL_PATTERNS.positive_feedback) {
      if (pattern.test(content)) {
        signals.push({
          type: 'positive_feedback',
          score: SIGNAL_SCORES.positive_feedback,
          excerpt: content.substring(0, 100),
        });
        break; // Un singur match per mesaj
      }
    }
    
    // Întrebare personală despre YANA
    for (const pattern of SIGNAL_PATTERNS.personal_question) {
      if (pattern.test(content)) {
        signals.push({
          type: 'personal_question',
          score: SIGNAL_SCORES.personal_question,
          excerpt: content.substring(0, 100),
        });
        break;
      }
    }
    
    // Împărtășire personală
    for (const pattern of SIGNAL_PATTERNS.personal_share) {
      if (pattern.test(content)) {
        signals.push({
          type: 'personal_share',
          score: SIGNAL_SCORES.personal_share,
          excerpt: content.substring(0, 100),
        });
        break;
      }
    }
    
    // Expresie emoțională
    for (const pattern of SIGNAL_PATTERNS.emotional_expression) {
      if (pattern.test(content)) {
        signals.push({
          type: 'emotional_expression',
          score: SIGNAL_SCORES.emotional_expression,
          excerpt: content.substring(0, 100),
        });
        break;
      }
    }
    
    // Folosirea numelui YANA
    for (const pattern of SIGNAL_PATTERNS.name_usage) {
      if (pattern.test(content)) {
        signals.push({
          type: 'name_usage',
          score: SIGNAL_SCORES.name_usage,
          excerpt: content.substring(0, 100),
        });
        break;
      }
    }
  }
  
  return signals;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, conversationId, messages, sessionId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Detectează semnale din mesaje
    const detectedSignals = detectSignals(messages || []);
    console.log(`[detect-hook-signals] User ${userId}: detected ${detectedSignals.length} signals`);

    // Verifică revenire în 24h
    const { data: relationship } = await supabase
      .from('yana_relationships')
      .select('last_interaction_at, consecutive_return_days, last_return_check_date')
      .eq('user_id', userId)
      .single();

    let return24hSignal = false;
    let newConsecutiveDays = 0;
    const today = new Date().toISOString().split('T')[0];

    if (relationship?.last_interaction_at) {
      const lastInteraction = new Date(relationship.last_interaction_at);
      const hoursSinceLastInteraction = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);
      
      // Revenire în 24h
      if (hoursSinceLastInteraction > 1 && hoursSinceLastInteraction < 24) {
        return24hSignal = true;
        detectedSignals.push({
          type: 'return_24h',
          score: SIGNAL_SCORES.return_24h,
          excerpt: `Returned after ${Math.round(hoursSinceLastInteraction)}h`,
        });
      }
      
      // Calculează zile consecutive
      if (relationship.last_return_check_date !== today) {
        const lastCheckDate = relationship.last_return_check_date 
          ? new Date(relationship.last_return_check_date) 
          : null;
        
        if (lastCheckDate) {
          const daysDiff = Math.floor((Date.now() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            newConsecutiveDays = (relationship.consecutive_return_days || 0) + 1;
          } else if (daysDiff > 1) {
            newConsecutiveDays = 1; // Reset
          }
        } else {
          newConsecutiveDays = 1;
        }
      } else {
        newConsecutiveDays = relationship.consecutive_return_days || 0;
      }
    }

    // Calculează scorul total al sesiunii
    const sessionScore = detectedSignals.reduce((sum, s) => sum + s.score, 0);
    console.log(`[detect-hook-signals] Session score: ${sessionScore}`);

    // Salvează semnalele în hook_signals
    if (detectedSignals.length > 0) {
      const signalRecords = detectedSignals.map(s => ({
        user_id: userId,
        signal_type: s.type,
        signal_score: s.score,
        message_excerpt: s.excerpt,
        session_id: sessionId || conversationId,
      }));

      const { error: insertError } = await supabase
        .from('hook_signals')
        .insert(signalRecords);

      if (insertError) {
        console.error('[detect-hook-signals] Error inserting signals:', insertError);
      }
    }

    // Actualizează yana_relationships
    const { data: existingRelationship } = await supabase
      .from('yana_relationships')
      .select('*')
      .eq('user_id', userId)
      .single();

    const currentHookScore = existingRelationship?.hook_score || 0;
    const newHookScore = Number(currentHookScore) + sessionScore;
    const newRelationshipScore = Math.min(10, newHookScore); // Cap la 10
    const hookJustReached = newHookScore >= 6 && (currentHookScore < 6);

    if (existingRelationship) {
      const updateData: Record<string, any> = {
        hook_score: newHookScore,
        relationship_score: newRelationshipScore,
        last_interaction_at: new Date().toISOString(),
        total_conversations: (existingRelationship.total_conversations || 0) + 1,
        total_messages: (existingRelationship.total_messages || 0) + (messages?.filter((m: any) => m.role === 'user')?.length || 0),
      };

      if (hookJustReached && !existingRelationship.hook_reached_at) {
        updateData.hook_reached_at = new Date().toISOString();
        console.log(`[detect-hook-signals] 🎉 User ${userId} reached HOOK moment!`);
      }

      if (newConsecutiveDays > 0) {
        updateData.consecutive_return_days = newConsecutiveDays;
        updateData.last_return_check_date = today;
      }

      await supabase
        .from('yana_relationships')
        .update(updateData)
        .eq('user_id', userId);
    } else {
      // Creează relație nouă
      await supabase
        .from('yana_relationships')
        .insert({
          user_id: userId,
          hook_score: sessionScore,
          relationship_score: Math.min(10, sessionScore),
          hook_reached_at: sessionScore >= 6 ? new Date().toISOString() : null,
          total_conversations: 1,
          total_messages: messages?.filter((m: any) => m.role === 'user')?.length || 0,
          consecutive_return_days: 1,
          last_return_check_date: today,
        });
    }

    // Actualizează și user_journey dacă există
    await supabase
      .from('user_journey')
      .update({
        hook_score: newHookScore,
        relationship_score: newRelationshipScore,
        hook_reached_at: hookJustReached ? new Date().toISOString() : undefined,
        consecutive_return_days: newConsecutiveDays > 0 ? newConsecutiveDays : undefined,
        last_return_check_date: today,
      })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({
        success: true,
        signals_detected: detectedSignals.length,
        session_score: sessionScore,
        total_hook_score: newHookScore,
        relationship_score: newRelationshipScore,
        hook_reached: hookJustReached,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[detect-hook-signals] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
