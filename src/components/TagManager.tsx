'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface TagWithCount {
  id: string;
  name: string;
  color: string;
  site_count: number;
}

const PRESET_COLORS = [
  '#CC0000', '#EA580C', '#EAB308', '#16A34A', '#0033A0', '#7C3AED',
  '#EC4899', '#0891B2', '#6B7280', '#1F2937', '#B45309', '#065F46',
];

interface TagManagerProps {
  onClose: () => void;
}

export default function TagManager({ onClose }: TagManagerProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6B7280');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TagWithCount | null>(null);

  const fetchTags = async () => {
    const res = await fetch('/api/tags');
    const data = await res.json();
    if (data.tags) setTags(data.tags);
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) { toast.success('Tag created'); setNewName(''); fetchTags(); }
    else { const d = await res.json(); toast.error(d.error || 'Failed'); }
  };

  const handleUpdateName = async (id: string) => {
    if (!editName.trim()) { setEditingId(null); return; }
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) { setEditingId(null); fetchTags(); }
  };

  const handleUpdateColor = async (id: string, color: string) => {
    await fetch(`/api/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color }),
    });
    fetchTags();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/tags/${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Tag deleted'); setDeleteTarget(null); fetchTags(); }
    else toast.error('Failed to delete');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-stampede-black">Manage Tags</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Create new tag */}
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="New tag name..." value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stampede-red/30" />
            <div className="flex gap-1">
              {PRESET_COLORS.slice(0, 6).map(c => (
                <button key={c} onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${newColor === c ? 'border-stampede-black scale-110' : 'border-transparent'}`}
                  style={{ background: c }} />
              ))}
            </div>
            <button onClick={handleCreate} disabled={!newName.trim()}
              className="px-3 py-2 text-sm font-semibold bg-stampede-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Add</button>
          </div>

          {/* Tag list */}
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No tags yet</div>
          ) : (
            <div className="space-y-2">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group">
                  {/* Color picker */}
                  <div className="relative group/color">
                    <button className="w-5 h-5 rounded-full border border-gray-200" style={{ background: tag.color }} />
                    <div className="absolute left-0 top-7 hidden group-hover/color:flex gap-1 bg-white p-2 rounded-lg shadow-lg border border-gray-100 z-10">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => handleUpdateColor(tag.id, c)}
                          className={`w-5 h-5 rounded-full border ${tag.color === c ? 'border-black' : 'border-gray-200'}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>

                  {/* Name */}
                  {editingId === tag.id ? (
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => handleUpdateName(tag.id)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateName(tag.id); if (e.key === 'Escape') setEditingId(null); }}
                      className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none" autoFocus />
                  ) : (
                    <span onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}
                      className="flex-1 text-sm font-medium text-gray-700 cursor-pointer hover:text-stampede-red">{tag.name}</span>
                  )}

                  <span className="text-[10px] text-gray-400">{tag.site_count} {tag.site_count === 1 ? 'site' : 'sites'}</span>

                  <button onClick={() => setDeleteTarget(tag)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        {deleteTarget && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl">
            <div className="bg-white rounded-lg p-6 mx-4 max-w-xs shadow-xl">
              <p className="text-sm font-medium text-gray-700 mb-4">
                Delete &quot;{deleteTarget.name}&quot;?{deleteTarget.site_count > 0 && ` It's used on ${deleteTarget.site_count} site(s).`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
