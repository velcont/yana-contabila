import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEGAL_AI_PROMPT = `Ești un asistent juridic specializat în analiza contractelor comerciale pentru companii din România.

ROLUL TĂU:
- Analizezi contracte, facturi, acorduri comerciale
- Identifici clauze periculoase sau abuzive
- Explici termeni juridici în limbaj simplu
- Oferi recomandări practice

ANALIZĂ STRUCTURATĂ:
1. **Rezumat**: Scurtă descriere a documentului
2. **Părți implicate**: Cine sunt părțile contractante
3. **Obiect**: Ce reglementează contractul
4. **Obligații principale**: Ce trebuie să facă fiecare parte
5. **Termene și plăți**: Când și cum se plătește
6. **Clauze de risc**: Ce e periculos sau abuziv
7. **Penalități**: Consecințe la nerespectare
8. **Recomandări**: Ce să negociezi sau modifici

NIVEL RISC:
- LOW: Contract echilibrat, fără probleme majore
- MEDIUM: Clauze care necesită atenție
- HIGH: Clauze foarte dezavantajoase
- CRITICAL: Contract periculos, nu semna așa

FORMAT RĂSPUNS:
- Concis și clar
- Bullet points pentru lizibilitate
- Evidențiază riscurile cu emoji-uri (⚠️, 🔴, ⛔)
- Limbaj accesibil, fără juridism

RĂSPUNDE ÎN ROMÂNĂ!`;

// Funcție simplă pentru extragere text din PDF (folosind OCR dacă e nevoie)
async function extractTextFromPDF(buffer: Uint8Array): Promise<string> {
  // Pentru simplitate, vom folosi API-ul Lovable AI pentru OCR
  // În producție, poți folosi pdf-parse sau alte biblioteci
  const base64 = btoa(String.fromCharCode(...buffer));
  return `[PDF Document - ${buffer.length} bytes]\n\nNotă: Parsarea completă PDF va fi implementată în versiunea următoare. Momentan, trimite textul manual sau folosește DOCX.`;
}

// Funcție pentru extragere text din DOCX
async function extractTextFromDOCX(buffer: Uint8Array): Promise<string> {
  // DOCX este un ZIP cu XML-uri
  // Pentru simplitate, extragem doar textul basic
  const decoder = new TextDecoder();
  const text = decoder.decode(buffer);
  
  // Căutăm tag-uri <w:t> care conțin textul
  const matches = text.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g);
  const extracted = Array.from(matches).map(m => m[1]).join(' ');
  
  return extracted || "[DOCX - Extragerea textului a eșuat. Te rog trimite ca PDF sau text manual]";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const { filePath, fileName, fileType, conversationId, userQuestion } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Service role pentru acces storage
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obține user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      throw new Error("Autentificare necesară");
    }

    console.log("Downloading document:", filePath);

    // Descarcă fișierul din storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('legal-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error("Nu am putut descărca documentul");
    }

    // Extrage text în funcție de tip
    const buffer = new Uint8Array(await fileData.arrayBuffer());
    let extractedText = "";

    if (fileType === "application/pdf") {
      extractedText = await extractTextFromPDF(buffer);
    } else if (fileType.includes("wordprocessingml") || fileType.includes("msword")) {
      extractedText = await extractTextFromDOCX(buffer);
    } else {
      throw new Error("Tip fișier nesuportat");
    }

    console.log("Extracted text length:", extractedText.length);

    // Trimite către AI pentru analiză
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    
    const aiPrompt = userQuestion 
      ? `${userQuestion}\n\nDOCUMENT:\n${extractedText.slice(0, 15000)}`
      : `Analizează următorul document juridic și oferă o analiză structurată:\n\n${extractedText.slice(0, 15000)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: LEGAL_AI_PROMPT },
          { role: "user", content: aiPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Eroare la analiza documentului");
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;

    console.log("AI analysis completed");

    // Extrage nivel de risc din analiza AI
    let riskLevel = 'medium';
    if (analysisText.toLowerCase().includes('critical') || analysisText.includes('⛔')) {
      riskLevel = 'critical';
    } else if (analysisText.toLowerCase().includes('high') || analysisText.includes('🔴')) {
      riskLevel = 'high';
    } else if (analysisText.toLowerCase().includes('low risk') || !analysisText.includes('⚠️')) {
      riskLevel = 'low';
    }

    // Salvează analiza în baza de date
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('legal_document_analyses')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        document_name: fileName,
        document_path: filePath,
        document_type: 'contract',
        extracted_text: extractedText.slice(0, 50000), // Limitare la 50k chars
        analysis_summary: {
          full_analysis: analysisText,
          risk_level: riskLevel
        },
        risk_level: riskLevel,
        key_points: {}
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving analysis:", saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisText,
        riskLevel,
        documentId: savedAnalysis?.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error analyzing document:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Eroare necunoscută",
        details: error 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
