'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Site, Ranking, Competitor } from '@/lib/types';

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = useCallback(async () => {
    const { data } = await supabase
      .from('sites')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setSites(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSites();

    const channel = supabase
      .channel('sites-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sites' }, () => {
        fetchSites();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSites]);

  return { sites, loading, refetch: fetchSites };
}

export function useRankings() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    const { data } = await supabase
      .from('rankings')
      .select('*');
    if (data) setRankings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRankings();

    const channel = supabase
      .channel('rankings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => {
        fetchRankings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRankings]);

  return { rankings, loading, refetch: fetchRankings };
}

export function useCompetitors() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompetitors = useCallback(async () => {
    const { data } = await supabase
      .from('competitors')
      .select('*')
      .order('brand', { ascending: true });
    if (data) setCompetitors(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompetitors();

    const channel = supabase
      .channel('competitors-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competitors' }, () => {
        fetchCompetitors();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCompetitors]);

  return { competitors, loading, refetch: fetchCompetitors };
}

export function getRankingsForSite(rankings: Ranking[], siteId: string): Ranking[] {
  return rankings.filter(r => r.site_id === siteId);
}

export function getUserRank(rankings: Ranking[], siteId: string, userName: string): number | null {
  const r = rankings.find(r => r.site_id === siteId && r.user_name === userName);
  return r?.rank ?? null;
}

export function getLowestRankForSite(rankings: Ranking[], siteId: string): number | null {
  const siteRankings = rankings.filter(r => r.site_id === siteId && r.rank !== null);
  if (siteRankings.length === 0) return null;
  return Math.min(...siteRankings.map(r => r.rank!));
}
