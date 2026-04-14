'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AddSiteModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddSiteModal({ lat, lng, onClose, onAdded }: AddSiteModalProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate next site number
  useEffect(() => {
    async function getNextName() {
      const { data: sites } = await supabase.from('sites').select('name');
      let maxNum = 0;
      if (sites) {
        for (const s of sites) {
          const match = s.name.match(/Site\s+(\d+)/i);
          if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
        }
      }
      setName(`Stampede Wash - Site ${maxNum + 1}`);
    }
    getNextName();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Please enter a site name'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/sites/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add site');
      toast.success(`Site added: ${data.site.name}`);
      onAdded();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-stampede-black mb-1">Add New Site</h3>
        <p className="text-xs text-gray-500 mb-4">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
        <input type="text" placeholder="Site name..." value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30 focus:border-stampede-red mb-4"
          autoFocus />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !name.trim()}
            className="flex-1 py-2 text-sm font-semibold text-white bg-stampede-red rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
            {submitting ? 'Adding...' : 'Add Site'}
          </button>
        </div>
      </div>
    </div>
  );
}
