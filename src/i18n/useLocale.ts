import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { translations, Locale, TranslationKeys } from './translations';
import { supabase } from '@/integrations/supabase/client';

const LOCALE_STORAGE_KEY = 'resilient_locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'pt') return stored;
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('pt')) return 'pt';
    return 'en';
  });

  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, locale: newLocale, updated_at: new Date().toISOString() })
        .select();
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const applyProfileLocale = async (userId: string) => {
      const { data } = await supabase
        .from('user_profiles')
        .select('locale')
        .eq('user_id', userId)
        .single();
      if (!active) return;
      if (data?.locale && (data.locale === 'en' || data.locale === 'pt')) {
        setLocaleState(data.locale);
        localStorage.setItem(LOCALE_STORAGE_KEY, data.locale);
      }
    };

    // This listener must stay synchronous and must not start a Supabase call
    // (backlog A-08). The auth client awaits its listeners while holding its
    // lock, and every Supabase call first waits for that lock: a call awaited
    // in here never answers, and the sign-in that fired the event never
    // completes. The profile is read after the listener has returned.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id;
      if (!userId) return;
      const timer = setTimeout(() => {
        timers.delete(timer);
        applyProfileLocale(userId).catch(() => {
          // Offline or refused: the language of the device stays.
        });
      }, 0);
      timers.add(timer);
    });

    return () => {
      active = false;
      timers.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const t = translations[locale] as TranslationKeys;

  return React.createElement(
    LocaleContext.Provider,
    { value: { locale, setLocale, t } },
    children
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
