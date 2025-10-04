import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AdvertisementPopupProps {
  intervalMinutes?: number; // Interval în minute pentru afișarea pop-up-ului
}

const AdvertisementPopup = ({ intervalMinutes = 10 }: AdvertisementPopupProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verifică când a fost afișat ultima dată pop-up-ul
    const lastShown = localStorage.getItem('adPopupLastShown');
    const now = Date.now();
    
    const shouldShow = () => {
      if (!lastShown) return true;
      const timeSinceLastShown = now - parseInt(lastShown);
      const intervalMs = intervalMinutes * 60 * 1000;
      return timeSinceLastShown >= intervalMs;
    };

    // Afișează pop-up-ul după 30 secunde de la încărcarea paginii (prima dată)
    const initialDelay = lastShown ? 0 : 30000;
    
    const initialTimer = setTimeout(() => {
      if (shouldShow()) {
        setIsOpen(true);
        localStorage.setItem('adPopupLastShown', now.toString());
      }
    }, initialDelay);

    // Setează un interval pentru afișarea periodică
    const intervalId = setInterval(() => {
      if (shouldShow()) {
        setIsOpen(true);
        localStorage.setItem('adPopupLastShown', Date.now().toString());
      }
    }, intervalMinutes * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [intervalMinutes]);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
            Servicii Complete de Contabilitate
          </DialogTitle>
          <DialogDescription className="text-base mt-4 space-y-3">
            <p className="font-semibold text-foreground">
              Ai nevoie de un partener de încredere pentru contabilitatea firmei tale?
            </p>
            
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Contabilitate primară și fiscalitate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Consultanță financiară personalizată</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Raportări automate și analize</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Suport dedicat și răspuns rapid</span>
              </li>
            </ul>

            <div className="bg-primary/10 p-4 rounded-lg mt-4">
              <p className="font-semibold text-primary mb-2">
                🎁 Ofertă specială pentru utilizatorii Yana!
              </p>
              <p className="text-sm">
                Primește o lună gratuită la serviciile noastre de contabilitate
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={() => window.open('/contact', '_blank')}
            className="w-full"
          >
            Solicită o Ofertă Gratuită
          </Button>
          <Button 
            variant="outline"
            onClick={handleClose}
            className="w-full"
          >
            Poate mai târziu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvertisementPopup;
