'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface AddSitePanelProps {
  clickToAddMode: boolean;
  onToggleClickMode: () => void;
}

export default function AddSitePanel({ clickToAddMode, onToggleClickMode }: AddSitePanelProps) {
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitLink = async () => {
    if (!link.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/sites/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_maps_url: link.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add site');
      toast.success(`Site added: ${data.site.name}`);
      setLink('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 border-b border-gray-100">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add New Site</h3>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Paste Google Maps link..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmitLink()}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30 focus:border-stampede-red"
          disabled={submitting}
        />
        <button
          onClick={handleSubmitLink}
          disabled={submitting || !link.trim()}
          className="px-4 py-2 bg-stampede-red text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '...' : 'Add'}
        </button>
      </div>
      <button
        onClick={onToggleClickMode}
        className={`w-full py-2 text-sm font-medium rounded-lg border transition-colors ${
          clickToAddMode
            ? 'bg-stampede-red text-white border-stampede-red'
            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
        }`}
      >
        {clickToAddMode ? '✕ Cancel Click Mode' : '📍 Click Map to Add Site'}
      </button>
    </div>
  );
}
