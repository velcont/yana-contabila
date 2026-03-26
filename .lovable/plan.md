

# Fix: TLS Handshake Error in Business Diagnostic

## Problem
The `generate-business-diagnostic` edge function fails with "tls handshake eof" when calling the AI gateway. This is a transient network error in the edge runtime — the connection drops before TLS completes. The user sees a raw error message instead of a friendly retry prompt.

## Solution
Add retry logic (up to 3 attempts with short delays) to the AI gateway fetch call in the edge function, and improve the error message shown to users when all retries fail.

## Changes

### 1. `supabase/functions/generate-business-diagnostic/index.ts`
- Wrap the `fetch()` call to `ai.gateway.lovable.dev` in a retry loop (3 attempts, 1s delay between retries)
- On final failure, return a user-friendly Romanian error message instead of the raw TLS error
- Pattern: simple `for` loop with try/catch around the fetch, break on success

### 2. `src/components/demo/BusinessDiagnostic.tsx`
- Verify error display handles the retry gracefully (already has "Incearca din nou" button — confirm it works)

## Technical Detail
The TLS handshake EOF is a known transient issue in Deno edge runtime cold starts. A single retry almost always succeeds. Three retries with 1-second delays provides robust coverage without significant latency increase (user already waits 3-8s for AI response).

