import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Database } from '../lib/database.types';
import { checkLicenseStatus, type LicenseInfo } from '../utils/licenseEnforcement';

type Ranch = Database['public']['Tables']['ranches']['Row'];
type UserRanch = Database['public']['Tables']['user_ranches']['Row'];

interface RanchContextType {
  currentRanch: Ranch | null;
  userRanches: (UserRanch & { ranch: Ranch })[];
  loading: boolean;
  licenseInfo: LicenseInfo;
  currentUserRole: string | null;
  selectRanch: (ranchId: string) => void;
  createRanch: (name: string, location?: string) => Promise<void>;
  refreshRanches: () => Promise<void>;
  refreshRanchData: () => Promise<void>;
}

const RanchContext = createContext<RanchContextType | undefined>(undefined);

export function RanchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentRanch, setCurrentRanch] = useState<Ranch | null>(null);
  const [userRanches, setUserRanches] = useState<(UserRanch & { ranch: Ranch })[]>([]);
  const [loading, setLoading] = useState(true);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>(checkLicenseStatus(null));
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

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
        setCurrentUserRole(ranch?.role || null);
      } else if (ranches.length > 0) {
        setCurrentRanch(ranches[0].ranch);
        setCurrentUserRole(ranches[0].role);
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

  useEffect(() => {
    setLicenseInfo(checkLicenseStatus(currentRanch));
  }, [currentRanch]);

  const selectRanch = (ranchId: string) => {
    const ranch = userRanches.find(r => r.ranch_id === ranchId);
    if (ranch) {
      setCurrentRanch(ranch.ranch);
      setCurrentUserRole(ranch.role);
      localStorage.setItem('currentRanchId', ranchId);
    }
  };

  const createRanch = async (name: string, location?: string) => {
    if (!user) throw new Error('Must be logged in to create a ranch');

    const { error } = await supabase
      .from('ranches')
      .insert({ name, location });

    if (error) throw error;

    await fetchUserRanches();
  };

  const refreshRanches = async () => {
    await fetchUserRanches();
  };

  const refreshRanchData = async () => {
    if (!currentRanch) return;

    const { data, error } = await supabase
      .from('ranches')
      .select('*')
      .eq('id', currentRanch.id)
      .single();

    if (error) {
      console.error('Error refreshing ranch data:', error);
      return;
    }

    setCurrentRanch(data);
  };

  return (
    <RanchContext.Provider value={{
      currentRanch,
      userRanches,
      loading,
      licenseInfo,
      currentUserRole,
      selectRanch,
      createRanch,
      refreshRanches,
      refreshRanchData,
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
