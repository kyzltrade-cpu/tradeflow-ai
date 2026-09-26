import { Composio } from '@composio/core';
import {
  COMPOSIO_APPS,
  isMailboxToolkit,
  mailboxProviderFor,
  type CompanyMailboxState,
  type ComposioAppModule,
  type ComposioConnectionState,
  type MailboxToolkitSlug,
} from '@/lib/composio-apps';

let client: Composio | null = null;

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

export function getComposio(): Composio {
  if (client) return client;
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error('COMPOSIO_API_KEY is not configured');
  }
  client = new Composio({ apiKey });
  return client;
}

type ToolkitListItem = {
  slug: string;
  name: string;
  meta?: { logo?: string; description?: string };
};

type ConnectedAccountItem = {
  id: string;
  alias?: string | null;
  status?: string;
  updatedAt?: string;
  wordId?: string | null;
  isDisabled?: boolean;
  data?: Record<string, unknown> | null;
  state?: { val?: Record<string, unknown> | null } | null;
  toolkit?: { slug?: string };
};

let appCatalog: Map<string, { app: ComposioAppModule }> | null = null;

export async function getAppCatalog(): Promise<Map<string, ComposioAppModule>> {
  const composio = getComposio();
  return loadCatalog(composio);
}

async function loadCatalog(composio: Composio): Promise<Map<string, ComposioAppModule>> {
  if (appCatalog) {
    const map = new Map<string, ComposioAppModule>();
    for (const [slug, { app }] of appCatalog) map.set(slug, { ...app, connection: null });
    return map;
  }

  // The curated list is the source of truth for what we offer. Composio's
  // toolkit catalogue only enriches it with logos/descriptions — a failure
  // there must never block a customer from connecting their mailbox.
  const map = new Map<string, ComposioAppModule>();
  for (const curated of COMPOSIO_APPS) {
    map.set(curated.slug, {
      slug: curated.slug,
      name: curated.name,
      logo: '',
      description: '',
      category: curated.category,
      isMailbox: isMailboxToolkit(curated.slug),
      connection: null,
    });
  }

  try {
    const list = (await composio.toolkits.get({ limit: 1000 })) as unknown as {
      items?: ToolkitListItem[];
    };
    for (const item of list.items ?? []) {
      const existing = map.get(item.slug);
      if (!existing) continue;
      map.set(item.slug, {
        ...existing,
        name: item.name || existing.name,
        logo: item.meta?.logo ?? existing.logo,
        description: item.meta?.description ?? existing.description,
      });
    }
  } catch (err) {
    console.error('[composio] toolkit catalogue unavailable, using curated list:', err);
  }

  appCatalog = new Map(Array.from(map.entries()).map(([slug, app]) => [slug, { app }]));
  const out = new Map<string, ComposioAppModule>();
  for (const [slug, { app }] of appCatalog) out.set(slug, { ...app, connection: null });
  return out;
}

// ---------------------------------------------------------------------------
// Connected accounts (scoped per company via the Composio userId)
// ---------------------------------------------------------------------------

async function listCompanyAccounts(companyId: string): Promise<ConnectedAccountItem[]> {
  const composio = getComposio();
  const res = (await composio.connectedAccounts.list({
    userIds: [companyId],
    limit: 100,
  })) as unknown as { items?: ConnectedAccountItem[] };
  return res.items ?? [];
}

/** Digs the mailbox address out of whatever shape Composio reports. */
function extractAddress(item: ConnectedAccountItem): string | null {
  const candidates: unknown[] = [
    item.alias,
    item.data?.email,
    item.data?.mail,
    item.data?.user_email,
    item.state?.val?.email,
    item.state?.val?.mail,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const angle = candidate.match(/<([^>]+)>/);
    const raw = (angle ? angle[1] : candidate).trim().toLowerCase();
    if (raw.includes('@')) return raw;
  }
  return null;
}

/**
 * The connected account record omits `params`; the mailbox address only shows
 * up on a full retrieve. Best-effort and cached — never throws.
 */
const addressCache = new Map<string, { address: string | null; at: number }>();
const ADDRESS_TTL_MS = 60_000;

async function fetchAddress(composio: Composio, accountId: string): Promise<string | null> {
  const cached = addressCache.get(accountId);
  if (cached && Date.now() - cached.at < ADDRESS_TTL_MS) return cached.address;
  try {
    const full = (await composio.connectedAccounts.get(accountId)) as unknown as {
      params?: Record<string, unknown> | null;
      data?: Record<string, unknown> | null;
      state?: { val?: Record<string, unknown> | null } | null;
    };
    const address = extractAddress({
      id: accountId,
      alias: null,
      status: 'ACTIVE',
      data: full?.params ?? full?.data ?? null,
      state: full?.state ?? null,
    });
    addressCache.set(accountId, { address, at: Date.now() });
    return address;
  } catch (err) {
    console.error('[composio] connected account retrieve failed:', accountId, err);
    addressCache.set(accountId, { address: null, at: Date.now() });
    return null;
  }
}

