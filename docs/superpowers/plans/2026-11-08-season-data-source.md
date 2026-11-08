# Season Data Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real season data reaches `/api/season`. A scheduled GitHub Action builds the snapshot and writes it to Workers KV, because Jolpica rejects every request from the Worker with 429s.

**Architecture:**
- **Why move the fetch.** Jolpica sits behind Cloudflare and rate-limits Workers egress:
  - every cron run since deploy failed (10:00, 10:30 and 11:00 UTC on 2026-11-08);
  - the same request from a laptop returns 200.
- **The script.** A Bun script reuses `refreshSnapshot` unchanged. Only the `SnapshotStore` underneath it changes, to a `KVText` built on Cloudflare's KV REST API.
- **The Worker** keeps serving `/api/season` from KV and loses its cron trigger.

**Tech Stack:**
- Bun 1.4 and Effect v4 (`FetchHttpClient`).
- GitHub Actions: `oven-sh/setup-bun@v2`, pinned by commit SHA.
- The Cloudflare KV REST API: `PUT /accounts/{account_id}/storage/kv/namespaces/{namespace_id}/values/{key_name}`.

**Spec:** `docs/superpowers/specs/2026-11-07-f1-fan-site-design.md` (zero cost, live season data).

## Global Constraints

- Zero cost. Run hourly at minute 7: `7 * * * *`. Also allow `workflow_dispatch`.
- Jolpica requests send `User-Agent: LightsOutFanSite/0.1 (personal project)`.
- Pin `KEY 'season:v1'` and the snapshot encoding. Both come from `src/season/store.ts`; never duplicate them.
- **Secret.** Only `CLOUDFLARE_API_TOKEN`, a token with **Workers KV Storage: Edit** on account `25fa0f27992016edcaf8e040e67fe2ba` and nothing else.
  - Praffi creates it and stores it as a repo secret.
  - The token never appears in code, logs or chat.
- **Not secret.** The account ID and namespace ID `633469db86874a8995c6a05239e3288f` go in the workflow file as plain values.
- No comments in code, no type assertions, and `bun run lint` passes.
- Ask before each commit, and before any push or deploy.

## Review Focus

1. **Jolpica fails in the Action.** Expected: KV keeps the previous snapshot, the job exits 1 (red run, GitHub emails Praffi), and the log names the failing path and HTTP status. Test in Task 1.
2. **The KV write fails** (bad token, 403). Expected: the job exits 1 and the log shows the status without the token. Test in Task 1.
3. **Encoding drift.** Expected: what the script writes decodes with the Worker's own `SnapshotStore.read`. Test in Task 1.

---

### Task 1: Refresh script with a REST-backed store

**Files:**
- Create: `tools/refresh-season.ts`, `src/season/kv-rest.ts`
- Modify: `src/season/refresh.ts` (log the error's `path` and the HTTP status, not just the message)
- Test: `test/season/kv-rest.test.ts`, `test/season/refresh.test.ts`

**Interfaces:**
- Consumes:
  - `refreshSnapshot(now)`;
  - `SnapshotStore.fromKV(kv: KVText)`;
  - `JolpicaClient.layer`.
- Produces:
  - `kvRest({ accountId, namespaceId, token, fetch }) => KVText`, where `put` throws `KVWriteError` with `status` on any non-2xx, and `get` returns null on 404;
  - `tools/refresh-season.ts`, which exits 0 on `'written'` and 1 on `'kept-previous'` or a KV error.

- [ ] **Step 1: Write the failing tests.**
  - `kvRest`:
    - `put` sends `PUT …/values/season%3Av1` with the token as a Bearer header and the body unchanged;
    - `put` on a 403 rejects with `status: 403`, and the error message does not contain the token;
    - `get` on a 404 returns null.
  - Round trip: `SnapshotStore.fromKV(kvRest(fakeFetch))` writes the fixture snapshot, and the same store's `read` decodes it equal to the fixture.
  - `refresh.test.ts`: when Jolpica fails, the logged message contains `/current/races/?limit=100` and `429`.
- [ ] **Step 2: Run** `bun test test/season`. Expected: FAIL, `kv-rest.ts` not found.
- [ ] **Step 3: Implement.**
  - **Error log** in `refresh.ts`: `Effect.logError('Season refresh failed, keeping the previous snapshot', { path: error.path, cause: String(error.cause) })`.
  - **Script.** It reads `CLOUDFLARE_API_TOKEN`, `CF_ACCOUNT_ID` and `CF_KV_NAMESPACE_ID` from env and exits 1 naming the first one that's missing. Then it runs `refreshSnapshot(new Date())` with `JolpicaClient.layer` (FetchHttpClient) and `SnapshotStore.fromKV(kvRest(...))`.
- [ ] **Step 4: Run** `bun test && bun run lint`. Expected: all pass.
- [ ] **Step 5: Commit** (ask first): `feat(season): a script refreshes the season snapshot into KV from outside Workers`

### Task 2: Scheduled workflow, and the Worker loses its cron

**Files:**
- Create: `.github/workflows/season.yml`
- Modify: `src/server.ts` (remove `scheduled`), `wrangler.jsonc` (remove `triggers`)

- [ ] **Step 1: Write the workflow.**
  - Triggers: `schedule: - cron: '7 * * * *'` and `workflow_dispatch`.
  - `permissions: contents: read`, and `concurrency: season` with `cancel-in-progress: false`.
  - Steps: checkout, setup-bun (both pinned by SHA), `bun install --frozen-lockfile`, then `bun tools/refresh-season.ts` with env:
    - `CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}`;
    - `CF_ACCOUNT_ID`;
    - `CF_KV_NAMESPACE_ID`.
- [ ] **Step 2:** Remove the Worker's `scheduled` handler and the cron trigger. Delete any imports left unused.
- [ ] **Step 3: Run** `bun test && bun run lint && bun run build`. Expected: all pass.
- [ ] **Step 4: Run locally (Praffi's call).** Run `CLOUDFLARE_API_TOKEN=… CF_ACCOUNT_ID=… CF_KV_NAMESPACE_ID=… bun tools/refresh-season.ts` from Praffi's machine. Expected: exit 0. Then `curl https://lights-out.prafficoding.workers.dev/api/season` returns 200 JSON with `season: 2026`.
- [ ] **Step 5: Commit, push and deploy (ask first).**
  - Commit: `ci(season): an hourly GitHub Action keeps the season snapshot fresh`.
  - After the push, trigger the workflow once with `gh workflow run season.yml` and watch it go green.
  - Deploy the Worker without its cron.
