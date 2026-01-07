/**
 * Hook for fetching alerts from news_items based on user preferences
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertPreferences } from './useAlertPreferences';

export interface AlertItem {
  id: string;
  kind: 'signals' | 'context' | 'headline';
  publishedAt: string | null;
  fetchedAt: string;
  title: string;
  summary: string | null;
  url: string | null;
  domain: string | null;
  region: string | null;
  topics: string[];
  severity: 'major' | 'moderate';
}

export function useAlertsInbox(preferences: AlertPreferences) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    if (!preferences.enabled) {
      setAlerts([]);
      setNewCount(0);
      return;
    }

    setIsLoading(true);
    try {
      // Calculate since date
      const since = preferences.lastSeenAt 
        ? new Date(preferences.lastSeenAt)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      let query = supabase
        .from('news_items')
        .select('*')
        .gte('published_at', since.toISOString())
        .order('published_at', { ascending: false })
        .limit(50);

      // Apply severity filter
      if (preferences.severityThreshold === 'major') {
        query = query.eq('severity', 'major');
      }

      // Apply region filter if not Global/empty
      const regions = preferences.regions.filter(r => r !== 'Global');
      if (regions.length > 0) {
        // Use OR filter for multiple regions
        const regionFilters = regions.map(r => `region.ilike.%${r}%`).join(',');
        query = query.or(regionFilters);
      }

      // Apply topic filter if not empty
      if (preferences.topics.length > 0) {
        query = query.overlaps('topics', preferences.topics);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
        setAlerts([]);
        return;
      }

      const mappedAlerts: AlertItem[] = (data || []).map(item => ({
        id: item.id,
        kind: item.kind as 'signals' | 'context' | 'headline',
        publishedAt: item.published_at,
        fetchedAt: item.fetched_at || new Date().toISOString(),
        title: item.title,
        summary: item.summary,
        url: item.url,
        domain: item.domain,
        region: item.region,
        topics: item.topics || [],
        severity: (item.severity as 'major' | 'moderate') || 'moderate',
      }));

      // Sort: signals first, then by severity, then by date
      mappedAlerts.sort((a, b) => {
        // Kind priority: signals > context > headline
        const kindOrder = { signals: 0, context: 1, headline: 2 };
        if (kindOrder[a.kind] !== kindOrder[b.kind]) {
          return kindOrder[a.kind] - kindOrder[b.kind];
        }
        // Severity priority: major > moderate
        if (a.severity !== b.severity) {
          return a.severity === 'major' ? -1 : 1;
        }
        // Date: newest first
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });

      setAlerts(mappedAlerts);
      
      // Count new since last seen
      if (preferences.lastSeenAt) {
        const lastSeen = new Date(preferences.lastSeenAt).getTime();
        const newAlerts = mappedAlerts.filter(a => {
          const pubDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          return pubDate > lastSeen;
        });
        setNewCount(newAlerts.length);
      } else {
        setNewCount(mappedAlerts.length);
      }

      // Cache for offline
      localStorage.setItem('resilient_alerts_last', JSON.stringify({
        alerts: mappedAlerts,
        timestamp: Date.now(),
      }));
    } catch {
      // Try to load from cache
      const cached = localStorage.getItem('resilient_alerts_last');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setAlerts(parsed.alerts || []);
        } catch {
          setAlerts([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading,
    newCount,
    refresh: fetchAlerts,
  };
}
