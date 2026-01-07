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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('locale')
          .eq('user_id', session.user.id)
          .single();
        if (data?.locale && (data.locale === 'en' || data.locale === 'pt')) {
          setLocaleState(data.locale);
          localStorage.setItem(LOCALE_STORAGE_KEY, data.locale);
        }
      }
    });
    return () => subscription.unsubscribe();
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
