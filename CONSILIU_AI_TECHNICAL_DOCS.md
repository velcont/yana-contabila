# 🤖 Consiliu AI - Documentație Tehnică

## 📋 Overview

Sistemul "Consiliu AI" este un mecanism de validare cross-platform care folosește 3 AI-uri diferite pentru a valida analiza financiară. Fiecare AI votează independent pe 10 indicatori financiari, iar sistemul calculează consensul.

## 🏗️ Arhitectură

### Flow:
```
User uploads balance.xlsx
    ↓
analyze-balance function
    ↓
validate-analysis-with-council (PARALLEL)
    ├─→ Lovable AI (Google Gemini 2.5 Flash) - Contabil Expert
    ├─→ Perplexity AI (Llama 3.1 Sonar) - Auditor Financiar  
    └─→ OpenAI (GPT-4o-mini) - CFO Strategic
    ↓
Calculate Consensus (per-indicator voting)
    ↓
Return validation result with badges
```

## 🔑 API Keys Required

**Supabase Secrets:**
- `LOVABLE_API_KEY` - pre-configured ✅
- `PERPLEXITY_API_KEY` - added ✅
- `OPENAI_API_KEY` - already exists ✅

## 📊 Data Structures

### Input (`ValidationRequest`):
```typescript
interface ValidationRequest {
  metadata: Record<string, any>;  // Financial indicators extracted
  analysisText: string;           // Initial AI analysis
  balanceText?: string;           // Raw balance data (optional)
  userId: string;                 // User ID for tracking
}
```

### Output (`ConsensusResult`):
```typescript
interface ConsensusResult {
  validated: boolean;              // Overall validation status
  confidence: number;              // 0-100 confidence score
  aiResponses: AIResponse[];       // Individual AI responses
  agreements: Record<string, IndicatorVote>;  // Per-indicator consensus
  discrepancies: Array<{          // Indicators with no consensus
    field: string;
    reason: string;
    votes: string;
  }>;
  alerts: string[];               // Combined alerts from all AIs
  recommendations: string[];      // Combined recommendations
  consensus: {
    total: number;                // Number of AIs that responded
    indicatorsWithConsensus: number;  // How many indicators have 2/3 agreement
    verdict: "VALIDATED" | "ACCEPTABLE" | "REQUIRES_REVIEW";
  };
}
```

### Per-AI Response:
```typescript
interface AIResponse {
  role: string;                   // "Contabil Expert", "Auditor", "CFO"
  provider: "lovable" | "perplexity" | "openai";
  verdict: string;                // Provider-specific verdict
  confidence: number;             // 0-100
  findings: {                     // Per-indicator findings
    hasStock: boolean;
    hasCapital: boolean;
    hasDebts: boolean;
    hasRevenue: boolean;
    hasCashBank: boolean;
    hasClients: boolean;
    hasSuppliers: boolean;
    hasTaxes: boolean;
    hasExpenses: boolean;
    isProfit: boolean;
  };
  alerts: string[];
  recommendations: string[];
  executionTime?: number;         // Response time in ms
}
```

### Voting System:
```typescript
interface IndicatorVote {
  value: boolean;                 // Final consensus value (majority wins)
  votes: { 
    yes: number;                  // How many AIs voted TRUE
    no: number;                   // How many AIs voted FALSE
    abstain: number;              // How many didn't respond for this indicator
  };
  consensusReached: boolean;      // TRUE if ≥2 AIs agree
  providers: {
    lovable?: boolean;
    perplexity?: boolean;
    openai?: boolean;
  };
}
```

## 🎯 Consensus Logic

### Voting Rules:
1. **Minimum 2 AI responses required** - If <2 AIs respond, function throws error
2. **Per-indicator voting** - Each of 10 indicators is voted separately
3. **Majority wins** - If 2/3 or 3/3 AIs agree → consensus reached
4. **Discrepancy detection** - If vote is 1-1 or 1-0-1 → flagged as discrepancy

### Validation Status:
- `validated = true` if:
  - Overall confidence ≥ 70%
  - No critical discrepancies (≥7/10 indicators have consensus)
  
- `verdict`:
  - `VALIDATED`: validated = true AND confidence ≥ 80%
  - `ACCEPTABLE`: validated = true AND confidence 70-79%
  - `REQUIRES_REVIEW`: <70% confidence OR ≥3 discrepancies

## ⚡ Performance

### Parallel Execution:
- All 3 AI calls start **simultaneously** using `Promise.allSettled()`
- Expected total time: **3-5 seconds** (max of 3 parallel calls)
- ❌ NOT serial (would be 9-15 seconds)

### Timeout Handling:
- Each AI call has **10-second timeout** (AbortController)
- If timeout → AI result excluded, continues with other 2
- System resilient to 1 AI failure

### Cost per Validation:
- Lovable AI: ~$0.002 (Gemini 2.5 Flash)
- Perplexity: ~$0.003 (Llama 3.1 Sonar)
- OpenAI: ~$0.005 (GPT-4o-mini)
- **Total: ~$0.01 per validation** ✅ (well under $0.10 budget)

## 🔧 Error Handling

