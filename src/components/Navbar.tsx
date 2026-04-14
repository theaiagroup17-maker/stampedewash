'use client';

import { USERS, type UserName } from '@/lib/users';

interface NavbarProps {
  user: UserName | null;
  onUserChange: (user: UserName) => void;
  onOpenTagManager?: () => void;
}

export default function Navbar({ user, onUserChange, onOpenTagManager }: NavbarProps) {
  return (
    <nav className="bg-stampede-red h-14 flex items-center justify-between px-4 md:px-6 shadow-md z-50 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-white font-extrabold text-xl tracking-wider">STAMPEDE WASH</span>
      </div>
      <div className="flex items-center gap-3">
        {onOpenTagManager && (
          <button onClick={onOpenTagManager} className="text-white/70 hover:text-white transition-colors" title="Manage Tags">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
        <span className="text-white/80 text-sm hidden sm:inline">Viewing as:</span>
        <select value={user || ''} onChange={(e) => onUserChange(e.target.value as UserName)}
          className="bg-white/20 text-white border border-white/30 rounded px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer">
          {USERS.map((u) => <option key={u} value={u} className="text-black">{u}</option>)}
        </select>
      </div>
    </nav>
  );
}
