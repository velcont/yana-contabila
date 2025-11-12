/**
 * Centralized AI Cost Configuration
 * All AI-related pricing in one place for easy maintenance
 */

export const AI_COSTS = {
  // Strategic Advisor costs (RON per message)
  STRATEGIC_ADVISOR: {
    MESSAGE_COST: 0.5,
    WARNING_THRESHOLD: 2.0,
    CRITICAL_THRESHOLD: 0.0,
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
  },
} as const;

export type AIModel = keyof typeof AI_COSTS.MODELS;
