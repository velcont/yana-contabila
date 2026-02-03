import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeInput {
  category: string;
  key: string;
  value: any;
  source_type: string;
  user_id?: string;
  conversation_id?: string;
}

interface ValidationResult {
  accepted: boolean;
  flagged: boolean;
  escalated: boolean;
  reason?: string;
  contradictions?: any[];
  credibility_score: number;
  ground_truth_conflict?: any;
  clarification_needed?: string;
}

interface GroundTruth {
  id: string;
  category: string;
  fact_key: string;
  fact_value: any;
  legal_source: string;
  effective_from: string;
  effective_until: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { knowledge, action = 'validate' } = await req.json() as { 
      knowledge: KnowledgeInput | KnowledgeInput[];
      action: 'validate' | 'learn' | 'batch_validate';
    };

    const knowledgeItems = Array.isArray(knowledge) ? knowledge : [knowledge];
    const results: ValidationResult[] = [];

    // Get source credibility scores
    const { data: credibilityConfig } = await supabase
      .from('yana_source_credibility')
      .select('*');
    
    const credibilityMap = new Map(
      credibilityConfig?.map(c => [c.source_type, c]) || []
    );

    // Get validation rules
    const { data: validationRules } = await supabase
      .from('yana_validation_rules')
      .select('*')
      .eq('is_active', true);

    // Get IMMUTABLE ground truth (current date)
    const today = new Date().toISOString().split('T')[0];
    const { data: groundTruth } = await supabase
      .from('yana_ground_truth')
      .select('*')
      .lte('effective_from', today)
      .or(`effective_until.is.null,effective_until.gte.${today}`);

    const groundTruthMap = new Map<string, GroundTruth>();
    groundTruth?.forEach(gt => {
      groundTruthMap.set(`${gt.category}:${gt.fact_key}`, gt);
    });

