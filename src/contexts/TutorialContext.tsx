import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTutorialSteps, TutorialStep } from '@/hooks/useTutorialSteps';

interface TutorialContextType {
  isActive: boolean;
  currentStep: TutorialStep | undefined;
  currentStepIndex: number;
  totalSteps: number;
  highlightedElement: string | null;
  voiceEnabled: boolean;
  startTutorial: (stepIndex?: number) => void;
  stopTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  performAction: (action: string) => void;
  toggleVoice: () => void;
  showTutorialMenu: boolean;
  setShowTutorialMenu: (show: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_STORAGE_KEY = 'yana-tutorial-progress';

export const TutorialProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showTutorialMenu, setShowTutorialMenu] = useState(false);
  const navigate = useNavigate();
  const { steps } = useTutorialSteps();

  const currentStep = steps[currentStepIndex];

  // Activează și focalizează elementul țintă; dacă suntem pe /yana și
  // elementul nu există încă, deschide Dashboard-ul și încearcă din nou.
  const activateTarget = useCallback((selector?: string) => {
    if (!selector) return;
    let attempts = 0;
    const isApp = window.location.pathname === '/yana';

    const tryActivate = () => {
      const el = document.querySelector(selector!) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const isTabTrigger = el.getAttribute('role') === 'tab' || selector!.includes('[value=');
        if (isTabTrigger) {
          el.click();
        }
        return;
      }

      // Prima încercare: dacă suntem pe /yana și Dashboard-ul nu e deschis, apasă butonul
      if (attempts === 0 && isApp) {
        const dashBtn = document.querySelector('[data-tour="dashboard-button"]') as HTMLElement | null;
        if (dashBtn) {
          console.log('Tutorial: Opening dashboard');
          dashBtn.click();
        } else {
          console.warn('Tutorial: Dashboard button not found');
        }
      }

      if (attempts < 15) { // ~3s retry window (mai lung pentru conexiuni lente)
        attempts++;
        setTimeout(tryActivate, 200);
      } else {
        console.warn(`Tutorial: Could not find element ${selector} after ${attempts} attempts`);
      }
    };

    setTimeout(tryActivate, 300);
  }, []);

  // Salvează progresul în localStorage
  useEffect(() => {
    if (isActive) {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({
        currentStepIndex,
        timestamp: Date.now()
      }));
    }
  }, [currentStepIndex, isActive]);

  const startTutorial = useCallback((stepIndex: number = 0) => {
    setIsActive(true);
    setCurrentStepIndex(stepIndex);
    setShowTutorialMenu(false);
    
    if (steps[stepIndex]?.page) {
      navigate(steps[stepIndex].page);
    }

    if (steps[stepIndex]?.highlight) {
      setHighlightedElement(steps[stepIndex].highlight!);
      activateTarget(steps[stepIndex].highlight!);
    }
  }, [navigate, steps]);

  const stopTutorial = useCallback(() => {
    setIsActive(false);
    setHighlightedElement(null);
  }, []);

  const performAction = useCallback((action: string) => {
    switch (action) {
      case 'demo-upload':
        console.log('Demo: Simulating file upload');
        break;
      case 'click-workflows-tab':
        setTimeout(() => {
          const tab = document.querySelector('[data-tour="workflows-tab"]') as HTMLElement;
          if (tab) tab.click();
        }, 300);
        break;
      case 'click-templates-subtab':
        setTimeout(() => {
          const tab = document.querySelector('[data-tour="templates-subtab"]') as HTMLElement;
          if (tab) tab.click();
        }, 500);
        break;
      case 'click-team-subtab':
        setTimeout(() => {
          const tab = document.querySelector('[data-tour="team-subtab"]') as HTMLElement;
          if (tab) tab.click();
        }, 500);
        break;
      case 'click-due-diligence-tab':
        setTimeout(() => {
          const tab = document.querySelector('[data-tour="due-diligence-tab"]') as HTMLElement;
          if (tab) tab.click();
        }, 300);
        break;
      case 'click-deadlines-tab':
        setTimeout(() => {
          const tab = document.querySelector('[data-tour="deadlines-tab"]') as HTMLElement;
          if (tab) tab.click();
        }, 300);
        break;
      case 'click-email-tab':
        setTimeout(() => {
          const tab = document.querySelector('[data-tour="email-tab"]') as HTMLElement;
          if (tab) tab.click();
        }, 300);
        break;
      case 'click-messaging-tab':
        setTimeout(() => {
          const tab = document.querySelector('[data-tour="messaging-tab"]') as HTMLElement;
          if (tab) tab.click();
        }, 300);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      const nextStep = steps[nextIndex];
      if (nextStep.page && nextStep.page !== currentStep.page) {
        navigate(nextStep.page);
      }
      
      // Execută acțiunea înainte de highlighting
      if (nextStep.action) {
        performAction(nextStep.action);
      }
      
      if (nextStep.highlight) {
        setHighlightedElement(nextStep.highlight);
        activateTarget(nextStep.highlight!);
      } else {
        setHighlightedElement(null);
      }
    } else {
      stopTutorial();
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    }
  }, [currentStepIndex, steps, currentStep, navigate, stopTutorial, performAction]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      
      const prevStep = steps[prevIndex];
      if (prevStep.page && prevStep.page !== currentStep.page) {
        navigate(prevStep.page);
      }
      
      if (prevStep.highlight) {
        setHighlightedElement(prevStep.highlight);
        activateTarget(prevStep.highlight!);
      } else {
        setHighlightedElement(null);
      }
    }
  }, [currentStepIndex, steps, currentStep, navigate]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => !prev);
  }, []);

  // Verifică dacă există progres salvat
  const getSavedProgress = useCallback(() => {
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (saved) {
      try {
        const { currentStepIndex: savedIndex, timestamp } = JSON.parse(saved);
        // Consideră progresul valid dacă e mai nou de 7 zile
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          return savedIndex;
        }
      } catch (e) {
        console.error('Error parsing saved progress:', e);
      }
    }
    return null;
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        currentStepIndex,
        totalSteps: steps.length,
        highlightedElement,
        voiceEnabled,
        startTutorial,
        stopTutorial,
        nextStep,
        previousStep,
        performAction,
        toggleVoice,
        showTutorialMenu,
        setShowTutorialMenu,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

// Helper pentru a obține progresul salvat
export const getSavedTutorialProgress = () => {
  const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
  if (saved) {
    try {
      const { currentStepIndex, timestamp } = JSON.parse(saved);
      if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
        return currentStepIndex;
      }
    } catch (e) {
      console.error('Error parsing saved progress:', e);
    }
  }
  return null;
};
