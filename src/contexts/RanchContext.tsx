import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Database } from '../lib/database.types';

type Ranch = Database['public']['Tables']['ranches']['Row'];
type UserRanch = Database['public']['Tables']['user_ranches']['Row'];

interface RanchContextType {
  currentRanch: Ranch | null;
  userRanches: (UserRanch & { ranch: Ranch })[];
  loading: boolean;
  selectRanch: (ranchId: string) => void;
  createRanch: (name: string, location?: string) => Promise<void>;
  refreshRanches: () => Promise<void>;
}

const RanchContext = createContext<RanchContextType | undefined>(undefined);

export function RanchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentRanch, setCurrentRanch] = useState<Ranch | null>(null);
  const [userRanches, setUserRanches] = useState<(UserRanch & { ranch: Ranch })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRanches = async () => {
    if (!user) {
      setUserRanches([]);
      setCurrentRanch(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_ranches')
        .select(`
          *,
          ranch:ranches(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const ranches = (data || []).map(ur => ({
        ...ur,
        ranch: ur.ranch as unknown as Ranch
      }));

      setUserRanches(ranches);

      const savedRanchId = localStorage.getItem('currentRanchId');
      if (savedRanchId && ranches.find(r => r.ranch_id === savedRanchId)) {
        const ranch = ranches.find(r => r.ranch_id === savedRanchId);
        setCurrentRanch(ranch?.ranch || null);
      } else if (ranches.length > 0) {
        setCurrentRanch(ranches[0].ranch);
        localStorage.setItem('currentRanchId', ranches[0].ranch_id);
      }
    } catch (error) {
      console.error('Error fetching ranches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRanches();
  }, [user]);

  const selectRanch = (ranchId: string) => {
    const ranch = userRanches.find(r => r.ranch_id === ranchId);
    if (ranch) {
      setCurrentRanch(ranch.ranch);
      localStorage.setItem('currentRanchId', ranchId);
    }
  };

  const createRanch = async (name: string, location?: string) => {
    if (!user) throw new Error('Must be logged in to create a ranch');

    const { data: ranch, error: ranchError } = await supabase
      .from('ranches')
      .insert({ name, location })
      .select()
      .single();

    if (ranchError) throw ranchError;

    const { error: userRanchError } = await supabase
      .from('user_ranches')
      .insert({
        user_id: user.id,
        ranch_id: ranch.id,
        role: 'ADMIN',
      });

    if (userRanchError) throw userRanchError;

    const { error: settingsError } = await supabase
      .from('ranch_settings')
      .insert({
        ranch_id: ranch.id,
      });

    if (settingsError) throw settingsError;

    await fetchUserRanches();
  };

  const refreshRanches = async () => {
    await fetchUserRanches();
  };

  return (
    <RanchContext.Provider value={{
      currentRanch,
      userRanches,
      loading,
      selectRanch,
      createRanch,
      refreshRanches,
    }}>
      {children}
    </RanchContext.Provider>
  );
}

export function useRanch() {
  const context = useContext(RanchContext);
  if (context === undefined) {
    throw new Error('useRanch must be used within a RanchProvider');
  }
  return context;
}
