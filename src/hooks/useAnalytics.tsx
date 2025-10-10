import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '@/utils/analytics';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page views
    const pageName = location.pathname === '/' ? 'home' : location.pathname.slice(1);
    analytics.pageView(pageName);
  }, [location]);
};

export const useAnalytics = () => {
  return analytics;
};
