import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Simple YouTube transcript extractor for Deno
interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

const fetchTranscript = async (videoId: string): Promise<string | null> => {
  try {
    console.log(`[Transcript] Fetching for video ID: ${videoId}`);
    
    // Fetch video page to get transcript data
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    // Find caption tracks in the page HTML
    const captionTrackMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (!captionTrackMatch) {
      console.warn(`[Transcript] No captions found for ${videoId}`);
      return null;
    }
    
    const captionTracks = JSON.parse(captionTrackMatch[1]);
    if (!captionTracks || captionTracks.length === 0) {
      return null;
    }
    
    // Try to find English or Romanian transcript, fallback to first available
    let transcriptUrl = captionTracks.find((track: any) => 
      track.languageCode === 'en' || track.languageCode === 'ro'
    )?.baseUrl || captionTracks[0]?.baseUrl;
    
    if (!transcriptUrl) {
      return null;
    }
    
    // Fetch the transcript XML
    const transcriptResponse = await fetch(transcriptUrl);
    const transcriptXml = await transcriptResponse.text();
    
    // Parse XML to extract text
    const textMatches = transcriptXml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
    const texts: string[] = [];
    
    for (const match of textMatches) {
      const text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]*>/g, '') // Remove any HTML tags
        .trim();
      
      if (text) {
        texts.push(text);
      }
    }
    
    const fullText = texts.join(' ').replace(/\s+/g, ' ').trim();
    
    if (!fullText || fullText.length < 100) {
      console.warn(`[Transcript] Transcript too short: ${fullText.length} chars`);
      return null;
    }
    
    console.log(`[Transcript] SUCCESS: ${fullText.length} characters extracted`);
    return fullText;
    
  } catch (error: any) {
    console.error(`[Transcript] ERROR:`, error.message);
    return null;
  }
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { videoUrl } = await req.json();
    
    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'videoUrl is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
    
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid YouTube URL',
          transcript: null 
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
    
    const transcript = await fetchTranscript(videoId);
    
    return new Response(
      JSON.stringify({ 
        videoId,
        transcript,
        success: !!transcript,
        length: transcript?.length || 0
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
    
  } catch (error: any) {
    console.error('Error in extract-youtube-transcript:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        transcript: null 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});
