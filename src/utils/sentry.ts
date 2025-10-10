import * as Sentry from "@sentry/react";

export const initSentry = () => {
  // Only initialize in production
  if (import.meta.env.MODE === 'production') {
    Sentry.init({
      dsn: "", // User will need to add their Sentry DSN
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0,
      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      // Environment
      environment: import.meta.env.MODE,
    });
  }
};

export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('Error logged:', error, context);
  
  if (import.meta.env.MODE === 'production') {
    Sentry.captureException(error, {
      extra: context,
    });
  }
};

export const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  console.log(`[${level}] ${message}`);
  
  if (import.meta.env.MODE === 'production') {
    Sentry.captureMessage(message, level);
  }
};
