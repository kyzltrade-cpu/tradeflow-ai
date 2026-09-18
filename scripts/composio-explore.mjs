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

  // Search for Gmail tools
  console.log("\n=== Searching for Gmail tools ===");
  const gmail = await mcpCall("tools/call", {
    name: "COMPOSIO_SEARCH_TOOLS",
    arguments: { query: "gmail send email", limit: 5 },
  });
  console.log(JSON.stringify(gmail.result, null, 2));

  // Search for Google Sheets tools
  console.log("\n=== Searching for Google Sheets tools ===");
  const sheets = await mcpCall("tools/call", {
    name: "COMPOSIO_SEARCH_TOOLS",
    arguments: { query: "google sheets", limit: 5 },
  });
  console.log(JSON.stringify(sheets.result, null, 2));

  // Search for Slack tools
  console.log("\n=== Searching for Slack tools ===");
  const slack = await mcpCall("tools/call", {
    name: "COMPOSIO_SEARCH_TOOLS",
    arguments: { query: "slack send message", limit: 5 },
  });
  console.log(JSON.stringify(slack.result, null, 2));

  // Search for LinkedIn tools
  console.log("\n=== Searching for LinkedIn tools ===");
  const linkedin = await mcpCall("tools/call", {
    name: "COMPOSIO_SEARCH_TOOLS",
    arguments: { query: "linkedin", limit: 5 },
  });
  console.log(JSON.stringify(linkedin.result, null, 2));
}

main().catch(console.error);