### Scenarios:
1. **1 AI fails** → Continue with 2/2 consensus
2. **2 AIs fail** → Throw error "< 2 AI-uri au răspuns"
3. **All 3 fail** → Throw error with clear message
4. **Timeout** → Excluded from results, no crash
5. **Invalid JSON** → Fallback parsing for Perplexity (text extraction)
6. **API rate limit (429)** → Logged, excluded from results
7. **API payment required (402)** → Logged, excluded from results

## 🧪 Testing

### Manual Test:
```bash
# Upload a real balance.xlsx via UI
# Check console logs for:
✅ [LOVABLE] Verdict: VALID (1234ms)
✅ [PERPLEXITY] Verdict: WARNING (987ms)  
✅ [OPENAI] Verdict: GOOD (1567ms)
📊 [AI-COUNCIL] Received 3/3 responses
✅ [AI-COUNCIL] Validation complete
   - Verdict: VALIDATED
   - Confidence: 87%
   - Consensus on 9/10 indicators
   - Discrepancies: 1
```

### Expected Logs:
- Function should log each AI call start + result
- Total execution time should be <6 seconds
- Should show consensus calculation details
- Badge should appear in UI with correct styling

## 🎨 UI Integration

### Badge Variants:
```tsx
// VALIDATED (green)
✅ Validat de Consiliul AI (3/3 AI-uri, Confidence: 87%)
Verificat de: LOVABLE, PERPLEXITY, OPENAI
📊 Consens pe 9/10 indicatori financiari

// REQUIRES_REVIEW (yellow)
⚠️ Necesită Verificare (3/3 AI-uri, Confidence: 65%)
Discrepanțe detectate: 3 indicatori în dezacord
• hasProfit: Split vote 1 YES, 2 NO
• hasDebts: Lovable: TRUE, Perplexity: FALSE, OpenAI: ?

// ACCEPTABLE (blue)
⚡ Validare Consiliu AI (3/3 AI-uri, Confidence: 74%)
Analiză verificată cu consens parțial
⚠️ Atenție: 2 indicatori fără consens clar
```

## 🔐 Access Control

### Subscription Tiers:
1. **Free (first 6 analyses)** - Consiliu included
2. **Trial (30 days)** - Consiliu included
3. **Entrepreneur Plan (49 RON/month)** - Consiliu included unlimited
4. **Accountant Plan (199 RON/month)** - Consiliu included unlimited for all clients

### Logic in `analyze-balance`:
```typescript
const hasFreeAnalysesLeft = validatedCount < 6;
const isInTrial = userProfile?.trial_ends_at && new Date(userProfile.trial_ends_at) > new Date();
const hasActiveSubscription = userProfile?.subscription_status === 'active';

const canAnalyze = hasFreeAnalysesLeft || isInTrial || hasActiveSubscription;

if (!canAnalyze) {
  return 403 error with upgrade message;
}

// If user has access, ALWAYS call consiliu
const councilResponse = await supabaseClient.functions.invoke('validate-analysis-with-council', {...});
```

## 📈 Monitoring

### Key Metrics to Track:
- **Success rate**: How often 3/3 AIs respond
- **Consensus rate**: % of analyses with ≥7/10 indicators in consensus
- **Average confidence**: Trend of confidence scores over time
- **Discrepancy types**: Which indicators most often have split votes
- **Response times**: Per-AI latency tracking
- **Cost tracking**: Tokens used per validation

### Logs to Monitor:
```
🔍 [AI-COUNCIL] Starting validation for user X
✅ [LOVABLE] Verdict: VALID (1234ms)
✅ [PERPLEXITY] Verdict: WARNING (987ms)
✅ [OPENAI] Verdict: GOOD (1567ms)
📊 [AI-COUNCIL] Received 3/3 responses
✅ [AI-COUNCIL] Validation complete
   - Verdict: VALIDATED
   - Confidence: 87%
   - Consensus on 9/10 indicators
   - Discrepancies: 1
```

## 🚨 Alerts & Troubleshooting

### Common Issues:

**Issue:** No logs for validate-analysis-with-council
**Cause:** Function never called or crashed immediately
**Fix:** Test with real balance upload, check Supabase logs

**Issue:** All 3 AIs timeout
**Cause:** Network issues or API outages
**Fix:** Check API status pages, increase timeout if needed

**Issue:** Perplexity returns non-JSON
**Cause:** Model returns conversational text instead of structured JSON
**Fix:** Fallback text parsing implemented (parsePerplexityResponse)

**Issue:** Consiliu shows only 1 AI
**Cause:** API keys missing or invalid
**Fix:** Check Supabase secrets, verify keys work with curl test

## 🔄 Future Improvements

### Roadmap:
- [ ] Add admin dashboard showing consiliu success/failure rates
- [ ] Store per-AI responses in DB for audit trail
- [ ] Add manual re-validation button for users
- [ ] A/B test single AI vs consiliu accuracy
- [ ] Add Claude AI as 4th council member (optional)
- [ ] Implement weighted voting (give CFO double weight for strategic indicators)
- [ ] Add confidence calibration (track AI accuracy over time)

## 📚 References

- **Lovable AI Docs**: https://docs.lovable.dev/features/ai
- **Perplexity API Docs**: https://docs.perplexity.ai/
- **OpenAI API Docs**: https://platform.openai.com/docs/

---

**Last Updated:** 2025-11-01
**Version:** 2.0.0 (Parallel execution with 3 real AI providers)
