import { Users, MessageSquare, FileCheck } from 'lucide-react';

const stats = [
  { icon: Users, value: '177+', label: 'antreprenori' },
  { icon: MessageSquare, value: '310+', label: 'conversații' },
  { icon: FileCheck, value: '90+', label: 'analize' },
];

const quotes = [
  {
    text: '"Contabilul meu n-a văzut problema de lichiditate. YANA a găsit-o în 90 de secunde."',
    author: 'Antreprenor, e-commerce',
  },
  {
    text: '"Am pierdut 23.000 RON pentru că nimeni nu mi-a spus. Acum YANA îmi spune ÎNAINTE să se întâmple."',
    author: 'Fondator, servicii IT',
  },
];

export const LandingSocialProof = () => {
  return (
    <section className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="text-center p-3 rounded-xl bg-muted/40">
            <s.icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
            <div className="text-lg sm:text-xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quotes — dramatic style */}
      <div className="space-y-3">
        {quotes.map((q, i) => (
          <div key={i} className="p-5 rounded-xl border-l-4 border-primary bg-card space-y-2">
            <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">{q.text}</p>
            <p className="text-xs text-muted-foreground">— {q.author}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
