import { Building2, MessageSquare, TrendingUp } from 'lucide-react';

/**
 * Demo vizual: arată exact cum se folosește CRM-ul prin chat.
 * Susține poziționarea "primul CRM conversational AI din România".
 */
export const LandingChatDemo = () => {
  return (
    <section className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Așa arată CRM-ul tău în chat
        </h2>
        <p className="text-sm text-muted-foreground">Fără click-uri. Fără formulare. Doar conversație.</p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        {/* Mesaj 1 — user */}
        <UserMsg text='Adaugă SC Alpha SRL ca lead, deal 50.000 RON pentru consultanță.' />
        <YanaMsg
          icon={Building2}
          text='Gata. Am adăugat Alpha SRL și un deal de 50.000 RON în stadiul "Lead nou". Vrei să programez și un follow-up săptămâna viitoare?'
        />

        {/* Mesaj 2 */}
        <UserMsg text='Cum stă pipeline-ul luna asta?' />
        <YanaMsg
          icon={TrendingUp}
          text='Ai 7 deal-uri active, total 320.000 RON. 3 în Negociere (180k), 2 în Calificat (90k), 2 Lead-uri noi (50k). Vrei detalii pe Negociere?'
        />

        {/* Mesaj 3 */}
        <UserMsg text='Mută deal-ul Alpha în Negociere și loghează că am sunat azi.' />
        <YanaMsg
          icon={MessageSquare}
          text='Mutat în Negociere și am notat apelul în istoric. Probabilitate actualizată la 80%.'
        />
      </div>
    </section>
  );
};

const UserMsg = ({ text }: { text: string }) => (
  <div className="px-4 py-3 border-b border-border/30 bg-muted/30">
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold flex-shrink-0">Tu</div>
      <p className="text-sm text-foreground leading-relaxed pt-1">{text}</p>
    </div>
  </div>
);

const YanaMsg = ({ text, icon: Icon }: { text: string; icon: typeof Building2 }) => (
  <div className="px-4 py-3 border-b border-border/30 last:border-b-0">
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">Y</div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm text-foreground leading-relaxed">{text}</p>
        <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
          <Icon className="w-3 h-3" />
          <span>acțiune CRM executată</span>
        </div>
      </div>
    </div>
  </div>
);