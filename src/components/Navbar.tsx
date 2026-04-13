'use client';

import { USERS, type UserName } from '@/lib/users';

interface NavbarProps {
  user: UserName | null;
  onUserChange: (user: UserName) => void;
}

export default function Navbar({ user, onUserChange }: NavbarProps) {
  return (
    <nav className="bg-stampede-red h-14 flex items-center justify-between px-4 md:px-6 shadow-md z-50 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-white font-extrabold text-xl tracking-wider">
          STAMPEDE WASH
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-white/80 text-sm hidden sm:inline">Viewing as:</span>
        <select
          value={user || ''}
          onChange={(e) => onUserChange(e.target.value as UserName)}
          className="bg-white/20 text-white border border-white/30 rounded px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
        >
          {USERS.map((u) => (
            <option key={u} value={u} className="text-black">
              {u}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
}
