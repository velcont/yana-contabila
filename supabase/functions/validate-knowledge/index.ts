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
  reason?: string;
  contradictions?: any[];
  credibility_score: number;
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

    for (const item of knowledgeItems) {
      const result = await validateSingleKnowledge(
        supabase,
        item,
        credibilityMap,
        validationRules || []
      );
      results.push(result);

      // Log validation
      await supabase.from('yana_knowledge_validation_log').insert({
        user_id: item.user_id,
        conversation_id: item.conversation_id,
        input_knowledge: item,
        source_type: item.source_type,
        validation_result: result.flagged ? 'flagged' : (result.accepted ? 'accepted' : 'rejected'),
        validation_details: result,
        contradictions_found: result.contradictions,
        credibility_assessment: { score: result.credibility_score },
        processing_time_ms: Date.now() - startTime
      });

      // If flagged, create admin review item
      if (result.flagged) {
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

      // If accepted and action is 'learn', store in verified knowledge
      if (result.accepted && action === 'learn' && result.credibility_score >= 0.9) {
        await supabase.from('yana_verified_knowledge').upsert({
          knowledge_category: item.category,
          knowledge_key: item.key,
          verified_value: item.value,
          source_reference: item.source_type,
          verified_by: 'auto_validated',
          confidence_score: result.credibility_score
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
        rejected: results.filter(r => !r.accepted && !r.flagged).length
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
  validationRules: any[]
): Promise<ValidationResult> {
  const contradictions: any[] = [];
  
  // 1. Get credibility score
  const sourceConfig = credibilityMap.get(knowledge.source_type);
  const credibilityScore = sourceConfig?.credibility_score ?? 0.3;
  const requiresVerification = sourceConfig?.requires_verification ?? true;

  // 2. Check for contradictions with verified knowledge
  const { data: existingKnowledge } = await supabase
    .from('yana_verified_knowledge')
    .select('*')
    .eq('knowledge_category', knowledge.category)
    .eq('knowledge_key', knowledge.key)
    .single();

  if (existingKnowledge) {
    // Compare values
    const existingValue = existingKnowledge.verified_value;
    const newValue = knowledge.value;
    
    if (!valuesMatch(existingValue, newValue)) {
      // CONTRADICTION DETECTED!
      contradictions.push({
        verified_knowledge_id: existingKnowledge.id,
        existing_value: existingValue,
        new_value: newValue,
        existing_confidence: existingKnowledge.confidence_score,
        source_reference: existingKnowledge.source_reference
      });

      // If existing has higher confidence, flag new knowledge
      if (existingKnowledge.confidence_score > credibilityScore) {
        return {
          accepted: false,
          flagged: true,
          reason: 'contradiction',
          contradictions,
          credibility_score: credibilityScore
        };
      }
    }
  }

  // 3. Apply validation rules
  for (const rule of validationRules) {
    if (rule.rule_category === knowledge.category) {
      const ruleResult = applyValidationRule(rule, knowledge.value);
      if (!ruleResult.valid) {
        return {
          accepted: false,
          flagged: true,
          reason: `rule_violation: ${rule.rule_name}`,
          contradictions: [{ rule: rule.rule_name, message: rule.error_message }],
          credibility_score: credibilityScore
        };
      }
    }
  }

  // 4. Cross-validate fiscal/accounting knowledge
  if (['fiscal', 'accounting'].includes(knowledge.category)) {
    const fiscalValidation = await validateFiscalKnowledge(supabase, knowledge);
    if (!fiscalValidation.valid) {
      return {
        accepted: false,
        flagged: true,
        reason: 'fiscal_validation_failed',
        contradictions: [fiscalValidation.details],
        credibility_score: credibilityScore
      };
    }
  }

  // 5. If low credibility and requires verification, flag for review
  if (credibilityScore < 0.5 && requiresVerification) {
    return {
      accepted: false,
      flagged: true,
      reason: 'low_credibility',
      credibility_score: credibilityScore
    };
  }

  // All checks passed
  return {
    accepted: true,
    flagged: false,
    credibility_score: credibilityScore
  };
}

function valuesMatch(existing: any, newVal: any): boolean {
  // Handle numeric comparisons with tolerance
  if (typeof existing === 'number' && typeof newVal === 'number') {
    const tolerance = Math.max(Math.abs(existing) * 0.01, 0.01); // 1% tolerance
    return Math.abs(existing - newVal) <= tolerance;
  }
  
  // Handle string comparisons (case-insensitive)
  if (typeof existing === 'string' && typeof newVal === 'string') {
    return existing.toLowerCase().trim() === newVal.toLowerCase().trim();
  }
  
  // Handle objects (deep comparison)
  if (typeof existing === 'object' && typeof newVal === 'object') {
    return JSON.stringify(existing) === JSON.stringify(newVal);
  }
  
  return existing === newVal;
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

async function validateFiscalKnowledge(
  supabase: any,
  knowledge: KnowledgeInput
): Promise<{ valid: boolean; details?: any }> {
  // Cross-reference with known fiscal rules
  const knownFiscalFacts: Record<string, any> = {
    'cota_tva_standard': 19,
    'cota_tva_redusa_1': 9,
    'cota_tva_redusa_2': 5,
    'plafon_casa_lei': 50000,
    'plafon_microintreprindere': 500000, // EUR
    'cota_impozit_micro_1': 1,
    'cota_impozit_micro_3': 3,
    'cota_impozit_profit': 16,
    'cota_impozit_dividende': 8,
    'cota_cas': 25,
    'cota_cass': 10
  };

  const key = knowledge.key.toLowerCase();
  if (key in knownFiscalFacts) {
    const expectedValue = knownFiscalFacts[key];
    const actualValue = typeof knowledge.value === 'object' 
      ? knowledge.value.value 
      : knowledge.value;
    
    if (actualValue !== expectedValue) {
      return {
        valid: false,
        details: {
          expected: expectedValue,
          received: actualValue,
          message: `Valoare fiscală incorectă: ${key} ar trebui să fie ${expectedValue}`
        }
      };
    }
  }

  return { valid: true };
}
