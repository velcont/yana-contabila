---
name: Gmail auto-responder
description: Per-user Gmail auto-reply system using OAuth + Lovable AI Gateway. Cron 5 min, drafts in Gmail.
type: feature
---
**Edge function**: `gmail-auto-responder` (verify_jwt=false), cron `gmail-auto-responder-every-5min` (*/5 min).
**Tables**: `gmail_responder_settings` (per user, modes: draft/auto_whitelist/auto_all), `gmail_responder_log`, `gmail_responder_examples` (few-shot).
**UI**: `/gmail-responder`. Reuses existing Google OAuth (`getValidAccessToken` from `_shared/google-calendar.ts`) — needs `gmail.send` + read scopes. Uses Gemini 2.5 Flash via Lovable AI Gateway.
**Default mode**: draft only (saves to Gmail Drafts, never auto-sends). Throttled by per-user `frequency_minutes`. Skips placeholder-laden replies (`[...]` regex).
