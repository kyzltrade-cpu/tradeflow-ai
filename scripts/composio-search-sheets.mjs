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
  await mcpCall("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "opencode", version: "1.0" },
  });

  // Search for spreadsheet creation tools
  console.log("=== Searching for Sheets tools ===");
  const result = await mcpCall("tools/call", {
    name: "COMPOSIO_SEARCH_TOOLS",
    arguments: { query: "create spreadsheet google sheets", limit: 5 },
  });

  const data = JSON.parse(result.result.content[0].text);
  const tools = data.data?.results?.[0]?.tool_schemas || {};
  console.log("Available tools:");
  Object.keys(tools).forEach((k) => console.log(` - ${k}`));
}

main().catch(console.error);
