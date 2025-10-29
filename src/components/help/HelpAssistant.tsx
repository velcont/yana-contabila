import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { HelpContent } from './HelpContent';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface HelpAssistantProps {
  userRole: 'entrepreneur' | 'accounting_firm';
}

export const HelpAssistant = ({ userRole }: HelpAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Detectează pagina curentă
  const currentPage = location.pathname.includes('/app') ? 'dashboard' :
                      location.pathname.includes('/strategic') ? 'strategic' :
                      location.pathname.includes('/fiscal') ? 'fiscal' :
                      location.pathname.includes('/yanacrm') ? 'crm' : 'dashboard';

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-lg hover:scale-110 transition-transform"
        size="icon"
        aria-label="Ajutor"
      >
        <HelpCircle className="w-8 h-8" />
      </Button>

      {/* Slide-in Panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="w-6 h-6" />
              Ajutor YANA
            </SheetTitle>
          </SheetHeader>
          
          <div className="mt-6">
            <HelpContent page={currentPage} role={userRole} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
