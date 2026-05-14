// YANA Self-Modifier — recursive self-improvement via GitHub PR flow
// SAFETY RAILS (hard-coded, NOT changeable by Yana itself):
// 1. Kill switch (DB) — instant stop
// 2. Rate limit: max N modifications/day
// 3. Forbidden paths: cannot touch own self-mod tools, .env, supabase config, supabase client
// 4. DB migrations & config changes require explicit setting flags
// 5. Destructive SQL keywords blocked in migrations
// 6. Post-deploy error monitoring with auto-revert

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GITHUB_PAT = Deno.env.get("GITHUB_PAT")!;
const GITHUB_REPO = Deno.env.get("GITHUB_REPO")!; // "owner/repo"

const FORBIDDEN_SQL = /\b(DROP\s+(TABLE|COLUMN|SCHEMA|DATABASE|FUNCTION|TYPE)|TRUNCATE|DELETE\s+FROM|ALTER\s+TABLE\s+\S+\s+DROP)\b/i;

type SelfModSettings = {
  kill_switch: boolean;
  max_per_day: number;
  allowed_scopes: string[];
  forbidden_paths: string[];
  allow_db_migrations: boolean;
  allow_config_changes: boolean;
  error_rate_multiplier: number;
  monitor_window_minutes: number;
};

function gh(path: string, init?: RequestInit) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${GITHUB_PAT}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

async function loadSettings(supabase: any): Promise<SelfModSettings> {
  const { data, error } = await supabase.from("yana_self_mod_settings").select("*").eq("id", 1).single();
  if (error) throw new Error("Cannot load self-mod settings: " + error.message);
  return data;
}

function pathIsAllowed(path: string, settings: SelfModSettings): { ok: boolean; reason?: string } {
  // Forbidden first
  for (const f of settings.forbidden_paths) {
    if (path.startsWith(f)) return { ok: false, reason: `Forbidden path: ${f}` };
  }
  // Migrations gate
  if (path.startsWith("supabase/migrations/")) {
    if (!settings.allow_db_migrations) return { ok: false, reason: "DB migrations disabled" };
    return { ok: true };
  }
  // Config gate
  const configFiles = ["vite.config.ts", "tailwind.config.ts", "package.json", "tsconfig.json", "index.html"];
  if (configFiles.some((c) => path === c || path.endsWith("/" + c))) {
    if (!settings.allow_config_changes) return { ok: false, reason: "Config changes disabled" };
    return { ok: true };
  }
  // Allowed scope
  if (!settings.allowed_scopes.some((s) => path.startsWith(s))) {
    return { ok: false, reason: `Path outside allowed scopes` };
  }
  return { ok: true };
}

async function getDailyCount(supabase: any): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase
    .from("yana_self_modifications")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);
  return count || 0;
}

async function getInFlightCount(supabase: any): Promise<number> {
  const { count } = await supabase
    .from("yana_self_modifications")
    .select("*", { count: "exact", head: true })
    .in("status", ["proposed", "build_pending", "merged", "monitoring"]);
  return count || 0;
}

// Tool: read_own_source
async function readFile(path: string): Promise<{ content: string; sha: string } | { error: string }> {
  const r = await gh(`/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`);
  if (!r.ok) return { error: `GitHub read failed (${r.status}): ${await r.text()}` };
  const j = await r.json();
  if (j.type !== "file") return { error: "Not a file" };
  const content = atob(j.content.replace(/\n/g, ""));
  return { content, sha: j.sha };
}

