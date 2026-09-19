'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLang, LangToggle } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { CompanyProvider, useCompany } from '@/lib/company';
import { authFetch } from '@/lib/auth-fetch';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type NavItem = { href: string; en: string; zh: string; icon: string };
type NavSection = { label: string; labelZh: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    labelZh: '總覽',
    items: [
      { href: '/admin', en: 'Dashboard', zh: '控制台', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ],
  },
  {
    label: 'Sales',
    labelZh: '銷售',
    items: [
      { href: '/admin/inquiries', en: 'Inquiries', zh: '詢價', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { href: '/admin/opportunities', en: 'Opportunities', zh: '商機', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { href: '/admin/rfqs', en: 'Supplier RFQs', zh: '供應商詢價', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { href: '/admin/quotes', en: 'Quotes', zh: '報價', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
      { href: '/admin/follow-ups', en: 'Follow-ups', zh: '跟進', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/admin/conversations', en: 'Conversations', zh: '對話', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    ],
  },
  {
    label: 'Catalog',
    labelZh: '目錄',
    items: [
      { href: '/admin/products', en: 'Products', zh: '產品', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href: '/admin/suppliers', en: 'Suppliers', zh: '供應商', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    ],
  },
  {
    label: 'Knowledge',
    labelZh: '知識',
    items: [
      { href: '/admin/knowledge', en: 'Knowledge Base', zh: '知識庫', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
      { href: '/admin/faq', en: 'FAQ Rules', zh: 'FAQ 規則', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
  {
    label: 'Config',
    labelZh: '設定',
    items: [
      { href: '/admin/settings', en: 'Settings', zh: '設定', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ],
  },
];

// Flat list for quick matching
const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanyProvider>
      <ErrorBoundary>
        <AdminShell>{children}</AdminShell>
      </ErrorBoundary>
    </CompanyProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLang();
  const { user, loading, signOut } = useAuth();
  const { companyId, companyStatus, loading: companyLoading } = useCompany();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && !companyLoading && !companyId) {
      router.push('/onboarding');
    }
  }, [user, loading, companyId, companyLoading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFD' }}>
        <div className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFD' }}>
        <div className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  // Show pending approval page if company is not approved
  // Admin email always gets approved automatically — also auto-fix DB status
  if (companyId && companyStatus === 'pending') {
    if (user?.email === 'tradeflow.hk@gmail.com') {
      // Auto-approve admin and clear cache
      authFetch(`/api/admin/pending-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, action: 'approve' }),
      }).then(() => {
        localStorage.removeItem('tradeflow_company_id');
        window.location.reload();
      });
      return (
        <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F8FAFD' }}>
          <div className="w-full max-w-[400px] text-center">
            <div className="mb-6">
              <img src="/logo.svg" alt="TradeFlow" className="h-7 mx-auto" />
            </div>
            <div className="p-6 border rounded-[4px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#D1FAE5' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h1 className="text-[20px] font-semibold mb-2">{t('Approving your account…', '正在批准您的帳戶…')}</h1>
              <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                {t('Please wait a moment.', '請稍候。')}
              </p>
            </div>
          </div>
        </div>
      );
    } else {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F8FAFD' }}>
        <div className="w-full max-w-[400px] text-center">
          <div className="mb-6">
            <img src="/logo.svg" alt="TradeFlow" className="h-7 mx-auto" />
          </div>
          <div className="p-6 border rounded-[4px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#FEF3C7' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-[20px] font-semibold mb-2">{t('Account pending approval', '帳戶待審批')}</h1>
            <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
              {t('Your account is being reviewed. We\'ll notify you once approved — typically within 24 hours.', '您的帳戶正在審核中。審批通過後我們會通知您 — 通常在 24 小時內。')}
            </p>
            <div className="space-y-3">
              <button
                onClick={async () => {
                  await signOut();
                  router.push('/login');
                }}
                className="w-full text-[14px] font-medium py-2.5 rounded-[4px] border"
                style={{ borderColor: 'var(--border)' }}
              >
                {t('Sign out', '登出')}
              </button>
            </div>
          </div>
          <p className="text-[12px] mt-6" style={{ color: 'var(--text-muted)' }}>
            {t('Questions? Email tradeflow.hk@gmail.com', '有問題？請電郵 tradeflow.hk@gmail.com')}
          </p>
        </div>
      </div>
    );
    }
  }

  const sidebarWidth = collapsed ? 'w-[60px]' : 'w-[240px]';

  return (
    <div className="dashboard-mode min-h-screen flex" style={{ background: '#F8FAFD' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} flex flex-col border-r transform transition-all duration-200 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
          {!collapsed && (
            <Link href="/" className="flex items-center overflow-hidden">
              <img src="/logo.svg" alt="TradeFlow" className="h-7 w-auto max-w-none" style={{ width: '100px' }} />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-md hover:bg-black/5 shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!collapsed && <LangToggle />}
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.label} className={si > 0 ? 'mt-3' : ''}>
              {!collapsed && (
                <div className="px-5 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                    {t(section.label, section.labelZh)}
                  </p>
                </div>
              )}
              {collapsed && si > 0 && (
                <div className="mx-3 mb-1 border-t" style={{ borderColor: 'var(--border)' }} />
              )}
              {section.items.map((item) => {
                const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 py-2.5 text-[14px] ${collapsed ? 'justify-center px-0' : 'px-5'}`}
                    title={collapsed ? t(item.en, item.zh) : undefined}
                    style={{
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                      fontWeight: isActive ? 500 : 400,
                      background: isActive ? 'var(--accent-light)' : 'transparent',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d={item.icon} />
                    </svg>
                    {!collapsed && t(item.en, item.zh)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={`border-t ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`} style={{ borderColor: 'var(--border)' }}>
          {!collapsed ? (
            <div className="border rounded-[4px] p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium truncate">{user?.email}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Free plan</p>
                </div>
              </div>
              <div className="space-y-1">
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-2 text-[12px] w-full px-2 py-1.5 rounded-[4px] hover:bg-black/5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {t('Settings', '設定')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-[12px] w-full px-2 py-1.5 rounded-[4px] hover:bg-red-50 transition-colors"
                  style={{ color: 'var(--error, #ef4444)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {t('Sign out', '登出')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Link
                href="/admin/settings"
                className="flex items-center justify-center w-full p-2 rounded-[4px] hover:bg-black/5 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title={t('Settings', '設定')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-full p-2 rounded-[4px] hover:bg-red-50 transition-colors"
                style={{ color: 'var(--error, #ef4444)' }}
                title={t('Sign out', '登出')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0" style={{ background: 'var(--bg)' }}>
        <div className="h-14 border-b px-4 md:px-6 flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <button
            className="md:hidden p-1.5 -ml-1 rounded-md hover:bg-black/5"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {t('Admin', '管理後台')}
          </p>
        </div>
        <div className="p-4 md:p-6 max-w-[1280px]">
          {children}
        </div>
      </main>
    </div>
  );
}
