'use client';

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLang, LangToggle } from '@/lib/lang';
import { useAuth } from '@/lib/auth';
import { CompanyProvider, useCompany } from '@/lib/company';
import { authFetch } from '@/lib/auth-fetch';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/* ── Navigation config ──────────────────────────────────────────────────── */

interface NavItem {
  href: string;
  en: string;
  zh: string;
  icon: string;
}

interface NavGroup {
  label: { en: string; zh: string };
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: { en: 'Primary', zh: '主要' },
    items: [
      {
        href: '/admin',
        en: 'Dashboard',
        zh: '控制台',
        icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
      },
      {
        href: '/admin/inquiries',
        en: 'Inquiries',
        zh: '詢價',
        icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
      },
      {
        href: '/admin/opportunities',
        en: 'Opportunities',
        zh: '商機',
        icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
      },
      {
        href: '/admin/quotes',
        en: 'Quotes',
        zh: '報價',
        icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
      },
      {
        href: '/admin/rfqs',
        en: 'Supplier RFQs',
        zh: '供應商詢價',
        icon: 'M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25-9.75 5.25-9.75-5.25 4.179-2.25',
      },
      {
        href: '/admin/follow-ups',
        en: 'Follow-ups',
        zh: '跟進',
        icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        href: '/admin/conversations',
        en: 'Conversations',
        zh: '對話',
        icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
      },
    ],
  },
  {
    label: { en: 'Secondary', zh: '次要' },
    items: [
      {
        href: '/admin/products',
        en: 'Products',
        zh: '產品',
        icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
      },
      {
        href: '/admin/suppliers',
        en: 'Suppliers',
        zh: '供應商',
        icon: 'M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z',
      },
      {
        href: '/admin/knowledge',
        en: 'Knowledge Base',
        zh: '知識庫',
        icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
      },
      {
        href: '/admin/faq',
        en: 'FAQ Rules',
        zh: 'FAQ 規則',
        icon: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z',
      },
      {
        href: '/admin/billing',
        en: 'Billing',
        zh: '帳單',
        icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
      },
      {
        href: '/admin/settings',
        en: 'Settings',
        zh: '設定',
        icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z',
      },
    ],
  },
];

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const { t } = useLang();
  const active = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      title={collapsed ? t(item.en, item.zh) : undefined}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors"
      style={{
        background: active ? 'var(--accent-light)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5 shrink-0"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
      </svg>
      {!collapsed && <span>{t(item.en, item.zh)}</span>}
    </Link>
  );
}

function Sidebar({
  collapsed,
  onClose,
  email,
  onSignOut,
}: {
  collapsed: boolean;
  onClose: () => void;
  email: string | null;
  onSignOut: () => void;
}) {
  const { t } = useLang();
  const initial = (email || 'B').charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />

      <aside
        className="fixed left-0 top-0 z-50 flex h-full flex-col border-r transition-all duration-200 lg:static lg:z-auto"
        style={{
          width: collapsed ? 60 : 240,
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b px-4" style={{ borderColor: 'var(--border)' }}>
          <Link
            href="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          >
            <img src="/brand/vectra-mark.png" alt="Vectra" className="h-8 w-8 rounded-lg object-cover" />
          </Link>
          {!collapsed && (
            <Link
              href="/"
              className="text-[15px] font-semibold"
              style={{ color: 'var(--text)' }}
            >
              Vectra
            </Link>
          )}
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-6' : ''}>
              {!collapsed && (
                <div
                  className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t(group.label.en, group.label.zh)}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarItem key={item.href} item={item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User badge */}
        <div className="border-t px-3 py-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 group">
            <Link
              href="/admin/settings"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: '#6366F1' }}
              title={email || t('Account', '帳戶')}
            >
              {initial}
            </Link>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                  {email}
                </div>
                <Link
                  href="/admin/settings"
                  className="truncate text-[11px] hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('Settings', '設定')}
                </Link>
              </div>
            )}
            <button
              onClick={onSignOut}
              className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-red-50"
              title={t('Sign out', '登出')}
              style={{ color: 'var(--error, #ef4444)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ── Admin shell ─────────────────────────────────────────────────────────── */

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <CompanyProvider>
      <ErrorBoundary>
        <AdminShell>{children}</AdminShell>
      </ErrorBoundary>
    </CompanyProvider>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useLang();
  const { user, loading, signOut } = useAuth();
  const { companyId, companyStatus, loading: companyLoading } = useCompany();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), []);

  if (loading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  if (!user) return null;

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
        <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
          <div className="w-full max-w-[400px] text-center">
            <div className="mb-6">
              <img src="/brand/vectra-mark.png" alt="Vectra" className="h-10 mx-auto rounded-lg" />
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
        <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
          <div className="w-full max-w-[400px] text-center">
            <div className="mb-6">
              <img src="/brand/vectra-mark.png" alt="Vectra" className="h-10 mx-auto rounded-lg" />
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
                  onClick={handleLogout}
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

  return (
    <div className="dashboard-mode flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden">
          <Sidebar collapsed={false} onClose={() => setMobileOpen(false)} email={user?.email ?? null} onSignOut={handleLogout} />
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onClose={() => {}} email={user?.email ?? null} onSignOut={handleLogout} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
              style={{ color: 'var(--text-muted)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <button
            onClick={toggleCollapse}
            className="hidden h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100 lg:flex"
            aria-label="Collapse sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
              style={{ color: 'var(--text-muted)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <LangToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}