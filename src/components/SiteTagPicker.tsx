'use client';

import { useState, useEffect, useRef } from 'react';
import type { Tag, SiteTag } from '@/lib/types';
import toast from 'react-hot-toast';

interface SiteTagPickerProps {
  siteId: string;
  tags: Tag[];
  siteTags: SiteTag[];
  onRefresh: () => void;
}

export default function SiteTagPicker({ siteId, tags, siteTags, onRefresh }: SiteTagPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const activeTags = siteTags.filter(st => st.site_id === siteId).map(st => st.tag_id);
  const activeTagObjects = tags.filter(t => activeTags.includes(t.id));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTag = async (tagId: string) => {
    const isActive = activeTags.includes(tagId);
    const res = await fetch('/api/site-tags', {
      method: isActive ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, tag_id: tagId }),
    });
    if (res.ok) onRefresh();
  };

  const handleCreateTag = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: '#6B7280' }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success('Tag created');
      setNewName('');
      setCreating(false);
      onRefresh();
      // Auto-add new tag to this site
      await fetch('/api/site-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId, tag_id: data.tag.id }),
      });
      onRefresh();
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Active tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {activeTagObjects.map(tag => (
          <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
            style={{ background: tag.color }}>
            {tag.name}
            <button onClick={() => toggleTag(tag.id)} className="hover:opacity-70 ml-0.5">×</button>
          </span>
        ))}
        <button onClick={() => setOpen(!open)}
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
          + Tag
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-8 left-0 bg-white rounded-lg shadow-xl border border-gray-200 w-52 z-50 py-2 max-h-64 overflow-y-auto">
          {tags.map(tag => (
            <button key={tag.id} onClick={() => toggleTag(tag.id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tag.color }} />
              <span className="text-xs flex-1">{tag.name}</span>
              {activeTags.includes(tag.id) && <span className="text-stampede-red text-xs font-bold">✓</span>}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1 px-3">
            {creating ? (
              <div className="flex gap-1">
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                  placeholder="Tag name..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded" autoFocus />
                <button onClick={handleCreateTag} className="text-xs text-stampede-red font-semibold">Add</button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} className="text-xs text-gray-500 hover:text-stampede-red py-1">+ Create new tag</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
