import { Composio } from '@composio/core';
import { COMPOSIO_APPS, type ComposioAppModule, type ComposioConnectionState } from '@/lib/composio-apps';

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
  alias: string | null;
  status: string;
  updatedAt: string;
  wordId?: string | null;
  toolkit?: { slug: string };
};

let appCatalog: Map<string, { app: ComposioAppModule }> | null = null;

export async function getAppCatalog(): Promise<Map<string, ComposioAppModule>> {
  const composio = getComposio();
  return loadCatalog(composio);
}

async function loadCatalog(composio: Composio): Promise<Map<string, ComposioAppModule>> {
  if (appCatalog) {
    const map = new Map<string, ComposioAppModule>();
    for (const [slug, { app }] of appCatalog) map.set(slug, app);
    return map;
  }
  const list = await composio.toolkits.get({ limit: 1000 });
  const raw = (list as { items?: ToolkitListItem[] }).items ?? [];
  const map = new Map<string, ComposioAppModule>();
  const store = new Map<string, { app: ComposioAppModule }>();
  for (const item of raw) {
    const curated = COMPOSIO_APPS.find((a) => a.slug === item.slug);
    if (!curated) continue;
    const app: ComposioAppModule = {
      slug: item.slug,
      name: item.name,
      logo: item.meta?.logo ?? '',
      description: item.meta?.description ?? '',
      category: curated.category,
      connection: null,
    };
    map.set(item.slug, app);
    store.set(item.slug, { app });
  }
  appCatalog = store;
  return map;
}

export async function getCompanyApps(companyId: string): Promise<ComposioAppModule[]> {
  const composio = getComposio();
  const catalog = await loadCatalog(composio);
  const accounts = (await composio.connectedAccounts.list({
    userIds: [companyId],
  })) as unknown as { items?: ConnectedAccountItem[] };

  const bySlug = new Map((accounts.items ?? []).map((a) => [a.toolkit?.slug, a]));

  return Array.from(catalog.values()).map((app) => {
    const raw = bySlug.get(app.slug);
    if (!raw) return app;
    return {
      ...app,
      connection: {
        id: raw.id,
        status: raw.status as ComposioConnectionState,
        alias: raw.alias ?? raw.wordId ?? null,
        updatedAt: raw.updatedAt,
      },
    };
  });
}

export async function startConnection(companyId: string, toolkitSlug: string): Promise<string> {
  const composio = getComposio();
  const request = await composio.toolkits.authorize(companyId, toolkitSlug);
  const url = request.redirectUrl;
  if (!url) {
    throw new Error('Failed to start connection — no redirect URL returned.');
  }
  return url;
}

export async function disconnectConnection(companyId: string, connectedAccountId: string): Promise<void> {
  const composio = getComposio();
  const list = (await composio.connectedAccounts.list({
    userIds: [companyId],
  })) as unknown as { items?: ConnectedAccountItem[] };
  const belongs = (list.items ?? []).some((a) => a.id === connectedAccountId);
  if (!belongs) {
    throw new Error('Connection not found for this company');
  }
  await composio.connectedAccounts.delete(connectedAccountId);
}