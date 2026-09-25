export type ComposioAppCategory =
  | 'Email'
  | 'Google'
  | 'Microsoft'
  | 'Productivity'
  | 'Communication';

export const COMPOSIO_APPS: ReadonlyArray<{ slug: string; name: string; category: ComposioAppCategory }> = [
  { slug: 'gmail', name: 'Gmail', category: 'Email' },
  { slug: 'googledrive', name: 'Google Drive', category: 'Google' },
  { slug: 'googlesuper', name: 'Google Sheets', category: 'Google' },
  { slug: 'googlecalendar', name: 'Google Calendar', category: 'Google' },
  { slug: 'outlook', name: 'Outlook', category: 'Email' },
  { slug: 'one_drive', name: 'OneDrive', category: 'Microsoft' },
  { slug: 'sharepoint_graph', name: 'SharePoint', category: 'Microsoft' },
  { slug: 'notion', name: 'Notion', category: 'Productivity' },
  { slug: 'slack', name: 'Slack', category: 'Communication' },
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