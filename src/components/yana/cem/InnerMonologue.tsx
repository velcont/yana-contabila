import { useEffect, useState } from 'react';
import { Brain } from 'lucide-react';

const PHRASES = [
  'las gândul să se așeze…',
  'caut firul în rețea…',
  'îmi vine o asociere…',
  'reflectez la ce mi-ai spus…',
  'verific în memorie…',
  'simt o tensiune între două direcții…',
  'leg ce-mi spui de ce știu deja…',
  'aștept ca imaginea să se contureze…',
];

/**
 * Monolog interior: înlocuiește typing indicator generic cu fraze rotative
 * inspirate dintr-un flux de gândire. Pur vizual, fără logică AI.
 */
export function InnerMonologue({ className }: { className?: string }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * PHRASES.length));

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((v) => (v + 1) % PHRASES.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground italic ${className ?? ''}`}
      aria-live="polite"
    >
      <Brain className="h-4 w-4 text-primary animate-pulse" />
      <span key={idx} className="animate-fade-in">
        {PHRASES[idx]}
      </span>
    </div>
  );
}