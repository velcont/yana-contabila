export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      console.log('[AudioRecorder] Requesting microphone access...');
      
      // Request microphone with mobile-friendly constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('[AudioRecorder] Microphone access granted');
      
      // Support both standard and webkit AudioContext for iOS
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported on this device');
      }
      
      this.audioContext = new AudioContextClass({
        sampleRate: 24000,
        latencyHint: 'interactive'
      });
      
      // Resume AudioContext if suspended (iOS requirement)
      if (this.audioContext.state === 'suspended') {
        console.log('[AudioRecorder] Resuming suspended AudioContext...');
        await this.audioContext.resume();
      }
      
      console.log('[AudioRecorder] AudioContext state:', this.audioContext.state);
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const wavData = this.createWavFromPCM(audioData);
      // Create a proper ArrayBuffer copy
      const uint8Array = new Uint8Array(wavData.buffer);
      const arrayBuffer = uint8Array.slice().buffer;
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext();
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
    
    return wavArray;
  }
}

let audioQueueInstance: AudioQueue | null = null;

export const playAudioData = async (audioContext: AudioContext, audioData: Uint8Array) => {
  if (!audioQueueInstance) {
    audioQueueInstance = new AudioQueue(audioContext);
  }
  await audioQueueInstance.addToQueue(audioData);
};

export class RealtimeChat {
  private ws: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private fnArgsBuffer: Record<string, string> = {};
  private fnNameByCallId: Record<string, string> = {};

  constructor(
    private onMessage: (message: any) => void,
    private onConnect: () => void,
    private onDisconnect: () => void
  ) {}

