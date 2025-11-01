import { useCallback } from 'react';
import { VisualFeedback, createSuccessAnimation, createErrorAnimation } from '@/components/VisualFeedback';

export const useVisualFeedback = () => {
  const showSuccess = useCallback((title: string, description?: string, withAnimation: boolean = false) => {
    if (withAnimation) {
      createSuccessAnimation();
    }
    VisualFeedback.success({ title, description });
  }, []);

  const showError = useCallback((title: string, description?: string, withAnimation: boolean = false) => {
    if (withAnimation) {
      createErrorAnimation();
    }
    VisualFeedback.error({ title, description });
  }, []);

  const showWarning = useCallback((title: string, description?: string) => {
    VisualFeedback.warning({ title, description });
  }, []);

  const showInfo = useCallback((title: string, description?: string) => {
    VisualFeedback.info({ title, description });
  }, []);

  const showLoading = useCallback((title: string, description?: string) => {
    return VisualFeedback.loading({ title, description });
  }, []);

  const showAI = useCallback((title: string, description?: string) => {
    VisualFeedback.ai({ title, description });
  }, []);

  const showPromise = useCallback(<T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return VisualFeedback.promise(promise, messages);
  }, []);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showAI,
    showPromise
  };
};
