import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const HEARTBEAT_INTERVAL = 60000; // 60 secunde

export const usePresenceTracking = () => {
  const { user } = useAuth();
  const location = useLocation();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCreatedRef = useRef(false);

  // Upsert sesiune la mount și update pagină
  const upsertSession = async (currentPage: string) => {
    if (!user?.email) return;

    try {
      const { error } = await supabase
        .from('active_sessions')
        .upsert({
          user_id: user.id,
          email: user.email,
          current_page: currentPage,
          last_activity: new Date().toISOString(),
          user_agent: navigator.userAgent,
          started_at: sessionCreatedRef.current ? undefined : new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('[Presence] Error upserting session:', error);
      } else {
        sessionCreatedRef.current = true;
      }
    } catch (err) {
      console.error('[Presence] Upsert failed:', err);
    }
  };

  // Heartbeat: update last_activity + cleanup
  const sendHeartbeat = async () => {
    if (!user?.id) return;

    try {
      // Update propria sesiune
      await supabase
        .from('active_sessions')
        .update({ 
          last_activity: new Date().toISOString(),
          current_page: location.pathname
        })
        .eq('user_id', user.id);

      // Cleanup sesiuni inactive (apelat de orice user, funcția șterge toate sesiunile vechi)
      await supabase.rpc('cleanup_inactive_sessions');
    } catch (err) {
      console.error('[Presence] Heartbeat failed:', err);
    }
  };

  // Șterge sesiunea la unmount/logout
  const deleteSession = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('active_sessions')
        .delete()
        .eq('user_id', user.id);
    } catch (err) {
      console.error('[Presence] Delete session failed:', err);
    }
  };

  // Effect pentru crearea sesiunii și heartbeat
  useEffect(() => {
    if (!user?.id || !user?.email) return;

    // Crează/actualizează sesiunea
    upsertSession(location.pathname);

    // Pornește heartbeat
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Handler pentru închidere tab/fereastră
    const handleBeforeUnload = () => {
      // Încercăm să ștergem sesiunea sincron (beacon API)
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/active_sessions?user_id=eq.${user.id}`;
      navigator.sendBeacon(url); // Nu merge cu DELETE, dar cleanup-ul va curăța
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Cleanup la unmount
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      deleteSession();
    };
  }, [user?.id, user?.email]);

  // Effect pentru update pagină la navigare
  useEffect(() => {
    if (!user?.id || !sessionCreatedRef.current) return;

    // Update pagina curentă
    supabase
      .from('active_sessions')
      .update({ 
        current_page: location.pathname,
        last_activity: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .then(({ error }) => {
        if (error) console.error('[Presence] Page update failed:', error);
      });
  }, [location.pathname, user?.id]);
};
