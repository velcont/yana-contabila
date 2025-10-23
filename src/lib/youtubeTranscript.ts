import { YoutubeTranscript } from 'youtube-transcript';

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
 * Extrage transcriptul unui video YouTube
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

    // Încearcă română, apoi engleză, apoi orice limbă disponibilă
    let transcript;
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ro' });
    } catch {
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
      } catch {
        transcript = await YoutubeTranscript.fetchTranscript(videoId);
      }
    }

    // Concatenează textul
    const fullText = transcript
      .map(entry => entry.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!fullText || fullText.length < 100) {
      console.warn(`[YouTube Transcript] Transcript prea scurt: ${fullText.length} chars`);
      return null;
    }

    console.log(`[YouTube Transcript] ✓ SUCCESS: ${fullText.length} caractere extrase`);
    return fullText;

  } catch (error: any) {
    console.error(`[YouTube Transcript] EROARE:`, error.message);
    
    if (error.message?.includes('Transcript is disabled')) {
      console.warn('[YouTube Transcript] Video-ul nu are transcriere disponibilă');
    } else if (error.message?.includes('Video unavailable')) {
      console.warn('[YouTube Transcript] Video indisponibil sau privat');
    }
    
    return null;
  }
};

/**
 * Procesează o listă de link-uri YouTube și extrage transcripturile
 * @param urls - Array de URL-uri YouTube
 * @returns Map cu URL → transcript
 */
export const batchFetchTranscripts = async (
  urls: string[]
): Promise<Map<string, string>> => {
  const results = new Map<string, string>();
  
  console.log(`[Batch Transcript] 📝 Procesare ${urls.length} video-uri...`);
  
  // Procesează secvențial pentru a evita rate limiting
  for (const url of urls) {
    const transcript = await fetchYouTubeTranscript(url);
    if (transcript) {
      results.set(url, transcript);
    }
    
    // Delay mic între cereri (500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`[Batch Transcript] ✓ Extrase cu succes: ${results.size}/${urls.length}`);
  
  return results;
};

/**
 * Verifică dacă un URL este de la YouTube
 */
export const isYouTubeUrl = (url: string): boolean => {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
};
