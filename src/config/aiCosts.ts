/**
 * Centralized AI Cost Configuration
 * All AI-related pricing in one place for easy maintenance
 */

export const AI_COSTS = {
  // Strategic Advisor costs (RON per message) - Multi-Agent System
  STRATEGIC_ADVISOR: {
    MESSAGE_COST: 0.75, // 0.25 (validator) + 0.5 (strategist)
    WARNING_THRESHOLD: 2.0,
    CRITICAL_THRESHOLD: 0.0,
    BREAKDOWN: {
      VALIDATOR_COST: 0.25, // Gemini 2.5 Flash - fact extraction & validation
      STRATEGIST_COST: 0.5, // Claude Sonnet 4.5 - strategy generation
    }
  },
  
  // Chat AI costs (RON per message)
  CHAT_AI: {
    BALANCE_ANALYSIS: 0.3,
    FISCAL_QUERY: 0.2,
  },
  
  // Voice interface costs (RON per minute)
  VOICE: {
    PER_MINUTE: 0.8,
    WARNING_THRESHOLD: 5.0,
  },
  
  // Grok validation costs (RON per validation)
  GROK_VALIDATION: {
    PER_VALIDATION: 0.75,
    WARNING_THRESHOLD: 2.0,
    DESCRIPTION: 'Validare automată cu Grok AI (cel mai puternic model contabil)',
  },
  
  // Model costs estimation (tokens to RON conversion)
  MODELS: {
    'google/gemini-2.5-flash': {
      INPUT_TOKENS_PER_RON: 2000,
      OUTPUT_TOKENS_PER_RON: 2000,
    },
    'openai/gpt-5': {
      INPUT_TOKENS_PER_RON: 1500,
      OUTPUT_TOKENS_PER_RON: 1500,
    },
    'x-ai/grok-3': {
      INPUT_TOKENS_PER_RON: 1800,
      OUTPUT_TOKENS_PER_RON: 1800,
    },
  },
} as const;

export type AIModel = keyof typeof AI_COSTS.MODELS;
