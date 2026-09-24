import 'server-only';
import crypto from 'crypto';

export type OAuthProvider = 'google' | 'microsoft';

export type ProviderConfig = {
  name: string;
  brandColor: string;
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string | null;
  scope: string;
  needsConsent: boolean;
  clientId: () => string;
  clientSecret: () => string;
};

export const PROVIDERS: Record<OAuthProvider, ProviderConfig> = {
  google: {
    name: 'Google',
    brandColor: '#4285F4',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
    needsConsent: true,
    clientId: () => process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: () => process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  },
  microsoft: {
    name: 'Microsoft',
    brandColor: '#2F5B98',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfoUrl: null,
    scope: 'openid email profile offline_access Mail.Send',
    needsConsent: false,
    clientId: () => process.env.MICROSOFT_OAUTH_CLIENT_ID || '',
    clientSecret: () => process.env.MICROSOFT_OAUTH_CLIENT_SECRET || '',
  },
};

export function isProviderConfigured(provider: OAuthProvider): boolean {
  const c = PROVIDERS[provider];
  return !!(c.clientId() && c.clientSecret());
}

export function buildRedirectUri(req: Request): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return `${base.replace(/\/$/, '')}/api/admin/connections/callback`;
}

export function buildAuthorizeUrl(provider: OAuthProvider, redirectUri: string, state: string): string {
  const c = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: c.clientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: c.scope,
    state,
    prompt: 'select_account',
  });
  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }
  return `${c.authorizeUrl}?${params.toString()}`;
}

function stateSecret(): string {
  return process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SECRET_KEY || 'changeme-insecure-state-secret';
}

function encryptionKey(): Buffer {
  return crypto.createHash('sha256').update(stateSecret()).digest();
}

export function createState(data: { companyId: string; provider: OAuthProvider }): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyState(state: string): { companyId: string; provider: OAuthProvider } | null {
  try {
    const [payload, sig] = state.split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', stateSecret()).update(payload).digest();
    const given = Buffer.from(sig, 'hex');
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.companyId !== 'string' || !PROVIDERS[data.provider as OAuthProvider]) return null;
    return { companyId: data.companyId, provider: data.provider as OAuthProvider };
  } catch {
    return null;
  }
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed encrypted payload');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
};

export async function exchangeCode(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const c = PROVIDERS[provider];
  const body = new URLSearchParams({
    client_id: c.clientId(),
    client_secret: c.clientSecret(),
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(c.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }
  return data as TokenResponse;
}

export async function refreshAccessToken(
  provider: OAuthProvider,
  refreshToken: string
): Promise<Pick<TokenResponse, 'access_token' | 'expires_in'>> {
  const c = PROVIDERS[provider];
  const body = new URLSearchParams({
    client_id: c.clientId(),
    client_secret: c.clientSecret(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch(c.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Token refresh failed');
  }
  return { access_token: data.access_token, expires_in: data.expires_in };
}

export function decodeIdTokenPayload(idToken?: string): Record<string, unknown> | null {
  if (!idToken) return null;
  try {
    const part = idToken.split('.')[1];
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export async function fetchAccountInfo(
  provider: OAuthProvider,
  accessToken: string,
  idToken?: string
): Promise<{ email: string; name: string }> {
  if (provider === 'microsoft') {
    const claims = decodeIdTokenPayload(idToken) || {};
    const email = String(claims.email || claims.preferred_username || claims.upn || '');
    if (!email) throw new Error('Could not determine Microsoft account email');
    return { email, name: String(claims.name || email.split('@')[0]) };
  }
  const res = await fetch(PROVIDERS.google.userinfoUrl!, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.email) throw new Error(data.error?.message || 'Could not fetch Google account');
  return { email: data.email, name: data.name || data.email.split('@')[0] };
}

export async function sendViaMailbox(
  provider: OAuthProvider,
  accessToken: string,
  from: { email: string; name: string },
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (provider === 'google') {
    const message = [
      `From: ${from.name} <${from.email}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join('\r\n');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: Buffer.from(message).toString('base64url') }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error?.message || 'Gmail send failed');
    }
    return;
  }

  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'html', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Outlook send failed');
  }
}