/**
 * Fetch wrapper cu timeout automat pentru a preveni blocarea indefinită
 * 
 * @param url - URL-ul pentru fetch
 * @param options - Opțiuni fetch standard
 * @param timeoutMs - Timeout în milisecunde (default: 30000ms = 30s)
 * @returns Promise cu Response
 * @throws Error dacă timeout-ul expiră
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
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout după ${timeoutMs}ms`);
    }
    
    throw error;
  }
}
