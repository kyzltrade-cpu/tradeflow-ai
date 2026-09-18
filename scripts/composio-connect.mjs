const API_KEY = "ck_Hfyrlgp-Akk1mVZlmnS2";
const MCP_URL = "https://connect.composio.dev/mcp";

let sessionId = null;

async function mcpCall(method, params = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "x-consumer-api-key": API_KEY,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: Date.now() }),
  });

  sessionId = res.headers.get("mcp-session-id") || sessionId;
  const text = await res.text();

  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) return JSON.parse(line.slice(6));
  }
  return JSON.parse(text);
}

async function main() {
  // Init
  await mcpCall("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "opencode", version: "1.0" },
  });

  // Connect Gmail
  console.log("=== Connecting Gmail ===");
  const gmailConn = await mcpCall("tools/call", {
    name: "COMPOSIO_MANAGE_CONNECTIONS",
    arguments: { toolkits: ["gmail"] },
  });
  console.log(JSON.stringify(gmailConn.result, null, 2));
}

main().catch(console.error);
