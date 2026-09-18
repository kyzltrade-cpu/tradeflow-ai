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

async function executeTool(slug, args) {
  const result = await mcpCall("tools/call", {
    name: "COMPOSIO_MULTI_EXECUTE_TOOL",
    arguments: { tools: [{ tool_slug: slug, arguments: args }] },
  });
  return JSON.parse(result.result.content[0].text);
}

async function main() {
  await mcpCall("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "opencode", version: "1.0" },
  });

  // 1. Create spreadsheet
  console.log("=== Creating contact tracking spreadsheet ===");
  const spreadsheet = await executeTool("GOOGLESHEETS_CREATE_SPREADSHEET", {
    title: "TradeFlow AI - Outreach Contacts",
  });
  console.log(JSON.stringify(spreadsheet, null, 2));

  const spreadsheetId = spreadsheet.data?.spreadsheet?.spreadsheetId;
  if (!spreadsheetId) {
    console.log("Failed to create spreadsheet");
    return;
  }
  console.log("Spreadsheet ID:", spreadsheetId);
  console.log("URL:", `https://docs.google.com/spreadsheets/d/${spreadsheetId}`);

  // 2. Add headers
  console.log("\n=== Adding headers ===");
  const headers = await executeTool("GOOGLESHEETS_BATCH_UPDATE", {
    spreadsheet_id: spreadsheetId,
    requests: [
      {
        addSheet: {
          properties: { title: "Contacts" },
        },
      },
    ],
  });
  console.log(JSON.stringify(headers, null, 2));

  // 3. Write header row
  console.log("\n=== Writing header row ===");
  const headerRow = await executeTool("GOOGLESHEETS_WRITE_TO_RANGE", {
    spreadsheet_id: spreadsheetId,
    range: "Contacts!A1:H1",
    values: [
      [
        "Company",
        "Email",
        "Contact Name",
        "Phone",
        "Status",
        "Last Contacted",
        "Notes",
        "Source",
      ],
    ],
  });
  console.log(JSON.stringify(headerRow, null, 2));

  console.log("\n✅ Spreadsheet created!");
  console.log(`Open: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
}

main().catch(console.error);
