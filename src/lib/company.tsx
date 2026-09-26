'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { authFetch } from '@/lib/auth-fetch';

interface CompanyContextType {
  companyId: string | null;
  companyStatus: string | null;
  loading: boolean;
  refresh: () => void;
}

const CompanyContext = createContext<CompanyContextType>({ companyId: null, companyStatus: null, loading: true, refresh: () => {} });

const ONBOARDING_PATH = '/onboarding';

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
        const res = await authFetch(`/api/admin/company?id=${stored}`);
        if (res.ok) {
          const data = await res.json();
          setCompanyId(stored);
          setCompanyStatus(data.status || 'approved');
          setLoading(false);
          return;
        }
        // 404 means the company is really gone. Any other failure (401/5xx) is
        // transient, so keep the cached ID and fall through to the user_id
        // lookup instead of wiping it and sending a real customer to onboarding.
        if (res.status === 404) localStorage.removeItem('tradeflow_company_id');
      } catch {
        // Network error — keep the cached ID and fall through
      }
    }

    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch company by user_id. authFetch refreshes an expired token and retries,
    // so a stale session is never mistaken for "this user has no company".
    try {
      const res = await authFetch(`/api/admin/company?user_id=${user.id}`);

      // The API answers 404 for "this user has no company" and 200 with the
      // company row otherwise. Anything else (401/5xx) is a failed lookup, not
      // an absent company: keep `loading` true so the admin shell keeps waiting
      // instead of bouncing a signed-in customer to onboarding.
      const noCompany = res.ok || res.status === 404;
      if (!noCompany) return;

      const data = res.ok ? await res.json() : null;
      if (data?.id) {
        setCompanyId(data.id);
        setCompanyStatus(data.status || 'approved');
        localStorage.setItem('tradeflow_company_id', data.id);
        setLoading(false);
        return;
      }

      // Signed in with no company: send them to onboarding and keep `loading`
      // true so the admin shell never renders a company-less dashboard.
      if (pathname !== ONBOARDING_PATH) router.replace(ONBOARDING_PATH);
    } catch {
      // Transient failure — stay in the loading state, no redirect
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
