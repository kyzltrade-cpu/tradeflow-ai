export type ComposioAppCategory =
  | 'Email'
  | 'Google'
  | 'Microsoft'
  | 'Productivity'
  | 'Communication';

export const COMPOSIO_APPS: ReadonlyArray<{ slug: string; category: ComposioAppCategory }> = [
  { slug: 'gmail', category: 'Email' },
  { slug: 'googledrive', category: 'Google' },
  { slug: 'googlesuper', category: 'Google' },
  { slug: 'googlecalendar', category: 'Google' },
  { slug: 'outlook', category: 'Email' },
  { slug: 'one_drive', category: 'Microsoft' },
  { slug: 'sharepoint_graph', category: 'Microsoft' },
  { slug: 'notion', category: 'Productivity' },
  { slug: 'slack', category: 'Communication' },
];

export type ComposioConnectionState =
  | 'INITIALIZING'
  | 'INITIATED'
  | 'ACTIVE'
  | 'FAILED'
  | 'EXPIRED'
  | 'INACTIVE'
  | 'REVOKED';

export type ComposioAppModule = {
  slug: string;
  name: string;
  logo: string;
  description: string;
  category: ComposioAppCategory;
  connection: {
    id: string;
    status: ComposioConnectionState;
    alias: string | null;
    updatedAt: string;
  } | null;
};