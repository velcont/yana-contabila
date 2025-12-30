import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AIUsage {
  total_cost_cents: number;
  budget_cents: number;
  usage_percent: number;
}

export interface AICreditsData {
  isLoading: boolean;
  hasFreeAccess: boolean;
  hasEverUsedCredits: boolean;
  remainingCredits: number;
  usagePercent: number;
  estimatedSessions: number;
  hasCredits: boolean;
  aiUsage: AIUsage | null;
  refetch: () => void;
}

export function useAICredits(): AICreditsData {
  const [aiUsage, setAiUsage] = useState<AIUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFreeAccess, setHasFreeAccess] = useState(false);
  const [hasEverUsedCredits, setHasEverUsedCredits] = useState(false);

  const fetchAIUsage = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check if user has free access
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_free_access')
        .eq('id', user.id)
        .single();
      
      setHasFreeAccess(profile?.has_free_access === true);

      // Check if user has ever used AI credits (any usage in ai_usage table)
      const { count } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setHasEverUsedCredits((count || 0) > 0);

      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data: monthlyUsage } = await supabase.rpc('get_monthly_ai_usage', {
        p_user_id: user.id,
        p_month_year: currentMonth
      });

      if (monthlyUsage && monthlyUsage.length > 0) {
        setAiUsage(monthlyUsage[0]);
      }
    } catch (error) {
      console.error('Error fetching AI usage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAIUsage();
    const interval = setInterval(fetchAIUsage, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchAIUsage]);

  // Calculated values
  const remainingCredits = aiUsage ? (aiUsage.budget_cents - aiUsage.total_cost_cents) / 100 : 0;
  const usagePercent = aiUsage?.usage_percent || 0;
  // Utilizatorii cu acces gratuit NU au credite AI disponibile pentru funcții premium
  const hasCredits = !hasFreeAccess && remainingCredits > 0;
  // Estimare sesiuni rămase (~2 RON per sesiune medie, minim 1 dacă există credite)
  const estimatedSessions = remainingCredits > 0 
    ? Math.max(1, Math.floor(remainingCredits / 2)) 
    : 0;

  return {
    isLoading,
    hasFreeAccess,
    hasEverUsedCredits,
    remainingCredits,
    usagePercent,
    estimatedSessions,
    hasCredits,
    aiUsage,
    refetch: fetchAIUsage,
  };
}
