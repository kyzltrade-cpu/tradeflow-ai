import { NextResponse } from 'next/server';
import { handleChat, getOrCreateConversation } from '@/lib/ai';
import { supabaseAdmin } from '@/lib/supabase';
import {
  decryptMessage,
  verifySignature,
  parseWeChatXml,
  sendWeChatMessage,
} from '@/lib/wechat';

// ── GET — Webhook verification ──────────────────────────────────────────────
// WeChat Work sends: msg_signature, timestamp, nonce, echostr
// We must verify the signature and return the decrypted echostr.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const msgSignature = url.searchParams.get('msg_signature') || '';
  const timestamp = url.searchParams.get('timestamp') || '';
  const nonce = url.searchParams.get('nonce') || '';
  const echoStr = url.searchParams.get('echostr') || '';

  // Try env vars first (legacy), then fall back to company DB lookup
  const token = process.env.WECHAT_WORK_TOKEN || '';
  const encodingAESKey = process.env.WECHAT_WORK_ENCODING_AES_KEY || '';
  const corpId = process.env.WECHAT_WORK_CORP_ID || '';

  // If no env vars, try to find a matching company by corp_id query param
  let resolvedToken = token;
  let resolvedAESKey = encodingAESKey;
  let resolvedCorpId = corpId;

  if (!resolvedToken || !resolvedAESKey) {
    // Try looking up from query param or first matching company
    const queryCorpId = url.searchParams.get('corpid') || '';
    if (queryCorpId) {
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('wechat_corp_id, wechat_work_token, wechat_work_encoding_aes_key')
        .eq('wechat_corp_id', queryCorpId)
        .single();

      if (company) {
        resolvedToken = company.wechat_work_token || '';
        resolvedAESKey = company.wechat_work_encoding_aes_key || '';
        resolvedCorpId = company.wechat_corp_id || '';
      }
    }
  }

  if (!resolvedToken || !resolvedAESKey) {
    return new NextResponse('Configuration missing', { status: 500 });
  }

  // Decrypt echostr first (before signature verification for initial setup)
  let decryptedEcho: string;
  try {
    decryptedEcho = decryptMessage(resolvedAESKey, echoStr);
  } catch {
    return new NextResponse('Decryption failed', { status: 403 });
  }

  // Verify signature
  if (!verifySignature(resolvedToken, msgSignature, timestamp, nonce, echoStr)) {
    return new NextResponse('Signature verification failed', { status: 403 });
  }

  return new NextResponse(decryptedEcho, {
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ── POST — Receive messages from WeChat Work ────────────────────────────────
export async function POST(req: Request) {
  // Always return 'success' to WeChat Work (they retry on failure)
  const ok = () => new NextResponse('success', { headers: { 'Content-Type': 'text/plain' } });

  try {
    const body = await req.text();

    // ── 1. Parse outer XML to get Encrypt field ──
    const outerXmlMatch = body.match(/<xml>([\s\S]*?)<\/xml>/);
    if (!outerXmlMatch) return ok();

    const outer = parseWeChatXml(outerXmlMatch[1]);
    const encrypt = outer.Encrypt;
    if (!encrypt) return ok();

    // ── 2. Resolve credentials (env vars or DB) ──
    let token = process.env.WECHAT_WORK_TOKEN || '';
    let encodingAESKey = process.env.WECHAT_WORK_ENCODING_AES_KEY || '';
    let envCorpId = process.env.WECHAT_WORK_CORP_ID || '';
    let envSecret = process.env.WECHAT_WORK_SECRET || '';
    let envAgentId = parseInt(process.env.WECHAT_WORK_AGENT_ID || '0', 10);

    // WeChat Work sends msg_signature, timestamp, nonce in query params
    const url = new URL(req.url);
    const msgSignature = url.searchParams.get('msg_signature') || '';
    const timestamp = url.searchParams.get('timestamp') || '';
    const nonce = url.searchParams.get('nonce') || '';

    // Verify signature (must happen before decryption)
    if (!verifySignature(token, msgSignature, timestamp, nonce, encrypt)) {
      return ok();
    }

    // ── 3. Decrypt message ──
    let decryptedXml: string;
    try {
      decryptedXml = decryptMessage(encodingAESKey, encrypt);
    } catch (err) {
      console.error('WeChat Work decryption failed:', err);
      return ok();
    }

    // ── 4. Parse decrypted XML ──
    const innerMatch = decryptedXml.match(/<xml>([\s\S]*?)<\/xml>/);
    if (!innerMatch) {
      // Might be the raw message without outer <xml> wrapper
      const rawMatch = decryptedXml.match(/<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\w+>/g);
      if (!rawMatch) return ok();
    }

    const msgXml = innerMatch ? innerMatch[1] : decryptedXml;
    const msg = parseWeChatXml(msgXml);

    const fromUser = msg.FromUserName;
    const msgType = msg.MsgType;
    const agentId = msg.AgentID ? parseInt(msg.AgentID, 10) : envAgentId;

    if (!fromUser || !msgType) return ok();

    // Only handle text messages
    if (msgType !== 'text') return ok();

    const userMessage = msg.Content;
    if (!userMessage) return ok();

    // ── 5. Find company by WeChat Work Corp ID or Agent ID ──
    let company = null;

    // Try by corp_id first
    if (envCorpId) {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('wechat_corp_id', envCorpId)
        .single();
      company = data;
    }

    // Fallback: try by agent_id
    if (!company && agentId) {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('*')
        .eq('wechat_agent_id', String(agentId))
        .single();
      company = data;
    }

    if (!company) {
      console.error('No company found for WeChat Work corp_id:', envCorpId, 'agent_id:', agentId);
      return ok();
    }

    // Use per-company credentials if available, fall back to env
    const companyCorpId = company.wechat_corp_id || envCorpId;
    const companySecret = company.wechat_work_secret || envSecret;
    const companyAgentId = company.wechat_agent_id ? parseInt(company.wechat_agent_id, 10) : agentId || envAgentId;

    if (!companyCorpId || !companySecret || !companyAgentId) {
      console.error('Company missing WeChat Work credentials:', company.id);
      return ok();
    }

    // ── 6. Get or create conversation ──
    const conversationId = await getOrCreateConversation(
      company.id,
      'wechat',
      fromUser
    );

    // ── 7. Get AI response ──
    const { reply } = await handleChat({
      companyId: company.id,
      channel: 'wechat',
      conversationId,
      userMessage,
      contactName: fromUser,
    });

    if (!reply) {
      return ok();
    }

    // ── 8. Send reply ──
    await sendWeChatMessage(
      companyCorpId,
      companyAgentId,
      companySecret,
      fromUser,
      reply
    );

    return ok();
  } catch (error) {
    console.error('WeChat Work webhook error:', error);
    return ok();
  }
}
