'use client';

import { useState, useEffect, useCallback } from 'react';
import { USERS, type UserName } from '@/lib/users';

const STORAGE_KEY = 'stampede_wash_user';

export function useUser() {
  const [user, setUserState] = useState<UserName | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && USERS.includes(stored as UserName)) {
      setUserState(stored as UserName);
    }
    setLoading(false);
  }, []);

  const setUser = useCallback((name: UserName) => {
    localStorage.setItem(STORAGE_KEY, name);
    setUserState(name);
  }, []);

  return { user, setUser, loading };
}
