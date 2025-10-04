import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin role:', error);
      }

      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isAdmin, isLoading };
};
