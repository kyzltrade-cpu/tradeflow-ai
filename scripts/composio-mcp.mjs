const API_KEY = "ck_Hfyrlgp-Akk1mVZlmnS2";
const MCP_URL = "https://connect.composio.dev/mcp";

async function mcpCall(method, params = {}, sessionId = null) {
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

  const sid = res.headers.get("mcp-session-id") || sessionId;
  const text = await res.text();

  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      return { data: JSON.parse(line.slice(6)), sessionId: sid };
    }
  }
  return { data: JSON.parse(text), sessionId: sid };
}

async function main() {
  // 1. Initialize
  const init = await mcpCall("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "opencode", version: "1.0" },
  });
  console.log("Session ID:", init.sessionId);
  console.log("Init:", JSON.stringify(init.data.result, null, 2));

  // 2. List tools
  const tools = await mcpCall("tools/list", {}, init.sessionId);
  console.log("\n--- Available Tools ---");
  const toolList = tools.data.result?.tools || [];
  console.log(`Found ${toolList.length} tools\n`);
  toolList.forEach((t) => console.log(` ${t.name}`));
}

main().catch(console.error);