  async init() {
    try {
      console.log('[RealtimeChat] Initializing...');
      
      // Support both standard and webkit AudioContext for iOS
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext not supported on this device');
      }
      
      this.audioContext = new AudioContextClass({ 
        sampleRate: 24000,
        latencyHint: 'interactive'
      });
      
      // Resume AudioContext if suspended (iOS requirement)
      if (this.audioContext.state === 'suspended') {
        console.log('[RealtimeChat] Resuming suspended AudioContext...');
        await this.audioContext.resume();
      }
      
      console.log('[RealtimeChat] AudioContext state:', this.audioContext.state);
      
      // Get ephemeral token from our edge function using Supabase SDK
// Connect to our Lovable Cloud voice proxy (WebSocket)
const EDGE_WS_URL = "wss://ygfsuoloxzjpiulogrjz.functions.supabase.co/functions/v1/realtime-chat";
this.ws = new WebSocket(EDGE_WS_URL);

      this.ws.onopen = () => {
        console.log("Connected to voice server");
        this.onConnect();
        this.startRecording();
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message type:", data.type);
          
          this.onMessage(data);

          // Handle tool calling events
          if (data.type === 'response.tool_call.created') {
            // Map call_id to function name
            if (data.call_id && data.name) {
              this.fnNameByCallId[data.call_id] = data.name as string;
              this.fnArgsBuffer[data.call_id] = '';
            }
          }

          if (data.type === 'response.function_call_arguments.delta') {
            if (data.call_id && typeof data.delta === 'string') {
              this.fnArgsBuffer[data.call_id] = (this.fnArgsBuffer[data.call_id] || '') + data.delta;
            }
          }

          if (data.type === 'response.function_call_arguments.done') {
            const callId = data.call_id as string;
            const name = this.fnNameByCallId[callId] || (data.name as string) || 'get_financial_data';
            const argsStr = this.fnArgsBuffer[callId] || (data.arguments as string) || '{}';
            console.log("Function call complete:", name, argsStr);
            await this.handleFunctionCall(callId, name, argsStr);
          }

          if (data.type === 'response.audio.delta' && data.delta) {
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            if (this.audioContext) {
              await playAudioData(this.audioContext, bytes);
            }
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.ws.onclose = () => {
        console.log("Disconnected from server");
        this.onDisconnect();
        this.stopRecording();
      };
    } catch (error) {
      console.error("Error initializing chat:", error);
      throw error;
    }
  }

  private async handleFunctionCall(callId: string, functionName: string, args: string) {
    try {
      console.log(`Handling function call: ${functionName}`, args);
      
      if (functionName === 'search_balance_info') {
        // Parse arguments
        let period: string | undefined;
        let search_term: string | undefined;
        try {
          const parsed = typeof args === 'string' ? JSON.parse(args || '{}') : args;
          period = parsed?.period as string | undefined;
          search_term = parsed?.search_term as string | undefined;
        } catch (_) {}
        
        if (!search_term) {
          this.sendFunctionResult(callId, JSON.stringify({ error: 'Termenul de căutare lipsește.' }));
          return;
        }
        
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Build period filters
        const monthMap: Record<string, string> = {
          ianuarie: '01', februarie: '02', martie: '03', aprilie: '04', mai: '05', iunie: '06',
          iulie: '07', august: '08', septembrie: '09', octombrie: '10', noiembrie: '11', decembrie: '12'
        };
        let filters: string[] = [];
        if (period) {
          const p = period.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const m = Object.keys(monthMap).find((k) => p.includes(k));
          const yearMatch = p.match(/20\d{2}/)?.[0];
          const mm = m ? monthMap[m] : undefined;
          if (yearMatch && mm) {
            const patterns = [
              `*.${yearMatch}-${mm}.*`,
              `*${mm}-${yearMatch}*`,
              `*${mm}.${yearMatch}*`,
              `*${yearMatch}${mm}*`,
              `*${m}*${yearMatch}*`
            ];
            for (const pat of patterns) {
              filters.push(`file_name.ilike.${pat}`, `analysis_text.ilike.${pat}`);
            }
          } else if (yearMatch) {
            filters.push(`file_name.ilike.*${yearMatch}*`, `analysis_text.ilike.*${yearMatch}*`);
          } else if (m) {
            filters.push(`file_name.ilike.*${m}*`, `analysis_text.ilike.*${m}*`);
          }
        }
        
        let analysesResp;
        if (filters.length > 0) {
          analysesResp = await supabase
            .from('analyses')
            .select('*')
            .or(filters.join(','))
            .order('created_at', { ascending: false })
            .limit(1);
        } else {
          analysesResp = await supabase
            .from('analyses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        }
        
        const { data: analyses, error } = analysesResp as any;
        if (error) {
          console.error('Error fetching analysis:', error);
          this.sendFunctionResult(callId, JSON.stringify({ error: 'Nu am putut prelua datele.' }));
          return;
        }
        
        let rows = analyses as any[] | null;
        if (!rows || rows.length === 0) {
          const { data: recent, error: e2 } = await supabase
            .from('analyses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
          if (e2) {
            console.error('Error fetching latest analysis:', e2);
            this.sendFunctionResult(callId, JSON.stringify({ error: 'Nu am putut prelua datele.' }));
            return;
          }
          rows = recent;
        }
        
        if (!rows || rows.length === 0) {
          this.sendFunctionResult(callId, JSON.stringify({ message: 'Nu există nicio analiză încărcată încă.' }));
          return;
        }
        
        const analysis = rows[0];
        const analysisText: string = analysis?.analysis_text || '';
        
        // Normalizăm termenul de căutare
        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const searchNorm = norm(search_term);
        
        // Caută în text contextul în jurul termenului căutat
        const lines = analysisText.split('\n');
        const relevantLines: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const lineNorm = norm(lines[i]);
          // Caută și numeric și text normalizat
          if (lineNorm.includes(searchNorm) || lines[i].includes(search_term)) {
            // Adaugă context: 2 linii înainte și 2 linii după
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length, i + 3);
            for (let j = start; j < end; j++) {
              if (!relevantLines.includes(lines[j])) {
                relevantLines.push(lines[j]);
              }
            }
          }
        }

        const result = {
          period: period || 'ultima analiză',
          search_term: search_term,
          found_info: relevantLines.length > 0,
          context: relevantLines.join('\n').trim(),
          company_name: analysis.company_name || 'Companie necunoscută',
          file_name: analysis.file_name,
          message: relevantLines.length > 0 
            ? `Am găsit informații despre ${search_term} în balanța pentru ${period || 'ultima perioadă'}.`
            : `Nu am găsit informații despre ${search_term} în balanța pentru ${period || 'ultima perioadă'}.`
        };

        this.sendFunctionResult(callId, JSON.stringify(result));
        
      } else if (functionName === 'get_financial_data') {
        // Parse arguments
        let period: string | undefined;
        let metric: string | undefined;
        try {
          const parsed = typeof args === 'string' ? JSON.parse(args || '{}') : args;
          period = parsed?.period as string | undefined;
          metric = parsed?.metric as string | undefined;
        } catch (_) {}
        
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Build period-aware query heuristics (month name or MM/YYYY or YYYY-MM)
        const monthMap: Record<string, string> = {
          ianuarie: '01', februarie: '02', martie: '03', aprilie: '04', mai: '05', iunie: '06',
          iulie: '07', august: '08', septembrie: '09', octombrie: '10', noiembrie: '11', decembrie: '12'
        };
        let filters: string[] = [];
        if (period) {
          const p = period.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const m = Object.keys(monthMap).find((k) => p.includes(k));
          const yearMatch = p.match(/20\d{2}/)?.[0];
          const mm = m ? monthMap[m] : undefined;
          if (yearMatch && mm) {
            const patterns = [
              `*.${yearMatch}-${mm}.*`,
              `*${mm}-${yearMatch}*`,
              `*${mm}.${yearMatch}*`,
              `*${yearMatch}${mm}*`,
              `*${m}*${yearMatch}*`
            ];
            for (const pat of patterns) {
              filters.push(`file_name.ilike.${pat}`, `analysis_text.ilike.${pat}`);
            }
          } else if (yearMatch) {
            filters.push(`file_name.ilike.*${yearMatch}*`, `analysis_text.ilike.*${yearMatch}*`);
          } else if (m) {
            filters.push(`file_name.ilike.*${m}*`, `analysis_text.ilike.*${m}*`);
          }
        }
        
        let analysesResp;
        if (filters.length > 0) {
          analysesResp = await supabase
            .from('analyses')
            .select('*')
            .or(filters.join(','))
            .order('created_at', { ascending: false })
            .limit(1);
        } else {
          analysesResp = await supabase
            .from('analyses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        }
        
        const { data: analyses, error } = analysesResp as any;
        if (error) {
          console.error('Error fetching analysis:', error);
          this.sendFunctionResult(callId, JSON.stringify({ error: 'Nu am putut prelua datele financiare.' }));
          return;
        }
        
        // Fallback: if no rows matched the period filters, fetch the latest analysis
        let rows = analyses as any[] | null;
        if (!rows || rows.length === 0) {
          const { data: recent, error: e2 } = await supabase
            .from('analyses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
          if (e2) {
            console.error('Error fetching latest analysis:', e2);
            this.sendFunctionResult(callId, JSON.stringify({ error: 'Nu am putut prelua datele financiare.' }));
            return;
          }
          rows = recent;
        }
        
        if (!rows || rows.length === 0) {
          this.sendFunctionResult(callId, JSON.stringify({ message: 'Nu există nicio analiză financiară încărcată încă.' }));
          return;
        }
        
        const analysis = rows[0];
        const md = (analysis?.metadata || {}) as Record<string, any>;
        const analysisText: string = analysis?.analysis_text || '';
        const { parseAnalysisText } = await import('@/utils/analysisParser');
        const parsed = parseAnalysisText(analysisText);
        
        // Compose structured financial snapshot
        const mdVal = metric ? md[metric] : undefined;
        let numericVal: number | null = null;
        if (typeof mdVal === 'number') numericVal = mdVal;
        else if (mdVal != null) {
          const n = Number(mdVal);
          if (!Number.isNaN(n)) numericVal = n;
        }
        // Try structured parser mapping by metric  
        if (numericVal == null && metric) {
          const map: Record<string, keyof typeof parsed> = {
            dso: 'dso',
            dpo: 'dpo',
            ebitda: 'ebitda',
            profit: 'profit',
            revenue: 'revenue'
          } as const;
          const key = map[metric.toLowerCase()];
          const val = key ? (parsed as any)[key] : undefined;
          if (typeof val === 'number' && !Number.isNaN(val)) numericVal = val;
        }
        
        // If still null, check if indicator exists in parsed with undefined (meaning "not available")
        const isUnavailable = metric && (parsed as any)[metric.toLowerCase()] === undefined;
        
        const result = {
          company_name: analysis.company_name || 'Companie necunoscută',
          period_requested: period || null,
          assumed_period: md.period || new Date(analysis.created_at).toISOString().slice(0, 10),
          requested_metric: metric || null,
          requested_metric_value: numericVal,
          data_available: numericVal !== null || !isUnavailable,
          message: numericVal === null && isUnavailable 
            ? `Indicatorul ${metric?.toUpperCase()} nu este disponibil în analiza pentru această perioadă. Acest lucru se poate datora lipsei unor date necesare în balanța contabilă încărcată.`
            : undefined,
          indicators: {
            dso: parsed.dso ?? (typeof md.dso === 'number' ? md.dso : undefined),
            dpo: parsed.dpo ?? md.dpo,
            ebitda: parsed.ebitda ?? md.ebitda,
            profit: parsed.profit ?? md.profit,
            revenue: parsed.revenue ?? md.revenue,
            cash_flow: md.cash_flow,
          },
          source: {
            file_name: analysis.file_name,
            created_at: analysis.created_at,
            analysis_id: analysis.id,
          }
        };
        
        this.sendFunctionResult(callId, JSON.stringify(result));
        
      } else if (functionName === 'get_analyses_history') {
        // Parse arguments
        let limit = 5;
        try {
          const parsed = typeof args === 'string' ? JSON.parse(args || '{}') : args;
          limit = parsed?.limit || 5;
        } catch (_) {}
        
        const { supabase } = await import('@/integrations/supabase/client');
        
        const { data: analyses, error } = await supabase
          .from('analyses')
          .select('id, file_name, created_at, analysis_text, metadata, company_name')
          .order('created_at', { ascending: false })
          .limit(Math.min(limit, 10));
        
        if (error) {
          console.error('Error fetching analyses history:', error);
          this.sendFunctionResult(callId, JSON.stringify({ error: 'Nu am putut prelua istoricul analizelor.' }));
          return;
        }
        
        const result = {
          analyses: analyses || [],
          count: analyses?.length || 0,
          message: `Am găsit ${analyses?.length || 0} analize în istoric.`
        };
        
        this.sendFunctionResult(callId, JSON.stringify(result));
        
      } else if (functionName === 'get_analysis_by_period') {
        // Parse arguments
        let period: string | undefined;
        try {
          const parsed = typeof args === 'string' ? JSON.parse(args || '{}') : args;
          period = parsed?.period as string | undefined;
        } catch (_) {}
        
        if (!period) {
          this.sendFunctionResult(callId, JSON.stringify({ error: 'Perioada lipsește.' }));
          return;
        }
        
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Reutilizez logica de căutare după perioadă
        const monthMap: Record<string, string> = {
          ianuarie: '01', februarie: '02', martie: '03', aprilie: '04', mai: '05', iunie: '06',
          iulie: '07', august: '08', septembrie: '09', octombrie: '10', noiembrie: '11', decembrie: '12'
        };
        
        let filters: string[] = [];
        const p = period.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const m = Object.keys(monthMap).find((k) => p.includes(k));
        const yearMatch = p.match(/20\d{2}/)?.[0];
        const mm = m ? monthMap[m] : undefined;
        
        if (yearMatch && mm) {
          const patterns = [
            `*.${yearMatch}-${mm}.*`,
            `*${mm}-${yearMatch}*`,
            `*${mm}.${yearMatch}*`,
            `*${yearMatch}${mm}*`,
            `*${m}*${yearMatch}*`
          ];
          for (const pat of patterns) {
            filters.push(`file_name.ilike.${pat}`, `analysis_text.ilike.${pat}`);
          }
        } else if (yearMatch) {
          filters.push(`file_name.ilike.*${yearMatch}*`, `analysis_text.ilike.*${yearMatch}*`);
        } else if (m) {
          filters.push(`file_name.ilike.*${m}*`, `analysis_text.ilike.*${m}*`);
        }
        
        let analysesResp;
        if (filters.length > 0) {
          analysesResp = await supabase
            .from('analyses')
            .select('*')
            .or(filters.join(','))
            .order('created_at', { ascending: false })
            .limit(1);
        } else {
          analysesResp = await supabase
            .from('analyses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
        }
        
        const { data: analyses, error } = analysesResp as any;
        if (error) {
          console.error('Error fetching analysis by period:', error);
          this.sendFunctionResult(callId, JSON.stringify({ error: 'Nu am putut găsi analiza.' }));
          return;
        }
        
        let rows = analyses as any[] | null;
        if (!rows || rows.length === 0) {
          const { data: recent, error: e2 } = await supabase
            .from('analyses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
          if (e2) {
            this.sendFunctionResult(callId, JSON.stringify({ error: 'Nu am putut găsi analiza.' }));
            return;
          }
          rows = recent;
        }
        
        if (!rows || rows.length === 0) {
          this.sendFunctionResult(callId, JSON.stringify({ 
            error: `Nu am găsit analiza pentru perioada "${period}".`,
            message: 'Nu există nicio analiză încărcată.'
          }));
          return;
        }
        
        const analysis = rows[0];
        const result = {
          analysis: analysis,
          message: `Am găsit analiza pentru ${period}.`
        };
        
        this.sendFunctionResult(callId, JSON.stringify(result));
        
      } else if (functionName === 'get_proactive_insights') {
        // Parse arguments
        let only_unread = false;
        try {
          const parsed = typeof args === 'string' ? JSON.parse(args || '{}') : args;
          only_unread = parsed?.only_unread || false;
        } catch (_) {}
        
        const { supabase } = await import('@/integrations/supabase/client');
        
        let query = supabase
          .from('chat_insights')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (only_unread) {
          query = query.eq('is_read', false);
        }
        
        const { data: insights, error } = await query;
        
        if (error) {
          console.error('Error fetching insights:', error);
          this.sendFunctionResult(callId, JSON.stringify({ error: 'Nu am putut prelua alertele.' }));
          return;
        }
        
        const result = {
          insights: insights || [],
          count: insights?.length || 0,
          message: `Am găsit ${insights?.length || 0} ${only_unread ? 'alerte necitite' : 'alerte'}.`
        };
        
        this.sendFunctionResult(callId, JSON.stringify(result));
        
      } else if (functionName === 'compare_periods') {
        // Parse arguments
        let period1: string | undefined;
        let period2: string | undefined;
        try {
          const parsed = typeof args === 'string' ? JSON.parse(args || '{}') : args;
          period1 = parsed?.period1 as string | undefined;
          period2 = parsed?.period2 as string | undefined;
        } catch (_) {}
        
        if (!period1 || !period2) {
          this.sendFunctionResult(callId, JSON.stringify({ error: 'Perioadele lipsesc.' }));
          return;
        }
        
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Helper function to find analysis by period
        const findAnalysisByPeriod = async (period: string) => {
          const monthMap: Record<string, string> = {
            ianuarie: '01', februarie: '02', martie: '03', aprilie: '04', mai: '05', iunie: '06',
            iulie: '07', august: '08', septembrie: '09', octombrie: '10', noiembrie: '11', decembrie: '12'
          };
          
          let filters: string[] = [];
          const p = period.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const m = Object.keys(monthMap).find((k) => p.includes(k));
          const yearMatch = p.match(/20\d{2}/)?.[0];
          const mm = m ? monthMap[m] : undefined;
          
          if (yearMatch && mm) {
            const patterns = [
              `*.${yearMatch}-${mm}.*`,
              `*${mm}-${yearMatch}*`,
              `*${mm}.${yearMatch}*`,
              `*${yearMatch}${mm}*`,
              `*${m}*${yearMatch}*`
            ];
            for (const pat of patterns) {
              filters.push(`file_name.ilike.${pat}`, `analysis_text.ilike.${pat}`);
            }
          } else if (yearMatch) {
            filters.push(`file_name.ilike.*${yearMatch}*`, `analysis_text.ilike.*${yearMatch}*`);
          } else if (m) {
            filters.push(`file_name.ilike.*${m}*`, `analysis_text.ilike.*${m}*`);
          }
          
          let analysesResp;
          if (filters.length > 0) {
            analysesResp = await supabase
              .from('analyses')
              .select('*')
              .or(filters.join(','))
              .order('created_at', { ascending: false })
              .limit(1);
          } else {
            analysesResp = await supabase
              .from('analyses')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(1);
          }
          
          const { data: analyses } = analysesResp as any;
          return analyses?.[0] || null;
        };
        
        // Find both analyses
        const [analysis1, analysis2] = await Promise.all([
          findAnalysisByPeriod(period1),
          findAnalysisByPeriod(period2)
        ]);
        
        if (!analysis1 || !analysis2) {
          this.sendFunctionResult(callId, JSON.stringify({ 
            error: `Nu am găsit ${!analysis1 ? period1 : ''} ${!analysis1 && !analysis2 ? 'și' : ''} ${!analysis2 ? period2 : ''}.`
          }));
          return;
        }
        
        const analyses = [analysis1, analysis2];
        
        const [old, current] = analyses.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const oldMeta = (old.metadata || {}) as Record<string, any>;
        const currentMeta = (current.metadata || {}) as Record<string, any>;
        
        const comparison: any = {
          period_old: { date: old.created_at, file: old.file_name, indicators: oldMeta },
          period_new: { date: current.created_at, file: current.file_name, indicators: currentMeta },
          changes: {}
        };
        
        // Calculează schimbări procentuale
        for (const key of ['dso', 'dpo', 'ebitda', 'profit', 'revenue']) {
          if (oldMeta[key] && currentMeta[key]) {
            const oldVal = parseFloat(oldMeta[key]);
            const newVal = parseFloat(currentMeta[key]);
            const change = ((newVal - oldVal) / Math.abs(oldVal)) * 100;
            comparison.changes[key] = {
              old: oldVal,
              new: newVal,
              change_pct: Math.round(change * 10) / 10,
              trend: change > 0 ? 'crescător' : change < 0 ? 'descrescător' : 'stabil'
            };
          }
        }
        
        comparison.message = `Comparație între ${old.file_name} și ${current.file_name}.`;
        this.sendFunctionResult(callId, JSON.stringify(comparison));
      }
    } catch (error) {
      console.error('Error handling function call:', error);
      this.sendFunctionResult(callId, JSON.stringify({ error: 'A apărut o eroare la preluarea datelor.' }));
    }
  }

  private sendFunctionResult(callId: string, output: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not ready');
      return;
    }

    // Send function result
    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: output
      }
    }));
    
    // Trigger response generation
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  private async startRecording() {
    try {
      this.recorder = new AudioRecorder((audioData) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          const encoded = encodeAudioForAPI(audioData);
          this.ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encoded
          }));
        }
      });
      await this.recorder.start();
      console.log("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }

  private stopRecording() {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
  }

  sendTextMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    }));
    
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  disconnect() {
    this.stopRecording();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
