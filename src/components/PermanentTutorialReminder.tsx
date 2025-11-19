import { useEffect } from 'react';
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css';
import confetti from 'canvas-confetti';

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
          text: 'Skip acest pas', 
          action: () => tourInstance.next(),
          classes: 'shepherd-button-skip'
        },
        { 
          text: 'Next →', 
          action: () => tourInstance.next(), 
          classes: 'shepherd-button-primary' 
        },
        { 
          text: 'Nu mai arăta', 
          action: () => {
            localStorage.setItem('yana-tutorial-permanently-hidden', 'true');
            tourInstance.complete();
          }, 
          classes: 'shepherd-button-warning' 
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
      buttons: createButtons(tour)
    });

    // Pas 5: Alege ultima balanță
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

    // Pas 7: Închide confirmarea
    tour.addStep({
      id: 'step-7',
      text: '<h3>✅ Închide confirmarea</h3><p>După validare, apasă butonul pentru a închide dialogul</p>',
      attachTo: { element: '[data-tour="close-confirmation-dialog"]', on: 'top' },
      buttons: createButtons(tour)
    });

    // Pas 8: Mesaj final (raportul se descarcă automat)
    tour.addStep({
      id: 'step-8',
      text: '<h3>🎉 Felicitări!</h3><p>Raportul Word se va descărca automat! Acum citește raportul și întreabă ChatAI orice nu înțelegi! 🎊</p>',
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