/**
 * Curated app list for a company with each app's connection state attached.
 * Connections are scoped to `companyId`, so one customer's mailbox can never
 * surface on another's settings page.
 */
export async function getCompanyApps(companyId: string): Promise<ComposioAppModule[]> {
  const composio = getComposio();
  const catalog = await loadCatalog(composio);
  const accounts = await listCompanyAccounts(companyId);

  const bySlug = new Map((accounts ?? [])
    .filter((a) => Boolean(a.toolkit?.slug))
    .map((a) => [a.toolkit!.slug!, a]));

  const apps = Array.from(catalog.values()).map((app) => {
    const raw = bySlug.get(app.slug);
    if (!raw) return app;
    return {
      ...app,
      connection: {
        id: raw.id,
        status: (raw.status || 'INITIALIZING') as ComposioConnectionState,
        alias: raw.alias ?? raw.wordId ?? null,
        address: extractAddress(raw),
        updatedAt: raw.updatedAt || new Date().toISOString(),
      },
    };
  });

  // Resolve mailbox addresses for ACTIVE email connections only.
  return Promise.all(
    apps.map(async (app) => {
      const connection = app.connection;
      if (!app.isMailbox || connection?.status !== 'ACTIVE' || connection.address) return app;
      return {
        ...app,
        connection: { ...connection, address: await fetchAddress(composio, connection.id) },
      };
    })
  );
}

/**
 * Per-company mailbox state — what Settings renders as "your inbox" and what
 * the send path uses to reply from the customer's own address.
 */
export async function getCompanyMailboxState(companyId: string): Promise<CompanyMailboxState> {
  const empty: CompanyMailboxState = {
    connected: false,
    address: null,
    provider: null,
    toolkit: null,
    connectedAccountId: null,
    pending: false,
    state: null,
  };
  if (!isComposioConfigured()) return empty;

  let accounts: ConnectedAccountItem[];
  try {
    accounts = await listCompanyAccounts(companyId);
  } catch (err) {
    console.error('[composio] mailbox lookup failed:', err);
    return empty;
  }

  const candidates = accounts.filter((a) => isMailboxToolkit(a.toolkit?.slug || ''));
  const active = candidates.find((a) => a.status === 'ACTIVE' && !a.isDisabled);
  const pending = candidates.find(
    (a) => a.status === 'INITIATED' || a.status === 'INITIALIZING'
  );
  const chosen = active || pending;

  if (!chosen) return empty;

  const slug = chosen.toolkit!.slug as MailboxToolkitSlug;
  const address = extractAddress(chosen) || (chosen.status === 'ACTIVE'
    ? await fetchAddress(getComposio(), chosen.id)
    : null);

  return {
    connected: chosen.status === 'ACTIVE',
    address,
    provider: mailboxProviderFor(slug),
    toolkit: slug,
    connectedAccountId: chosen.id,
    pending: chosen.status !== 'ACTIVE',
    state: (chosen.status || null) as ComposioConnectionState | null,
  };
}

/**
 * The customer's connected mailbox address, or null when none is connected.
 * Used by the send path so replies come from the buyer's own address.
 */
export async function getCompanyMailbox(
  companyId: string
): Promise<{ address: string; provider: string; connectedAccountId: string } | null> {
  const state = await getCompanyMailboxState(companyId);
  if (!state.connected || !state.address || !state.connectedAccountId) return null;
  return {
    address: state.address,
    provider: state.provider || 'unknown',
    connectedAccountId: state.connectedAccountId,
  };
}

// ---------------------------------------------------------------------------
// Connect / disconnect
// ---------------------------------------------------------------------------

export interface StartConnectionResult {
  url: string;
  connectionId: string | null;
  status: string | null;
}

/**
 * Starts Composio hosted OAuth for one toolkit, keyed to `companyId` so the
 * resulting connected account belongs to that company.
 */
export async function startConnection(
  companyId: string,
  toolkitSlug: string
): Promise<StartConnectionResult> {
  const composio = getComposio();
  const request = await composio.toolkits.authorize(companyId, toolkitSlug);
  const url = request?.redirectUrl;
  if (!url) {
    throw new Error('Failed to start connection — no redirect URL returned.');
  }
  return {
    url,
    connectionId: request?.id ?? null,
    status: (request?.status as string) ?? null,
  };
}

export async function disconnectConnection(companyId: string, connectedAccountId: string): Promise<void> {
  const composio = getComposio();
  const list = await listCompanyAccounts(companyId);
  const belongs = list.some((a) => a.id === connectedAccountId);
  if (!belongs) {
    throw new Error('Connection not found for this company');
  }
  addressCache.delete(connectedAccountId);
  await composio.connectedAccounts.delete(connectedAccountId);
}
