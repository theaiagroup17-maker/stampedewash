'use client';

import { USERS, type UserName } from '@/lib/users';

interface UserModalProps {
  onSelect: (user: UserName) => void;
}

export default function UserModal({ onSelect }: UserModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-stampede-red rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-extrabold text-xl">SW</span>
        </div>
        <h2 className="text-2xl font-bold text-stampede-black mb-2">
          Who are you?
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Select your name to get started
        </p>
        <div className="flex flex-col gap-3">
          {USERS.map((user) => (
            <button
              key={user}
              onClick={() => onSelect(user)}
              className="w-full py-3 px-4 bg-stampede-black text-white rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors"
            >
              {user}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
