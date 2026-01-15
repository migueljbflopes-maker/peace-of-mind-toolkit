import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Generate or retrieve session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

export function usePageTracking() {
  const location = useLocation();
  const { user } = useAuth();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Don't track the same path twice in a row
    if (lastPathRef.current === location.pathname) {
      return;
    }
    lastPathRef.current = location.pathname;

    // Don't track admin pages
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    const trackPageView = async () => {
      try {
        await supabase.from('page_views').insert({
          path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          session_id: getSessionId(),
          user_id: user?.id || null,
        });
      } catch (error) {
        // Silently fail - analytics shouldn't break the app
        console.debug('Page tracking error:', error);
      }
    };

    trackPageView();
  }, [location.pathname, user?.id]);
}
