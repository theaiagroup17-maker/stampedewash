'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { USERS } from '@/lib/users';
import { formatMountainTime } from '@/lib/constants';
import UserModal from '@/components/UserModal';
import type { Site, Ranking, ResearchData } from '@/lib/types';
import toast from 'react-hot-toast';

type Tab = 'rankings' | 'research' | 'notes';

export default function SiteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.id as string;
  const { user, setUser, loading: userLoading } = useUser();

  const [site, setSite] = useState<Site | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('rankings');
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesLastSaved, setNotesLastSaved] = useState<string | null>(null);
  const notesTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    const { data: siteData } = await supabase.from('sites').select('*').eq('id', siteId).single();
    if (siteData) {
      setSite(siteData);
      setNotes(siteData.notes || '');
    }
    const { data: rankingsData } = await supabase.from('rankings').select('*').eq('site_id', siteId);
    if (rankingsData) setRankings(rankingsData);
    setLoading(false);
  }, [siteId]);

  useEffect(() => {
    fetchData();

    const siteChan = supabase
      .channel(`site-${siteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sites', filter: `id=eq.${siteId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings', filter: `site_id=eq.${siteId}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(siteChan); };
  }, [siteId, fetchData]);

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch(`/api/sites/${siteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) toast.success('Status updated');
  };

  const handleRankChange = async (rank: number | null) => {
    if (!user) return;
    const res = await fetch('/api/rankings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, user_name: user, rank }),
    });
    if (res.ok) toast.success('Rank updated');
    else toast.error('Failed to update rank');
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      setNotesSaving(true);
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      });
      setNotesSaving(false);
      if (res.ok) setNotesLastSaved(new Date().toISOString());
    }, 1000);
  };

  const handleRunResearch = async () => {
    toast.loading('Running research agent...', { id: 'research' });
    const res = await fetch(`/api/research/${siteId}`, { method: 'POST' });
    if (res.ok) {
      toast.success('Research complete!', { id: 'research' });
    } else {
      toast.error('Research failed', { id: 'research' });
    }
  };

  if (userLoading || loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-[3px] border-stampede-red border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <UserModal onSelect={setUser} />;
  if (!site) return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-gray-500">Site not found</p>
    </div>
  );

  const myRank = rankings.find(r => r.user_name === user)?.rank ?? null;
  const googleMapsUrl = `https://www.google.com/maps?q=${site.lat},${site.lng}`;
  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${site.lat},${site.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${site.lat},${site.lng}&zoom=17&size=600x200&maptype=satellite&markers=color:red|${site.lat},${site.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => router.push('/')} className="text-gray-500 hover:text-stampede-red transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-stampede-black flex-1">{site.name}</h1>
          <select
            value={site.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stampede-red/30"
          >
            <option value="potential">Potential</option>
            <option value="under_negotiation">Under Negotiation</option>
            <option value="ruled_out">Ruled Out</option>
          </select>
        </div>
        <p className="text-sm text-gray-500 mt-1 ml-9">{site.address || 'No address'}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Left column — imagery */}
        <div className="lg:w-[40%] space-y-4">
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
            <img
              src={streetViewUrl}
              alt="Street View"
              className="w-full h-[250px] object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-no-streetview.svg'; }}
            />
          </div>
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
            <img
              src={staticMapUrl}
              alt="Satellite View"
              className="w-full h-[160px] object-cover"
            />
          </div>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-stampede-red hover:bg-red-50 transition-colors"
          >
            Open in Google Maps →
          </a>
        </div>

        {/* Right column — tabs */}
        <div className="lg:w-[60%]">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tab headers */}
            <div className="flex border-b border-gray-100">
              {(['rankings', 'research', 'notes'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'text-stampede-red border-stampede-red'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  {tab === 'rankings' && 'Rankings'}
                  {tab === 'research' && 'AI Research'}
                  {tab === 'notes' && 'Notes'}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === 'rankings' && (
                <RankingsTab
                  rankings={rankings}
                  currentUser={user}
                  myRank={myRank}
                  onRankChange={handleRankChange}
                />
              )}
              {activeTab === 'research' && (
                <ResearchTab
                  site={site}
                  onRunResearch={handleRunResearch}
                />
              )}
              {activeTab === 'notes' && (
                <NotesTab
                  notes={notes}
                  saving={notesSaving}
                  lastSaved={notesLastSaved}
                  onChange={handleNotesChange}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankingsTab({
  rankings,
  currentUser,
  myRank,
  onRankChange,
}: {
  rankings: Ranking[];
  currentUser: string;
  myRank: number | null;
  onRankChange: (rank: number | null) => void;
}) {
  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
            <th className="pb-2 font-semibold">User</th>
            <th className="pb-2 font-semibold">Rank</th>
            <th className="pb-2 font-semibold">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {USERS.map(userName => {
            const ranking = rankings.find(r => r.user_name === userName);
            const isCurrentUser = userName === currentUser;
            return (
              <tr key={userName} className={`border-b border-gray-50 ${isCurrentUser ? 'bg-red-50/50' : ''}`}>
                <td className="py-3 font-medium">
                  {userName}
                  {isCurrentUser && <span className="ml-1 text-[10px] text-stampede-red">(you)</span>}
                </td>
                <td className="py-3">
                  {isCurrentUser ? (
                    <select
                      value={myRank ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onRankChange(val === '' ? null : parseInt(val));
                      }}
                      className="px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-stampede-red/30"
                    >
                      <option value="">Unranked</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>#{n}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={ranking?.rank ? 'font-bold text-stampede-red' : 'text-gray-400'}>
                      {ranking?.rank ? `#${ranking.rank}` : '—'}
                    </span>
                  )}
                </td>
                <td className="py-3 text-gray-500 text-xs">
                  {ranking?.updated_at ? formatMountainTime(ranking.updated_at) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResearchTab({ site, onRunResearch }: { site: Site; onRunResearch: () => void }) {
  const data = site.research_data as ResearchData | null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusIndicator status={site.research_status} />
          {site.last_researched_at && (
            <span className="text-xs text-gray-500">
              Last researched: {formatMountainTime(site.last_researched_at)}
            </span>
          )}
        </div>
        <button
          onClick={onRunResearch}
          disabled={site.research_status === 'running'}
          className="px-3 py-1.5 text-xs font-semibold bg-stampede-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {site.research_status === 'running' ? 'Running...' : '🔄 Re-run Research'}
        </button>
      </div>

      {site.research_status === 'pending' && (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-3">Research has not been run yet</p>
          <button onClick={onRunResearch} className="px-4 py-2 bg-stampede-red text-white rounded-lg font-semibold text-sm hover:bg-red-700">
            Run Research Agent
          </button>
        </div>
      )}

      {site.research_status === 'running' && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-[3px] border-stampede-red border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Agent is researching this site...</p>
        </div>
      )}

      {site.research_status === 'failed' && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-red-500 text-xl">✗</span>
          </div>
          <p className="text-gray-500 text-sm mb-3">Research failed</p>
          <button onClick={onRunResearch} className="px-4 py-2 bg-stampede-red text-white rounded-lg font-semibold text-sm hover:bg-red-700">
            Retry
          </button>
        </div>
      )}

      {site.research_status === 'complete' && data && (
        <div className="space-y-3">
          <ResearchAccordion title="📍 Property Info" defaultOpen>
            <InfoGrid items={[
              ['Address', data.property_info?.address],
              ['Legal Description', data.property_info?.legal_description],
              ['Lot Size', data.property_info?.lot_size_sqft ? `${data.property_info.lot_size_sqft.toLocaleString()} sqft` : null],
              ['Zoning', data.property_info?.zoning_code ? `${data.property_info.zoning_code} — ${data.property_info.zoning_description || ''}` : null],
              ['Parcel ID', data.property_info?.parcel_id],
              ['Municipality', data.property_info?.municipality],
            ]} />
          </ResearchAccordion>

          <ResearchAccordion title="💰 Sale & Listing History">
            <InfoGrid items={[
              ['Last Sale Price', data.sale_history?.most_recent_sale_price],
              ['Sale Date', data.sale_history?.most_recent_sale_date],
              ['Listing Status', data.sale_history?.listing_status],
              ['Listing Price', data.sale_history?.listing_price],
              ['MLS #', data.sale_history?.mls_number],
              ['Days on Market', data.sale_history?.days_on_market?.toString()],
            ]} />
          </ResearchAccordion>

          <ResearchAccordion title="🚗 Traffic & Access">
            <InfoGrid items={[
              ['Est. Daily Traffic', data.traffic?.estimated_daily_count?.toLocaleString()],
              ['Major Roads', data.traffic?.major_nearby_roads],
              ['Highway Access', data.traffic?.highway_access],
              ['Ingress/Egress', data.traffic?.ingress_egress_notes],
            ]} />
          </ResearchAccordion>

          <ResearchAccordion title="👥 Demographics">
            <InfoGrid items={[
              ['Pop. (1km)', data.demographics?.population_1km?.toLocaleString()],
              ['Pop. (3km)', data.demographics?.population_3km?.toLocaleString()],
              ['Pop. (5km)', data.demographics?.population_5km?.toLocaleString()],
              ['Avg Household Income', data.demographics?.avg_household_income ? `$${data.demographics.avg_household_income.toLocaleString()}` : null],
              ['Vehicle Ownership', data.demographics?.vehicle_ownership_rate ? `${data.demographics.vehicle_ownership_rate}%` : null],
              ['Data Year', data.demographics?.source_year?.toString()],
            ]} />
          </ResearchAccordion>

          <ResearchAccordion title="🏪 Nearby Competitors">
            {data.nearby_competitors && data.nearby_competitors.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Distance</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Brand</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nearby_competitors.map((c, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 font-medium">{c.name}</td>
                      <td className="py-2">{c.distance_km ? `${c.distance_km} km` : '—'}</td>
                      <td className="py-2">{c.type || '—'}</td>
                      <td className="py-2">{c.brand || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 text-xs">No competitors found nearby</p>
            )}
          </ResearchAccordion>

          <ResearchAccordion title="📰 News & Notes">
            {data.news_and_notes && data.news_and_notes.length > 0 ? (
              <div className="space-y-2">
                {data.news_and_notes.map((item, i) => (
                  <div key={i} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium text-xs">{item.headline}</p>
                    {item.date && <p className="text-[10px] text-gray-400">{item.date}</p>}
                    {item.summary && <p className="text-xs text-gray-600 mt-1">{item.summary}</p>}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-stampede-red hover:underline">
                        Source →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-xs">No news items</p>
            )}
          </ResearchAccordion>

          {data.flags_and_concerns && data.flags_and_concerns.length > 0 && (
            <ResearchAccordion title="⚠️ Flags & Concerns" defaultOpen>
              <div className="space-y-2">
                {data.flags_and_concerns.map((flag, i) => (
                  <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium">
                    ⚠️ {flag}
                  </div>
                ))}
              </div>
            </ResearchAccordion>
          )}
        </div>
      )}
    </div>
  );
}

function ResearchAccordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-stampede-black hover:bg-gray-50 transition-colors">
        <span>{title}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InfoGrid({ items }: { items: [string, string | null | undefined][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-xs font-medium text-stampede-black">{value || '—'}</p>
        </div>
      ))}
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const config = {
    pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600' },
    running: { label: 'Running', color: 'bg-blue-100 text-blue-700' },
    complete: { label: 'Complete', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  }[status] || { label: status, color: 'bg-gray-100 text-gray-600' };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}

function NotesTab({
  notes,
  saving,
  lastSaved,
  onChange,
}: {
  notes: string;
  saving: boolean;
  lastSaved: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes about this site..."
        className="w-full h-64 p-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30 focus:border-stampede-red resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-gray-400">
          {saving ? 'Saving...' : lastSaved ? `Last saved: ${formatMountainTime(lastSaved)}` : 'Auto-saves on typing'}
        </p>
      </div>
    </div>
  );
}
