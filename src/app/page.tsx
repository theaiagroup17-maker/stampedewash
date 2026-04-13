'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import UserModal from '@/components/UserModal';
import AddSitePanel from '@/components/AddSitePanel';
import SiteCard from '@/components/SiteCard';
import SkeletonCard from '@/components/SkeletonCard';
import CompetitorSection from '@/components/CompetitorSection';
import EmptyState from '@/components/EmptyState';
import AddSiteModal from '@/components/AddSiteModal';
import MapLegend from '@/components/MapLegend';
import { useUser } from '@/hooks/useUser';
import { useSites, useRankings, useCompetitors, getLowestRankForSite } from '@/hooks/useSupabaseRealtime';
import { BRAND_KEYS } from '@/lib/brands';

const GoogleMap = dynamic(() => import('@/components/GoogleMap'), { ssr: false });

type ViewFilter = 'all' | 'top3' | 'top5' | 'top10';

export default function Dashboard() {
  const { user, setUser, loading: userLoading } = useUser();
  const { sites, loading: sitesLoading } = useSites();
  const { rankings, loading: rankingsLoading } = useRankings();
  const { competitors, refetch: refetchCompetitors } = useCompetitors();

  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [clickToAddMode, setClickToAddMode] = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [visibleBrands, setVisibleBrands] = useState<Set<string>>(new Set(BRAND_KEYS));
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const filteredSites = useMemo(() => {
    let filtered = sites;
    if (viewFilter !== 'all') {
      const maxRank = viewFilter === 'top3' ? 3 : viewFilter === 'top5' ? 5 : 10;
      filtered = filtered.filter(site => {
        const lowest = getLowestRankForSite(rankings, site.id);
        return lowest !== null && lowest <= maxRank;
      });
    }
    return filtered;
  }, [sites, rankings, viewFilter]);

  const searchFilteredSites = useMemo(() => {
    if (!searchQuery.trim()) return filteredSites;
    const q = searchQuery.toLowerCase();
    return filteredSites.filter(s =>
      s.name.toLowerCase().includes(q) || (s.address || '').toLowerCase().includes(q)
    );
  }, [filteredSites, searchQuery]);

  const sortedSites = useMemo(() => {
    return [...searchFilteredSites].sort((a, b) => {
      const aRank = getLowestRankForSite(rankings, a.id);
      const bRank = getLowestRankForSite(rankings, b.id);
      if (aRank !== null && bRank !== null) return aRank - bRank;
      if (aRank !== null) return -1;
      if (bRank !== null) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [searchFilteredSites, rankings]);

  const filteredSiteIds = useMemo(() => new Set(filteredSites.map(s => s.id)), [filteredSites]);

  const duplicateIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < sites.length; i++) {
      for (let j = i + 1; j < sites.length; j++) {
        if (Math.abs(sites[i].lat - sites[j].lat) < 0.0001 && Math.abs(sites[i].lng - sites[j].lng) < 0.0001) {
          ids.add(sites[i].id);
          ids.add(sites[j].id);
        }
      }
    }
    return ids;
  }, [sites]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setMapClickCoords({ lat, lng });
    setClickToAddMode(false);
  }, []);

  const handleToggleBrand = useCallback((brand: string) => {
    setVisibleBrands(prev => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand); else next.add(brand);
      return next;
    });
  }, []);

  if (userLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-[3px] border-stampede-red border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <UserModal onSelect={setUser} />;

  const isLoading = sitesLoading || rankingsLoading;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar user={user} onUserChange={setUser} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Map */}
        <div className="flex-1 relative md:w-[65%]">
          {sites.length === 0 && !sitesLoading && <EmptyState />}
          <GoogleMap
            sites={sites}
            rankings={rankings}
            competitors={competitors}
            visibleBrands={visibleBrands}
            showCompetitors={showCompetitors}
            clickToAddMode={clickToAddMode}
            onMapClick={handleMapClick}
            onSiteClick={() => {}}
            onCompetitorClick={() => {}}
            filteredSiteIds={filteredSiteIds}
          />
          <MapLegend showCompetitors={showCompetitors} visibleBrands={visibleBrands} competitors={competitors} />

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden absolute bottom-4 right-4 z-20 bg-stampede-red text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileSidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {/* Sidebar */}
        <div className={`
          w-full md:w-[35%] bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden
          fixed md:relative inset-0 md:inset-auto top-14 md:top-0 z-30
          transition-transform duration-300
          ${mobileSidebarOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        `}>
          <AddSitePanel clickToAddMode={clickToAddMode} onToggleClickMode={() => setClickToAddMode(!clickToAddMode)} />

          {/* View filters */}
          <div className="px-4 py-2 flex gap-1 border-b border-gray-100">
            {(['all', 'top3', 'top5', 'top10'] as ViewFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => setViewFilter(filter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  viewFilter === filter
                    ? 'bg-stampede-red text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {filter === 'all' ? 'All' : `Top ${filter.replace('top', '')}`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30 focus:border-stampede-red bg-white"
            />
          </div>

          {/* Site list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            ) : sortedSites.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                {searchQuery ? 'No sites match your search' : 'No sites found'}
              </p>
            ) : (
              sortedSites.map(site => (
                <SiteCard key={site.id} site={site} rankings={rankings} isDuplicate={duplicateIds.has(site.id)} />
              ))
            )}
          </div>

          {/* Competitors */}
          <CompetitorSection
            competitors={competitors}
            showCompetitors={showCompetitors}
            visibleBrands={visibleBrands}
            onToggleShow={() => setShowCompetitors(!showCompetitors)}
            onToggleBrand={handleToggleBrand}
            onSelectAll={() => setVisibleBrands(new Set(BRAND_KEYS))}
            onDeselectAll={() => setVisibleBrands(new Set())}
            onRefresh={refetchCompetitors}
          />
        </div>
      </div>

      {mapClickCoords && (
        <AddSiteModal
          lat={mapClickCoords.lat}
          lng={mapClickCoords.lng}
          onClose={() => setMapClickCoords(null)}
          onAdded={() => setMapClickCoords(null)}
        />
      )}
    </div>
  );
}
