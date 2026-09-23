'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { authFetch } from '@/lib/auth-fetch';

interface ConversationSummary {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_wechat_id: string | null;
  channel: string;
  status: string;
  detected_language: string | null;
  updated_at: string;
  last_message: { content: string; role: string; created_at: string } | null;
  message_count: number;
}

interface DashboardData {
  totalConversations: number;
  newClientsThisWeek: number;
  bookmarkedCount: number;
  productsCount: number;
  recentConversations: ConversationSummary[];
  bookmarkedConversations: ConversationSummary[];
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function SkeletonCard() {
  return (
    <div className="surface-elevated p-4 md:p-5 animate-pulse" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="h-3 w-24 rounded mb-3" style={{ background: 'var(--border)' }} />
      <div className="h-7 w-12 rounded" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b last:border-b-0 animate-pulse" style={{ borderColor: 'var(--border)' }}>
      <div className="w-8 h-8 rounded-full" style={{ background: 'var(--border)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-48 rounded" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyLoading && !companyId) {
      router.push('/onboarding');
    }
  }, [companyId, companyLoading, router]);

  useEffect(() => {
    if (companyLoading || !companyId) return;

    const fetchData = async () => {
      try {
        const [convRes, prodRes] = await Promise.all([
          authFetch(`/api/admin/conversations?company_id=${companyId}`),
          authFetch(`/api/admin/products?company_id=${companyId}`),
        ]);

        const convJson = await convRes.json();
        const prodJson = await prodRes.json();

        const allConvs: ConversationSummary[] = convJson.conversations || [];
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

        const uniqueContacts = new Set(
          allConvs
            .filter((c) => new Date(c.updated_at).getTime() > weekAgo)
            .map((c) => c.contact_phone || c.contact_wechat_id || c.id)
        );

        setData({
          totalConversations: allConvs.length,
          newClientsThisWeek: uniqueContacts.size,
          bookmarkedCount: allConvs.filter((c) => c.status === 'bookmarked').length,
          productsCount: (prodJson.products || []).length,
          recentConversations: allConvs.slice(0, 5),
          bookmarkedConversations: allConvs.filter((c) => c.status === 'bookmarked').slice(0, 3),
        });
      } catch (err) {
        console.error('[dashboard] fetch error:', err);
        setData({
          totalConversations: 0,
          newClientsThisWeek: 0,
          bookmarkedCount: 0,
          productsCount: 0,
          recentConversations: [],
          bookmarkedConversations: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId, companyLoading]);

  const displayStatus = (conv: ConversationSummary): 'ai' | 'human' | 'flagged' => {
    if (conv.status === 'bookmarked') return 'flagged';
    if (conv.status === 'human') return 'human';
    return 'ai';
  };

  const contactName = (conv: ConversationSummary) =>
    conv.contact_name || conv.contact_phone || conv.contact_wechat_id || 'Unknown';

  return (
    <div>
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Dashboard', '控制台')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Live overview of your inbox, pipeline, and catalog', '收件箱、管道與目錄的實時概覽')}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="surface-elevated p-4 md:p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[11px] md:text-[12px] font-medium uppercase tracking-[0.05em] mb-1.5 md:mb-2" style={{ color: 'var(--text-muted)' }}>
                {t('Total conversations', '總對話數')}
              </p>
              <p className="text-[22px] md:text-[28px] font-semibold tracking-[-0.5px]">{data?.totalConversations ?? 0}</p>
            </div>
            <div className="surface-elevated p-4 md:p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[11px] md:text-[12px] font-medium uppercase tracking-[0.05em] mb-1.5 md:mb-2" style={{ color: 'var(--text-muted)' }}>
                {t('New clients this week', '本週新客戶')}
              </p>
              <p className="text-[22px] md:text-[28px] font-semibold tracking-[-0.5px]">{data?.newClientsThisWeek ?? 0}</p>
            </div>
            <div className="surface-elevated p-4 md:p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[11px] md:text-[12px] font-medium uppercase tracking-[0.05em] mb-1.5 md:mb-2" style={{ color: 'var(--text-muted)' }}>
                {t('Bookmarked', '已加書籤')}
              </p>
              <p className="text-[22px] md:text-[28px] font-semibold tracking-[-0.5px]" style={{ color: 'var(--error)' }}>{data?.bookmarkedCount ?? 0}</p>
            </div>
            <div className="surface-elevated p-4 md:p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <p className="text-[11px] md:text-[12px] font-medium uppercase tracking-[0.05em] mb-1.5 md:mb-2" style={{ color: 'var(--text-muted)' }}>
                {t('Products listed', '已上架產品')}
              </p>
              <p className="text-[22px] md:text-[28px] font-semibold tracking-[-0.5px]">{data?.productsCount ?? 0}</p>
            </div>
          </>
        )}
      </div>

      {/* Empty state — get connected */}
      {!loading && (data?.totalConversations ?? 0) === 0 && (
        <div className="surface-card mb-4 p-6 md:p-8 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-[16px] font-semibold mb-1">{t('Connect your inbox to get started', '連接收件箱開始使用')}</h2>
          <p className="text-[13px] mb-5 max-w-[420px] mx-auto" style={{ color: 'var(--text-muted)' }}>
            {t('Backtide needs a conversation channel before inquiries can arrive. Connect WhatsApp or an email, then upload your products.', 'Backtide 需要一個對話渠道才能接收查詢。請先連接 WhatsApp 或電郵，然後上載產品。')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/admin/settings" className="accent-btn inline-flex items-center justify-center">
              {t('Connect channel', '連接渠道')}
            </Link>
            <Link href="/admin/products" className="secondary-btn inline-flex items-center justify-center">
              {t('Add products', '新增產品')}
            </Link>
          </div>
        </div>
      )}

      {/* Bookmarked — needs attention */}
      <div className="surface-card mb-4">
        <div className="px-4 md:px-5 py-3 md:py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--error)" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <h2 className="text-[14px] md:text-[15px] font-semibold">{t('Bookmarked for review', '已加書籤待審核')}</h2>
            {!loading && (
              <span className="text-[11px] md:text-[12px] px-2 py-0.5 rounded font-medium" style={{ background: '#FEE8EA', color: 'var(--error)' }}>
                {data?.bookmarkedConversations.length ?? 0}
              </span>
            )}
          </div>
          <Link href="/admin/conversations" className="text-[12px] md:text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
            {t('View all', '查看全部')}
          </Link>
        </div>
        <div>
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : (data?.bookmarkedConversations.length ?? 0) === 0 ? (
            <div className="px-4 md:px-5 py-6 text-center">
              <svg className="mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
              <p className="text-[13px] md:text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {t('No bookmarked conversations', '沒有已加書籤的對話')}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t('Bookmark conversations that need your attention', '加書籤需要您關注的對話')}
              </p>
            </div>
          ) : (
            data?.bookmarkedConversations.map((conv) => (
              <Link
                key={conv.id}
                href="/admin/conversations"
                className="flex items-center justify-between px-4 md:px-5 py-3 border-b last:border-b-0 relative hover:bg-[#FEFBFB]"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--error)' }} />
                <div className="flex items-center gap-3 ml-1 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {contactName(conv).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] md:text-[14px] font-medium truncate">{contactName(conv)}</p>
                      <span className="text-[10px] md:text-[11px] px-1.5 py-0.5 rounded shrink-0" style={{ background: '#FEE8EA', color: 'var(--error)' }}>
                        {conv.channel}
                      </span>
                    </div>
                    <p className="text-[12px] md:text-[13px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {conv.last_message?.content || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 ml-2">
                  <span className="text-[11px] md:text-[12px] hidden sm:inline" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(conv.updated_at)}</span>
                  <span className="text-[12px] md:text-[13px] font-medium" style={{ color: 'var(--accent)' }}>{t('Review', '審核')}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Recent conversations */}
      <div className="surface-card">
        <div className="px-4 md:px-5 py-3 md:py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-[14px] md:text-[15px] font-semibold">{t('Recent conversations', '最近對話')}</h2>
          <Link href="/admin/conversations" className="text-[12px] md:text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
            {t('View all', '查看全部')}
          </Link>
        </div>
        {/* Desktop table */}
        <table className="hidden md:table w-full text-[14px]">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <th className="px-5 py-3 font-medium">{t('Contact', '聯絡人')}</th>
              <th className="px-5 py-3 font-medium">{t('Channel', '渠道')}</th>
              <th className="px-5 py-3 font-medium">{t('Last message', '最新訊息')}</th>
              <th className="px-5 py-3 font-medium">{t('Status', '狀態')}</th>
              <th className="px-5 py-3 font-medium">{t('Time', '時間')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <tr><td colSpan={5}><SkeletonRow /></td></tr>
                <tr><td colSpan={5}><SkeletonRow /></td></tr>
                <tr><td colSpan={5}><SkeletonRow /></td></tr>
              </>
            ) : (data?.recentConversations.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center">
                  <p className="text-[13px] md:text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {t('No conversations yet', '暫無對話')}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {t('Customer messages will appear here', '客戶訊息會顯示在這裡')}
                  </p>
                </td>
              </tr>
            ) : (
              data?.recentConversations.map((conv) => {
                const s = displayStatus(conv);
                return (
                  <tr key={conv.id} className="border-b last:border-b-0 relative" style={{ borderColor: 'var(--border)' }}>
                    {s === 'flagged' && (
                      <td className="absolute left-0 top-0 bottom-0 w-[3px] p-0" style={{ background: 'var(--error)' }}></td>
                    )}
                    <td className="px-5 py-3 font-medium">{contactName(conv)}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{conv.channel}</td>
                    <td className="px-5 py-3 truncate max-w-[300px]" style={{ color: 'var(--text-muted)' }}>{conv.last_message?.content || '—'}</td>
                    <td className="px-5 py-3">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded font-medium"
                        style={{
                          background: s === 'flagged' ? '#FEE8EA' : s === 'human' ? '#E8F5F1' : 'var(--accent-light)',
                          color: s === 'flagged' ? 'var(--error)' : s === 'human' ? '#038153' : 'var(--accent)',
                        }}
                      >
                        {s === 'flagged' ? t('Bookmarked', '已加書籤') : s === 'human' ? 'HUMAN' : 'AI'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(conv.updated_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {/* Mobile list */}
        <div className="md:hidden">
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : (data?.recentConversations.length ?? 0) === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {t('No conversations yet', '暫無對話')}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t('Customer messages will appear here', '客戶訊息會顯示在這裡')}
              </p>
            </div>
          ) : (
            data?.recentConversations.map((conv) => {
              const s = displayStatus(conv);
              return (
                <div key={conv.id} className="px-4 py-3 border-b last:border-b-0 relative" style={{ borderColor: 'var(--border)' }}>
                  {s === 'flagged' && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--error)' }} />
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[13px] font-medium truncate">{contactName(conv)}</p>
                    <span className="text-[11px] shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(conv.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{conv.last_message?.content || '—'}</p>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-2"
                      style={{
                        background: s === 'flagged' ? '#FEE8EA' : s === 'human' ? '#E8F5F1' : 'var(--accent-light)',
                        color: s === 'flagged' ? 'var(--error)' : s === 'human' ? '#038153' : 'var(--accent)',
                      }}
                    >
                      {s === 'flagged' ? t('Bookmarked', '已加書籤') : s === 'human' ? 'HUMAN' : 'AI'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
