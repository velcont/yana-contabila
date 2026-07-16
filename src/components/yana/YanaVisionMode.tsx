import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Monitor, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface YanaVisionModeProps {
  /** Called each time YANA produces a non-skip observation. */
  onObservation?: (text: string) => void;
}

type Source = "screen" | "camera";

const CAPTURE_INTERVAL_MS = 6000;
const MAX_WIDTH = 960;

export function YanaVisionMode({ onObservation }: YanaVisionModeProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [thinking, setThinking] = useState(false);
  const [lastObservation, setLastObservation] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
    setSource(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    try {
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

      setThinking(true);
      const { data, error } = await supabase.functions.invoke("yana-vision", {
        body: { imageBase64: dataUrl },
      });
      setThinking(false);

      if (error) throw error;
      if (data?.observation && !data.skip) {
        setLastObservation(data.observation);
        onObservation?.(data.observation);
      }
    } catch (e) {
      console.warn("[YanaVision] capture failed:", e);
      setThinking(false);
    }
  }, [onObservation]);

  const start = useCallback(
    async (src: Source) => {
      try {
        const stream =
          src === "screen"
            ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
            : await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });

        streamRef.current = stream;
        setSource(src);
        setActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Auto-stop when user stops sharing (browser UI)
        stream.getVideoTracks()[0]?.addEventListener("ended", () => stop());

        // First capture after 2s (let video initialize), then interval
        setTimeout(() => captureFrame(), 2000);
        timerRef.current = window.setInterval(captureFrame, CAPTURE_INTERVAL_MS);

        toast.success(src === "screen" ? "YANA vede ecranul tău" : "YANA vede prin camera ta");
      } catch (e: any) {
        console.error("[YanaVision] start failed:", e);
        toast.error("Nu am putut porni Vision Mode: " + (e?.message || "acces refuzat"));
        stop();
      }
    },
    [captureFrame, stop],
  );

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setOpen(true)}
        title="Vision Mode — YANA vede ecranul sau camera ta"
      >
        <Eye className="w-4 h-4" />
        Vision
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-72 p-3 shadow-lg border-primary/30 bg-background/95 backdrop-blur animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          {active ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <Eye className="w-4 h-4 text-primary" />
          )}
          YANA Vision
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            stop();
            setOpen(false);
          }}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {!active && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Alege ce văd:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => start("screen")}>
              <Monitor className="w-3.5 h-3.5" />
              Ecran
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => start("camera")}>
              <Camera className="w-3.5 h-3.5" />
              Camera
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            YANA analizează câte un cadru la 6s. Nimic nu se salvează.
          </p>
        </div>
      )}

      {active && (
        <div className="space-y-2">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded border bg-black aspect-video object-contain"
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-h-[16px]">
            {thinking ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>YANA analizează…</span>
              </>
            ) : (
              <span>Sursă: {source === "screen" ? "ecran" : "cameră"}</span>
            )}
          </div>
          {lastObservation && (
            <p className="text-xs bg-primary/5 border border-primary/20 rounded p-2 leading-snug">
              💬 {lastObservation}
            </p>
          )}
          <Button size="sm" variant="secondary" className="w-full gap-1.5" onClick={stop}>
            <EyeOff className="w-3.5 h-3.5" />
            Oprește
          </Button>
        </div>
      )}
    </Card>
  );
}