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
  | 'first_analysis'
  | 'crm_first_client'
  | 'fiscal_chat_message'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'error_occurred'
  | 'button_click'
  | 'feature_used'
  | 'search'
  | 'download'
  | 'share'
  | 'form_submit'
  | 'ai_query'
  | 'email_sent'
  | 'file_upload'
  | 'navigation'
  // Funnel tracking events
  | 'landing_cta_click'
  | 'auth_page_view'
  | 'auth_form_started'
  | 'auth_signup_success'
  | 'auth_login_success'
  | 'yana_page_view'
  | 'yana_first_message'
  | 'yana_conversation_started'
  | 'trial_banner_shown'
  | 'pricing_page_view'
  | 'checkout_started';

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

  firstAnalysis: (companyName: string, fileType: string) => trackEvent({
    eventName: 'first_analysis',
    eventData: { company_name: companyName, file_type: fileType }
  }),

  crmFirstClient: (companyName: string) => trackEvent({
    eventName: 'crm_first_client',
    eventData: { company_name: companyName }
  }),

  fiscalChatMessage: (messageLength: number, hasAnswer: boolean) => trackEvent({
    eventName: 'fiscal_chat_message',
    eventData: { message_length: messageLength, has_answer: hasAnswer }
  }),

  subscriptionStarted: (planType: string, amount?: number) => trackEvent({
    eventName: 'subscription_started',
    eventData: { plan_type: planType, amount }
  }),

  subscriptionCancelled: (planType: string, reason?: string) => trackEvent({
    eventName: 'subscription_cancelled',
    eventData: { plan_type: planType, reason }
  }),

  buttonClick: (buttonName: string, location: string) => trackEvent({
    eventName: 'button_click',
    eventData: { button: buttonName, location }
  }),

  featureUsed: (featureName: string, duration?: number) => trackEvent({
    eventName: 'feature_used',
    eventData: { feature: featureName, duration }
  }),

  search: (query: string, resultsCount: number) => trackEvent({
    eventName: 'search',
    eventData: { query, results: resultsCount }
  }),

  download: (fileType: string, fileName: string) => trackEvent({
    eventName: 'download',
    eventData: { type: fileType, name: fileName }
  }),

  share: (contentType: string, method: string) => trackEvent({
    eventName: 'share',
    eventData: { type: contentType, method }
  }),

  formSubmit: (formName: string, success: boolean) => trackEvent({
    eventName: 'form_submit',
    eventData: { form: formName, success }
  }),

  aiQuery: (queryType: string, tokensUsed: number, cost: number) => trackEvent({
    eventName: 'ai_query',
    eventData: { type: queryType, tokens: tokensUsed, cost }
  }),

  emailSent: (emailType: string, recipientCount: number) => trackEvent({
    eventName: 'email_sent',
    eventData: { type: emailType, recipients: recipientCount }
  }),

  fileUpload: (fileType: string, fileSize: number, success: boolean) => trackEvent({
    eventName: 'file_upload',
    eventData: { type: fileType, size: fileSize, success }
  }),

  navigation: (from: string, to: string) => trackEvent({
    eventName: 'navigation',
    eventData: { from, to }
  }),

  // ====== FUNNEL TRACKING ======
  
  // Landing page
  landingCtaClick: (ctaType: 'primary' | 'secondary' | 'login', source?: string) => trackEvent({
    eventName: 'landing_cta_click',
    eventData: { 
      cta_type: ctaType, 
      source: source || 'direct',
      referrer: document.referrer || 'none'
    }
  }),

  // Auth page
  authPageView: (mode: 'login' | 'signup' | 'reset', source?: string) => trackEvent({
    eventName: 'auth_page_view',
    eventData: { 
      mode, 
      source: source || 'direct',
      referrer: document.referrer || 'none'
    }
  }),

  authFormStarted: (mode: 'login' | 'signup') => trackEvent({
    eventName: 'auth_form_started',
    eventData: { mode }
  }),

  authSignupSuccess: (method: 'email', hasMarketplaceEntry: boolean) => trackEvent({
    eventName: 'auth_signup_success',
    eventData: { 
      method, 
      has_marketplace_entry: hasMarketplaceEntry,
      referrer: document.referrer || 'none'
    }
  }),

  authLoginSuccess: (method: 'email') => trackEvent({
    eventName: 'auth_login_success',
    eventData: { method }
  }),

  // Yana page
  yanaPageView: (accessType: string | null, hasCredits: boolean) => trackEvent({
    eventName: 'yana_page_view',
    eventData: { 
      access_type: accessType || 'none',
      has_credits: hasCredits
    }
  }),

  yanaFirstMessage: (messageLength: number, hasDocuments: boolean) => trackEvent({
    eventName: 'yana_first_message',
    eventData: { 
      message_length: messageLength,
      has_documents: hasDocuments
    }
  }),

  yanaConversationStarted: (conversationType: 'new' | 'continued') => trackEvent({
    eventName: 'yana_conversation_started',
    eventData: { type: conversationType }
  }),

  // Trial & Pricing
  trialBannerShown: (daysRemaining: number, location: string) => trackEvent({
    eventName: 'trial_banner_shown',
    eventData: { days_remaining: daysRemaining, location }
  }),

  pricingPageView: (source: string) => trackEvent({
    eventName: 'pricing_page_view',
    eventData: { source }
  }),

  checkoutStarted: (planType: string, price: number) => trackEvent({
    eventName: 'checkout_started',
    eventData: { plan_type: planType, price }
  }),
};
