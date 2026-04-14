'use client';

import { useState, useMemo } from 'react';
import { getBrand } from '@/lib/brands';
import ConfirmDialog from './ConfirmDialog';
import AddCompetitorModal from './AddCompetitorModal';
import type { Competitor } from '@/lib/types';
import toast from 'react-hot-toast';

const CITIES = ['All', 'Calgary', 'Airdrie', 'Cochrane', 'Okotoks'] as const;
const WASH_TYPES = ['All', 'tunnel', 'automatic', 'express', 'full_service', 'detail'] as const;
const STATUS_OPTS = ['All', 'existing', 'new', 'upcoming'] as const;

interface CompetitorListViewProps {
  competitors: Competitor[];
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  existing: 'bg-green-100 text-green-700',
  new: 'bg-blue-100 text-blue-700',
  upcoming: 'bg-amber-100 text-amber-700',
};

export default function CompetitorListView({ competitors, onClose, onRefresh }: CompetitorListViewProps) {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [washFilter, setWashFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortCol, setSortCol] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [editTarget, setEditTarget] = useState<Competitor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Competitor | null>(null);

  const filtered = useMemo(() => {
    let list = competitors;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q));
    }
    if (cityFilter !== 'All') list = list.filter(c => c.city === cityFilter);
    if (washFilter !== 'All') list = list.filter(c => c.wash_type === washFilter);
    if (statusFilter !== 'All') list = list.filter(c => c.status === statusFilter);
    return list;
  }, [competitors, search, cityFilter, washFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'brand': cmp = a.brand.localeCompare(b.brand); break;
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'city': cmp = (a.city || '').localeCompare(b.city || ''); break;
        case 'wash_type': cmp = (a.wash_type || '').localeCompare(b.wash_type || ''); break;
        case 'status': cmp = (a.status || '').localeCompare(b.status || ''); break;
        default: cmp = a.name.localeCompare(b.name);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/competitors/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Deleted'); setDeleteTarget(null); onRefresh(); }
    else toast.error('Failed to delete');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-stampede-black">All Competitors ({filtered.length})</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-100 space-y-2">
          <input type="text" placeholder="Search name or address..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30" />
          <div className="flex gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">City:</span>
              {CITIES.map(c => <button key={c} onClick={() => setCityFilter(c)} className={`px-2 py-0.5 rounded-full ${cityFilter === c ? 'bg-stampede-black text-white' : 'bg-gray-100 text-gray-600'}`}>{c}</button>)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Type:</span>
              {WASH_TYPES.map(w => <button key={w} onClick={() => setWashFilter(w)} className={`px-2 py-0.5 rounded-full ${washFilter === w ? 'bg-stampede-black text-white' : 'bg-gray-100 text-gray-600'}`}>{w === 'All' ? 'All' : w.replace('_', ' ')}</button>)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Status:</span>
              {STATUS_OPTS.map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`px-2 py-0.5 rounded-full ${statusFilter === s ? 'bg-stampede-black text-white' : 'bg-gray-100 text-gray-600'}`}>{s}</button>)}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {[
                  { key: 'brand', label: 'Brand' },
                  { key: 'name', label: 'Name' },
                  { key: 'address', label: 'Address' },
                  { key: 'city', label: 'City' },
                  { key: 'wash_type', label: 'Type' },
                  { key: 'status', label: 'Status' },
                  { key: 'verified', label: 'Verified' },
                  { key: 'actions', label: '' },
                ].map(col => (
                  <th key={col.key} onClick={() => col.key !== 'actions' && col.key !== 'verified' && handleSort(col.key)}
                    className={`px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase border-b border-gray-200 ${col.key !== 'actions' ? 'cursor-pointer hover:text-gray-700' : ''}`}>
                    {col.label}
                    {sortCol === col.key && <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(comp => {
                const brand = getBrand(comp.brand);
                return (
                  <tr key={comp.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ background: brand.color }} />
                        <span className="text-xs font-bold" style={{ color: brand.color }}>{brand.acronym}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium">{comp.name}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs truncate max-w-[200px]">{comp.address || '—'}</td>
                    <td className="px-3 py-2 text-xs">{comp.city || '—'}</td>
                    <td className="px-3 py-2 text-xs">{(comp.wash_type || '').replace('_', ' ')}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[comp.status || 'existing'] || STATUS_BADGE.existing}`}>
                        {comp.status || 'existing'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">{comp.verified ? '✓' : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => setEditTarget(comp)} className="text-xs text-stampede-red hover:underline">Edit</button>
                        <button onClick={() => setDeleteTarget(comp)} className="text-xs text-gray-400 hover:text-red-500">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget && (
        <AddCompetitorModal editData={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); onRefresh(); }} />
      )}

      {deleteTarget && (
        <ConfirmDialog title="Delete Competitor" message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete" confirmColor="red" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
