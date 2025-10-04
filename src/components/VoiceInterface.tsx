import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';

interface VoiceInterfaceProps {
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onTranscript }) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);

  const handleMessage = (event: any) => {
    console.log('Message received:', event.type);
    
    if (event.type === 'response.audio_transcript.delta' && event.delta) {
      onTranscript?.(event.delta, 'assistant');
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      onTranscript?.(event.transcript, 'user');
    } else if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
    } else if (event.type === 'error') {
      console.error('Realtime API error:', event.error);
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
      
      const hasPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (hasPermission) {
        hasPermission.getTracks().forEach(track => track.stop());
      }

      chatRef.current = new RealtimeChat(
        handleMessage,
        () => {
          setIsConnected(true);
          setIsConnecting(false);
          toast({
            title: "Conectat",
            description: "Poți vorbi acum cu Yana",
          });
        },
        () => {
          setIsConnected(false);
          setIsConnecting(false);
          setIsSpeaking(false);
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

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    toast({
      title: "Deconectat",
      description: "Conversația s-a încheiat",
    });
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!isConnected ? (
        <Button 
          onClick={startConversation}
          disabled={isConnecting}
          size="lg"
          className="gap-2"
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
        <Button 
          onClick={endConversation}
          variant="destructive"
          size="lg"
          className="gap-2"
        >
          <MicOff className="h-5 w-5" />
          {isSpeaking && (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
          )}
          Oprește
        </Button>
      )}
    </div>
  );
};

export default VoiceInterface;
