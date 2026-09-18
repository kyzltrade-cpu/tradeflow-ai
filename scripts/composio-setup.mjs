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

  // 1. Test Gmail - list recent emails
  console.log("=== Gmail: Listing recent emails ===");
  const emails = await mcpCall("tools/call", {
    name: "COMPOSIO_MULTI_EXECUTE_TOOL",
    arguments: {
      tools: [{ tool_slug: "GMAIL_FETCH_EMAILS", arguments: { max_results: 3 } }],
    },
  });
  console.log(JSON.stringify(emails.result, null, 2));

  // 2. Connect Google Sheets
  console.log("\n=== Connecting Google Sheets ===");
  const sheetsConn = await mcpCall("tools/call", {
    name: "COMPOSIO_MANAGE_CONNECTIONS",
    arguments: { toolkits: ["googlesheets"] },
  });
  const sheetsData = JSON.parse(sheetsConn.result.content[0].text);
  if (sheetsData.data.results?.googlesheets?.redirect_url) {
    console.log("Sheets auth URL:", sheetsData.data.results.googlesheets.redirect_url);
  } else {
    console.log(JSON.stringify(sheetsData, null, 2));
  }

  // 3. Connect Slack
  console.log("\n=== Connecting Slack ===");
  const slackConn = await mcpCall("tools/call", {
    name: "COMPOSIO_MANAGE_CONNECTIONS",
    arguments: { toolkits: ["slack"] },
  });
  const slackData = JSON.parse(slackConn.result.content[0].text);
  if (slackData.data.results?.slack?.redirect_url) {
    console.log("Slack auth URL:", slackData.data.results.slack.redirect_url);
  } else {
    console.log(JSON.stringify(slackData, null, 2));
  }

  // 4. Connect LinkedIn
  console.log("\n=== Connecting LinkedIn ===");
  const linkedinConn = await mcpCall("tools/call", {
    name: "COMPOSIO_MANAGE_CONNECTIONS",
    arguments: { toolkits: ["linkedin"] },
  });
  const linkedinData = JSON.parse(linkedinConn.result.content[0].text);
  if (linkedinData.data.results?.linkedin?.redirect_url) {
    console.log("LinkedIn auth URL:", linkedinData.data.results.linkedin.redirect_url);
  } else {
    console.log(JSON.stringify(linkedinData, null, 2));
  }
}

main().catch(console.error);
