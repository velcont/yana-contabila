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
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const chatRef = useRef<RealtimeChat | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const autoStartAttemptedRef = useRef(false);

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
      console.log('[VoiceInterface] Starting conversation...');
      setIsConnecting(true);
      setMicPermissionDenied(false);

      // Check if user has minutes remaining FIRST
      const remaining = await checkVoiceUsage();
      console.log('[VoiceInterface] Minutes remaining:', remaining);

      if (remaining <= 0) {
        console.log('[VoiceInterface] No minutes remaining');
        setIsConnecting(false);
        toast({
          title: "Ai epuizat minutele vocale",
          description: "Ai folosit toate cele 20 de minute vocale pentru această lună. Poți continua să folosești chat-ul text, care este NELIMITAT! 💬",
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      // Log current microphone permission state (if supported)
      try {
        const perm: any = await (navigator as any).permissions?.query?.({ name: 'microphone' as any });
        console.log('[VoiceInterface] Microphone permission state (pre-request):', perm?.state);
        if (perm && 'onchange' in perm) {
          perm.onchange = () => console.log('[VoiceInterface] Microphone permission changed:', (perm as any)?.state);
        }
      } catch {
        console.log('[VoiceInterface] Permissions API not available');
      }

      // Request microphone permission NOW (not before checking minutes)
      const constraints = {
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      } as const;
      console.log('[VoiceInterface] Requesting microphone with constraints:', constraints);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('[VoiceInterface] Microphone permission granted. Tracks:', stream.getTracks().map(t => ({ kind: t.kind, label: t.label, enabled: t.enabled })));
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop());
      } catch (err: any) {
        console.error('[VoiceInterface] Microphone permission error:', { name: err?.name, message: err?.message });
        setIsConnecting(false);
        setMicPermissionDenied(true);
        toast({
          title: "⚠️ Permisiune necesară",
          description: "Pentru conversații vocale, trebuie să permiți accesul la microfon în browser. Apasă pe butonul \"Pornește Conversația\" și permite accesul.",
          variant: "destructive",
          duration: 10000,
        });
        return;
      }

      console.log('[VoiceInterface] Initializing RealtimeChat...');
      chatRef.current = new RealtimeChat(
        handleMessage,
        () => {
          console.log('[VoiceInterface] Connected successfully');
          startTimeRef.current = Date.now();
          setIsConnected(true);
          setIsConnecting(false);
          setThinkingStatus('listening');
          toast({
            title: "✅ Conectat cu Yana",
            description: `Vorbește acum! Ai ${remaining.toFixed(1)} minute rămase luna aceasta`,
            duration: 5000,
          });
        },
        () => {
          console.log('[VoiceInterface] Disconnected from server');
          endConversation();
        }
      );

      console.log('[VoiceInterface] Calling init()...');
      await chatRef.current.init();
      console.log('[VoiceInterface] Init completed');
    } catch (error) {
      console.error('[VoiceInterface] Error starting conversation:', error);
      setIsConnecting(false);
      setMicPermissionDenied(true);
      toast({
        title: "❌ Eroare la pornire",
        description: error instanceof Error ? error.message : 'Nu s-a putut porni conversația vocală',
        variant: "destructive",
        duration: 8000,
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
    console.log('[VoiceInterface] Component mounted');
    
    // Check usage first, then attempt auto-start ONCE
    checkVoiceUsage().then((remaining) => {
      console.log('[VoiceInterface] Usage check complete:', remaining);
      
      if (!autoStartAttemptedRef.current && remaining > 0) {
        autoStartAttemptedRef.current = true;
        console.log('[VoiceInterface] Attempting auto-start...');
        
        // Small delay to ensure UI is ready
        setTimeout(() => {
          if (!isConnected && !isConnecting) {
            startConversation();
          }
        }, 500);
      }
    });
    
    return () => {
      console.log('[VoiceInterface] Component unmounting');
      if (chatRef.current) {
        chatRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Show permission error if needed */}
      {micPermissionDenied && !isConnected && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-md">
          <p className="text-sm text-center text-destructive font-medium mb-2">
            🎤 Permisiune microfon necesară
          </p>
          <p className="text-xs text-center text-muted-foreground">
            Pentru conversații vocale, browser-ul tău trebuie să permită accesul la microfon. 
            Apasă pe butonul de mai jos și selectează "Permite" când browser-ul solicită.
          </p>
        </div>
      )}

      {!isConnected ? (
        <Button 
          onClick={startConversation}
          disabled={isConnecting}
          size="lg"
          className="gap-2 min-w-[220px]"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Se conectează...
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              {micPermissionDenied ? 'Încearcă din nou' : 'Pornește Conversația'}
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
