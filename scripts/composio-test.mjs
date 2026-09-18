import { Composio } from "@composio/core";

const composio = new Composio({ apiKey: "ck_Hfyrlgp-Akk1mVZlmnS2" });

const session = await composio.create("tradeflow-user");

console.log("MCP URL:", session.mcp.url);
console.log("MCP Headers:", JSON.stringify(session.mcp.headers));

const tools = await session.tools();
console.log("\nAvailable tools:", tools.length);
tools.forEach((t) => console.log(` - ${t.name}: ${t.description?.slice(0, 80)}`));
