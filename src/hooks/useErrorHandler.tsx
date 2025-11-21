/**
 * Centralizare error handling - elimină 50+ duplicate din cod
 */

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { ApiError } from '@/types/shared';

interface ErrorHandlerOptions {
  logToConsole?: boolean;
  showToast?: boolean;
  customTitle?: string;
  customDescription?: string;
}

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback(
    (error: unknown, context: string, options: ErrorHandlerOptions = {}) => {
      const {
        logToConsole = true,
        showToast = true,
        customTitle,
        customDescription,
      } = options;

      // Log to console
      if (logToConsole) {
        logger.error(`[${context}] Error:`, error);
      }

      // Extract error message
      const errorMessage = extractErrorMessage(error);

      // Show toast notification
      if (showToast) {
        toast({
          title: customTitle || `Eroare la ${context}`,
          description: customDescription || errorMessage,
          variant: 'destructive',
        });
      }

      return errorMessage;
    },
    [toast]
  );

  const handleSuccess = useCallback(
    (message: string, description?: string) => {
      toast({
        title: message,
        description,
        variant: 'default',
      });
    },
    [toast]
  );

  const handleWarning = useCallback(
    (message: string, description?: string) => {
      toast({
        title: message,
        description,
        variant: 'default',
      });
    },
    [toast]
  );

  return {
    handleError,
    handleSuccess,
    handleWarning,
  };
}

/**
 * Extract mesaj lizibil din orice tip de eroare
 */
function extractErrorMessage(error: unknown): string {
  // String direct
  if (typeof error === 'string') {
    return error;
  }

  // Error standard
  if (error instanceof Error) {
    return error.message;
  }

  // ApiError custom
  if (isApiError(error)) {
    return error.message;
  }

  // Object cu mesaj
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    
    if (typeof err.message === 'string') {
      return err.message;
    }
    
    if (typeof err.error === 'string') {
      return err.error;
    }
    
    if (typeof err.msg === 'string') {
      return err.msg;
    }
  }

  // Fallback
  return 'A apărut o eroare neașteptată';
}

/**
 * Type guard pentru ApiError
 */
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * Hook pentru loading state cu error handling
 */
export function useAsyncOperation<T>() {
  const { handleError } = useErrorHandler();

  const execute = useCallback(
    async (
      operation: () => Promise<T>,
      context: string,
      options?: ErrorHandlerOptions
    ): Promise<T | null> => {
      try {
        return await operation();
      } catch (error) {
        handleError(error, context, options);
        return null;
      }
    },
    [handleError]
  );

  return { execute };
}
