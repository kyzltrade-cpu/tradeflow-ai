export type ComposioAppCategory =
  | 'Email'
  | 'Google'
  | 'Microsoft'
  | 'Productivity'
  | 'Communication';

/** OAuth provider family — mirrors `oauth_accounts.provider` (018). */
export type MailboxProvider = 'google' | 'microsoft';

/**
 * Toolkits that carry a customer's real mailbox. Connecting one of these is
 * what makes inbound email land in that company's inbox and lets replies send
 * from the customer's own address.
 */
export const MAILBOX_TOOLKITS = {
  gmail: 'google',
  outlook: 'microsoft',
} as const satisfies Record<string, MailboxProvider>;

export type MailboxToolkitSlug = keyof typeof MAILBOX_TOOLKITS;

export function isMailboxToolkit(slug: string): slug is MailboxToolkitSlug {
  return Object.prototype.hasOwnProperty.call(MAILBOX_TOOLKITS, slug);
}

export function mailboxProviderFor(slug: string): MailboxProvider | null {
  return isMailboxToolkit(slug) ? MAILBOX_TOOLKITS[slug] : null;
}

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

export function isKnownToolkit(slug: string): boolean {
  return COMPOSIO_APPS.some((a) => a.slug === slug);
}

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
  /** True for Gmail/Outlook — the apps that feed the customer's inbox. */
  isMailbox: boolean;
  connection: {
    id: string;
    status: ComposioConnectionState;
    alias: string | null;
    /** Mailbox address behind the connection, when Composio reports one. */
    address?: string | null;
    updatedAt: string;
  } | null;
};

/** Per-company mailbox state returned by the composio status route. */
export type CompanyMailboxState = {
  connected: boolean;
  /** Mailbox address the customer's email will be read from / sent from. */
  address: string | null;
  provider: MailboxProvider | null;
  toolkit: MailboxToolkitSlug | null;
  connectedAccountId: string | null;
  /** Set when a connection exists but is not usable yet. */
  pending?: boolean;
  state: ComposioConnectionState | null;
};