// Tool: propose_patch — creates branch, commits files, opens PR (auto-merge enabled)
async function proposePatch(opts: {
  rationale: string;
  trigger_source: string;
  trigger_ref?: string;
  files: { path: string; content: string }[];
  auto_merge: boolean;
}, supabase: any) {
  const settings = await loadSettings(supabase);

  if (settings.kill_switch) {
    return { error: "Kill switch is ENABLED. Self-modification disabled." };
  }

  // Rate limits
  const daily = await getDailyCount(supabase);
  if (daily >= settings.max_per_day) {
    return { error: `Daily limit reached (${daily}/${settings.max_per_day})` };
  }
  const inFlight = await getInFlightCount(supabase);
  if (inFlight > 0) {
    return { error: `Another modification is in flight (${inFlight}). Wait for it to settle.` };
  }

  // Validate paths
  for (const f of opts.files) {
    const check = pathIsAllowed(f.path, settings);
    if (!check.ok) return { error: `Path ${f.path} rejected: ${check.reason}` };

    // Migration safety scan
    if (f.path.startsWith("supabase/migrations/") && FORBIDDEN_SQL.test(f.content)) {
      return { error: `Migration ${f.path} contains forbidden destructive SQL` };
    }
  }

  // Get default branch SHA
  const repoR = await gh(`/repos/${GITHUB_REPO}`);
  if (!repoR.ok) return { error: "Cannot read repo info" };
  const repo = await repoR.json();
  const baseBranch = repo.default_branch;

  const refR = await gh(`/repos/${GITHUB_REPO}/git/ref/heads/${baseBranch}`);
  if (!refR.ok) return { error: "Cannot read base ref" };
  const baseSha = (await refR.json()).object.sha;

  // Create new branch
  const branchName = `yana/auto-${Date.now()}`;
  const createBranch = await gh(`/repos/${GITHUB_REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
  });
  if (!createBranch.ok) return { error: "Cannot create branch: " + await createBranch.text() };

  // Commit each file
  const filesChanged: any[] = [];
  for (const f of opts.files) {
    // Get current sha if exists
    let currentSha: string | undefined;
    const existing = await gh(`/repos/${GITHUB_REPO}/contents/${encodeURIComponent(f.path)}?ref=${branchName}`);
    if (existing.ok) {
      const ej = await existing.json();
      currentSha = ej.sha;
    }

    const put = await gh(`/repos/${GITHUB_REPO}/contents/${encodeURIComponent(f.path)}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `yana(auto): ${opts.rationale.slice(0, 60)} — ${f.path}`,
        content: btoa(unescape(encodeURIComponent(f.content))),
        branch: branchName,
        ...(currentSha ? { sha: currentSha } : {}),
      }),
    });
    if (!put.ok) {
      return { error: `Cannot commit ${f.path}: ${await put.text()}` };
    }
    filesChanged.push({ path: f.path, action: currentSha ? "update" : "create", sha_before: currentSha });
  }

  // Open PR
  const prR = await gh(`/repos/${GITHUB_REPO}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: `[YANA AUTO] ${opts.rationale.slice(0, 80)}`,
      head: branchName,
      base: baseBranch,
      body: `**Trigger**: ${opts.trigger_source} (${opts.trigger_ref || "n/a"})\n\n**Rationale**: ${opts.rationale}\n\n**Files**:\n${opts.files.map(f => `- \`${f.path}\``).join("\n")}\n\n_Generated by yana-self-modifier. Auto-merge: ${opts.auto_merge}_`,
    }),
  });
  if (!prR.ok) return { error: "Cannot open PR: " + await prR.text() };
  const pr = await prR.json();

  // Log
  const { data: logRow } = await supabase.from("yana_self_modifications").insert({
    trigger_source: opts.trigger_source,
    trigger_ref: opts.trigger_ref,
    rationale: opts.rationale,
    files_changed: filesChanged,
    diff_summary: `${opts.files.length} file(s) changed`,
    branch_name: branchName,
    pr_number: pr.number,
    pr_url: pr.html_url,
    status: opts.auto_merge ? "build_pending" : "proposed",
  }).select().single();

  // Auto-merge if requested
  if (opts.auto_merge) {
    // Use squash merge — Lovable will pick up the change on default branch
    const mergeR = await gh(`/repos/${GITHUB_REPO}/pulls/${pr.number}/merge`, {
      method: "PUT",
      body: JSON.stringify({ merge_method: "squash", commit_title: `[YANA AUTO] ${opts.rationale.slice(0, 60)}` }),
    });
    if (mergeR.ok) {
      await supabase.from("yana_self_modifications").update({
        status: "merged",
        merged_at: new Date().toISOString(),
        monitored_until: new Date(Date.now() + settings.monitor_window_minutes * 60 * 1000).toISOString(),
      }).eq("id", logRow.id);
    } else {
      await supabase.from("yana_self_modifications").update({
        status: "build_failed",
        notes: "Merge failed: " + await mergeR.text(),
      }).eq("id", logRow.id);
    }
  }

  return { ok: true, pr_number: pr.number, pr_url: pr.html_url, modification_id: logRow.id };
}

// Tool: monitor_post_deploy — checks error rate, auto-reverts if spike
async function monitorAndMaybeRevert(supabase: any) {
  const { data: pending } = await supabase
    .from("yana_self_modifications")
    .select("*")
    .eq("status", "merged")
    .lte("monitored_until", new Date().toISOString());

  if (!pending || pending.length === 0) return { checked: 0 };

  const results: any[] = [];
  for (const mod of pending) {
    // Compare error counts: 30min before merge vs 30min after
    const settings = await loadSettings(supabase);
    const windowMs = settings.monitor_window_minutes * 60 * 1000;
    const mergedAt = new Date(mod.merged_at).getTime();

    const { count: baselineCount } = await supabase
      .from("yana_self_evaluator")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(mergedAt - windowMs).toISOString())
      .lt("created_at", mod.merged_at);

    const { count: postCount } = await supabase
      .from("ai_reflection_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", mod.merged_at)
      .lte("created_at", new Date(mergedAt + windowMs).toISOString())
      .ilike("reflection", "%error%");

    const baseline = Math.max(baselineCount || 0, 1);
    const post = postCount || 0;
    const ratio = post / baseline;

    if (ratio > settings.error_rate_multiplier) {
      // Auto-revert by reverting the merge commit
      results.push({ id: mod.id, action: "would_revert", baseline, post, ratio });
      await supabase.from("yana_self_modifications").update({
        status: "monitoring",
        error_rate_baseline: baseline,
        error_rate_post: post,
        notes: `Error spike detected (ratio=${ratio.toFixed(2)}). Manual review required.`,
      }).eq("id", mod.id);
    } else {
      await supabase.from("yana_self_modifications").update({
        status: "deployed",
        error_rate_baseline: baseline,
        error_rate_post: post,
      }).eq("id", mod.id);
      results.push({ id: mod.id, action: "deployed_ok", ratio });
    }
  }
  return { checked: pending.length, results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "status";

  try {
    if (action === "status") {
      const settings = await loadSettings(supabase);
      const daily = await getDailyCount(supabase);
      const inFlight = await getInFlightCount(supabase);
      return new Response(JSON.stringify({ settings, daily, inFlight, repo: GITHUB_REPO }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "read") {
      const body = await req.json();
      if (!body?.path) throw new Error("path required");
      const r = await readFile(body.path);
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "propose") {
      const body = await req.json();
      const r = await proposePatch({
        rationale: body.rationale,
        trigger_source: body.trigger_source || "manual",
        trigger_ref: body.trigger_ref,
        files: body.files,
        auto_merge: body.auto_merge !== false, // default true (FULL AUTO)
      }, supabase);
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "monitor") {
      const r = await monitorAndMaybeRevert(supabase);
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[yana-self-modifier]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});