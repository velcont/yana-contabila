/**
 * Edge Function Utilities
 * Common helpers for Supabase Edge Functions
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Timeout wrapper for fetch requests
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Retry logic for failed requests
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 10000) // Max 10k characters
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

/**
 * Validate file MIME type
 */
export function validateFileMimeType(
  base64: string,
  allowedTypes: string[]
): boolean {
  // Extract MIME type from base64 data URI
  const mimeMatch = base64.match(/^data:([^;]+);base64,/);
  if (!mimeMatch) return false;
  
  const mimeType = mimeMatch[1];
  return allowedTypes.includes(mimeType);
}

/**
 * Truncate large text for AI processing
 */
export function truncateForAI(text: string, maxChars: number = 50000): string {
  if (text.length <= maxChars) return text;
  
  const truncated = text.slice(0, maxChars);
  return truncated + '\n\n[... truncated for length ...]';
}
