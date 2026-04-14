'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { BRAND_KEYS, getBrand } from '@/lib/brands';
import { formatMountainTime } from '@/lib/constants';
import AddCompetitorModal from './AddCompetitorModal';
import CompetitorListView from './CompetitorListView';
import type { Competitor } from '@/lib/types';

interface CompetitorSectionProps {
  competitors: Competitor[];
  showCompetitors: boolean;
  visibleBrands: Set<string>;
  onToggleShow: () => void;
  onToggleBrand: (brand: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRefresh: () => void;
}

const CITIES = ['All', 'Calgary', 'Airdrie', 'Cochrane', 'Okotoks'] as const;
const WASH_TYPES = ['All', 'tunnel', 'automatic', 'express', 'full_service'] as const;
const COMP_STATUSES = ['All', 'existing', 'new', 'upcoming'] as const;

export default function CompetitorSection({
  competitors, showCompetitors, visibleBrands,
  onToggleShow, onToggleBrand, onSelectAll, onDeselectAll, onRefresh,
}: CompetitorSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [washFilter, setWashFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showListView, setShowListView] = useState(false);

  const filteredCompetitors = competitors.filter(c => {
    if (cityFilter !== 'All' && c.city !== cityFilter) return false;
    if (washFilter !== 'All' && c.wash_type !== washFilter) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    return true;
  });

  const brandCounts: Record<string, number> = {};
  const brandStatusCounts: Record<string, Record<string, number>> = {};
  filteredCompetitors.forEach(c => {
    brandCounts[c.brand] = (brandCounts[c.brand] || 0) + 1;
    if (!brandStatusCounts[c.brand]) brandStatusCounts[c.brand] = {};
    const st = c.status || 'existing';
    brandStatusCounts[c.brand][st] = (brandStatusCounts[c.brand][st] || 0) + 1;
  });

  const activeBrands = BRAND_KEYS.filter(k => brandCounts[k]);
  const cityCount = new Set(competitors.map(c => c.city).filter(Boolean)).size;
  const lastUpdated = competitors.length > 0
    ? Math.max(...competitors.map(c => new Date(c.created_at).getTime()))
    : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('[CompetitorSection] Calling POST /api/seed-competitors...');
    try {
      const seedRes = await fetch('/api/seed-competitors', { method: 'POST' });
      const seedData = await seedRes.json();
      console.log('[CompetitorSection] seed response:', seedData);
      if (!seedRes.ok) throw new Error(seedData.error || 'Seed failed');
      toast.success(`${seedData.count} competitors loaded successfully`);
      onRefresh();
      fetch('/api/discover-competitors', { method: 'POST' })
        .then(async r => { const d = await r.json(); if (r.ok && d.upserted > 0) { toast.success(`AI found ${d.upserted} additional competitors`); onRefresh(); } })
        .catch(() => {});
    } catch (err: any) {
      console.error('[CompetitorSection] error:', err);
      toast.error(err.message);
    } finally { setRefreshing(false); }
  };

  return (
    <div className="border-t border-gray-100">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="font-bold text-sm text-stampede-black">Competitors</span>
          <span className="text-xs text-gray-400">{competitors.length} loaded</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-gray-500">Show</span>
          <div className="relative">
            <input type="checkbox" checked={showCompetitors} onChange={onToggleShow} className="sr-only" />
            <div className={`w-9 h-5 rounded-full transition-colors ${showCompetitors ? 'bg-stampede-red' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-0.5 ${showCompetitors ? 'translate-x-4.5 ml-[18px]' : 'ml-0.5'}`} />
            </div>
          </div>
        </label>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-500">
            {competitors.length} competitors across {cityCount} {cityCount === 1 ? 'city' : 'cities'}
          </p>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={() => setShowAddModal(true)}
              className="flex-1 py-1.5 text-xs font-semibold bg-stampede-red text-white rounded-lg hover:bg-red-700">+ Add Competitor</button>
            <button onClick={() => setShowListView(true)}
              className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">View All</button>
          </div>

          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {COMP_STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors ${statusFilter === s ? 'bg-stampede-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === 'All' ? 'All Status' : s}
              </button>
            ))}
          </div>

          {/* City filter */}
          <div className="flex gap-1 flex-wrap">
            {CITIES.map(city => (
              <button key={city} onClick={() => setCityFilter(city)}
                className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors ${cityFilter === city ? 'bg-stampede-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {city}
              </button>
            ))}
          </div>

          {/* Wash type filter */}
          <div className="flex gap-1 flex-wrap">
            {WASH_TYPES.map(type => (
              <button key={type} onClick={() => setWashFilter(type)}
                className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors ${washFilter === type ? 'bg-stampede-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {type === 'All' ? 'All Types' : type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Select/Deselect */}
          <div className="flex gap-2">
            <button onClick={onSelectAll} className="text-[10px] text-stampede-red font-medium hover:underline">Select All</button>
            <button onClick={onDeselectAll} className="text-[10px] text-gray-500 font-medium hover:underline">Deselect All</button>
          </div>

          {/* Brand toggles with status breakdown */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {activeBrands.map(key => {
              const brand = getBrand(key);
              const sCounts = brandStatusCounts[key] || {};
              const breakdown = Object.entries(sCounts).map(([s, n]) => `${n} ${s}`).join(', ');
              return (
                <div key={key} className="flex items-center gap-2 py-1">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: brand.color }} />
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: brand.color }}>{brand.acronym}</span>
                  <span className="text-xs text-gray-500 truncate flex-1" title={breakdown}>{brand.name}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{brandCounts[key]}</span>
                  <label className="flex-shrink-0 cursor-pointer">
                    <input type="checkbox" checked={visibleBrands.has(key)} onChange={() => onToggleBrand(key)} className="sr-only" />
                    <div className={`w-7 h-4 rounded-full transition-colors ${visibleBrands.has(key) ? 'bg-stampede-red' : 'bg-gray-300'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform mt-0.5 ${visibleBrands.has(key) ? 'ml-[14px]' : 'ml-0.5'}`} />
                    </div>
                  </label>
                </div>
              );
            })}
          </div>

          {/* Refresh button */}
          <button onClick={handleRefresh} disabled={refreshing}
            className="w-full py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
            {refreshing ? 'Loading...' : '🔄 Refresh Competitor Data'}
          </button>

          {lastUpdated && (
            <p className="text-[10px] text-gray-400 text-center">
              Last updated: {formatMountainTime(new Date(lastUpdated))}
            </p>
          )}
        </div>
      )}

      {showAddModal && <AddCompetitorModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); onRefresh(); }} />}
      {showListView && <CompetitorListView competitors={competitors} onClose={() => setShowListView(false)} onRefresh={onRefresh} />}
    </div>
  );
}
