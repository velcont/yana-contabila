import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEvent = 
  | 'page_view'
  | 'analysis_created'
  | 'analysis_exported'
  | 'chat_message_sent'
  | 'voice_conversation_started'
  | 'voice_conversation_ended'
  | 'company_created'
  | 'user_login'
  | 'user_signup'
  | 'error_occurred';

interface TrackEventParams {
  eventName: AnalyticsEvent;
  eventData?: Record<string, any>;
  pageUrl?: string;
}

export const trackEvent = async ({ 
  eventName, 
  eventData = {}, 
  pageUrl 
}: TrackEventParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        user_id: user?.id || null,
        event_name: eventName,
        event_data: eventData,
        page_url: pageUrl || window.location.href,
        user_agent: navigator.userAgent,
      });

    if (error) {
      console.error('Analytics tracking error:', error);
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

// Convenience functions for common events
export const analytics = {
  pageView: (pageName: string) => trackEvent({
    eventName: 'page_view',
    eventData: { page: pageName }
  }),
  
  analysisCreated: (companyName: string, fileType: string) => trackEvent({
    eventName: 'analysis_created',
    eventData: { company_name: companyName, file_type: fileType }
  }),
  
  analysisExported: (format: string) => trackEvent({
    eventName: 'analysis_exported',
    eventData: { format }
  }),
  
  chatMessage: (messageLength: number) => trackEvent({
    eventName: 'chat_message_sent',
    eventData: { message_length: messageLength }
  }),
  
  voiceStarted: () => trackEvent({
    eventName: 'voice_conversation_started'
  }),
  
  voiceEnded: (durationSeconds: number) => trackEvent({
    eventName: 'voice_conversation_ended',
    eventData: { duration_seconds: durationSeconds }
  }),
  
  error: (errorMessage: string, errorStack?: string) => trackEvent({
    eventName: 'error_occurred',
    eventData: { 
      error_message: errorMessage,
      error_stack: errorStack
    }
  }),
};
