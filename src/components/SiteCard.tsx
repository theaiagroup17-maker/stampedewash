'use client';

import { useRouter } from 'next/navigation';
import StatusBadge from './StatusBadge';
import { getUserRank } from '@/hooks/useSupabaseRealtime';
import { USERS } from '@/lib/users';
import type { Site, Ranking } from '@/lib/types';

interface SiteCardProps {
  site: Site;
  rankings: Ranking[];
  isDuplicate?: boolean;
}

export default function SiteCard({ site, rankings, isDuplicate }: SiteCardProps) {
  const router = useRouter();

  const researchIcon = {
    pending: <span className="text-gray-400 text-xs" title="Research pending">🕐</span>,
    running: <span className="animate-spin inline-block text-xs" title="Researching...">⏳</span>,
    complete: <span className="text-green-600 text-xs" title="Research complete">✓</span>,
    failed: <span className="text-red-500 text-xs" title="Research failed">✗</span>,
  }[site.research_status];

  return (
    <div
      onClick={() => router.push(`/site/${site.id}`)}
      className="bg-white rounded-lg p-3.5 border border-gray-100 hover:border-stampede-red/30 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-semibold text-sm text-stampede-black group-hover:text-stampede-red transition-colors truncate flex-1 mr-2">
          {site.name}
        </h4>
        {researchIcon}
      </div>
      <p className="text-xs text-gray-500 truncate mb-2">{site.address || 'No address'}</p>
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
              <span className={rank ? 'font-bold text-stampede-red' : 'text-gray-400'}>
                {rank ? `#${rank}` : '—'}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
