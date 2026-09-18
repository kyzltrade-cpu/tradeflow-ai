'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

interface CompanyContextType {
  companyId: string | null;
  companyStatus: string | null;
  loading: boolean;
  refresh: () => void;
}

const CompanyContext = createContext<CompanyContextType>({ companyId: null, companyStatus: null, loading: true, refresh: () => {} });

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyStatus, setCompanyStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = async () => {
    if (authLoading) return;

    // Try localStorage first
    const stored = typeof window !== 'undefined' ? localStorage.getItem('tradeflow_company_id') : null;
    if (stored) {
      // Verify the stored company still exists and belongs to this user
      try {
        const res = await fetch(`/api/admin/company?id=${stored}`);
        if (res.ok) {
          const data = await res.json();
          setCompanyId(stored);
          setCompanyStatus(data.status || 'approved');
          setLoading(false);
          return;
        }
      } catch {
        // Stored ID is stale — clear it and fall through
      }
      localStorage.removeItem('tradeflow_company_id');
    }

    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch company by user_id
    try {
      const res = await fetch(`/api/admin/company?user_id=${user.id}`);
      const data = await res.json();
      if (data.id) {
        setCompanyId(data.id);
        setCompanyStatus(data.status || 'approved');
        localStorage.setItem('tradeflow_company_id', data.id);
      }
    } catch {
      // No company yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  return (
    <CompanyContext.Provider value={{ companyId, companyStatus, loading, refresh: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
