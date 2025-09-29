## Infinite Table: Pagination + Loading UX Plan

### TL;DR
- Adopt cursor-based pagination on the API and wire it in the client.
- Trigger next-page fetch via a near-bottom sentinel and show append skeletons using `isFetchingNextPage`.
- Add row virtualization with `@tanstack/react-virtual` for scale.
- Emit stable row IDs from the backend; stop randomizing per response.
- Fix JSON response encoding and align server page size defaults with the client.

---

### Current state (summary)
- Client uses `useInfiniteQuery` with offset-based paging (`start`, `size` default 50) and `keepPreviousData`.
- API loads the full snapshot, filters/sorts in-memory, slices a page, and returns cursors that are not used by the client.
- Row IDs are `crypto.randomUUID()` per request (unstable across refetches).
- We render column-aware skeleton rows:
  - Initial load: `skeletonRowCount = search.size`.
  - Pagination: append skeletons immediately when triggered.

### Current Redis access (summary)
- Provider discovery via `KEYS pricing:*:latest`, then per-provider `GET` (sequential).
- Writes use `pipeline()` (good); reads are not batched.
- Instances stored as many keys `pricing:{provider}:by_instance:{id}` and fetched individually.

### Risks / gaps
- In-memory sort and slice scales poorly and can skip/duplicate rows when data changes between requests.
- Cursors unused in client; offset math is brittle for dynamic data.
- Unstable row IDs hurt selection/memoization.
- No virtualization; DOM size grows with each page.
- API JSON uses `Response.json(SuperJSON.stringify(...))` (double-serialize risk).

---

## Plan

### Codebase cleanup & consistency
- Remove/rename the non-route file `src/components/infinite-table/api/route.ts` to avoid confusion with `src/app/api/route.ts` (only the latter is a real route).
- Remove unused helper defaults like `splitData(... size || 1000)` or align to 50 everywhere.
- Unify JSON handling for Redis values: either rely on Upstash client JSON de/serialization for both snapshots and instances or explicitly `JSON.stringify/parse` consistently.

### Step 1 — Client UX improvements (quick win)
1) Use query-native flags for append loading
   - Replace local "pending" with `isFetchingNextPage` to render append skeletons.
2) Prefetch with a sentinel
   - Add an IntersectionObserver sentinel row at the end of `<TableBody>`.
   - When visible and `hasNextPage && !isFetchingNextPage`, call `fetchNextPage()`.
3) Accessibility & consistency
   - Keep `aria-busy` for initial loads; avoid layout jumps by appending skeletons below existing rows.
   - Skeleton row count stays aligned with `search.size`.

Implementation notes
```tsx
// Append skeletons
{isFetchingNextPage && hasNextPage && (
  <RowSkeletons table={table} rows={skeletonNextPageRowCount ?? skeletonRowCount} />
)}

// Sentinel (simplified)
<TableRow ref={sentinelRef} aria-hidden />
// useEffect + IntersectionObserver: on intersect -> fetchNextPage()
```

### Step 2 — Cursor-based pagination (client + API)
Goal: correctness with changing datasets and simpler boundary logic.

- Client
  - `initialPageParam: { cursor: null, size }`
  - `getNextPageParam: (last) => last.nextCursor ?? null`
  - Add `cursor` into the serialized query string.

- API
  - Accept `cursor`, `size`, `direction`.
  - Sort at the source (Redis or upstream) and return a page window plus `nextCursor` / `prevCursor`.
  - Remove offset slicing pathway for forward pagination.

- Stable IDs
  - Emit a deterministic `id` from backend (e.g., hash of provider+model+config or a true primary key) and use `getRowId={(row) => row.id}`.

Response shape
```json
{
  "data": [ /* page rows */ ],
  "meta": { "totalRowCount": 12345, "filterRowCount": 678 },
  "nextCursor": 1717431140123,
  "prevCursor": 1717431000000
}
```

### Step 3 — Virtualization for scale
Use `@tanstack/react-virtual` to render only visible rows.
- Estimated row height + small overscan (e.g., 5–10) for smooth scroll.
- Works with sticky headers and our resizable columns (width via `getSize()`).

Implementation notes
```tsx
const rowVirtualizer = useVirtualizer({
  count: table.getRowModel().rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 34,
  overscan: 6,
});
```

