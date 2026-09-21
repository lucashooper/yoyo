import { useCallback, useEffect, useState } from 'react';
import { fetchStreak, signInAnonymously } from '../services/supabase';
import { getProfile } from '../services/storage';

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { userId } = await signInAnonymously();
      const value = await fetchStreak(userId);
      setStreak(value);
    } catch {
      const profile = await getProfile();
      setStreak(profile.streak);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { streak, loading, refresh };
}
