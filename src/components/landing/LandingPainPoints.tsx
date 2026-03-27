import { AlertTriangle, UserX, FileQuestion } from 'lucide-react';

const pains = [
  {
    icon: AlertTriangle,
    text: 'Nu știi dacă firma ta e pe profit real sau te păcălesc cifrele.',
  },
  {
    icon: UserX,
    text: 'Iei decizii importante singur, fără pe cineva care să vadă ce nu vezi tu.',
  },
  {
    icon: FileQuestion,
    text: 'Contabilul îți dă numere, dar nu îți spune ce să faci cu ele.',
  },
];

export const LandingPainPoints = () => {
  return (
    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground">
        Sună cunoscut?
      </h2>
      <div className="space-y-3">
        {pains.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5"
          >
            <p.icon className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm sm:text-base text-foreground leading-relaxed">{p.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
