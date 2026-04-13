'use client';

import { useState } from 'react';
import { BRANDS } from '@/lib/brands';
import type { Competitor } from '@/lib/types';

interface MapLegendProps {
  showCompetitors: boolean;
  visibleBrands: Set<string>;
  competitors: Competitor[];
}

export default function MapLegend({ showCompetitors, visibleBrands, competitors }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  const brandCounts = competitors.reduce((acc, c) => {
    acc[c.brand] = (acc[c.brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute bottom-4 left-4 z-10 bg-white rounded-full w-10 h-10 shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        title="Show legend"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-3 max-w-[220px] text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-stampede-black text-[11px] uppercase tracking-wide">Legend</span>
        <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-2">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Stampede Wash Sites</p>
        <div className="space-y-1">
          {[
            { color: '#F59E0B', label: 'Potential (unranked)' },
            { color: '#CC0000', label: 'Ranked' },
            { color: '#6B7280', label: 'Ruled Out' },
            { color: '#EA580C', label: 'Under Negotiation' },
          ].map(item => (
            <div key={item.color} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-white shadow-sm flex-shrink-0" style={{ background: item.color }} />
              <span className="text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {showCompetitors && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Competitors</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Object.entries(BRANDS)
              .filter(([key]) => visibleBrands.has(key) && brandCounts[key])
              .map(([key, brand]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: brand.color }} />
                  <span className="text-gray-700">{brand.acronym}</span>
                  <span className="text-gray-400 ml-auto">{brandCounts[key]}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
