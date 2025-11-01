import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ContextualHelpProps {
  title: string;
  content: string;
  learnMoreUrl?: string;
}

export function ContextualHelp({ title, content, learnMoreUrl }: ContextualHelpProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full hover:bg-muted"
          aria-label="Ajutor contextual"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 animate-in fade-in-0 zoom-in-95 duration-200" side="right">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            💡 {title}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {content}
          </p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
            >
              Află mai multe →
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Predefined contextual help for common features
export const helpContent = {
  dashboard: {
    analyses: {
      title: "Istoric Analize",
      content: "Aici găsești toate analizele financiare generate. Poți filtra după perioadă și companie pentru a compara evoluția în timp.",
    },
    charts: {
      title: "Grafice Interactive",
      content: "Graficele arată tendințele pe luni. Hover pe puncte pentru detalii, click pe legendă pentru a ascunde serii.",
    },
    export: {
      title: "Export PDF",
      content: "Generează rapoarte profesionale cu toate indicatorii, grafice și recomandări pentru clienți sau bănci.",
    },
  },
  crm: {
    clients: {
      title: "Gestionare Clienți",
      content: "Administrează baza de clienți: adaugă manual, importă CSV sau sincronizează automat cu ANAF pentru date actualizate.",
    },
    workflows: {
      title: "Dosare Lunare",
      content: "Workflow-uri automate pentru fiecare client: task-uri recurente, documente necesare, deadline-uri fiscale și notificări.",
    },
  },
  financial: {
    dso: {
      title: "DSO (Days Sales Outstanding)",
      content: "Măsoară câte zile durează în medie să încasezi banii de la clienți. Sub 45 de zile = excelent, peste 60 = risc.",
    },
    ebitda: {
      title: "EBITDA",
      content: "Profit operațional înainte de dobânzi, taxe, depreciere și amortizare. Indicator cheie al performanței operaționale.",
    },
    cashflow: {
      title: "Cash Flow",
      content: "Fluxul real de bani în firmă. Poți avea profit pe hârtie dar lipsă de lichidități - cash flow-ul arată realitatea.",
    },
  },
};
