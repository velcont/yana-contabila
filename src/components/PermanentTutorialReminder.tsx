import { useEffect } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import confetti from 'canvas-confetti';
import { toast } from '@/hooks/use-toast';

interface Props {
  run: boolean;
  onComplete: () => void;
}

export const PermanentTutorialReminder = ({ run, onComplete }: Props) => {
  useEffect(() => {
    if (!run) return;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'yana-tutorial-step',
        scrollTo: { behavior: 'auto', block: 'center' },
        cancelIcon: { enabled: true },
        canClickTarget: false, // ← FIX #1: previne click pe element să închidă tour-ul
      }
    });

    // ← FIX #1: event listener pentru a preveni închiderea la click pe overlay
    tour.on('show', () => {
      const modalOverlay = document.querySelector('.shepherd-modal-overlay-container');
      if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
        });
      }
    });

    // Helper function pentru butoane custom
    const createButtons = (tourInstance: any, isLastStep = false): any[] => {
      if (isLastStep) {
        return [
          { 
            text: 'Finalizează 🎊', 
            action: () => {
              triggerConfetti();
              tourInstance.complete();
            },
            classes: 'shepherd-button-primary'
          }
        ];
      }

      return [
        { 
          text: 'Nu mai arăta', 
          action: () => {
            localStorage.setItem('yana-tutorial-permanently-hidden', 'true');
            tourInstance.complete();
          }, 
          classes: 'shepherd-button-secondary'
        },
        { 
          text: 'Skip acest pas', 
          action: () => tourInstance.next(),
          classes: 'shepherd-button-secondary'
        },
        { 
          text: 'Next →', 
          action: () => tourInstance.next(), 
          classes: 'shepherd-button-primary' 
        }
      ];
    };

    // Pas 1: Încarcă balanța
    tour.addStep({
      id: 'step-1',
      text: '<h3>👋 Bine ai revenit!</h3><p>Încarcă balanța aici făcând click pe butonul galben 📎</p>',
      attachTo: { element: '[data-tour="file-upload"]', on: 'bottom' },
      buttons: createButtons(tour)
    });

    // Pas 2: Scrie și trimite mesaj
    tour.addStep({
      id: 'step-2',
      text: '<h3>✍️ Scrie orice + trimite</h3><p>Scrie un mesaj simplu (ex: "Analizează") și apasă butonul de trimitere</p>',
      attachTo: { element: '[data-tour="chat-input-area"]', on: 'top' },
      buttons: createButtons(tour)
    });

    // Pas 3: Închide ChatAI
    tour.addStep({
      id: 'step-3',
      text: '<h3>✅ Închide ChatAI</h3><p>Apasă pe X pentru a închide fereastra ChatAI</p>',
      attachTo: { element: '[data-tour="close-chatai"]', on: 'left' },
      buttons: createButtons(tour)
    });

    // Pas 4: Click pe Dosarul Meu
    tour.addStep({
      id: 'step-4',
      text: '<h3>📂 Click pe Dosarul Meu</h3><p>Deschide tab-ul "Dosarul Meu" pentru a vedea balanțele tale</p>',
      attachTo: { element: '[data-tour="my-folder-button"]', on: 'bottom' },
      buttons: createButtons(tour),
      when: {
        hide: () => {
          // FIX #1: DUPĂ ce utilizatorul apasă pe "Dosarul Meu", așteptăm ca DOM-ul să se randeze
          setTimeout(() => {
            const hasAnalyses = document.querySelector('[data-tour="select-analysis"]');
            
            if (!hasAnalyses) {
              // Dacă nu există analize, oprim tutorialul și afișăm mesaj
              tour.cancel();
              toast({
                title: "📂 Nu ai balanțe salvate",
                description: "Mai întâi încarcă o balanță în ChatAI și analizează-o!",
              });
            }
          }, 800); // Așteptăm 800ms ca tab-ul să se deschidă și să se randeze lista
        }
      }
    });

    // Pas 5: Alege ultima balanță (verificarea dinamică se face în pasul 4)
    tour.addStep({
      id: 'step-5',
      text: '<h3>👆 Alege ultima balanță încărcată</h3><p>Click pe primul rând din listă pentru a deschide analiza</p>',
      attachTo: { element: '[data-tour="select-analysis"]', on: 'right' },
      buttons: createButtons(tour)
    });

    // Pas 6: Scroll și apasă Generare Raport (scroll INSTANT)
    tour.addStep({
      id: 'step-6',
      text: '<h3>📊 Derulează și apasă Generare Raport Premium</h3><p>Scroll în jos și apasă butonul portocaliu pentru a genera raportul</p>',
      attachTo: { element: '[data-tour="generate-report-button"]', on: 'top' },
      scrollTo: { behavior: 'auto', block: 'center' }, // INSTANT scroll
      buttons: createButtons(tour),
      when: {
        show: () => {
          // Scroll instant către element
          const element = document.querySelector('[data-tour="generate-report-button"]');
          if (element) {
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
        }
      }
    });

    // Pas 7: Mesaj final (raportul se descarcă automat) - FIX #3: șters pas 7 (dialog validare)
    tour.addStep({
      id: 'step-7',
      text: '<h3>🎉 Felicitări!</h3><p>Raportul Word se va descărca automat după validare! Acum citește raportul și întreabă ChatAI orice nu înțelegi! 🎊</p>',
      attachTo: { element: '[data-tour="generate-report-button"]', on: 'top' },
      buttons: createButtons(tour, true)
    });

    tour.on('complete', onComplete);
    tour.on('cancel', onComplete);
    tour.start();

    return () => {
      tour.cancel();
    };
  }, [run, onComplete]);

  return null;
};

// Confetti function
const triggerConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#fb923c', '#fbbf24', '#34d399']
  });
};