### Step 4 — Backend performance & consistency
- Push sorting/pagination to Redis where possible:
  - Maintain ZSETs keyed by sort dimension; members reference a stable row key.
  - For cross-provider sorted views, materialize a merged ZSET (or compute via union/interleave if feasible) keyed by `observed_at` + tiebreaker.
- Align defaults: `size` fallback in API to 50 (not 1000) to match client.
- Fix JSON: return plain `Response.json(object)` (rows already serialize cleanly).

Redis data-access best practices (to implement)
- Replace `KEYS` usage:
  - Maintain a provider registry: `SADD pricing:providers <provider>` on write; read with `SMEMBERS pricing:providers`.
  - Alternatively, use `SCAN MATCH pricing:*:latest COUNT 1000` with an async iterator in batch.
- Batch reads:
  - Fetch all provider snapshots via `MGET` (if snapshot keys are simple values) or via a read `pipeline().get(...).exec()` to reduce round trips.
  - For instances, prefer a single hash: `HSET pricing:{provider}:instances {id} {json}` and batch with `HMGET`.
- Page at the source:
  - Use ZSETs to return only one page per request (`ZRANGE`/`ZREVRANGEBYSCORE` with cursor + tiebreaker), not the full dataset.
  - Return `nextCursor`/`prevCursor` from Redis and wire through to the client.

### Step 5 — Observability
- Log `queryKey`, `pageParam`, `rowsReturned`, `latencyMs`.
- Surface metrics for cache hit rates and time spent in sort/slice.

### Step 6 — Testing & rollout
- Unit test `getNextPageParam` and cursor arithmetic.
- Integration tests for sentinel-prefetch and append skeleton rendering.
- Load test against large datasets with virtualization enabled.
- Roll out behind a flag: enable cursor API + client wiring progressively.

---

## Acceptance criteria
- No visible flicker during initial or append loads; skeletons appear instantly.
- Cursor-based pagination returns consistent pages under concurrent updates.
- Stable row selection persists across refetches.
- Virtualization keeps scroll smooth with >50k rows fetched cumulatively.
- API responses are correctly JSON-encoded; page size defaults match the client.
- Redis
  - No `KEYS` usage in hot paths; discovery via `SMEMBERS` or batched `SCAN`.
  - Reads are batched (MGET/pipeline/HMGET); single page is read from Redis per request.
  - ZSET-driven cursor pagination proved under load tests.

---

## Additional best‑practices refinements

TanStack Table
- Set explicit server-driven flags: `manualSorting: true` (now) and `manualPagination: true` once cursor paging ships. Keep `getSortedRowModel` disabled to avoid accidental client sorting.

Stable identifiers
- Persist a deterministic `id` for each row at write time (e.g., composite of provider/model/config or a full SHA-256). Avoid truncation to minimize collision risk. Use this in `getRowId`.

Next.js runtime considerations
- Stay on the Node runtime while hashing server-side, or if moving the infinite-table route to Edge, switch to Web Crypto (`crypto.subtle.digest`) or precompute IDs at write time.

API protection
- Add rate limiting (e.g., Upstash Ratelimit) on `/api` and pricing/infinite-table endpoints to protect cursor paging and provider discovery.

Redis cursor design details
- For ZSETs, use a deterministic tiebreaker: score = `observed_at` (or primary sort metric); member = `${observed_at}:${stableId}` so pagination is stable when scores match.

Virtualization defaults
- When adopting `@tanstack/react-virtual`, start with `estimateSize: 34` and `overscan: 5–10`, then tune via profiling to minimize layout thrash.

Caching headers
- Keep cache headers on snapshot endpoints; avoid caching or set very low TTL on cursor endpoints to maintain freshness while still enabling CDN edge behavior where safe.

## Open questions
- Which sort modes must be supported server-side from day one (price, VRAM, vCPUs, observed_at)?
- How frequently does the pricing snapshot update, and do we need snapshot isolation per request?
- Are there compliance or retention constraints that affect materialized views in Redis?

## Suggested implementation order
1) Step 1 (client UX) — smallest risk, immediate UX improvement.
2) Step 2 (cursor API) — correctness + scalability.
3) Step 3 (virtualization) — performance under load.
4) Step 4+ (backend perf/observability) — ongoing hardening.


