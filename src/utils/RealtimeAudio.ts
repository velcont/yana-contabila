export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
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
      const audioBuffer = await this.audioContext.decodeAudioData(wavData.buffer);
      
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
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      
      // Get ephemeral token from our edge function using Supabase SDK
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-realtime-token', {
        body: {}
      });
      
      if (tokenError) {
        throw new Error(tokenError.message || 'Failed to get ephemeral token');
      }
      
      if (!tokenData?.client_secret?.value) {
        throw new Error('No client_secret in response');
      }
      
      const EPHEMERAL_KEY = tokenData.client_secret.value;
      
      // Connect to OpenAI Realtime WebSocket using subprotocols for auth
      const baseUrl = "wss://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      this.ws = new WebSocket(`${baseUrl}?model=${model}`, [
        "realtime",
        `openai-insecure-api-key.${EPHEMERAL_KEY}`,
        "openai-beta.realtime-v1"
      ]);

      this.ws.onopen = () => {
        console.log("Connected to OpenAI Realtime API");
        this.onConnect();
        
        // Send session configuration with tools
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'Ești Yana, un asistent financiar inteligent care oferă analize și sfaturi despre situația financiară. Răspunde clar și prietenos în limba română. Când utilizatorul îți cere informații despre indicatori financiari (DSO, DPO, EBITDA, profit, etc.), folosește tool-ul get_financial_data pentru a obține datele sale.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            tools: [
              {
                type: 'function',
                name: 'get_financial_data',
                description: 'Obține datele financiare ale utilizatorului din ultima analiză încărcată. Returnează indicatori precum DSO, DPO, EBITDA, profit, cifră de afaceri, etc.',
                parameters: {
                  type: 'object',
                  properties: {
                    metric: {
                      type: 'string',
                      description: 'Indicatorul dorit',
                      enum: ['dso','dpo','ebitda','profit','revenue','cash_flow']
                    },
                    period: {
                      type: 'string',
                      description: 'Perioada cerută (ex: "martie 2025", "03/2025", "2025-03")'
                    }
                  },
                  required: ['metric']
                }
              }
            ],
            tool_choice: 'auto',
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };
        
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(sessionConfig));
          console.log("Session configuration with tools sent");
        }
        
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
      
      if (functionName === 'get_financial_data') {
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
          const p = period.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
          const m = Object.keys(monthMap).find((k) => p.includes(k));
          const yearMatch = p.match(/20\d{2}/)?.[0];
          const mm = m ? monthMap[m] : undefined;
          if (yearMatch && mm) {
            // Try multiple filename and text patterns
            const patterns = [
              `*.${yearMatch}-${mm}.*`,
              `*${mm}-${yearMatch}*`,
              `*${mm}.${yearMatch}*`,
              `*${yearMatch}${mm}*`,
              `*${m}*${yearMatch}*`
            ];
            for (const pat of patterns) {
              filters.push(`ilike(file_name,${pat})`, `ilike(analysis_text,${pat})`);
            }
          } else if (yearMatch) {
            filters.push(`ilike(file_name,*${yearMatch}*)`);
          } else if (m) {
            filters.push(`ilike(file_name,*${m}*)`);
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
        
        // Compose structured financial snapshot
        const mdVal = metric ? md[metric] : undefined;
        let numericVal: number | null = null;
        if (typeof mdVal === 'number') numericVal = mdVal;
        else if (mdVal != null) {
          const n = Number(mdVal);
          if (!Number.isNaN(n)) numericVal = n;
        }
        
        // Fallback: try to parse from analysis_text (e.g., DSO)
        if (numericVal == null && metric) {
          const dec = (s: string) => Number(s.replace(',', '.'));
          if (metric.toLowerCase() === 'dso') {
            const m1 = analysisText.match(/\bDSO\b[^0-9]*([0-9]+(?:[.,][0-9]+)?)/i) 
              || analysisText.match(/days\s*sales\s*outstanding[^0-9]*([0-9]+(?:[.,][0-9]+)?)/i);
            if (m1?.[1]) numericVal = dec(m1[1]);
          }
        }
        
        const result = {
          company_name: analysis.company_name || 'Companie necunoscută',
          period_requested: period || null,
          assumed_period: md.period || new Date(analysis.created_at).toISOString().slice(0, 10),
          requested_metric: metric || null,
          requested_metric_value: numericVal,
          indicators: {
            dso: typeof md.dso === 'number' ? md.dso : md.dso ? Number(md.dso) : undefined,
            dpo: md.dpo ?? undefined,
            ebitda: md.ebitda ?? undefined,
            profit: md.profit ?? undefined,
            revenue: md.revenue ?? undefined,
            cash_flow: md.cash_flow ?? undefined,
          },
          source: {
            file_name: analysis.file_name,
            created_at: analysis.created_at,
            analysis_id: analysis.id,
          }
        };
        
        this.sendFunctionResult(callId, JSON.stringify(result));
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
