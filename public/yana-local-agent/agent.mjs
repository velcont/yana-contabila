#!/usr/bin/env node
/**
 * YANA Local Agent
 * --------------------------------------------------------------
 * Rulează pe laptopul tău (Mac/Linux/Windows) și permite Yanei
 * să citească/scrie fișiere și să execute comenzi LOCAL.
 *
 * Arhitectură:
 *   YANA cloud  ─►  bridge edge function  ─◄  acest agent (HTTP poll 2s)
 *
 * Securitate:
 *  - Folosește un device_token unic obținut prin pairing code
 *  - Toate comenzile rulează cu drepturile utilizatorului care a pornit agentul
 *  - "Trust total după pairing" — agentul execută orice comandă primită
 *    de la cloud. NU rula pe un sistem cu date sensibile fără să înțelegi asta.
 *
 * Utilizare:
 *   1. Cere un pairing code din /yana → Settings → Conectare laptop
 *   2. Rulează:  node agent.mjs
 *   3. Introdu codul când îți cere
 *   Token-ul se salvează în ~/.yana-local-agent.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const BRIDGE_URL = process.env.YANA_BRIDGE_URL ||
  "https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/yana-local-bridge";
const CLAIM_URL = process.env.YANA_CLAIM_URL ||
  "https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/yana-local-claim";
const CONFIG_PATH = path.join(os.homedir(), ".yana-local-agent.json");
const POLL_INTERVAL_MS = 2000;

// ─── Config helpers ────────────────────────────────────────────
async function loadConfig() {
  try {
    return JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  } catch {
    return null;
  }
}
async function saveConfig(cfg) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

// ─── Pairing flow ──────────────────────────────────────────────
async function pair() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("\n🔗  YANA Local Agent — pairing\n");
  console.log("   1. Deschide /yana → Settings → Conectare laptop");
  console.log("   2. Apasă 'Generează cod'");
  const code = (await rl.question("\n   3. Introdu codul de 6 cifre: ")).trim();
  rl.close();

  const resp = await fetch(CLAIM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pairing_code: code,
      os_info: `${os.platform()} ${os.release()} (${os.hostname()})`,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Pairing eșuat: ${resp.status} ${err}`);
  }
  const data = await resp.json();
  await saveConfig({ device_token: data.device_token, device_id: data.device_id });
  console.log(`\n✅  Conectat! Token salvat în ${CONFIG_PATH}\n`);
  return data.device_token;
}

// ─── Command executors ─────────────────────────────────────────
async function execCommand(type, params) {
  const t0 = Date.now();
  switch (type) {
    case "fs_read": {
      const max = params.max_bytes ?? 200000;
      const buf = await fs.readFile(params.path);
      const truncated = buf.length > max;
      const content = buf.subarray(0, max).toString("utf8");
      return { content, truncated, total_bytes: buf.length, duration_ms: Date.now() - t0 };
    }
    case "fs_write": {
      await fs.mkdir(path.dirname(params.path), { recursive: true });
      await fs.writeFile(params.path, params.content, "utf8");
      return { written: true, path: params.path, bytes: Buffer.byteLength(params.content), duration_ms: Date.now() - t0 };
    }
    case "fs_list": {
      const entries = await fs.readdir(params.path, { withFileTypes: true });
      return {
        path: params.path,
        entries: entries.map((e) => ({
          name: e.name,
          type: e.isDirectory() ? "dir" : e.isFile() ? "file" : "other",
        })),
        duration_ms: Date.now() - t0,
      };
    }
    case "bash_exec": {
      const timeout = params.timeout_ms ?? 30000;
      const { stdout, stderr } = await execAsync(params.command, {
        cwd: params.cwd || os.homedir(),
        timeout,
        maxBuffer: 5 * 1024 * 1024,
      });
      return {
        stdout: stdout.slice(0, 100000),
        stderr: stderr.slice(0, 50000),
        duration_ms: Date.now() - t0,
      };
    }
    case "desktop_cmd":
      // Reserved for future Desktop Commander integration (open app, screenshot, etc.)
      throw new Error("desktop_cmd: nu este implementat încă în acest agent");
    default:
      throw new Error(`Tip de comandă necunoscut: ${type}`);
  }
}

// ─── Main loop ─────────────────────────────────────────────────
async function pollLoop(token) {
  console.log(`👂  Ascult comenzi de la YANA (poll ${POLL_INTERVAL_MS}ms)...\n   Ctrl+C pentru oprire.\n`);
  let consecutiveErrors = 0;
  while (true) {
    try {
      const resp = await fetch(BRIDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Device-Token": token },
        body: JSON.stringify({ action: "poll" }),
      });
      if (resp.status === 403) {
        console.error("❌  Token invalid sau revocat. Șterge ~/.yana-local-agent.json și re-pair.");
        process.exit(1);
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { command } = await resp.json();
      consecutiveErrors = 0;

      if (command) {
        console.log(`▶️   ${command.type}`, JSON.stringify(command.params).slice(0, 120));
        let result, error, success = false, duration = 0;
        const t0 = Date.now();
        try {
          result = await execCommand(command.type, command.params);
          success = true;
          duration = result?.duration_ms ?? Date.now() - t0;
          console.log(`✅   completat în ${duration}ms`);
        } catch (e) {
          error = e?.message || String(e);
          duration = Date.now() - t0;
          console.log(`❌   ${error}`);
        }
        await fetch(BRIDGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Device-Token": token },
          body: JSON.stringify({
            action: "result",
            command_id: command.id,
            success,
            result: success ? result : null,
            error,
            duration_ms: duration,
          }),
        });
      }
    } catch (e) {
      consecutiveErrors++;
      const wait = Math.min(30000, POLL_INTERVAL_MS * Math.pow(2, consecutiveErrors));
      console.warn(`⚠️   poll error: ${e.message} — retry în ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// ─── Entry ─────────────────────────────────────────────────────
(async () => {
  let cfg = await loadConfig();
  let token = cfg?.device_token;
  if (!token) token = await pair();
  await pollLoop(token);
})().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});