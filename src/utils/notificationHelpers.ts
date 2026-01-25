import { supabase } from '@/integrations/supabase/client';

interface CreateNotificationOptions {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'alert';
  actionUrl?: string;
  metadata?: any;
}

/**
 * Helper function to create a notification for a user
 * This is typically called from edge functions
 */
export async function createNotification(options: CreateNotificationOptions) {
  const { userId, title, message, type, actionUrl, metadata } = options;

  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { data: null, error };
  }
}

/**
 * Create a notification for analysis completion
 */
export async function notifyAnalysisComplete(userId: string, fileName: string, analysisId: string) {
  return createNotification({
    userId,
    title: 'Analiză completă',
    message: `Analiza pentru ${fileName} a fost finalizată cu succes`,
    type: 'success',
    actionUrl: `/yana?analysis=${analysisId}`,
    metadata: { analysisId, fileName }
  });
}

/**
 * Create a notification for low credit warning
 */
export async function notifyLowCredit(userId: string, remainingCredits: number) {
  return createNotification({
    userId,
    title: 'Credite scăzute',
    message: `Ai rămas cu ${remainingCredits} credite AI. Reîncarcare recomandată.`,
    type: 'warning',
    actionUrl: '/my-ai-costs',
    metadata: { remainingCredits }
  });
}

/**
 * Create a notification for important insights
 */
export async function notifyImportantInsight(userId: string, insightTitle: string, insightMessage: string) {
  return createNotification({
    userId,
    title: insightTitle,
    message: insightMessage,
    type: 'alert',
    metadata: { category: 'financial_insight' }
  });
}

/**
 * Create a notification for subscription events
 */
export async function notifySubscriptionEvent(
  userId: string,
  eventType: 'renewal' | 'expiring' | 'expired' | 'upgraded',
  message: string
) {
  const titles = {
    renewal: 'Abonament reînnoit',
    expiring: 'Abonament expiră în curând',
    expired: 'Abonament expirat',
    upgraded: 'Abonament actualizat'
  };

  return createNotification({
    userId,
    title: titles[eventType],
    message,
    type: eventType === 'expired' ? 'error' : eventType === 'expiring' ? 'warning' : 'info',
    actionUrl: '/subscription',
    metadata: { eventType }
  });
}