    for (const item of knowledgeItems) {
      const result = await validateSingleKnowledge(
        supabase,
        item,
        credibilityMap,
        validationRules || [],
        groundTruthMap
      );
      results.push(result);

      // Log validation
      await supabase.from('yana_knowledge_validation_log').insert({
        user_id: item.user_id,
        conversation_id: item.conversation_id,
        input_knowledge: item,
        source_type: item.source_type,
        validation_result: result.escalated ? 'escalated' : (result.flagged ? 'flagged' : (result.accepted ? 'accepted' : 'rejected')),
        validation_details: result,
        contradictions_found: result.contradictions,
        credibility_assessment: { score: result.credibility_score },
        processing_time_ms: Date.now() - startTime
      });

      // ESCALATION: Critical error detected
      if (result.escalated) {
        await supabase.from('yana_learning_escalations').insert({
          user_id: item.user_id,
          conversation_id: item.conversation_id,
          escalation_type: result.ground_truth_conflict ? 'wrong_tax_advice' : 'critical_misinformation',
          severity: 'critical',
          proposed_knowledge: item,
          conflicting_ground_truth: result.ground_truth_conflict?.id,
          ground_truth_value: result.ground_truth_conflict?.fact_value,
          clarification_requested: result.clarification_needed,
          learning_blocked: true,
          resolution_status: 'pending'
        });
      }
      // If flagged (non-critical), create admin review item
      else if (result.flagged) {
        await supabase.from('yana_flagged_learnings').insert({
          user_id: item.user_id,
          conversation_id: item.conversation_id,
          proposed_knowledge: item,
          source_type: item.source_type,
          credibility_score: result.credibility_score,
          flag_reason: result.reason || 'unknown',
          new_value: item.value,
          existing_value: result.contradictions?.[0]?.existing_value,
          conflicting_with: result.contradictions?.[0]?.verified_knowledge_id,
          admin_decision: 'pending'
        });
      }

      // If accepted and action is 'learn', store in verified knowledge (user_overridable tier)
      if (result.accepted && action === 'learn' && result.credibility_score >= 0.9) {
        await supabase.from('yana_verified_knowledge').upsert({
          knowledge_category: item.category,
          knowledge_key: item.key,
          verified_value: item.value,
          source_reference: item.source_type,
          verified_by: 'auto_validated',
          confidence_score: result.credibility_score,
          credibility_tier: 'user_overridable', // User can override this
          is_ground_truth: false
        }, {
          onConflict: 'knowledge_category,knowledge_key'
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        total: results.length,
        accepted: results.filter(r => r.accepted).length,
        flagged: results.filter(r => r.flagged).length,
        escalated: results.filter(r => r.escalated).length,
        rejected: results.filter(r => !r.accepted && !r.flagged && !r.escalated).length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Knowledge validation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function validateSingleKnowledge(
  supabase: any,
  knowledge: KnowledgeInput,
  credibilityMap: Map<string, any>,
  validationRules: any[],
  groundTruthMap: Map<string, GroundTruth>
): Promise<ValidationResult> {
  const contradictions: any[] = [];
  
  // 1. Get credibility score
  const sourceConfig = credibilityMap.get(knowledge.source_type);
  const credibilityScore = sourceConfig?.credibility_score ?? 0.3;
  const requiresVerification = sourceConfig?.requires_verification ?? true;

  // 2. 🔴 CRITICAL: Check against IMMUTABLE ground truth FIRST
  const groundTruthKey = `${knowledge.category}:${knowledge.key}`;
  const groundTruth = groundTruthMap.get(groundTruthKey);
  
  if (groundTruth) {
    const gtValue = groundTruth.fact_value;
    const newValue = typeof knowledge.value === 'object' ? knowledge.value.value : knowledge.value;
    
    // Compare with ground truth
    if (!valuesMatch(gtValue, newValue)) {
      // 🚨 ESCALATION: User is trying to override IMMUTABLE tax/legal facts!
      return {
        accepted: false,
        flagged: false,
        escalated: true,
        reason: 'ground_truth_violation',
        credibility_score: credibilityScore,
        ground_truth_conflict: groundTruth,
        clarification_needed: `⚠️ ATENȚIE: Valoarea "${knowledge.key}" = ${newValue} contrazice legislația în vigoare (${groundTruth.legal_source}). Valoarea oficială este ${gtValue}. Ești sigur că informația ta este corectă? Dacă da, te rog să oferi sursa legală.`
      };
    }
  }

  // 3. Check for contradictions with verified knowledge (non-immutable)
  const { data: existingKnowledge } = await supabase
    .from('yana_verified_knowledge')
    .select('*')
    .eq('knowledge_category', knowledge.category)
    .eq('knowledge_key', knowledge.key)
    .single();

  if (existingKnowledge) {
    const existingValue = existingKnowledge.verified_value;
    const newValue = knowledge.value;
    
    if (!valuesMatch(existingValue, newValue)) {
      // Check tier - can this be overridden?
      const tier = existingKnowledge.credibility_tier || 'user_overridable';
      
      if (tier === 'immutable') {
        // Cannot override immutable knowledge
        return {
          accepted: false,
          flagged: false,
          escalated: true,
          reason: 'immutable_knowledge_violation',
          credibility_score: credibilityScore,
          contradictions: [{
            verified_knowledge_id: existingKnowledge.id,
            existing_value: existingValue,
            new_value: newValue,
            tier: 'immutable'
          }],
          clarification_needed: `Această informație este marcată ca IMUABILĂ și nu poate fi modificată.`
        };
      }
      
      if (tier === 'admin_overridable' && credibilityScore < 0.9) {
        // Only high-credibility sources can trigger admin review
        contradictions.push({
          verified_knowledge_id: existingKnowledge.id,
          existing_value: existingValue,
          new_value: newValue,
          existing_confidence: existingKnowledge.confidence_score,
          tier: 'admin_overridable'
        });

        return {
          accepted: false,
          flagged: true,
          escalated: false,
          reason: 'admin_override_required',
          contradictions,
          credibility_score: credibilityScore
        };
      }
      
      // User overridable - flag for review if lower credibility
      if (existingKnowledge.confidence_score > credibilityScore) {
        contradictions.push({
          verified_knowledge_id: existingKnowledge.id,
          existing_value: existingValue,
          new_value: newValue,
          existing_confidence: existingKnowledge.confidence_score,
          tier: 'user_overridable'
        });

        return {
          accepted: false,
          flagged: true,
          escalated: false,
          reason: 'contradiction',
          contradictions,
          credibility_score: credibilityScore
        };
      }
    }
  }

  // 4. Apply validation rules
  for (const rule of validationRules) {
    if (rule.rule_category === knowledge.category) {
      const ruleResult = applyValidationRule(rule, knowledge.value);
      if (!ruleResult.valid) {
        return {
          accepted: false,
          flagged: true,
          escalated: false,
          reason: `rule_violation: ${rule.rule_name}`,
          contradictions: [{ rule: rule.rule_name, message: rule.error_message }],
          credibility_score: credibilityScore
        };
      }
    }
  }

  // 5. Cross-validate fiscal/accounting knowledge against ground truth patterns
  if (['fiscal', 'accounting'].includes(knowledge.category)) {
    const fiscalValidation = validateAgainstGroundTruthPatterns(knowledge, groundTruthMap);
    if (!fiscalValidation.valid) {
      return {
        accepted: false,
        flagged: false,
        escalated: true,
        reason: 'fiscal_ground_truth_mismatch',
        ground_truth_conflict: fiscalValidation.conflictingGT,
        credibility_score: credibilityScore,
        clarification_needed: fiscalValidation.message
      };
    }
  }

  // 6. If low credibility and requires verification, flag for review
  if (credibilityScore < 0.5 && requiresVerification) {
    return {
      accepted: false,
      flagged: true,
      escalated: false,
      reason: 'low_credibility',
      credibility_score: credibilityScore
    };
  }

  // All checks passed
  return {
    accepted: true,
    flagged: false,
    escalated: false,
    credibility_score: credibilityScore
  };
}

function valuesMatch(existing: any, newVal: any): boolean {
  // Handle numeric comparisons with tolerance
  if (typeof existing === 'number' && typeof newVal === 'number') {
    const tolerance = Math.max(Math.abs(existing) * 0.01, 0.01);
    return Math.abs(existing - newVal) <= tolerance;
  }
  
  // Handle string-number comparison
  const existingNum = parseFloat(String(existing));
  const newNum = parseFloat(String(newVal));
  if (!isNaN(existingNum) && !isNaN(newNum)) {
    const tolerance = Math.max(Math.abs(existingNum) * 0.01, 0.01);
    return Math.abs(existingNum - newNum) <= tolerance;
  }
  
  // Handle string comparisons (case-insensitive)
  if (typeof existing === 'string' && typeof newVal === 'string') {
    return existing.toLowerCase().trim() === newVal.toLowerCase().trim();
  }
  
  // Handle objects (deep comparison)
  if (typeof existing === 'object' && typeof newVal === 'object') {
    return JSON.stringify(existing) === JSON.stringify(newVal);
  }
  
  return String(existing) === String(newVal);
}

function applyValidationRule(rule: any, value: any): { valid: boolean; message?: string } {
  const def = rule.rule_definition;
  
  switch (rule.rule_type) {
    case 'range_check':
      if (typeof value === 'object' && def.field in value) {
        const fieldValue = value[def.field];
        if (def.valid_values && !def.valid_values.includes(fieldValue)) {
          return { valid: false, message: rule.error_message };
        }
        if (fieldValue < def.min || fieldValue > def.max) {
          return { valid: false, message: rule.error_message };
        }
      }
      break;
      
    case 'formula':
      // Formula validation would require eval or specific implementations
      break;
  }
  
  return { valid: true };
}

function validateAgainstGroundTruthPatterns(
  knowledge: KnowledgeInput,
  groundTruthMap: Map<string, GroundTruth>
): { valid: boolean; message?: string; conflictingGT?: GroundTruth } {
  
  // Check for common fiscal misinformation patterns
  const key = knowledge.key.toLowerCase();
  const value = typeof knowledge.value === 'object' ? knowledge.value.value : knowledge.value;
  
  // TVA rate validation
  if (key.includes('tva') || key.includes('vat')) {
    const standardTVA = groundTruthMap.get('fiscal:cota_tva_standard');
    if (standardTVA && key.includes('standard')) {
      if (parseFloat(value) !== parseFloat(String(standardTVA.fact_value))) {
        return {
          valid: false,
          message: `Cota TVA standard în România este ${standardTVA.fact_value}%, nu ${value}% (${standardTVA.legal_source})`,
          conflictingGT: standardTVA
        };
      }
    }
  }
  
  // Plafon casa validation
  if (key.includes('plafon') && key.includes('casa')) {
    const plafonCasa = groundTruthMap.get('fiscal:plafon_casa_lei');
    if (plafonCasa && parseFloat(value) !== parseFloat(String(plafonCasa.fact_value))) {
      return {
        valid: false,
        message: `Plafonul legal pentru casa este ${plafonCasa.fact_value} lei, nu ${value} lei (${plafonCasa.legal_source})`,
        conflictingGT: plafonCasa
      };
    }
  }
  
  // Impozit dividende validation
  if (key.includes('dividende') && key.includes('impozit')) {
    const impozitDiv = groundTruthMap.get('fiscal:cota_impozit_dividende');
    if (impozitDiv && parseFloat(value) !== parseFloat(String(impozitDiv.fact_value))) {
      return {
        valid: false,
        message: `Impozitul pe dividende este ${impozitDiv.fact_value}%, nu ${value}% (${impozitDiv.legal_source})`,
        conflictingGT: impozitDiv
      };
    }
  }
  
  return { valid: true };
}
