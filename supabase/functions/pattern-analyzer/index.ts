import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PatternAnalysisRequest {
  type: 'detect_common_requests' | 'analyze_user_segments' | 'generate_proactive_alerts' | 'run_full_analysis';
}

// Pattern detection pentru cereri comune
const COMMON_REQUEST_PATTERNS = [
  { pattern: /cât.*plătesc|câți bani|cost.*total/i, category: 'cost_inquiry' },
  { pattern: /tva|impozit|taxa/i, category: 'fiscal' },
  { pattern: /salariu.*brut|salariu.*net|calcul.*salariu/i, category: 'payroll' },
  { pattern: /când.*termin|deadline|până când/i, category: 'deadlines' },
  { pattern: /cum.*fac|cum.*pot|ce trebuie/i, category: 'how_to' },
  { pattern: /de ce.*greșit|nu.*corect|eroare/i, category: 'error_resolution' },
  { pattern: /vreau.*raport|generează.*raport|export/i, category: 'reporting' },
  { pattern: /anaf|declarați|formular/i, category: 'anaf_compliance' },
];

// Urgency detection patterns
const URGENCY_PATTERNS = [
  { pattern: /urgent|repede|acum|azi|mâine/i, score: 0.9 },
  { pattern: /important|critic|trebuie neapărat/i, score: 0.8 },
  { pattern: /până.*termin|deadline/i, score: 0.7 },
  { pattern: /control.*anaf|inspecție/i, score: 0.95 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[PATTERN-ANALYZER][${requestId}] Starting analysis`);

  try {
    const body: PatternAnalysisRequest = await req.json();
    const { type } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result: Record<string, unknown> = {};

    switch (type) {
      case 'detect_common_requests': {
        // Analizează ultimele conversații pentru a detecta cereri comune
        const { data: recentLearnings } = await supabase
          .from('yana_learning_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        const requestCounts: Record<string, { count: number; samples: string[]; users: Set<string> }> = {};

        for (const learning of recentLearnings || []) {
          if (!learning.new_questions || learning.new_questions.length === 0) continue;

          for (const question of learning.new_questions) {
            // Detectează categoria
            let category = 'general';
            for (const patternDef of COMMON_REQUEST_PATTERNS) {
              if (patternDef.pattern.test(question)) {
                category = patternDef.category;
                break;
              }
            }

            // Calculează urgency
            let urgency = 0.5;
            for (const urgencyDef of URGENCY_PATTERNS) {
              if (urgencyDef.pattern.test(question)) {
                urgency = Math.max(urgency, urgencyDef.score);
              }
            }

            // Creează pattern normalizat (primele 50 caractere, lowercase, fără punctuație)
            const normalizedPattern = question.substring(0, 50).toLowerCase().replace(/[^\w\săîâșț]/g, '').trim();

            if (!requestCounts[normalizedPattern]) {
              requestCounts[normalizedPattern] = { count: 0, samples: [], users: new Set() };
            }

            requestCounts[normalizedPattern].count++;
            if (requestCounts[normalizedPattern].samples.length < 5) {
              requestCounts[normalizedPattern].samples.push(question);
            }
            requestCounts[normalizedPattern].users.add(learning.user_id);

            // Agregăm în baza de date
            await supabase.rpc('aggregate_common_request', {
              p_pattern: normalizedPattern,
              p_category: category,
              p_user_id: learning.user_id,
              p_sample_question: question.substring(0, 200),
            });
          }
        }

        result = {
          analyzed: recentLearnings?.length || 0,
          patternsFound: Object.keys(requestCounts).length,
          topPatterns: Object.entries(requestCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([pattern, data]) => ({
              pattern,
              count: data.count,
              uniqueUsers: data.users.size,
            })),
        };
        break;
      }

      case 'analyze_user_segments': {
        // Analizează segmentele de utilizatori și evoluția lor
        const { data: userSnapshots } = await supabase
          .from('yana_user_context_evolution')
          .select('*')
          .order('captured_at', { ascending: false });

        // Grupăm pe user_type
        const segments: Record<string, { count: number; avgChurnRisk: number; avgEngagement: number }> = {};

        for (const snapshot of userSnapshots || []) {
          const type = snapshot.user_type || 'unknown';
          if (!segments[type]) {
            segments[type] = { count: 0, avgChurnRisk: 0, avgEngagement: 0 };
          }
          segments[type].count++;
          segments[type].avgChurnRisk += snapshot.churn_risk_score || 0;
          segments[type].avgEngagement += snapshot.engagement_velocity || 0;
        }

        // Calculăm mediile
        for (const type of Object.keys(segments)) {
          if (segments[type].count > 0) {
            segments[type].avgChurnRisk /= segments[type].count;
            segments[type].avgEngagement /= segments[type].count;
          }
        }

        // Identificăm utilizatori cu risc mare de churn
        const { data: highChurnRisk } = await supabase
          .from('yana_user_context_evolution')
          .select('user_id, churn_risk_score, user_type')
          .gte('churn_risk_score', 0.7)
          .order('churn_risk_score', { ascending: false })
          .limit(20);

        result = {
          segments,
          highChurnRiskUsers: highChurnRisk?.length || 0,
          totalSnapshots: userSnapshots?.length || 0,
        };
        break;
      }

      case 'generate_proactive_alerts': {
        // Generează alerte proactive pentru utilizatori
        const alerts: Array<Record<string, unknown>> = [];

        // 1. Utilizatori inactivi cu churn risk mare
        const { data: churningUsers } = await supabase
          .from('yana_user_context_evolution')
          .select('user_id, churn_risk_score, captured_at')
          .gte('churn_risk_score', 0.6)
          .order('churn_risk_score', { ascending: false })
          .limit(10);

        for (const user of churningUsers || []) {
          // Verificăm dacă nu am trimis deja alertă
          const daysSinceCapture = Math.floor(
            (Date.now() - new Date(user.captured_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceCapture >= 7) {
            alerts.push({
              type: 'churn_prevention',
              user_id: user.user_id,
              priority: Math.round(user.churn_risk_score * 10),
              message: 'Utilizator cu risc mare de abandon - recomandăm email de re-engagement',
              data: { churn_risk: user.churn_risk_score, days_inactive: daysSinceCapture },
            });
          }
        }

        // 2. Knowledge gaps critice netratate
        const { data: criticalGaps } = await supabase
          .from('yana_knowledge_gaps')
          .select('*')
          .eq('severity', 'critical')
          .eq('resolved', false)
          .gte('frequency', 10);

        for (const gap of criticalGaps || []) {
          alerts.push({
            type: 'knowledge_gap_critical',
            priority: 9,
            message: `Knowledge gap critic: "${gap.question_pattern}" (${gap.frequency} întrebări)`,
            data: { gap_id: gap.id, category: gap.category, frequency: gap.frequency },
          });
        }

        // 3. Trending topics care necesită atenție
        const { data: hotTopics } = await supabase
          .from('yana_trending_topics')
          .select('*')
          .eq('is_trending', true)
          .gte('mention_count', 20);

        for (const topic of hotTopics || []) {
          alerts.push({
            type: 'trending_topic',
            priority: 7,
            message: `Topic în trend: "${topic.topic}" (${topic.mention_count} mențiuni, ${topic.unique_users} utilizatori)`,
            data: { topic_id: topic.id, mentions: topic.mention_count },
          });
        }

        // Salvăm alertele în proactive_patterns pentru monitorizare
        for (const alert of alerts) {
          const alertData = alert.data as Record<string, unknown> || {};
          const { error } = await supabase
            .from('yana_proactive_patterns')
            .upsert({
              pattern_name: `auto_${alert.type}_${Date.now()}`,
              trigger_conditions: { alert_type: alert.type, ...alertData },
              user_segment: alert.user_id ? `user:${alert.user_id}` : 'all',
              response_template: alert.message as string,
              priority: alert.priority as number,
              is_active: true,
            }, {
              onConflict: 'pattern_name',
            });

          if (error) {
            console.warn(`[PATTERN-ANALYZER][${requestId}] Failed to save alert:`, error);
          }
        }

        result = { generatedAlerts: alerts.length, alerts };
        break;
      }

      case 'run_full_analysis': {
        // Rulează toată analiza
        console.log(`[PATTERN-ANALYZER][${requestId}] Running full analysis...`);

        // 1. Detect common requests
        const detectResult = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/pattern-analyzer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ type: 'detect_common_requests' }),
        }).then(r => r.json()).catch(() => ({}));

        // 2. Analyze user segments
        const segmentResult = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/pattern-analyzer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ type: 'analyze_user_segments' }),
        }).then(r => r.json()).catch(() => ({}));

        // 3. Generate proactive alerts
        const alertsResult = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/pattern-analyzer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ type: 'generate_proactive_alerts' }),
        }).then(r => r.json()).catch(() => ({}));

        result = {
          commonRequests: detectResult,
          userSegments: segmentResult,
          proactiveAlerts: alertsResult,
          analysisTimestamp: new Date().toISOString(),
        };
        break;
      }

      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }

    console.log(`[PATTERN-ANALYZER][${requestId}] ✅ Analysis complete: ${type}`);

    return new Response(
      JSON.stringify({ success: true, type, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[PATTERN-ANALYZER][${requestId}] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
