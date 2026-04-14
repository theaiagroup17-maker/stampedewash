'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { BRANDS, BRAND_KEYS } from '@/lib/brands';
import type { Competitor } from '@/lib/types';

const CITIES = ['Calgary', 'Airdrie', 'Cochrane', 'Okotoks'] as const;
const WASH_TYPES = ['tunnel', 'automatic', 'express', 'full_service', 'detail'] as const;
const STATUSES = ['existing', 'new', 'upcoming'] as const;

interface AddCompetitorModalProps {
  editData?: Competitor | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddCompetitorModal({ editData, onClose, onSaved }: AddCompetitorModalProps) {
  const [name, setName] = useState(editData?.name || '');
  const [brand, setBrand] = useState(editData?.brand || 'ind');
  const [address, setAddress] = useState(editData?.address || '');
  const [city, setCity] = useState(editData?.city || 'Calgary');
  const [washType, setWashType] = useState(editData?.wash_type || 'automatic');
  const [status, setStatus] = useState<string>(editData?.status || 'existing');
  const [notes, setNotes] = useState(editData?.notes || '');
  const [lat, setLat] = useState(editData?.lat?.toString() || '');
  const [lng, setLng] = useState(editData?.lng?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const handleGeocode = async () => {
    if (!address.trim()) { toast.error('Enter an address first'); return; }
    setGeocoding(true);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ', Alberta, Canada')}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
      const data = await res.json();
      if (data.results?.[0]) {
        setLat(data.results[0].geometry.location.lat.toString());
        setLng(data.results[0].geometry.location.lng.toString());
        toast.success('Geocoded');
      } else toast.error('No results');
    } catch { toast.error('Geocode failed'); }
    finally { setGeocoding(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const body = {
        name: name.trim(), brand, address: address.trim(), city, wash_type: washType,
        status, notes: notes.trim() || null,
        lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null,
      };

      const url = editData ? `/api/competitors/${editData.id}` : '/api/competitors/add';
      const method = editData ? 'PATCH' : 'POST';

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }

      toast.success(editData ? 'Competitor updated' : 'Competitor added');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-stampede-black">{editData ? 'Edit Competitor' : 'Add Competitor'}</h2>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Business Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Brand</label>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30">
              {BRAND_KEYS.map(k => <option key={k} value={k}>{BRANDS[k].acronym} — {BRANDS[k].name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Address *</label>
            <div className="flex gap-2 mt-1">
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30" />
              <button onClick={handleGeocode} disabled={geocoding}
                className="px-3 py-2 text-xs font-semibold bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
                {geocoding ? '...' : 'Geocode'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg">
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Wash Type</label>
              <select value={washType} onChange={(e) => setWashType(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg">
                {WASH_TYPES.map(w => <option key={w} value={w}>{w.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Lat</label>
              <input type="text" value={lat} onChange={(e) => setLat(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="Auto" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Lng</label>
              <input type="text" value={lng} onChange={(e) => setLng(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="Auto" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-stampede-red/30" />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-2 text-sm font-semibold bg-stampede-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Saving...' : editData ? 'Update' : 'Add Competitor'}
          </button>
        </div>
      </div>
    </div>
  );
}
