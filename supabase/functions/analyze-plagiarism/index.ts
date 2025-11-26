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
      const { content, chapterNumber, chapterTitle, language = 'ro' } = await req.json();

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

const systemPrompt = language === 'en'
  ? `You are an expert in detecting academic plagiarism for doctoral theses.

Analyze the provided text on the following 8 criteria and return the result in the EXACT JSON format as shown in the example below.

**EVALUATION CRITERIA:**

1. **Typography Variations** (max 20 points)
   - Changes between fonts (Times New Roman, Calibri, Arial)
   - Font size inconsistencies
   - Penalty: -2 points per inconsistency

2. **AI-Generated Text Detection** (max 20 points)
   - Typical AI phrases: "delve into", "it's important to note", "in conclusion", "it is worth noting"
   - Overly formal or repetitive language patterns
   - Excessive use of passive voice in places where active is more natural
   - Penalty: -4 points per detected pattern

3. **Style Inconsistency** (max 15 points)
   - Abrupt shifts from technical to simple language
   - Mixed academic vs informal writing
   - Penalty: -3 points for major variations

4. **Structure Logic** (max 10 points)
   - Lack of transitions between sections
   - Illogical flow of arguments
   - Penalty: -2 points per logical jump

5. **Person Inconsistency** (max 15 points)
   - Alternating "I" → "we" → passive voice
   - Inconsistent narrative perspective
   - Penalty: -3 points per change

6. **Citation Inconsistency** (max 10 points)
   - Different styles: (Author, Year) vs [1] vs footnotes
   - Mixed APA, MLA, Chicago styles
   - Penalty: -2 points per inconsistency

7. **Bibliography Issues** (max 5 points)
   - Sections without references (>500 words)
   - Age of sources (>80% pre-2015)
   - Penalty: -1 point per problem

8. **Attribution Errors** (max 5 points)
   - Incorrect author names
   - Wrong publication years
   - Penalty: -1 point per error

**EXAMPLE JSON OUTPUT (FOLLOW THIS EXACT FORMAT):**

{
  "typographyVariations": {
    "score": 18,
    "issues": ["Font changed from Times New Roman to Calibri in paragraph 5"],
    "severity": "LOW",
    "locations": ["Paragraph 5"]
  },
  "translationErrors": {
    "score": 16,
    "issues": ["Detected AI phrase 'delve into' suggesting generated text"],
    "severity": "MEDIUM",
    "locations": ["Section 2.1, Paragraph 3"]
  },
  "styleInconsistency": {
    "score": 12,
    "issues": ["Abrupt transition from technical to informal language"],
    "severity": "MEDIUM",
    "locations": ["Between sections 1.2 and 1.3"]
  },
  "structureLogic": {
    "score": 8,
    "issues": ["Missing transition between subsections 2.1 and 2.2"],
    "severity": "MEDIUM",
    "locations": ["End of section 2.1"]
  },
  "personInconsistency": {
    "score": 15,
    "issues": [],
    "severity": "LOW",
    "locations": []
  },
  "citationInconsistency": {
    "score": 8,
    "issues": ["Citation style changed from (Author, Year) to [1]"],
    "severity": "MEDIUM",
    "locations": ["Chapter 3"]
  },
  "bibliographyIssues": {
    "score": 4,
    "issues": ["600-word section without any citations"],
    "severity": "MEDIUM",
    "locations": ["Section 4.2"]
  },
  "attributionErrors": {
    "score": 5,
    "issues": [],
    "severity": "LOW",
    "locations": []
  }
}

**CRITICAL INSTRUCTIONS:**
1. Return ONLY the JSON object, without explanatory text
2. DO NOT use markdown code blocks (no \`\`\`json or \`\`\`)
3. Start directly with { and end with }
4. Each criterion MUST have: score, issues, severity, locations
5. If no problems found, use issues: [] and locations: []
6. Severity: LOW (1-2 issues), MEDIUM (3-5 issues), HIGH (6-10 issues), CRITICAL (>10 issues)`
  : `Ești un expert în detectarea plagiatului academic pentru teze de doctorat în România.

Analizează textul furnizat pe următoarele 8 criterii și returnează rezultatul în format JSON EXACT ca în exemplul de mai jos.

**CRITERII DE EVALUARE:**

1. **Variații Tipografice** (max 20 puncte)
   - Schimbări între fonturi (Times New Roman, Calibri, Arial)
   - Inconsistențe în mărimea fontului
   - Penalizare: -2 puncte per inconsistență

2. **Erori de Traducere Automată** (max 20 puncte)
   - Topici suspecte: "face sens", "afacere de caz", "literatura de specialitate"
   - Expresii traduse literal din engleză
   - Penalizare: -4 puncte per eroare

3. **Stil Incoerent** (max 15 puncte)
   - Salturi bruște de la limbaj tehnic la simplu
   - Penalizare: -3 puncte pentru variații majore

4. **Structură Ilogică** (max 10 puncte)
   - Lipsă de tranziție între secțiuni
   - Penalizare: -2 puncte per salt logic

5. **Inconsistențe de Persoană** (max 15 puncte)
   - Alternanța "eu" → "noi" → "I"
   - Penalizare: -3 puncte per schimbare

6. **Inconsistențe Citări** (max 10 puncte)
   - Stiluri diferite: (Autor, An) vs [1] vs note subsol
   - Penalizare: -2 puncte per inconsistență

7. **Probleme Bibliografice** (max 5 puncte)
   - Secțiuni fără referințe (>500 cuvinte)
   - Vârsta surselor (>80% pre-2015)
   - Penalizare: -1 punct per problemă

8. **Erori de Atribuire** (max 5 puncte)
   - Nume de autori greșite
   - Ani de publicare greșiți
   - Penalizare: -1 punct per eroare

**EXEMPLU DE OUTPUT JSON (URMEAZĂ ACEST FORMAT EXACT):**

{
  "typographyVariations": {
    "score": 18,
    "issues": ["Font schimbat de la Times New Roman la Calibri în paragraful 5"],
    "severity": "LOW",
    "locations": ["Paragraful 5"]
  },
  "translationErrors": {
    "score": 16,
    "issues": ["Expresia 'face sens' în loc de 'are sens'"],
    "severity": "MEDIUM",
    "locations": ["Secțiunea 2.1, Paragraful 3"]
  },
  "styleInconsistency": {
    "score": 12,
    "issues": ["Tranziție bruscă de la limbaj tehnic la informal"],
    "severity": "MEDIUM",
    "locations": ["Între secțiunile 1.2 și 1.3"]
  },
  "structureLogic": {
    "score": 8,
    "issues": ["Lipsește tranziția între subcapitolul 2.1 și 2.2"],
    "severity": "MEDIUM",
    "locations": ["Sfârșitul secțiunii 2.1"]
  },
  "personInconsistency": {
    "score": 15,
    "issues": [],
    "severity": "LOW",
    "locations": []
  },
  "citationInconsistency": {
    "score": 8,
    "issues": ["Stil de citare schimbat de la (Autor, An) la [1]"],
    "severity": "MEDIUM",
    "locations": ["Capitolul 3"]
  },
  "bibliographyIssues": {
    "score": 4,
    "issues": ["Secțiune de 600 cuvinte fără nicio citare"],
    "severity": "MEDIUM",
    "locations": ["Secțiunea 4.2"]
  },
  "attributionErrors": {
    "score": 5,
    "issues": [],
    "severity": "LOW",
    "locations": []
  }
}

**INSTRUCȚIUNI CRITICE:**
1. Returnează DOAR obiectul JSON, fără text explicativ
2. NU folosi markdown code blocks (nu pune \`\`\`json sau \`\`\`)
3. Începe direct cu { și termină cu }
4. Fiecare criteriu TREBUIE să aibă: score, issues, severity, locations
5. Dacă nu găsești probleme, pune issues: [] și locations: []
6. Severity: LOW (1-2 probleme), MEDIUM (3-5 probleme), HIGH (6-10 probleme), CRITICAL (>10 probleme)`;

    const userPrompt = language === 'en'
      ? `Analyze the following thesis chapter and return the analysis in the exact JSON format from the instructions:

**Chapter ${chapterNumber}: ${chapterTitle}**

---
${content}
---`
      : `Analizează următorul capitol din teză și returnează analiza în format JSON exact ca în exemplul din instrucțiuni:

**Capitol ${chapterNumber}: ${chapterTitle}**

---
${content}
---`;

    // Call Lovable AI WITHOUT tool calling - simple JSON output with clear example
    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 4000,
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

    // Parse AI response - extract JSON from message.content
    let criteriaScores;
    try {
      const firstChoice = aiData.choices?.[0];
      const message: any = firstChoice?.message;

      let rawContent: string = '';
      
      if (typeof message?.content === 'string') {
        rawContent = message.content;
      } else if (Array.isArray(message?.content)) {
        rawContent = message.content
          .map((part: any) => {
            if (typeof part === 'string') return part;
            if (typeof part?.text === 'string') return part.text;
            return '';
          })
          .join(' ');
      }

      if (!rawContent) {
        throw new Error('Nu am primit conținut de la AI');
      }

      console.log('[Plagiarism Analysis] Raw AI content:', rawContent.substring(0, 300));

      // Clean the content - remove markdown code blocks and extra text
      let cleanContent = rawContent.trim();
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Extract only the JSON object
      const firstBrace = cleanContent.indexOf('{');
      const lastBrace = cleanContent.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('Nu am găsit un obiect JSON valid în răspuns');
      }
      
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
      console.log('[Plagiarism Analysis] Cleaned JSON:', cleanContent.substring(0, 300));

      criteriaScores = JSON.parse(cleanContent);

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
        // Validate structure
        if (typeof criteriaScores[field].score !== 'number' ||
            !Array.isArray(criteriaScores[field].issues) ||
            !criteriaScores[field].severity ||
            !Array.isArray(criteriaScores[field].locations)) {
          throw new Error(`Câmpul ${field} nu are structura corectă`);
        }
      }

      console.log('[Plagiarism Analysis] JSON parsed and validated successfully');
    } catch (parseError) {
      console.error('[Plagiarism Analysis] Parse error:', parseError);
      console.error('[Plagiarism Analysis] Full AI data:', JSON.stringify(aiData).substring(0, 1000));
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
    const criteriaNames: Record<string, string> = language === 'en' 
      ? {
          typographyVariations: 'Typography Variations',
          translationErrors: 'AI-Generated Text Detection',
          styleInconsistency: 'Style Inconsistency',
          structureLogic: 'Structure Logic',
          personInconsistency: 'Person Inconsistency',
          citationInconsistency: 'Citation Inconsistency',
          bibliographyIssues: 'Bibliography Issues',
          attributionErrors: 'Attribution Errors',
        }
      : {
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
    typographyVariations: 'Standardize font to Times New Roman 12pt throughout the text. / Standardizează fontul la Times New Roman 12pt pe tot textul.',
    translationErrors: 'Replace AI-generated phrases with authentic academic writing. / Înlocuiește expresiile traduse literal cu echivalente academice corecte.',
    styleInconsistency: 'Maintain consistent language complexity throughout the chapter. / Uniformizează nivelul de complexitate al limbajului pe tot capitolul.',
    structureLogic: 'Add transition paragraphs between sections for logical coherence. / Adaugă paragrafe de tranziție între secțiuni pentru coerentă logică.',
    personInconsistency: 'Choose one narrative perspective (I/we/passive) and maintain it consistently. / Alege o perspectivă narativă și menține-o consistent.',
    citationInconsistency: 'Adopt a single citation style (recommended: APA 7) and apply uniformly. / Adoptă un singur stil de citare (recomandat: APA 7).',
    bibliographyIssues: 'Add updated references (last 5-7 years) in sections without citations. / Adaugă referințe actualizate în secțiunile fără citări.',
    attributionErrors: 'Verify and correct author names and publication years in all citations. / Verifică și corectează numele autorilor și anii de publicare.',
  };

  return recommendations[criterion] || 'Review and correct the identified issue. / Revizuiește și corectează problema identificată.';
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
