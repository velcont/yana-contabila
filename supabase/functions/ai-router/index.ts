import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RouterRequest {
  message: string;
  conversationId: string;
  fileData?: {
    fileName: string;
    fileContent: string;
    fileType: string;
  };
  balanceData?: unknown;
  companyName?: string;
}

interface RouteDecision {
  route: 'analyze-balance' | 'chat-ai' | 'strategic-advisor' | 'fiscal-chat' | 'calculate-resilience' | 'direct-response';
  payload: Record<string, unknown>;
  reason: string;
}

// =============================================================================
// MEMORIE CROSS-CONVERSAȚII - Funcții noi
// =============================================================================

// Extrage CUI din numele fișierului balanță (format: DENUMIRE_CUI.xls)
function extractCUIFromFileName(fileName: string): string | null {
  if (!fileName) return null;
  // Pattern: 8 cifre înainte de .xls sau .xlsx
  const cuiMatch = fileName.match(/(\d{6,8})\.xls/i);
  return cuiMatch ? cuiMatch[1] : null;
}

// Găsește company_id pe baza CUI sau nume
async function findCompanyByContext(
  supabase: any,
  userId: string,
  companyName?: string,
  cui?: string
): Promise<{ companyId: string | null; matchedName: string | null }> {
  // Prioritate 1: Match pe CUI (cel mai precis)
  if (cui) {
    const { data: cuiMatch } = await supabase
      .from('companies')
      .select('id, company_name')
      .or(`managed_by_accountant_id.eq.${userId},user_id.eq.${userId}`)
      .eq('cui', cui)
      .limit(1)
      .single();
    
    if (cuiMatch) {
      console.log(`[AI-Router] Company found by CUI ${cui}: ${cuiMatch.company_name}`);
      return { companyId: cuiMatch.id, matchedName: cuiMatch.company_name };
    }
  }
  
  // Prioritate 2: Match fuzzy pe nume (dacă avem companyName)
  if (companyName && companyName.length > 3) {
    const { data: nameMatches } = await supabase
      .from('companies')
      .select('id, company_name')
      .or(`managed_by_accountant_id.eq.${userId},user_id.eq.${userId}`)
      .ilike('company_name', `%${companyName}%`)
      .limit(1);
    
    if (nameMatches && nameMatches.length > 0) {
      console.log(`[AI-Router] Company found by name "${companyName}": ${nameMatches[0].company_name}`);
      return { companyId: nameMatches[0].id, matchedName: nameMatches[0].company_name };
    }
  }
  
  console.log(`[AI-Router] No company found for CUI=${cui}, name=${companyName}`);
  return { companyId: null, matchedName: null };
}

