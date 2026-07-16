import { useEffect, useRef, useState } from "react";

/**
 * YanaAmbientPresence — futuristic ambient backdrop for /yana.
 *
 * Vision: "Conștiință Ambientală" (HER + Apple Intelligence).
 * Three fixed layers behind the chat:
 *  1. Deep gradient void
 *  2. Slow-drifting aurora blobs
 *  3. A living orb that breathes, follows the cursor subtly,
 *     and reacts to `state` (idle / listening / thinking / speaking).
 *
 * Pure CSS + a couple of refs. Zero deps, zero perf cost when idle.
 */
export type YanaPresenceState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  state?: YanaPresenceState;
}

export function YanaAmbientPresence({ state = "idle" }: Props) {
  const orbRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = () => setReduced(mq.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const el = orbRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      el.style.setProperty("--orb-x", `${x}px`);
      el.style.setProperty("--orb-y", `${y}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced]);

  return (
    <div
      aria-hidden
      className="yana-ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      data-state={state}
    >
      {/* deep void */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(258_60%_10%/0.9),hsl(240_40%_4%)_60%,hsl(240_40%_3%))] dark:opacity-100 opacity-30" />

      {/* aurora blobs */}
      <div className="yana-aurora yana-aurora-a" />
      <div className="yana-aurora yana-aurora-b" />
      <div className="yana-aurora yana-aurora-c" />

      {/* the orb */}
      <div ref={orbRef} className="yana-orb-wrap">
        <div className="yana-orb">
          <div className="yana-orb-core" />
          <div className="yana-orb-ring yana-orb-ring-1" />
          <div className="yana-orb-ring yana-orb-ring-2" />
          <div className="yana-orb-ring yana-orb-ring-3" />
        </div>
      </div>

      {/* subtle grain / scanlines for tactile depth */}
      <div className="yana-grain" />
    </div>
  );
}