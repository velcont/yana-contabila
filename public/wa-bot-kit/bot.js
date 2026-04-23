// WhatsApp AI Bot — YANA Cloud-Aware Edition
// Configurația vine din Lovable Cloud (YANA). Cheia Anthropic stă local în .env.
// Loghează fiecare conversație înapoi în cloud + heartbeat la 30s.

require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const Anthropic = require("@anthropic-ai/sdk").default;
const os = require("os");

const CLOUD_URL = process.env.CLOUD_URL || "https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/wa-bot-api";
const BOT_TOKEN = process.env.BOT_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!BOT_TOKEN) { console.error("❌ Lipsește BOT_TOKEN din .env"); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error("❌ Lipsește ANTHROPIC_API_KEY din .env"); process.exit(1); }

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

let config = {
  enabled: true, respond_in_groups: false, cooldown_seconds: 5,
  model: "claude-haiku-4-5", max_tokens: 400,
  system_prompt: "Esti un asistent AI prietenos.", keyword_rules: []
};

const history = new Map();
const MAX_HISTORY = 10;
const lastReply = new Map();

async function cloud(path, method = "GET", body = null) {
  try {
    const r = await fetch(`${CLOUD_URL}/${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Bot-Token": BOT_TOKEN },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) { console.warn(`[cloud ${path}] ${r.status}`); return null; }
    return await r.json();
  } catch (e) { console.warn(`[cloud ${path}] ${e.message}`); return null; }
}

async function refreshConfig() {
  const c = await cloud("config");
  if (c && !c.error) { config = { ...config, ...c }; console.log("✓ Config sincronizat din cloud"); }
}

async function heartbeat(extra = {}) {
  await cloud("heartbeat", "POST", { device_info: `${os.hostname()} (${os.platform()})`, ...extra });
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./wa-session" }),
  puppeteer: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

client.on("qr", (qr) => {
  console.log("\nScanează QR-ul cu WhatsApp (Settings → Linked Devices):\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log(`\n✓ Bot pornit pe ${os.hostname()}`);
  await refreshConfig();
  await heartbeat();
  setInterval(() => heartbeat().catch(() => {}), 30_000);
  setInterval(() => refreshConfig().catch(() => {}), 60_000);
});

client.on("message", async (msg) => {
  const t0 = Date.now();
  let replyText = null, replyType = "skipped", matched = null, errorMsg = null, tokens = null;
  const isGroup = msg.from.endsWith("@g.us");
  const text = (msg.body || "").trim();

  try {
    if (!config.enabled) return;
    if (msg.fromMe) return;
    if (isGroup && !config.respond_in_groups) return;
    if (!text) return;

    const last = lastReply.get(msg.from) || 0;
    if (Date.now() - last < (config.cooldown_seconds || 5) * 1000) return;

    // 1. Keyword
    for (const rule of config.keyword_rules || []) {
      if ((rule.keywords || []).some((k) => text.toLowerCase().includes(String(k).toLowerCase()))) {
        await msg.reply(rule.response);
        replyText = rule.response; replyType = "keyword"; matched = rule.keywords[0];
        lastReply.set(msg.from, Date.now());
        console.log(`[keyword] ${msg.from}: ${matched}`);
        return;
      }
    }

    // 2. AI Claude
    const prior = history.get(msg.from) || [];
    prior.push({ role: "user", content: text });
    const resp = await anthropic.messages.create({
      model: config.model, max_tokens: config.max_tokens,
      system: config.system_prompt, messages: prior.slice(-MAX_HISTORY),
    });
    const reply = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    tokens = (resp.usage?.input_tokens || 0) + (resp.usage?.output_tokens || 0);

    if (reply) {
      await msg.reply(reply);
      prior.push({ role: "assistant", content: reply });
      history.set(msg.from, prior.slice(-MAX_HISTORY));
      lastReply.set(msg.from, Date.now());
      replyText = reply; replyType = "ai";
      console.log(`[ai] ${msg.from}: ${text.slice(0, 40)}... → ${reply.length}c (${tokens}tok)`);
    }
  } catch (err) {
    errorMsg = err.message; replyType = "error";
    console.error("Eroare:", err.message);
  } finally {
    if (text && (replyText || errorMsg)) {
      let contactName = null;
      try { const c = await msg.getContact(); contactName = c.pushname || c.name || null; } catch {}
      cloud("log-message", "POST", {
        contact_id: msg.from, contact_name: contactName, is_group: isGroup,
        incoming_text: text, reply_text: replyText, reply_type: replyType,
        matched_keyword: matched, tokens_used: tokens, latency_ms: Date.now() - t0, error: errorMsg,
      }).catch(() => {});
    }
  }
});

client.on("auth_failure", (m) => console.error("Auth failure:", m));
client.on("disconnected", (r) => console.log("Deconectat:", r));

client.initialize();
