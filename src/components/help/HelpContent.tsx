import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, Zap } from 'lucide-react';

interface HelpContentProps {
  page: string;
  role: 'entrepreneur' | 'accounting_firm';
}

interface QuickAction {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}

interface FAQ {
  question: string;
  answer: string;
}

interface HelpData {
  pageName: string;
  description: string;
  quickActions: QuickAction[];
  faq: FAQ[];
  videoUrl?: string | null;
}

export const HelpContent = ({ page, role }: HelpContentProps) => {
  const navigate = useNavigate();

  const getHelpContent = (page: string, role: string): HelpData => {
    const helpData: Record<string, HelpData> = {
      dashboard: {
        pageName: 'Dashboard Analiză Balanță',
        description: 'Aici vezi graficele și indicatorii financiari.',
        quickActions: [
          {
            icon: '📊',
            label: 'Cum încarc o balanță?',
            description: 'Click pe "Analizează Balanță" în meniu',
            onClick: () => navigate('/app')
          },
          {
            icon: '📄',
            label: 'Unde descarc raportul PDF?',
            description: 'Scroll jos după ce ai încărcat balanța',
            onClick: () => {}
          },
          {
            icon: '💬',
            label: 'Cum pun întrebări?',
            description: 'Scroll jos la secțiunea Chat',
            onClick: () => {}
          }
        ],
        faq: [
          {
            question: 'De ce nu văd grafice?',
            answer: 'Trebuie să încarci mai întâi o balanță. Click pe "Analizează Balanță" din meniu.'
          },
          {
            question: 'Ce format trebuie să aibă Excel-ul?',
            answer: 'Balanță de verificare standard (.xls sau .xlsx). Numele fișierului trebuie să conțină luna și anul (ex: Balanta_Ianuarie_2025.xlsx).'
          },
          {
            question: 'Pot încărca mai multe balanțe?',
            answer: 'Da! Poți încărca balanțe pentru luni diferite. YANA le va compara automat.'
          }
        ],
        videoUrl: null
      },

      strategic: {
        pageName: 'Yana Strategică - Consultant AI',
        description: 'Consultant strategic pentru creștere business (necesită credite AI).',
        quickActions: [
          {
            icon: '💎',
            label: 'Cum folosesc creditele?',
            description: '~0.5 lei/mesaj. Vezi sold în header',
            onClick: () => {}
          },
          {
            icon: '💰',
            label: 'Cum cumpăr credite?',
            description: 'Meniu → Pachete Credite AI',
            onClick: () => navigate('/pricing')
          }
        ],
        faq: [
          {
            question: 'Ce diferență e față de Chat Balanță?',
            answer: `Chat Balanță:
- Analizează DOAR datele tale
- "DSO-ul meu e 68 zile"
- GRATUIT

Yana Strategică:
- Consultanță strategică
- "Cum reduc DSO-ul la 45 zile?" → strategie
- 0.5 lei/mesaj`
          },
          {
            question: 'Cât costă un mesaj?',
            answer: '~0.5 lei/mesaj. 10 lei = ~20 mesaje. Toți utilizatorii noi primesc 10 lei GRATUIT!'
          },
          {
            question: 'Creditele expiră?',
            answer: 'NU. Creditele cumpărate nu expiră niciodată.'
          }
        ],
        videoUrl: null
      },

      fiscal: {
        pageName: 'Chat Fiscal - Legislație',
        description: 'Chatbot pentru întrebări despre legislație fiscală.',
        quickActions: [
          {
            icon: '⚖️',
            label: 'Ce pot întreba aici?',
            description: 'Legislație, termene, declarații',
            onClick: () => {}
          }
        ],
        faq: [
          {
            question: 'Diferența față de Chat Balanță?',
            answer: `Chat Fiscal:
- Legislație generală
- "Când se depune D300?" → 25 ale lunii
- GRATUIT

Chat Balanță:
- Datele tale specifice
- "Care e DSO-ul MEU?" → cifra ta`
          },
          {
            question: 'Pot să mă bazez 100% pe răspunsuri?',
            answer: 'Pentru cazuri complexe, consultă expert CECCAR sau ANAF direct.'
          }
        ],
        videoUrl: null
      },

      crm: role === 'accounting_firm' ? {
        pageName: 'YanaCRM - Dashboard Contabil',
        description: 'Gestionezi toți clienții tăi (Plan Contabil 199 lei/lună).',
        quickActions: [
          {
            icon: '👥',
            label: 'Cum adaug clienți?',
            description: 'Buton "Adaugă Client" sau Import CSV',
            onClick: () => {}
          },
          {
            icon: '📋',
            label: 'Unde văd termene fiscale?',
            description: 'Tab "Calendar Termene"',
            onClick: () => {}
          },
          {
            icon: '📧',
            label: 'Cum trimit email-uri către clienți?',
            description: 'Tab "Email" - filtrează după parametri fiscali',
            onClick: () => {}
          }
        ],
        faq: [
          {
            question: 'Câți clienți pot adăuga?',
            answer: 'Nelimitat! Planul Contabil permite clienți nelimitați.'
          },
          {
            question: 'Cum trimit email-uri către anumite tipuri de clienți?',
            answer: 'În tab-ul Email poți filtra clienții după: plătitor TVA, regim fiscal (micro/profit/PFA), status activ/inactiv. Selectezi companiile dorite și trimiți imediat sau programezi email-ul.'
          }
        ],
        videoUrl: null
      } : {
        pageName: 'YanaCRM - Indisponibil',
        description: 'YanaCRM e disponibil DOAR pentru Plan Contabil (199 lei/lună).',
        quickActions: [
          {
            icon: '⬆️',
            label: 'Upgrade la Plan Contabil',
            description: 'Vezi prețuri',
            onClick: () => navigate('/pricing')
          }
        ],
        faq: [
          {
            question: 'De ce nu văd CRM-ul?',
            answer: 'YanaCRM e exclusiv pentru Plan Contabil (199 lei/lună). Planul Antreprenor (49 lei/lună) NU include CRM.'
          }
        ],
        videoUrl: null
      }
    };

    return helpData[page] || helpData.dashboard;
  };

  const content = getHelpContent(page, role);

  return (
    <div className="space-y-6">
      {/* Pagina curentă */}
      <Card className="border-l-4 border-primary">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-bold text-lg mb-2">
                Ești pe: {content.pageName}
              </h3>
              <p className="text-sm text-muted-foreground">{content.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Acțiuni rapide</h3>
        </div>
        <div className="space-y-2">
          {content.quickActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4"
            >
              <div className="text-left w-full">
                <div className="font-medium">
                  {action.icon} {action.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h3 className="font-bold text-lg mb-3">❓ Întrebări frecvente</h3>
        <Accordion type="single" collapsible className="w-full">
          {content.faq.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Video Tutorial */}
      {content.videoUrl && (
        <div>
          <h3 className="font-bold text-lg mb-3">🎥 Video tutorial</h3>
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Tutorial video (în curând)
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
