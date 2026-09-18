import crypto from 'crypto';

// ── Access Token Cache ──────────────────────────────────────────────────────
// Module-level cache resets on cold start (fine for Vercel).
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getAccessToken(corpId: string, secret: string): Promise<string> {
  const cacheKey = corpId;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`
  );
  const data = await res.json();

  if (data.errcode !== 0) {
    throw new Error(`WeChat Work token error: ${data.errcode} - ${data.errmsg}`);
  }

  const entry = {
    token: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000, // refresh 5 min early
  };
  tokenCache.set(cacheKey, entry);
  return entry.token;
}

// ── Send Text Message ───────────────────────────────────────────────────────
export async function sendWeChatMessage(
  corpId: string,
  agentId: number,
  secret: string,
  toUser: string,
  message: string
): Promise<void> {
  const accessToken = await getAccessToken(corpId, secret);

  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: toUser,
        msgtype: 'text',
        agentid: agentId,
        text: { content: message },
      }),
    }
  );

  const data = await res.json();
  if (data.errcode !== 0) {
    console.error('WeChat Work send message error:', data.errcode, data.errmsg);
  }
}

// ── Signature Verification ──────────────────────────────────────────────────
// WeChat Work sorts [token, timestamp, nonce, encrypt] then SHA1.
export function verifySignature(
  token: string,
  msgSignature: string,
  timestamp: string,
  nonce: string,
  encrypt: string
): boolean {
  const arr = [token, timestamp, nonce, encrypt].sort();
  const str = arr.join('');
  const hash = crypto.createHash('sha1').update(str).digest('hex');
  return hash === msgSignature;
}

// ── AES-256-CBC Decryption ──────────────────────────────────────────────────
// EncodingAESKey is 43 chars of Base64url → decodes to 32-byte AES key.
// IV = first 16 bytes of the key.
// Decrypted plaintext: 16 random bytes + 4-byte network-order msg length + msg + corp_id
export function decryptMessage(encodingAESKey: string, encrypted: string): string {
  const key = Buffer.from(encodingAESKey, 'base64');
  const iv = key.subarray(0, 16);

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  // Strip 16-byte random prefix
  const content = decrypted.substring(16);

  // Read 4-byte big-endian message length
  const msgLen = content.charCodeAt(0) << 24 |
    content.charCodeAt(1) << 16 |
    content.charCodeAt(2) << 8 |
    content.charCodeAt(3);

  // Extract the actual message (everything before the corp_id suffix)
  return content.substring(4, 4 + msgLen);
}

// ── AES-256-CBC Encryption (for replies, if needed) ────────────────────────
export function encryptMessage(encodingAESKey: string, msg: string, corpId: string): string {
  const key = Buffer.from(encodingAESKey, 'base64');
  const iv = key.subarray(0, 16);

  // Random 16-byte prefix
  const randomPrefix = crypto.randomBytes(16);

  // 4-byte big-endian msg length
  const msgBuf = Buffer.alloc(4);
  msgBuf.writeUInt32BE(msg.length, 0);

  const plaintext = Buffer.concat([randomPrefix, msgBuf, Buffer.from(msg, 'utf8'), Buffer.from(corpId, 'utf8')]);

  // PKCS7 padding
  const blockSize = 32;
  const padLen = blockSize - (plaintext.length % blockSize);
  const padBuf = Buffer.alloc(padLen, padLen);
  const padded = Buffer.concat([plaintext, padBuf]);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
  return encrypted.toString('base64');
}

// ── XML Parsing (no dependencies) ───────────────────────────────────────────
// WeChat Work XML is simple and predictable. Extract <Tag>content</Tag> and
// <Tag><![CDATA[content]]></Tag> patterns.
export function parseWeChatXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Match either CDATA or plain text content
  const regex = /<(\w+)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    result[match[1]] = match[2];
  }

  return result;
}
