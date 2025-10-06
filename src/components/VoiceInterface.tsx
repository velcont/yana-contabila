import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { supabase } from '@/integrations/supabase/client';

interface VoiceInterfaceProps {
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onTranscript }) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false); // Disabled by default
  const [thinkingStatus, setThinkingStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const chatRef = useRef<RealtimeChat | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const checkVoiceUsage = async () => {
    try {
      const { data, error } = await supabase.rpc('get_voice_usage_for_month');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const usage = data[0];
        const remaining = parseFloat(usage.minutes_remaining.toString());
        setMinutesRemaining(remaining);
        return remaining;
      }
      
      return 20; // Default limit
    } catch (error) {
      console.error('Error checking voice usage:', error);
      return 20;
    }
  };

  const handleMessage = (event: any) => {
    console.log('Message received:', event.type);
    
    if (event.type === 'response.audio_transcript.delta' && event.delta) {
      setThinkingStatus('speaking');
      onTranscript?.(event.delta, 'assistant');
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      setThinkingStatus('thinking');
      onTranscript?.(event.transcript, 'user');
    } else if (event.type === 'response.audio.delta') {
      setThinkingStatus('speaking');
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done') {
      setThinkingStatus('listening');
      setIsSpeaking(false);
    } else if (event.type === 'input_audio_buffer.speech_started') {
      setThinkingStatus('listening');
    } else if (event.type === 'input_audio_buffer.speech_stopped') {
      setThinkingStatus('thinking');
    } else if (event.type === 'error') {
      console.error('Realtime API error:', event.error);
      setThinkingStatus('idle');
      toast({
        title: "Eroare",
        description: event.error?.message || "A apărut o eroare",
        variant: "destructive",
      });
    }
  };

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      
      // Ensure microphone permission; auto-enable if granted
      if (!isMicEnabled) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setIsMicEnabled(true);
        } catch (err) {
          setIsConnecting(false);
          toast({
            title: "Activează microfonul",
            description: "Permite accesul la microfon pentru a porni conversația.",
          });
          return;
        }
      }
      
      // Check if user has minutes remaining
      const remaining = await checkVoiceUsage();
      
      if (remaining <= 0) {
        setIsConnecting(false);
        toast({
          title: "Ai epuizat minutele vocale",
          description: "Ai folosit toate cele 20 de minute vocale pentru această lună. Poți continua să folosești chat-ul text, care este NELIMITAT! 💬",
          variant: "destructive",
          duration: 8000,
        });
        return;
      }
      
      // Permission already checked above

      chatRef.current = new RealtimeChat(
        handleMessage,
        () => {
          startTimeRef.current = Date.now();
          setIsConnected(true);
          setIsConnecting(false);
          setThinkingStatus('listening');
          toast({
            title: "✅ Conectat",
            description: `Poți vorbi acum cu Yana • ${remaining.toFixed(1)} minute rămase`,
          });
        },
        () => {
          endConversation();
        }
      );
      
      await chatRef.current.init();
    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsConnecting(false);
      toast({
        title: "Eroare",
        description: error instanceof Error ? error.message : 'Nu s-a putut porni conversația',
        variant: "destructive",
      });
    }
  };

  const endConversation = async () => {
    let hadValidSession = false;
    
    // Calculate minutes used
    if (startTimeRef.current) {
      hadValidSession = true;
      const endTime = Date.now();
      const minutesUsed = (endTime - startTimeRef.current) / 1000 / 60;
      
      try {
        const { data, error } = await supabase.rpc('increment_voice_usage', {
          minutes_to_add: minutesUsed
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const result = data[0];
          const remaining = parseFloat(result.minutes_remaining.toString());
          setMinutesRemaining(remaining);
          
          if (remaining <= 0) {
            toast({
              title: "Ai epuizat minutele vocale! 🎤",
              description: "Nu-ți face griji! Poți continua să folosești chat-ul text, care este NELIMITAT! Scrie-mi orice întrebare mai jos. 💬",
              duration: 8000,
            });
          } else if (remaining < 5) {
            toast({
              title: `Mai ai doar ${remaining.toFixed(1)} minute vocale`,
              description: "Reține: chat-ul text este NELIMITAT, îl poți folosi oricât! 💬",
              duration: 6000,
            });
          }
        }
      } catch (error) {
        console.error('Error updating voice usage:', error);
      }
      
      startTimeRef.current = null;
    }
    
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    setThinkingStatus('idle');
    setIsConnecting(false);

    // Show generic disconnection message only if we didn't have a valid session
    if (!hadValidSession) {
      toast({
        title: "Deconectat",
        description: "Conversația s-a încheiat",
      });
    }
  };

  useEffect(() => {
    checkVoiceUsage();
    
    return () => {
      if (chatRef.current) {
        chatRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Microphone toggle */}
      <div className="flex gap-2 items-center">
        <Button
          onClick={() => setIsMicEnabled(!isMicEnabled)}
          variant={isMicEnabled ? "default" : "outline"}
          size="icon"
          title={isMicEnabled ? "Dezactivează microfonul" : "Activează microfonul"}
        >
          {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <span className="text-sm text-muted-foreground">
          {isMicEnabled ? "Microfon activat" : "Microfon dezactivat"}
        </span>
      </div>

      {!isConnected ? (
        <Button 
          onClick={startConversation}
          disabled={isConnecting || !isMicEnabled}
          size="lg"
          className="gap-2 min-w-[200px]"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Conectare...
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              Conversație Vocală
            </>
          )}
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {/* Visual Status Indicator */}
          <div className="relative flex items-center justify-center">
            <div className={`
              absolute w-20 h-20 rounded-full
              ${thinkingStatus === 'listening' ? 'bg-blue-500/20 animate-pulse' : 
                thinkingStatus === 'thinking' ? 'bg-yellow-500/20 animate-pulse' :
                thinkingStatus === 'speaking' ? 'bg-green-500/20 animate-pulse' : ''}
            `}></div>
            
            <div className={`
              relative w-16 h-16 rounded-full flex items-center justify-center
              ${thinkingStatus === 'listening' ? 'bg-blue-500' : 
                thinkingStatus === 'thinking' ? 'bg-yellow-500' :
                thinkingStatus === 'speaking' ? 'bg-green-500' : 'bg-gray-500'}
              transition-all duration-300
            `}>
              <Mic className="h-8 w-8 text-white" />
            </div>
          </div>

          <p className={`
            text-sm font-medium transition-colors
            ${thinkingStatus === 'listening' ? 'text-blue-500' : 
              thinkingStatus === 'thinking' ? 'text-yellow-500' :
              thinkingStatus === 'speaking' ? 'text-green-500' : ''}
          `}>
            {thinkingStatus === 'listening' && '🎤 Ascult...'}
            {thinkingStatus === 'thinking' && '🤔 Procesez...'}
            {thinkingStatus === 'speaking' && '🗣️ Răspund...'}
            {thinkingStatus === 'idle' && 'Conectat'}
          </p>
          
          <Button 
            onClick={endConversation}
            variant="destructive"
            size="lg"
            className="gap-2 min-w-[200px]"
          >
            <MicOff className="h-5 w-5" />
            Oprește Conversația
          </Button>
        </div>
      )}
      
      {!isConnected && minutesRemaining !== null && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          {minutesRemaining > 0 ? (
            <>
              Ai rămas <span className="font-semibold text-primary">{minutesRemaining.toFixed(1)} minute</span> vocale luna aceasta
            </>
          ) : (
            <>
              <span className="font-semibold text-destructive">0 minute</span> rămase • <span className="text-primary">Chat text NELIMITAT</span> disponibil 💬
            </>
          )}
        </p>
      )}
    </div>
  );
};

export default VoiceInterface;
