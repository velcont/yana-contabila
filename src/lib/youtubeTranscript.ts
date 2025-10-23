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
