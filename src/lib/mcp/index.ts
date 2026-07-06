import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listConversationsTool from "./tools/list_conversations";
import listActionItemsTool from "./tools/list_action_items";
import listCrmDealsTool from "./tools/list_crm_deals";

// Direct supabase.co issuer (mcp-js rejects mismatched issuers per RFC 8414 §3.3).
// Read the project ref from a Vite-inlined literal so this file stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "yana-mcp",
  title: "YANA — CFO + CRM AI",
  version: "0.1.0",
  instructions:
    "YANA is a Romanian AI CFO + CRM assistant. Use `echo` to verify connectivity. " +
    "Authenticated tools read the signed-in user's data via Supabase RLS: " +
    "`list_conversations` (recent YANA chats), `list_action_items` (open tasks), " +
    "`list_crm_deals` (CRM pipeline).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, listConversationsTool, listActionItemsTool, listCrmDealsTool],
});