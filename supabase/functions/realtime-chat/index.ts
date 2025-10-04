import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    return new Response("OPENAI_API_KEY not configured", { status: 500 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;
  let sessionReady = false;

  socket.onopen = async () => {
    console.log("Client WebSocket connected");
    
    try {
      // Get ephemeral token from OpenAI
      console.log("Requesting ephemeral token...");
      const tokenResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token response error:", errorText);
        throw new Error(`Failed to get token: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      console.log("Ephemeral token received");

      if (!tokenData.client_secret?.value) {
        throw new Error("No client_secret in response");
      }

      // Connect to OpenAI Realtime API using ephemeral token
      // Ephemeral tokens don't require auth in subprotocol
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
      console.log("Connecting to OpenAI WebSocket...");
      
      openAISocket = new WebSocket(wsUrl);

      openAISocket.onopen = () => {
        console.log("Connected to OpenAI Realtime API");
      };

      openAISocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("OpenAI message type:", message.type);

          // When session is created, send configuration
          if (message.type === 'session.created' && !sessionReady) {
            sessionReady = true;
            const sessionConfig = {
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: 'Ești Yana, un asistent financiar inteligent care oferă analize și sfaturi despre situația financiară. Răspunde clar și prietenos în limba română.',
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
                temperature: 0.8,
                max_response_output_tokens: 4096
              }
            };
            openAISocket?.send(JSON.stringify(sessionConfig));
            console.log("Session configuration sent");
          }

          // Forward all messages to client
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        } catch (error) {
          console.error("Error processing OpenAI message:", error);
        }
      };

      openAISocket.onerror = (error) => {
        console.error("OpenAI WebSocket error:", error);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ 
            type: 'error', 
            error: 'OpenAI connection error' 
          }));
        }
      };

      openAISocket.onclose = () => {
        console.log("OpenAI WebSocket closed");
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    } catch (error) {
      console.error("Error initializing OpenAI connection:", error);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 
          type: 'error', 
          error: error instanceof Error ? error.message : 'Failed to connect to OpenAI' 
        }));
      }
    }
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log("Client message type:", message.type);
      
      if (openAISocket?.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
      }
    } catch (error) {
      console.error("Error forwarding client message:", error);
    }
  };

  socket.onclose = () => {
    console.log("Client WebSocket disconnected");
    if (openAISocket?.readyState === WebSocket.OPEN) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
  };

  return response;
});
