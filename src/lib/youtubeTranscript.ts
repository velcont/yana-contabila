import { supabase } from '@/integrations/supabase/client';

/**
 * Extrage ID-ul video din URL YouTube
 */
export const extractVideoId = (url: string): string | null => {
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Extrage transcriptul unui video YouTube folosind edge function
 * @param videoUrl - URL-ul video-ului
 * @returns Transcriptul complet sau null dacă nu se poate extrage
 */
export const fetchYouTubeTranscript = async (videoUrl: string): Promise<string | null> => {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      console.log(`[YouTube Transcript] URL invalid: ${videoUrl}`);
      return null;
    }

    console.log(`[YouTube Transcript] Extragere pentru video ID: ${videoId}`);

    // Call edge function to extract transcript
    const { data, error } = await supabase.functions.invoke('extract-youtube-transcript', {
      body: { videoUrl }
    });

    if (error) {
      console.error(`[YouTube Transcript] EROARE:`, error.message);
      return null;
    }

    if (!data?.transcript) {
      console.warn(`[YouTube Transcript] Nu s-a putut extrage transcriptul pentru ${videoId}`);
      return null;
    }

    console.log(`[YouTube Transcript] ✓ SUCCESS: ${data.length} caractere extrase`);
    return data.transcript;

  } catch (error: any) {
    console.error(`[YouTube Transcript] EROARE:`, error.message);
    return null;
  }
};

/**
 * Verifică dacă un URL este de la YouTube
 */
export const isYouTubeUrl = (url: string): boolean => {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
};

/**
 * Extrage transcripturile pentru multiple video-uri YouTube
 * @param videoUrls - Array de URL-uri YouTube
 * @param onProgress - Callback pentru progres (current, total)
 * @returns Map cu URL -> transcript
 */
export const batchFetchTranscripts = async (
  videoUrls: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, string>> => {
  const results = new Map<string, string>();
  
  console.log(`[Batch Transcript] Procesare ${videoUrls.length} video-uri YouTube...`);
  
  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    
    if (onProgress) {
      onProgress(i + 1, videoUrls.length);
    }
    
    try {
      const transcript = await fetchYouTubeTranscript(url);
      if (transcript && transcript.length > 100) {
        results.set(url, transcript);
        console.log(`[Batch Transcript] ✅ Extras: ${url} (${transcript.length} caractere)`);
      } else {
        console.warn(`[Batch Transcript] ⚠️ Transcript prea scurt sau gol: ${url}`);
      }
    } catch (err) {
      console.error(`[Batch Transcript] ❌ Eroare pentru ${url}:`, err);
    }
    
    // Pauză între request-uri pentru a evita rate limiting
    if (i < videoUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`[Batch Transcript] ✅ Finalizat: ${results.size}/${videoUrls.length} extrase cu succes`);
  
  return results;
};