// Caută conversații similare pentru această firmă
async function findSimilarConversations(
  supabase: any,
  userId: string,
  companyId: string | null,
  question: string,
  limit: number = 3
): Promise<Array<{ question: string; answer: string; created_at: string }>> {
  if (!companyId || !question || question.length < 10) {
    return [];
  }
  
  // Extrag keywords (filtrăm stop words românești)
  const stopWords = ['care', 'este', 'sunt', 'pentru', 'acest', 'aceasta', 'unde', 'când', 'cât', 'cum', 'ce', 'de', 'la', 'în', 'pe', 'cu', 'și', 'sau', 'dar', 'daca', 'dacă'];
  const keywords = question
    .toLowerCase()
    .replace(/[^\w\săîâșț]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.includes(w))
    .slice(0, 5); // Max 5 keywords
  
  if (keywords.length === 0) {
    return [];
  }
  
  console.log(`[AI-Router] Searching similar conversations for company ${companyId} with keywords: ${keywords.join(', ')}`);
  
  try {
    // Apelez funcția PostgreSQL
    const { data, error } = await supabase.rpc('find_similar_conversations', {
      p_company_id: companyId,
      p_question_keywords: keywords,
      p_limit: limit
    });
    
    if (error) {
      console.error('[AI-Router] Error finding similar conversations:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`[AI-Router] No similar conversations found for company ${companyId}`);
      // Diagnostic: verifică dacă există conversații pentru această firmă
      const { count } = await supabase
        .from('ai_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);
      console.log(`[AI-Router] 📊 Total ai_conversations for company ${companyId}: ${count || 0}`);
      return [];
    }
    
    console.log(`[AI-Router] Found ${data.length} similar conversations`);
    return data.map((conv: any) => ({
      question: conv.question,
      answer: conv.answer,
      created_at: conv.created_at
    }));
  } catch (err) {
    console.error('[AI-Router] Exception finding similar conversations:', err);
    return [];
  }
}

// Construiește context din conversații similare
function buildMemoryContext(conversations: Array<{ question: string; answer: string }>): string | null {
  if (!conversations || conversations.length === 0) {
    return null;
  }
  
  const contextLines = conversations.map((conv, i) => {
    const shortQuestion = conv.question.length > 100 ? conv.question.substring(0, 100) + '...' : conv.question;
    const shortAnswer = conv.answer.length > 300 ? conv.answer.substring(0, 300) + '...' : conv.answer;
    return `${i + 1}. Întrebare anterioară: "${shortQuestion}"\n   Răspuns util: "${shortAnswer}"`;
  }).join('\n\n');
  
  return `📚 CONTEXT DIN CONVERSAȚII ANTERIOARE CU ACEASTĂ FIRMĂ:

${contextLines}

⚠️ Folosește aceste informații pentru a personaliza răspunsul și a menține continuitatea, dar bazează-te pe datele actuale dacă sunt disponibile.

---

`;
}

// =============================================================================
// ROUTING LOGIC (original)
// =============================================================================

function detectDocumentType(fileName: string): string {
  const extension = fileName.toLowerCase().split('.').pop();
  
  if (['xlsx', 'xls'].includes(extension || '')) {
    return 'balance_excel';
  } else if (extension === 'pdf') {
    return 'pdf';
  } else if (['doc', 'docx'].includes(extension || '')) {
    return 'docx';
  }
  return 'other';
}

function detectIntent(message: string): RouteDecision {
  const lowerMessage = message.toLowerCase();
  
  // Resilience detection
  if (
    lowerMessage.includes('reziliență') || 
    lowerMessage.includes('rezilienta') ||
    lowerMessage.includes('scor de reziliență') ||
    lowerMessage.includes('analiza rezilienta')
  ) {
    return {
      route: 'calculate-resilience',
      payload: { query: message },
      reason: 'User requested resilience analysis'
    };
  }
  
  // Fiscal questions - EXTENDED keywords pentru legislația 2026
  // Include forme articulate și variante pentru detecție robustă
  if (
    lowerMessage.includes('impozit') ||
    lowerMessage.includes('impozitul') ||
    lowerMessage.includes('tva') ||
    lowerMessage.includes('fiscal') ||
    lowerMessage.includes('anaf') ||
    lowerMessage.includes('declarație') ||
    lowerMessage.includes('declaratie') ||
    lowerMessage.includes('taxe') ||
    lowerMessage.includes('taxa') ||
    // Keywords pentru legislația 2026
    lowerMessage.includes('cass') ||
    lowerMessage.includes('cas ') ||
    lowerMessage.includes('dividend') ||
    lowerMessage.includes('dividende') ||
    lowerMessage.includes('contribuți') ||
    lowerMessage.includes('contributii') ||
    lowerMessage.includes('contribuția') ||
    lowerMessage.includes('contributia') ||
    // Salariu - toate variantele
    lowerMessage.includes('salariu') ||
    lowerMessage.includes('salariul') ||
    lowerMessage.includes('salarii') ||
    lowerMessage.includes('brut') ||
    lowerMessage.includes('minim') ||
    // Declarații
    lowerMessage.includes('d700') ||
    lowerMessage.includes('d107') ||
    lowerMessage.includes('d205') ||
    lowerMessage.includes('d112') ||
    lowerMessage.includes('d300') ||
    lowerMessage.includes('declarația unică') ||
    lowerMessage.includes('declaratia unica') ||
    // Micro și regimuri
    lowerMessage.includes('microîntreprindere') ||
    lowerMessage.includes('microintreprindere') ||
    lowerMessage.includes('micro') ||
    lowerMessage.includes('plafon') ||
    lowerMessage.includes('cotă unică') ||
    lowerMessage.includes('cota unica') ||
    lowerMessage.includes('legislație') ||
    lowerMessage.includes('legislatie') ||
    lowerMessage.includes('cod fiscal') ||
    // An și termeni temporali fiscali
    lowerMessage.includes('2026') ||
    lowerMessage.includes('2025')
  ) {
    return {
      route: 'fiscal-chat',
      payload: { message },
      reason: 'User asked a fiscal/tax question'
    };
  }
  
  // Strategic questions - EXPANDED for better detection
  if (
    lowerMessage.includes('strategi') ||
    lowerMessage.includes('war room') ||
    lowerMessage.includes('battle plan') ||
    lowerMessage.includes('simulare') ||
    lowerMessage.includes('scenariu') ||
    lowerMessage.includes('costuri') ||
    lowerMessage.includes('cost') ||
    lowerMessage.includes('optimiz') ||
    lowerMessage.includes('reduc') ||
    lowerMessage.includes('cresc') ||
    lowerMessage.includes('eficientiz') ||
    lowerMessage.includes('recomand') ||
    lowerMessage.includes('pe baza') ||
    lowerMessage.includes('plan de acțiune') ||
    lowerMessage.includes('plan de actiune') ||
    lowerMessage.includes('pași') ||
    lowerMessage.includes('pasi') ||
    lowerMessage.includes('următoarele') ||
    lowerMessage.includes('urmatoarele') ||
    lowerMessage.includes('ce ar trebui') ||
    lowerMessage.includes('cum să') ||
    lowerMessage.includes('cum sa') ||
    lowerMessage.includes('tai') ||
    lowerMessage.includes('taie') ||
    lowerMessage.includes('categor') ||
    lowerMessage.includes('cheltuieli') ||
    lowerMessage.includes('venituri') ||
    lowerMessage.includes('profit') ||
    lowerMessage.includes('marja') ||
    lowerMessage.includes('buget')
  ) {
    return {
      route: 'strategic-advisor',
      payload: { message },
      reason: 'User asked about strategic planning or optimization'
    };
  }
  
  // Default to chat-ai for general questions
  return {
    route: 'chat-ai',
    payload: { message },
    reason: 'General financial question'
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const requestData: RouterRequest = await req.json();
    const { message, conversationId, fileData, companyName } = requestData;

    // =============================================================================
    // MEMORIE: Detectez firma și caut conversații similare
    // =============================================================================
    let detectedCompanyId: string | null = null;
    let detectedCompanyName: string | null = companyName || null;
    let memoryContext: string | null = null;
    
    // Dacă avem fileData (balanță încărcată), extrag CUI și caut firma
    if (fileData && fileData.fileName) {
      const extractedCUI = extractCUIFromFileName(fileData.fileName);
      const companyResult = await findCompanyByContext(
        supabase, 
        user.id, 
        companyName || undefined, 
        extractedCUI || undefined
      );
      detectedCompanyId = companyResult.companyId;
      detectedCompanyName = companyResult.matchedName || companyName || null;
    }
    
    // Caut conversații similare doar dacă am identificat firma
    if (detectedCompanyId && message) {
      const similarConversations = await findSimilarConversations(
        supabase,
        user.id,
        detectedCompanyId,
        message,
        3
      );
      memoryContext = buildMemoryContext(similarConversations);
      
      if (memoryContext) {
        console.log(`[AI-Router] Memory context built from ${similarConversations.length} conversations`);
      }
    }

    let routeDecision: RouteDecision;
    let response: Response;

    // If file data is provided, route based on file type
    if (fileData && fileData.fileContent) {
      const docType = detectDocumentType(fileData.fileName);
      
      if (docType === 'balance_excel') {
        routeDecision = {
          route: 'analyze-balance',
          payload: {
            excelBase64: fileData.fileContent,
            companyName: detectedCompanyName || undefined,
            fileName: fileData.fileName,
            memoryContext // Adaug contextul de memorie
          },
          reason: 'Excel balance sheet uploaded'
        };
      } else if (docType === 'pdf' || docType === 'docx') {
        routeDecision = {
          route: 'strategic-advisor',
          payload: {
            message: message || `Analizează documentul: ${fileData.fileName}`,
            documentContent: fileData.fileContent,
            documentName: fileData.fileName,
            conversationId: conversationId,
            memoryContext // Adaug contextul de memorie
          },
          reason: 'Business document uploaded for strategic analysis'
        };
      } else {
        routeDecision = {
          route: 'chat-ai',
          payload: {
            message: `Am primit un document: ${fileData.fileName}. ${message || 'Analizează-l te rog.'}`,
            memoryContext // Adaug contextul de memorie
          },
          reason: 'Non-balance document uploaded'
        };
      }
    } else {
      // No file, detect intent from message
      routeDecision = detectIntent(message);
      // Adaug memoryContext la payload
      routeDecision.payload.memoryContext = memoryContext;
    }

    // Add conversationId for routes that require it
    if (routeDecision.route === 'strategic-advisor' || routeDecision.route === 'fiscal-chat') {
      routeDecision.payload.conversationId = conversationId;
    }

    console.log(`AI Router: Routing to ${routeDecision.route} - ${routeDecision.reason}${memoryContext ? ' (with memory context)' : ''}`);

    // Call the appropriate edge function
    const targetUrl = `${supabaseUrl}/functions/v1/${routeDecision.route}`;
    
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(routeDecision.payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Route ${routeDecision.route} failed: ${errorText}`);
    }

    // Handle SSE stream or regular JSON response
    const contentType = response.headers.get('content-type') || '';
    let result: Record<string, unknown>;

    if (contentType.includes('text/event-stream') || routeDecision.route === 'chat-ai') {
      const text = await response.text();
      const lines = text.split('\n');
      let accumulatedContent = '';
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content' && data.content) {
              accumulatedContent += data.content;
            } else if (data.response) {
              accumulatedContent += data.response;
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
      
      result = { response: accumulatedContent || text };
      console.log('AI Router: Parsed SSE stream, content length:', accumulatedContent.length);
    } else {
      result = await response.json();
    }

    // Save routing decision to yana_messages
    await supabase.from('yana_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: (result.response as string) || (result.analysis as string) || (result.message as string) || 'Răspuns primit.',
      artifacts: result.artifacts || [],
    });

    // =============================================================================
    // MEMORIE: Salvez conversația în ai_conversations pentru memorie viitoare
    // =============================================================================
    const assistantMessage = (result.response as string) || (result.analysis as string) || '';
    let savedAiConversationId: string | null = null;
    
    if (message && assistantMessage && assistantMessage.length > 20) {
      try {
        const { data: savedConv, error: saveError } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            company_id: detectedCompanyId, // Poate fi NULL - safeguard #1
            question: message.substring(0, 2000),
            answer: assistantMessage.substring(0, 5000),
            context: {
              route: routeDecision.route,
              companyName: detectedCompanyName, // Backup în metadata - safeguard #8
              conversationId: conversationId
            },
            was_helpful: null // Va fi setat de feedback utilizator
          })
          .select('id')
          .single();
        
        if (saveError) {
          console.error('[AI-Router] Failed to save conversation for memory:', saveError);
        } else {
          savedAiConversationId = savedConv?.id || null;
          console.log(`[AI-Router] Saved conversation to ai_conversations (id: ${savedAiConversationId})${detectedCompanyId ? ` for company: ${detectedCompanyId}` : ''}`);
        }
      } catch (saveError) {
        console.error('[AI-Router] Failed to save conversation for memory:', saveError);
        // Nu aruncăm eroare - memoria e opțională
      }
    }

    // =============================================================================
    // CONSCIOUSNESS ENGINE: Încărcare context conștiință SINCRON (timeout 2s)
    // =============================================================================
    let consciousnessContext: Record<string, unknown> | null = null;
    
    if (message && user.id) {
      try {
        const consciousnessUrl = `${supabaseUrl}/functions/v1/consciousness-engine`;
        const consciousnessPromise = fetch(consciousnessUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            userId: user.id,
            conversationId,
            currentMessage: message,
            companyId: detectedCompanyId,
          }),
        });
        
        // Race cu timeout de 2 secunde
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 2000)
        );
        
        const consciousnessResponse = await Promise.race([consciousnessPromise, timeoutPromise]) as Response;
        
        if (consciousnessResponse.ok) {
          consciousnessContext = await consciousnessResponse.json();
          console.log('[AI-Router] Consciousness context loaded:', {
            hasCuriosities: !!consciousnessContext?.curiosities,
            concernLevel: consciousnessContext?.concernLevel,
            emotionalMode: consciousnessContext?.emotionalMode,
          });
        }
      } catch (err) {
        console.warn('[AI-Router] Consciousness engine timeout/error, proceeding without context:', err);
        // Nu aruncăm eroare - conștiința e opțională
      }
    }
    
    // Injectează consciousness context în payload pentru routes care îl suportă
    if (consciousnessContext && (routeDecision.route === 'strategic-advisor' || routeDecision.route === 'chat-ai')) {
      routeDecision.payload.consciousnessContext = consciousnessContext;
      console.log('[AI-Router] Consciousness context injected into payload');
    }

    // =============================================================================
    // SELF-REFLECTION + CONSCIOUSNESS ASYNC TASKS
    // =============================================================================
    if (message && assistantMessage && assistantMessage.length > 50) {
      // Folosim EdgeRuntime.waitUntil pentru a garanta că reflecția se finalizează
      // chiar dacă răspunsul principal a fost deja trimis
      const selfReflectTask = async () => {
        try {
          const selfReflectUrl = `${supabaseUrl}/functions/v1/self-reflect`;
          const reflectResponse = await fetch(selfReflectUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              conversationId,
              userId: user.id,
              question: message,
              answer: assistantMessage,
              route: routeDecision.route,
            }),
          });
          
          if (!reflectResponse.ok) {
            console.error('[AI-Router] Self-reflect failed:', await reflectResponse.text());
          } else {
            const reflectResult = await reflectResponse.json();
            console.log(`[AI-Router] Self-reflection completed: score=${reflectResult.score}/10`);
          }
        } catch (err) {
          console.error('[AI-Router] Self-reflect error (non-blocking):', err);
        }
      };
      
      // Task pentru surprise-detector (detectează contradicții)
      const surpriseDetectorTask = async () => {
        try {
          const surpriseUrl = `${supabaseUrl}/functions/v1/surprise-detector`;
          await fetch(surpriseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              conversationId,
              userMessage: message,
              assistantResponse: assistantMessage,
            }),
          });
          console.log('[AI-Router] Surprise detector completed');
        } catch (err) {
          console.error('[AI-Router] Surprise detector error (non-blocking):', err);
        }
      };
      
      // Task pentru experiment-tracker (evaluează experimente YANA)
      const experimentTrackerTask = async () => {
        try {
          const experimentUrl = `${supabaseUrl}/functions/v1/experiment-tracker`;
          await fetch(experimentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              conversationId,
              userMessage: message,
              assistantResponse: assistantMessage,
              emotionalMode: consciousnessContext?.emotionalMode || null,
            }),
          });
          console.log('[AI-Router] Experiment tracker completed');
        } catch (err) {
          console.error('[AI-Router] Experiment tracker error (non-blocking):', err);
        }
      };
      
      // Task pentru actualizare user_journey
      const journeyUpdaterTask = async () => {
        try {
          // Actualizăm direct user_journey cu informații noi
          const { error } = await supabase
            .from('user_journey')
            .upsert({
              user_id: user.id,
              last_interaction_at: new Date().toISOString(),
              total_interactions: 1, // Se va incrementa
            }, {
              onConflict: 'user_id',
              ignoreDuplicates: false,
            });
          
          if (error) {
            // Dacă nu există, creăm
            await supabase.from('user_journey').insert({
              user_id: user.id,
              primary_goal: null,
              goal_confidence: 0,
              uncertainty_level: 5,
              knowledge_gaps: [],
              emotional_state: 'neutral',
              first_interaction_at: new Date().toISOString(),
              last_interaction_at: new Date().toISOString(),
              total_interactions: 1,
            });
          }
          console.log('[AI-Router] User journey updated');
        } catch (err) {
          console.error('[AI-Router] Journey updater error (non-blocking):', err);
        }
      };
      
      // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(Promise.all([
          selfReflectTask(),
          surpriseDetectorTask(),
          experimentTrackerTask(),
          journeyUpdaterTask(),
        ]));
        console.log('[AI-Router] All async tasks queued with EdgeRuntime.waitUntil()');
      } else {
        // Fallback pentru medii unde EdgeRuntime nu e disponibil
        Promise.all([
          selfReflectTask(),
          surpriseDetectorTask(),
          experimentTrackerTask(),
          journeyUpdaterTask(),
        ]).catch(console.error);
        console.log('[AI-Router] All async tasks triggered (fallback mode)');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        route: routeDecision.route,
        reason: routeDecision.reason,
        structuredData: result.structuredData || null,
        grokValidation: result.grokValidation || null,
        companyName: (result.structuredData as Record<string, unknown>)?.company || result.companyName || detectedCompanyName || null,
        hasMemoryContext: !!memoryContext,
        aiConversationId: savedAiConversationId, // NOU: pentru feedback din UI
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI Router error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});