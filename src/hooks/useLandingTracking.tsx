import { useEffect, useRef } from 'react';
import { analytics } from '@/utils/analytics';

export const useLandingTracking = () => {
  const scrollMilestonesRef = useRef<Set<number>>(new Set());
  const timeMilestonesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const startTime = Date.now();

    // Scroll depth tracking
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);
      
      [25, 50, 75, 100].forEach(milestone => {
        if (scrollPercent >= milestone && !scrollMilestonesRef.current.has(milestone)) {
          scrollMilestonesRef.current.add(milestone);
          analytics.featureUsed('scroll_depth', milestone);
        }
      });
    };

    // Time on page tracking
    const timeIntervals = [10, 30, 60].map(seconds => 
      setTimeout(() => {
        if (!timeMilestonesRef.current.has(seconds)) {
          timeMilestonesRef.current.add(seconds);
          analytics.featureUsed('time_on_page', seconds);
        }
      }, seconds * 1000)
    );

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      timeIntervals.forEach(clearTimeout);
      
      // Track total time spent on unmount
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      analytics.featureUsed('landing_total_time', totalTime);
    };
  }, []);
};
