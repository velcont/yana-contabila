import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTutorialSteps, TutorialStep } from './useTutorialSteps';

export const useTutorialMode = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  const navigate = useNavigate();
  const { steps } = useTutorialSteps();

  const currentStep = steps[currentStepIndex];

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
    if (steps[0].page) {
      navigate(steps[0].page);
    }
  }, [navigate, steps]);

  const stopTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    setHighlightedElement(null);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      
      const nextStep = steps[nextIndex];
      if (nextStep.page && nextStep.page !== currentStep.page) {
        navigate(nextStep.page);
      }
      
      if (nextStep.highlight) {
        setHighlightedElement(nextStep.highlight);
        // Scroll to element
        setTimeout(() => {
          const element = document.querySelector(nextStep.highlight!);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      } else {
        setHighlightedElement(null);
      }
    } else {
      stopTutorial();
    }
  }, [currentStepIndex, steps, currentStep, navigate, stopTutorial]);

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
      } else {
        setHighlightedElement(null);
      }
    }
  }, [currentStepIndex, steps, currentStep, navigate]);

  const performAction = useCallback((action: string) => {
    // Handle demo actions
    switch (action) {
      case 'demo-upload':
        // Simulate file upload for demo purposes
        console.log('Demo: Simulating file upload');
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, []);

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: steps.length,
    highlightedElement,
    startTutorial,
    stopTutorial,
    nextStep,
    previousStep,
    performAction,
  };
};
