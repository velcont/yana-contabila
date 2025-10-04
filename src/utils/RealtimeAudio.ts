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

  constructor(
    private onMessage: (message: any) => void,
    private onConnect: () => void,
    private onDisconnect: () => void
  ) {}

  async init() {
    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      
      // Get ephemeral token from our edge function
      const tokenUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-realtime-token`;
      const tokenResponse = await fetch(tokenUrl);
      
      if (!tokenResponse.ok) {
        throw new Error(`Failed to get token: ${await tokenResponse.text()}`);
      }
      
      const tokenData = await tokenResponse.json();
      console.log("Ephemeral token received");
      
      if (!tokenData.client_secret?.value) {
        throw new Error("No client_secret in response");
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
                    period: {
                      type: 'string',
                      description: 'Perioada pentru care se cer datele (ex: "martie 2025", "Q1 2025")'
                    }
                  }
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

          // Handle function calls
          if (data.type === 'response.function_call_arguments.done') {
            console.log("Function call:", data.name, data.arguments);
            await this.handleFunctionCall(data.call_id, data.name, data.arguments);
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
        // Import supabase client
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Get the latest analysis
        const { data: analyses, error } = await supabase
          .from('analyses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error('Error fetching analysis:', error);
          this.sendFunctionResult(callId, JSON.stringify({ 
            error: 'Nu am putut prelua datele financiare.' 
          }));
          return;
        }
        
        if (!analyses || analyses.length === 0) {
          this.sendFunctionResult(callId, JSON.stringify({ 
            message: 'Nu există nicio analiză financiară încărcată încă.' 
          }));
          return;
        }
        
        const analysis = analyses[0];
        const result = {
          company_name: analysis.company_name || 'Companie necunoscută',
          analysis_date: analysis.created_at,
          file_name: analysis.file_name,
          metadata: analysis.metadata,
          analysis_summary: analysis.analysis_text?.substring(0, 500) + '...'
        };
        
        this.sendFunctionResult(callId, JSON.stringify(result));
      }
    } catch (error) {
      console.error('Error handling function call:', error);
      this.sendFunctionResult(callId, JSON.stringify({ 
        error: 'A apărut o eroare la preluarea datelor.' 
      }));
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
