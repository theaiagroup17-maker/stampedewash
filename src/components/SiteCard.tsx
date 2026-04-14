'use client';

import { useRouter } from 'next/navigation';
import StatusBadge from './StatusBadge';
import { getUserRank } from '@/hooks/useSupabaseRealtime';
import { USERS } from '@/lib/users';
import type { Site, Ranking, Tag } from '@/lib/types';

interface SiteCardProps {
  site: Site;
  rankings: Ranking[];
  isDuplicate?: boolean;
  onDelete?: () => void;
  siteTags?: Tag[];
}

export default function SiteCard({ site, rankings, isDuplicate, onDelete, siteTags }: SiteCardProps) {
  const router = useRouter();

  const researchIcon = {
    pending: <span className="text-gray-400 text-xs" title="Research pending">🕐</span>,
    running: <span className="animate-spin inline-block text-xs" title="Researching...">⏳</span>,
    complete: <span className="text-green-600 text-xs" title="Research complete">✓</span>,
    failed: <span className="text-red-500 text-xs" title="Research failed">✗</span>,
  }[site.research_status];

  const visibleTags = siteTags?.slice(0, 3) || [];
  const extraTagCount = (siteTags?.length || 0) - 3;

  return (
    <div onClick={() => router.push(`/site/${site.id}`)}
      className="bg-white rounded-lg p-3.5 border border-gray-100 hover:border-stampede-red/30 hover:shadow-md transition-all cursor-pointer group relative">
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Delete site">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-semibold text-sm text-stampede-black group-hover:text-stampede-red transition-colors truncate flex-1 mr-2">{site.name}</h4>
        {researchIcon}
      </div>
      <p className="text-xs text-gray-500 truncate mb-2">{site.address || 'No address'}</p>

      {/* Tag pills */}
      {visibleTags.length > 0 && (
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {visibleTags.map(tag => (
            <span key={tag.id} className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white" style={{ background: tag.color }}>
              {tag.name}
            </span>
          ))}
          {extraTagCount > 0 && <span className="text-[9px] text-gray-400">+{extraTagCount} more</span>}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={site.status} />
        {isDuplicate && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
            ⚠️ Possible Duplicate
          </span>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-600 flex gap-3">
        {USERS.map(user => {
          const rank = getUserRank(rankings, site.id, user);
          return (
            <span key={user}>
              <span className="font-medium">{user}:</span>{' '}
              <span className={rank ? 'font-bold text-stampede-red' : 'text-gray-400'}>{rank ? `#${rank}` : '—'}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
