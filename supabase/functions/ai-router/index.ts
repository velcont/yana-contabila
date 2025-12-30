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
  
  // Fiscal questions
  if (
    lowerMessage.includes('impozit') ||
    lowerMessage.includes('tva') ||
    lowerMessage.includes('fiscal') ||
    lowerMessage.includes('anaf') ||
    lowerMessage.includes('declarație') ||
    lowerMessage.includes('taxe')
  ) {
    return {
      route: 'fiscal-chat',
      payload: { message },
      reason: 'User asked a fiscal/tax question'
    };
  }
  
  // Strategic questions
  if (
    lowerMessage.includes('strategi') ||
    lowerMessage.includes('war room') ||
    lowerMessage.includes('battle plan') ||
    lowerMessage.includes('simulare') ||
    lowerMessage.includes('scenariu')
  ) {
    return {
      route: 'strategic-advisor',
      payload: { message },
      reason: 'User asked about strategic planning'
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
    const { message, conversationId, fileData, balanceData, companyName } = requestData;

    let routeDecision: RouteDecision;
    let response: Response;

    // If file data is provided, route based on file type
    if (fileData && fileData.fileContent) {
      const docType = detectDocumentType(fileData.fileName);
      
      if (docType === 'balance_excel') {
        // Route to analyze-balance - it expects excelBase64
        routeDecision = {
          route: 'analyze-balance',
          payload: {
            excelBase64: fileData.fileContent,
            companyName: companyName || undefined,
            fileName: fileData.fileName
          },
          reason: 'Excel balance sheet uploaded'
        };
      } else if (docType === 'pdf' || docType === 'docx') {
        // For business documents, use strategic-advisor
        routeDecision = {
          route: 'strategic-advisor',
          payload: {
            message: message || `Analizează documentul: ${fileData.fileName}`,
            documentContent: fileData.fileContent,
            documentName: fileData.fileName,
          },
          reason: 'Business document uploaded for strategic analysis'
        };
      } else {
        // For other documents, use chat-ai with context
        routeDecision = {
          route: 'chat-ai',
          payload: {
            message: `Am primit un document: ${fileData.fileName}. ${message || 'Analizează-l te rog.'}`,
          },
          reason: 'Non-balance document uploaded'
        };
      }
    } else {
      // No file, detect intent from message
      routeDecision = detectIntent(message);
    }

    console.log(`AI Router: Routing to ${routeDecision.route} - ${routeDecision.reason}`);

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

    const result = await response.json();

    // Save routing decision to conversation
    await supabase.from('yana_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: result.response || result.analysis || result.message || 'Răspuns primit.',
      artifacts: result.artifacts || [],
    });

    return new Response(
      JSON.stringify({
        success: true,
        route: routeDecision.route,
        reason: routeDecision.reason,
        structuredData: result.structuredData || null,
        grokValidation: result.grokValidation || null,
        companyName: result.structuredData?.company || result.companyName || null,
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