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

  // Wait for Sheets
  console.log("=== Waiting for Sheets ===");
  const sheets = await mcpCall("tools/call", {
    name: "COMPOSIO_WAIT_FOR_CONNECTIONS",
    arguments: { toolkits: ["googlesheets"] },
  });
  console.log(JSON.stringify(sheets.result, null, 2));

  // Wait for Slack
  console.log("\n=== Waiting for Slack ===");
  const slack = await mcpCall("tools/call", {
    name: "COMPOSIO_WAIT_FOR_CONNECTIONS",
    arguments: { toolkits: ["slack"] },
  });
  console.log(JSON.stringify(slack.result, null, 2));

  // Test Sheets - list spreadsheets
  console.log("\n=== Testing Sheets ===");
  const sheetsList = await mcpCall("tools/call", {
    name: "COMPOSIO_MULTI_EXECUTE_TOOL",
    arguments: {
      tools: [{ tool_slug: "GOOGLESHEETS_LIST_SPREADSHEETS", arguments: { limit: 5 } }],
    },
  });
  console.log(JSON.stringify(sheetsList.result, null, 2));
}

main().catch(console.error);
