import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface PlagiarismCriteria {
  score: number; // 0-100
  issues: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  locations: string[];
}

interface PlagiarismReport {
  overallScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  plagiarismProbability: number;
  criteriaScores: {
    typographyVariations: PlagiarismCriteria;
    translationErrors: PlagiarismCriteria;
    styleInconsistency: PlagiarismCriteria;
    structureLogic: PlagiarismCriteria;
    personInconsistency: PlagiarismCriteria;
    citationInconsistency: PlagiarismCriteria;
    bibliographyIssues: PlagiarismCriteria;
    attributionErrors: PlagiarismCriteria;
  };
  detailedFindings: Array<{
    criterion: string;
    location: string;
    issue: string;
    recommendation: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, chapterNumber, chapterTitle } = await req.json();

    if (!content || chapterNumber === undefined || chapterNumber === null || !chapterTitle) {
      return new Response(
        JSON.stringify({ error: 'Lipsesc date obligatorii: content, chapterNumber, chapterTitle' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY nu este configurată');
    }

    console.log(`[Plagiarism Analysis] Starting analysis for Chapter ${chapterNumber}: ${chapterTitle}`);
    console.log(`[Plagiarism Analysis] Content length: ${content.length} characters`);

const systemPrompt = `Ești un expert în detectarea plagiatului academic pentru teze de doctorat în România.

IMPORTANT: Trebuie să returnezi DOAR un obiect JSON valid, fără text explicativ înainte sau după. Nu include markdown code blocks.

Analizează textul furnizat pe următoarele 8 criterii:

1. **Variații Tipografice** (max 20 puncte):
   - Detectează schimbări între fonturi (Times New Roman, Calibri, Arial, etc.)
   - Identifică inconsistențe în mărimea fontului
   - Penalizare: -2 puncte per inconsistență detectată

2. **Erori de Traducere Automată** (max 20 puncte):
   - Detectează topici suspecte (ex: "face sens", "afacere de caz", "literatura de specialitate")
   - Identifică expresii traduse literal din engleză
   - Penalizare: -4 puncte per eroare detectată

3. **Stil Incoerent** (max 15 puncte):
   - Analizează complexitatea limbajului per paragraf
   - Detectează salturi bruște de la limbaj tehnic → simplu
   - Penalizare: -3 puncte pentru variaţii majore

4. **Structură Ilogică** (max 10 puncte):
   - Verifică succesiunea logică a subcapitolelor
   - Detectează absența tranziției între secțiuni
   - Penalizare: -2 puncte per salt logic

5. **Inconsistențe de Persoană** (max 15 puncte):
   - Detectează alternanța "eu" → "noi" → "I" (engleză)
   - Verifică consistența perspectivei narative
   - Penalizare: -3 puncte per schimbare

6. **Inconsistențe Citări** (max 10 puncte):
   - Verifică stiluri diferite: (Autor, An) vs [1] vs note subsol
   - Detectează schimbări de stil în același capitol
   - Penalizare: -2 puncte per inconsistență

7. **Probleme Bibliografice** (max 5 puncte):
   - Identifică secțiuni fără referințe (>500 cuvinte fără citări)
   - Verifică vârsta surselor (>80% pre-2015 = suspect)
   - Penalizare: -1 punct per problemă

8. **Erori de Atribuire** (max 5 puncte):
   - Verifică corectitudinea numelor autorilor
   - Detectează citări cu ani greșiți
   - Penalizare: -1 punct per eroare

**REGULI CRITICE pentru OUTPUT:**
1. Returnează DOAR obiectul JSON, fără text explicativ
2. NU include markdown code blocks
3. NU include comentarii sau explicații
4. Începe direct cu { și termină cu }

**Structura JSON obligatorie:**

{
  "typographyVariations": {
    "score": <0-20>,
    "issues": ["descriere problemă 1", "descriere problemă 2"],
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "locations": ["Paragraf 3-5", "Secțiunea 2.1"]
  },
  "translationErrors": {
    "score": <0-20>,
    "issues": [...],
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "locations": [...]
  },
  "styleInconsistency": {
    "score": <0-15>,
    "issues": [...],
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "locations": [...]
  },
  "structureLogic": {
    "score": <0-10>,
    "issues": [...],
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "locations": [...]
  },
  "personInconsistency": {
    "score": <0-15>,
    "issues": [...],
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "locations": [...]
  },
  "citationInconsistency": {
    "score": <0-10>,
    "issues": [...],
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "locations": [...]
  },
  "bibliographyIssues": {
    "score": <0-5>,
    "issues": [...],
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "locations": [...]
  },
  "attributionErrors": {
    "score": <0-5>,
    "issues": [...],
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "locations": [...]
  }
}

**IMPORTANT:**
- Fii FOARTE strict și profesionist
- Locațiile să fie cât mai precise (ex: "Paragraf 7-9 din Secțiunea 3.2")
- Issues să fie concrete și acționabile
- Severity: LOW (1-2 probleme minore), MEDIUM (3-5 probleme), HIGH (6-10 probleme), CRITICAL (>10 probleme sau probleme grave)`;

    const userPrompt = `Analizează următorul capitol din teză:

**Capitol ${chapterNumber}: ${chapterTitle}**

---
${content}
---

Returnează analiza în format JSON conform instrucțiunilor.`;

    // Call Lovable AI
    const requestBody: any = {
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_plagiarism_report',
            description: 'Evaluează un capitol de teză de doctorat pe baza a 8 criterii de plagiat și stil academic.',
            parameters: {
              type: 'object',
              properties: {
                typographyVariations: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 20 },
                    issues: { type: 'array', items: { type: 'string' } },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                    locations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['score', 'issues', 'severity', 'locations'],
                  additionalProperties: false,
                },
                translationErrors: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 20 },
                    issues: { type: 'array', items: { type: 'string' } },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                    locations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['score', 'issues', 'severity', 'locations'],
                  additionalProperties: false,
                },
                styleInconsistency: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 15 },
                    issues: { type: 'array', items: { type: 'string' } },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                    locations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['score', 'issues', 'severity', 'locations'],
                  additionalProperties: false,
                },
                structureLogic: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 10 },
                    issues: { type: 'array', items: { type: 'string' } },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                    locations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['score', 'issues', 'severity', 'locations'],
                  additionalProperties: false,
                },
                personInconsistency: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 15 },
                    issues: { type: 'array', items: { type: 'string' } },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                    locations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['score', 'issues', 'severity', 'locations'],
                  additionalProperties: false,
                },
                citationInconsistency: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 10 },
                    issues: { type: 'array', items: { type: 'string' } },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                    locations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['score', 'issues', 'severity', 'locations'],
                  additionalProperties: false,
                },
                bibliographyIssues: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 5 },
                    issues: { type: 'array', items: { type: 'string' } },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                    locations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['score', 'issues', 'severity', 'locations'],
                  additionalProperties: false,
                },
                attributionErrors: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', minimum: 0, maximum: 5 },
                    issues: { type: 'array', items: { type: 'string' } },
                    severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                    locations: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['score', 'issues', 'severity', 'locations'],
                  additionalProperties: false,
                },
              },
              required: [
                'typographyVariations',
                'translationErrors',
                'styleInconsistency',
                'structureLogic',
                'personInconsistency',
                'citationInconsistency',
                'bibliographyIssues',
                'attributionErrors',
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'generate_plagiarism_report' },
      },
    };

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Plagiarism Analysis] AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limită de utilizare AI depășită. Încercați mai târziu.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('[Plagiarism Analysis] AI response received');

    if (!aiData?.choices?.[0]?.message) {
      throw new Error('Nu am primit răspuns valid de la AI');
    }

    // Parse AI response from tool call (preferred) or fallback to JSON content
    let criteriaScores;
    try {
      console.log('[Plagiarism Analysis] Full AI raw data:', JSON.stringify(aiData).substring(0, 500));

      const firstChoice = aiData.choices?.[0];
      const message: any = firstChoice?.message;

      let argsString: string | null = null;

      // Newer tool_calls format
      if (message?.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
        const firstToolCall = message.tool_calls[0];
        argsString = firstToolCall?.function?.arguments ?? null;
      }

      // Legacy function_call format
      if (!argsString && message?.function_call?.arguments) {
        argsString = message.function_call.arguments;
      }

      // Fallback: try to use plain content and clean JSON as before
      if (!argsString && typeof message?.content === 'string') {
        let cleanContent = message.content.trim();
        console.log('[Plagiarism Analysis] Fallback content from message.content:', cleanContent.substring(0, 300));

        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/\n?```/g, '');

        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
        }

        argsString = cleanContent;
      }

      if (!argsString) {
        throw new Error('Nu am primit arguments pentru tool_call sau conținut JSON.');
      }

      console.log('[Plagiarism Analysis] Parsed tool arguments preview:', argsString.substring(0, 300));
      criteriaScores = JSON.parse(argsString);

      // Validate required fields
      const requiredFields = [
        'typographyVariations', 'translationErrors', 'styleInconsistency',
        'structureLogic', 'personInconsistency', 'citationInconsistency',
        'bibliographyIssues', 'attributionErrors',
      ];

      for (const field of requiredFields) {
        if (!criteriaScores[field]) {
          throw new Error(`Lipsește câmpul obligatoriu: ${field}`);
        }
      }
    } catch (parseError) {
      console.error('[Plagiarism Analysis] Parse error:', parseError);
      console.error('[Plagiarism Analysis] Full AI data on error:', JSON.stringify(aiData));
      throw new Error(`Răspunsul AI nu este în format JSON valid: ${parseError instanceof Error ? parseError.message : 'eroare necunoscută'}`);
    }

    // Calculate overall score (weighted average)
    const weights = {
      typographyVariations: 0.20,
      translationErrors: 0.20,
      styleInconsistency: 0.15,
      structureLogic: 0.10,
      personInconsistency: 0.15,
      citationInconsistency: 0.10,
      bibliographyIssues: 0.05,
      attributionErrors: 0.05,
    };

    let overallScore = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      overallScore += (criteriaScores[key]?.score || 0) * weight;
    });
    overallScore = Math.round(overallScore);

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (overallScore >= 85) riskLevel = 'LOW';
    else if (overallScore >= 70) riskLevel = 'MEDIUM';
    else if (overallScore >= 50) riskLevel = 'HIGH';
    else riskLevel = 'CRITICAL';

    // Calculate plagiarism probability (inverse of score)
    const plagiarismProbability = Math.round((100 - overallScore) * 0.9); // 90% correlation

    // Build detailed findings
    const detailedFindings: PlagiarismReport['detailedFindings'] = [];
    const criteriaNames: Record<string, string> = {
      typographyVariations: 'Variații Tipografice',
      translationErrors: 'Erori de Traducere',
      styleInconsistency: 'Stil Incoerent',
      structureLogic: 'Structură Ilogică',
      personInconsistency: 'Inconsistențe de Persoană',
      citationInconsistency: 'Inconsistențe Citări',
      bibliographyIssues: 'Probleme Bibliografice',
      attributionErrors: 'Erori de Atribuire',
    };

    Object.entries(criteriaScores).forEach(([key, data]: [string, any]) => {
      if (data.issues && data.issues.length > 0) {
        data.issues.forEach((issue: string, idx: number) => {
          detailedFindings.push({
            criterion: criteriaNames[key] || key,
            location: data.locations?.[idx] || 'Necunoscut',
            issue,
            recommendation: generateRecommendation(key, issue),
            severity: data.severity || 'MEDIUM',
          });
        });
      }
    });

    // Generate recommendations
    const recommendations = generateRecommendations(criteriaScores, overallScore);

    const report: PlagiarismReport = {
      overallScore,
      riskLevel,
      plagiarismProbability,
      criteriaScores,
      detailedFindings,
      recommendations,
    };

    console.log(`[Plagiarism Analysis] Analysis complete. Overall score: ${overallScore}/100, Risk: ${riskLevel}`);

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Plagiarism Analysis] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Eroare la analiza plagiatului',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateRecommendation(criterion: string, issue: string): string {
  const recommendations: Record<string, string> = {
    typographyVariations: 'Standardizează fontul la Times New Roman 12pt pe tot textul.',
    translationErrors: 'Înlocuiește expresiile traduse literal cu echivalente academice corecte în română.',
    styleInconsistency: 'Uniformizează nivelul de complexitate al limbajului pe tot capitolul.',
    structureLogic: 'Adaugă paragrafe de tranziție între secțiuni pentru a asigura coerentă logică.',
    personInconsistency: 'Alege o perspectivă narativă (eu/noi) și menține-o consistent.',
    citationInconsistency: 'Adoptă un singur stil de citare (recomandat: APA 7) și aplică-l uniform.',
    bibliographyIssues: 'Adaugă referințe bibliografice actualizate (ultimii 5-7 ani) în secțiunile fără citări.',
    attributionErrors: 'Verifică și corectează numele autorilor și anii de publicare în toate citările.',
  };

  return recommendations[criterion] || 'Revizuiește și corectează problema identificată.';
}

function generateRecommendations(criteria: any, overallScore: number): string[] {
  const recommendations: string[] = [];

  if (overallScore < 50) {
    recommendations.push('🚨 URGENT: Scorul general este critic. Recomandăm revizuire completă cu îndrumător.');
  }

  // Check each criterion
  Object.entries(criteria).forEach(([key, data]: [string, any]) => {
    if (data.score < 15 && data.severity === 'CRITICAL') {
      recommendations.push(`PRIORITATE MAXIMĂ: Rezolvă problemele de ${key} (scor: ${data.score}).`);
    } else if (data.score < 18 && data.severity === 'HIGH') {
      recommendations.push(`Important: Îmbunătățește ${key} (scor: ${data.score}).`);
    }
  });

  if (criteria.translationErrors.score < 18) {
    recommendations.push('Verifică cu un vorbitor nativ de limba română pentru a elimina anglicismele.');
  }

  if (criteria.citationInconsistency.score < 8) {
    recommendations.push('Utilizează un software de management bibliografic (Zotero, Mendeley) pentru citări consistente.');
  }

  if (criteria.bibliographyIssues.score < 4) {
    recommendations.push('Actualizează bibliografia cu surse recente (ultimii 3-5 ani).');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Textul este de calitate bună. Revizuire finală recomandată pentru detalii minore.');
  }

  return recommendations;
}
