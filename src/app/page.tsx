'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import UserModal from '@/components/UserModal';
import AddSitePanel from '@/components/AddSitePanel';
import SiteCard from '@/components/SiteCard';
import SkeletonCard from '@/components/SkeletonCard';
import CompetitorSection from '@/components/CompetitorSection';
import EmptyState from '@/components/EmptyState';
import AddSiteModal from '@/components/AddSiteModal';
import MapLegend from '@/components/MapLegend';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useUser } from '@/hooks/useUser';
import { useSites, useRankings, useCompetitors, getUserRank, getLowestRankForSite } from '@/hooks/useSupabaseRealtime';
import { BRAND_KEYS } from '@/lib/brands';
import { USERS } from '@/lib/users';
import type { Site } from '@/lib/types';
import toast from 'react-hot-toast';

const GoogleMap = dynamic(() => import('@/components/GoogleMap'), { ssr: false });

type RankFilter = { user: string; max: number };

export default function Dashboard() {
  const router = useRouter();
  const { user, setUser, loading: userLoading } = useUser();
  const { sites, loading: sitesLoading } = useSites();
  const { rankings, loading: rankingsLoading } = useRankings();
  const { competitors, refetch: refetchCompetitors } = useCompetitors();

  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [clickToAddMode, setClickToAddMode] = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(true);
  const [visibleBrands, setVisibleBrands] = useState<Set<string>>(new Set(BRAND_KEYS));
  const [mapClickCoords, setMapClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [listSortCol, setListSortCol] = useState<string>('name');
  const [listSortAsc, setListSortAsc] = useState(true);

  // Parse active filters into RankFilter objects
  const rankFilters: RankFilter[] = useMemo(() => {
    const filters: RankFilter[] = [];
    activeFilters.forEach(key => {
      const userInitial = key[0]; // D or C
      const max = parseInt(key.substring(1));
      const userName = USERS.find(u => u[0] === userInitial);
      if (userName && !isNaN(max)) filters.push({ user: userName, max });
    });
    return filters;
  }, [activeFilters]);

  // Filter sites by active rank filters (union)
  const filteredSites = useMemo(() => {
    if (rankFilters.length === 0) return sites;
    return sites.filter(site => {
      return rankFilters.some(f => {
        const rank = getUserRank(rankings, site.id, f.user);
        return rank !== null && rank <= f.max;
      });
    });
  }, [sites, rankings, rankFilters]);

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

  // List view sorting
  const listSortedSites = useMemo(() => {
    return [...searchFilteredSites].sort((a, b) => {
      let cmp = 0;
      switch (listSortCol) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'address': cmp = (a.address || '').localeCompare(b.address || ''); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'research': cmp = a.research_status.localeCompare(b.research_status); break;
        default: {
          // User rank columns like 'rank_Derek'
          if (listSortCol.startsWith('rank_')) {
            const userName = listSortCol.replace('rank_', '');
            const aR = getUserRank(rankings, a.id, userName) ?? 999;
            const bR = getUserRank(rankings, b.id, userName) ?? 999;
            cmp = aR - bR;
          }
          break;
        }
      }
      return listSortAsc ? cmp : -cmp;
    });
  }, [searchFilteredSites, rankings, listSortCol, listSortAsc]);

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

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleDeleteSite = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/sites/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete site');
    }
  };

  const handleRetryResearch = async (siteId: string) => {
    toast.loading('Running research...', { id: `research-${siteId}` });
    const res = await fetch(`/api/research/${siteId}`, { method: 'POST' });
    if (res.ok) toast.success('Research complete', { id: `research-${siteId}` });
    else toast.error('Research failed', { id: `research-${siteId}` });
  };

  const handleListSort = (col: string) => {
    if (listSortCol === col) setListSortAsc(!listSortAsc);
    else { setListSortCol(col); setListSortAsc(true); }
  };

  if (userLoading) {
    return <div className="h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-[3px] border-stampede-red border-t-transparent rounded-full" />
    </div>;
  }

  if (!user) return <UserModal onSelect={setUser} />;

  const isLoading = sitesLoading || rankingsLoading;
  const filterButtons = USERS.map(u => [
    { key: `${u[0]}3`, label: `${u[0]}3` },
    { key: `${u[0]}5`, label: `${u[0]}5` },
    { key: `${u[0]}10`, label: `${u[0]}10` },
  ]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar user={user} onUserChange={setUser} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main content */}
        <div className="flex-1 relative md:w-[65%]">
          {viewMode === 'map' ? (
            <>
              {sites.length === 0 && !sitesLoading && <EmptyState />}
              <GoogleMap
                sites={sites} rankings={rankings} competitors={competitors}
                visibleBrands={visibleBrands} showCompetitors={showCompetitors}
                clickToAddMode={clickToAddMode} onMapClick={handleMapClick}
                onSiteClick={() => {}} onCompetitorClick={() => {}}
                filteredSiteIds={filteredSiteIds}
              />
              <MapLegend showCompetitors={showCompetitors} visibleBrands={visibleBrands} competitors={competitors} />
            </>
          ) : (
            /* LIST VIEW */
            <div className="h-full overflow-auto bg-white">
              {sites.length === 0 && !sitesLoading ? <EmptyState /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {[
                          { key: 'name', label: '#  Site Name' },
                          { key: 'address', label: 'Address' },
                          { key: 'status', label: 'Status' },
                          ...USERS.map(u => ({ key: `rank_${u}`, label: `${u} Rank` })),
                          { key: 'research', label: 'Research' },
                          { key: 'actions', label: '' },
                        ].map(col => (
                          <th key={col.key}
                            onClick={() => col.key !== 'actions' && handleListSort(col.key)}
                            className={`px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 ${col.key !== 'actions' ? 'cursor-pointer hover:text-gray-700' : ''}`}>
                            <span className="flex items-center gap-1">
                              {col.label}
                              {listSortCol === col.key && (
                                <svg className={`w-3 h-3 ${listSortAsc ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {listSortedSites.map((site, idx) => {
                        const rowBg = site.status === 'ruled_out' ? 'bg-gray-50' : site.status === 'under_negotiation' ? 'bg-amber-50/50' : 'bg-white';
                        return (
                          <tr key={site.id} onClick={() => router.push(`/site/${site.id}`)}
                            className={`${rowBg} border-b border-gray-100 hover:bg-gray-100/50 cursor-pointer transition-colors`}>
                            <td className="px-3 py-2.5 font-medium text-stampede-black">
                              <span className="text-gray-400 mr-2">{idx + 1}</span>
                              {site.name}
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs truncate max-w-[200px]">{site.address || '—'}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                site.status === 'potential' ? 'bg-amber-100 text-amber-700' :
                                site.status === 'under_negotiation' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-500'
                              }`}>{site.status.replace('_', ' ')}</span>
                            </td>
                            {USERS.map(u => {
                              const rank = getUserRank(rankings, site.id, u);
                              return (
                                <td key={u} className="px-3 py-2.5">
                                  <span className={rank ? 'font-bold text-stampede-red' : 'text-gray-400'}>
                                    {rank ? `#${rank}` : '—'}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-3 py-2.5">
                              {site.research_status === 'pending' && <span className="text-gray-400">🕐</span>}
                              {site.research_status === 'running' && <span className="animate-spin inline-block">⏳</span>}
                              {site.research_status === 'complete' && <span className="text-green-600">✓</span>}
                              {site.research_status === 'failed' && (
                                <span className="flex items-center gap-1">
                                  <span className="text-red-500">✗</span>
                                  <button onClick={(e) => { e.stopPropagation(); handleRetryResearch(site.id); }}
                                    className="text-[10px] text-stampede-red hover:underline">retry</button>
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(site); }}
                                className="text-gray-400 hover:text-red-500 transition-colors" title="Delete site">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Mobile toggle */}
          <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden absolute bottom-4 right-4 z-20 bg-stampede-red text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileSidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {/* Sidebar */}
        <div className={`w-full md:w-[35%] bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden fixed md:relative inset-0 md:inset-auto top-14 md:top-0 z-30 transition-transform duration-300 ${mobileSidebarOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>

          {/* View toggle + Add site */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <button onClick={() => setViewMode('map')} title="Map view"
              className={`p-1.5 rounded ${viewMode === 'map' ? 'bg-stampede-red text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button onClick={() => setViewMode('list')} title="List view"
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-stampede-red text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <span className="flex-1" />
            <span className="text-[10px] text-gray-400">{filteredSites.length} / {sites.length} sites</span>
          </div>

          <AddSitePanel clickToAddMode={clickToAddMode} onToggleClickMode={() => setClickToAddMode(!clickToAddMode)} />

          {/* Per-user multi-select filters */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <button onClick={() => setActiveFilters(new Set())}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors flex-shrink-0 ${
                  activeFilters.size === 0 ? 'bg-stampede-red text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}>All</button>

              {USERS.map((userName, ui) => (
                <div key={userName} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{userName}</span>
                  <div className="flex gap-1">
                    {filterButtons[ui].map(btn => (
                      <button key={btn.key} onClick={() => toggleFilter(btn.key)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-full transition-colors ${
                          activeFilters.has(btn.key) ? 'bg-stampede-red text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}>{btn.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-gray-100">
            <input type="text" placeholder="Search sites..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30 focus:border-stampede-red bg-white" />
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
                <SiteCard key={site.id} site={site} rankings={rankings}
                  isDuplicate={duplicateIds.has(site.id)}
                  onDelete={() => setDeleteTarget(site)} />
              ))
            )}
          </div>

          <CompetitorSection
            competitors={competitors} showCompetitors={showCompetitors} visibleBrands={visibleBrands}
            onToggleShow={() => setShowCompetitors(!showCompetitors)} onToggleBrand={handleToggleBrand}
            onSelectAll={() => setVisibleBrands(new Set(BRAND_KEYS))}
            onDeselectAll={() => setVisibleBrands(new Set())} onRefresh={refetchCompetitors}
          />
        </div>
      </div>

      {mapClickCoords && (
        <AddSiteModal lat={mapClickCoords.lat} lng={mapClickCoords.lng}
          onClose={() => setMapClickCoords(null)} onAdded={() => setMapClickCoords(null)} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Site"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This will also remove all rankings for this site. This cannot be undone.`}
          confirmLabel="Delete" confirmColor="red"
          onConfirm={handleDeleteSite} onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Debug button — temporary */}
      <button
        onClick={async () => {
          try {
            console.log('[DEBUG] Calling POST /api/seed-competitors...');
            const res = await fetch('/api/seed-competitors', { method: 'POST' });
            const data = await res.json();
            console.log('[DEBUG] Response:', data);
            alert(JSON.stringify(data, null, 2));
            if (res.ok) refetchCompetitors();
          } catch (e: any) {
            alert('Error: ' + e.message);
          }
        }}
        className="fixed bottom-4 left-4 z-50 px-3 py-1.5 text-[10px] font-mono bg-gray-500 text-white rounded shadow hover:bg-gray-600 transition-colors opacity-60 hover:opacity-100"
      >
        Debug: Seed Competitors
      </button>
    </div>
  );
}
