import { useEffect } from 'react';
import { toast } from 'sonner';
import { analytics } from '@/utils/analytics';

const JUST_UPDATED_KEY = 'yana_just_updated';

/**
 * Hook care verifică dacă aplicația tocmai s-a actualizat și afișează un toast
 * Trimite și analytics pentru version refresh
 */
export const useVersionUpdateToast = () => {
  useEffect(() => {
    try {
      const justUpdatedData = localStorage.getItem(JUST_UPDATED_KEY);
      
      if (justUpdatedData) {
        const updateInfo = JSON.parse(justUpdatedData);
        const { from, to, timestamp } = updateInfo;
        
        // Calculează durata refresh-ului
        const duration_ms = Date.now() - (timestamp || Date.now());
        
        // Trimite analytics
        analytics.versionRefresh({
          from: from || null,
          to: to,
          trigger: 'version_mismatch',
          duration_ms
        });
        
        // Afișează toast de succes
        toast.success('✅ Yana s-a actualizat!', {
          description: `Ai acces la noile feature-uri din versiunea ${to}`,
          duration: 5000,
        });
        
        // Șterge marker-ul pentru a nu afișa din nou
        localStorage.removeItem(JUST_UPDATED_KEY);
        
        console.log('[VersionToast] Update toast shown:', { from, to, duration_ms });
      }
    } catch (error) {
      console.warn('[VersionToast] Error checking update status:', error);
      // Curăță în caz de eroare
      localStorage.removeItem(JUST_UPDATED_KEY);
    }
  }, []);
};

export default useVersionUpdateToast;
