## Caching and Revalidation Plan

### Goals
- Reduce server invocations and latency by leveraging Next.js caching layers and CDN.
- Keep data fresh immediately after the daily (or ad-hoc) scraping job.
- Avoid client re-fetch churn with sensible client cache settings.
- No automatic client refresh; users can manually refresh to see new data.

### Scope (files to touch)
- API Route Handlers: `src/app/api/route.ts`, `src/app/api/pricing/route.ts`, `src/app/api/infinite-table/route.ts` (if used), and related GET endpoints.
- Scrape job endpoint: `src/app/api/jobs/scrape/route.ts` (trigger revalidation on success).
- SSR prefetch: `src/components/infinite-table/query-options.ts` (server `fetch()` options).
- Optional compute caching inside API: wrap filtering/sorting/faceting in `unstable_cache`.
- Optional client cache tuning: `src/providers/react-query.tsx` (React Query `staleTime`).

---

### 1) Route Handler caching (time-based ISR for GET)
- Remove dynamic bypassing on GET handlers you want cached.
  - Remove: `export const dynamic = "force-dynamic"` (on GET).
  - Prefer: `export const revalidate = 900` (15m) at the top of GET files.
  - Alternatively: `export const dynamic = 'force-static'` (static by default, still compatible with time-based revalidation via `fetch(..., { next: { revalidate } })`).

Example (at the top of `src/app/api/route.ts`):
```ts
export const revalidate = 900; // 15 minutes
```

Docs: [Revalidate Cached Data in a Route Handler](https://nextjs.org/docs/app/api-reference/file-conventions/route#revalidate) and [Route Handlers caching](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#caching).

---

### 2) Tag and cache server fetches (Next Data Cache)
- Wherever we `fetch` on the server (SSR prefetch or inside Route Handlers), opt into Data Cache with time-based revalidation and a shared tag, e.g. `'pricing'`.

Example (in `src/components/infinite-table/query-options.ts`):
```ts
const response = await fetch(`/api${serialize}`, {
  next: { revalidate: 900, tags: ['pricing'] },
});
```

Docs: [fetch revalidate](https://nextjs.org/docs/app/building-your-application/caching#time-based-revalidation) and [tags](https://nextjs.org/docs/app/building-your-application/caching#cache-tagging).

---

### 3) On-demand revalidation after scraping (instant freshness)
After the cron scrape stores new data in Redis, invalidate cached entries immediately:

- In `src/app/api/jobs/scrape/route.ts` (on success):
```ts
import { revalidateTag, revalidatePath } from 'next/cache';

if (wasUpdated) {
  // Invalidate all data fetches and cached functions tagged with 'pricing'
  revalidateTag('pricing');
  // Invalidate Route Handler caches serving API consumers
  revalidatePath('/api');
  revalidatePath('/api/pricing');
  revalidatePath('/api/infinite-table');
}
```

Docs: [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) and [revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).

---

### 4) Cache compute inside API with `unstable_cache` (optional, recommended)
Wrap the flatten → filter → sort → facet → paginate pipeline to avoid recomputing for identical inputs within TTL.

```ts
import { unstable_cache } from 'next/cache';

const getPageCached = unstable_cache(
  async (key: string) => {
    // 1) read snapshots
    // 2) flatten GPU rows
    // 3) filter/sort/facet/paginate
    // 4) return result object
  },
  ['api:page'],
  { revalidate: 900, tags: ['pricing'] }
);

const key = JSON.stringify(search /* normalized */);
const result = await getPageCached(key);
```

Docs: [`unstable_cache`](https://nextjs.org/docs/app/api-reference/functions/unstable_cache).

---

### 5) CDN cache headers (Vercel edge/CDN)
Add friendly headers to API responses so the CDN serves hot paths without invoking the function when possible. This complements Next Data Cache.

```ts
return Response.json(payload, {
  headers: {
    'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=86400',
  },
});
```

Notes:
- Keep `no-store` for mutation endpoints (e.g., `POST /api/jobs/scrape`).
- GET handlers that export `revalidate` can still emit `Cache-Control` for CDN wins.
- CDN vs Data Cache interplay: `revalidateTag` invalidates Next Data Cache/path caches, but the CDN may still serve cached responses until `s-maxage` expires. Use shorter CDN TTLs on highly dynamic/filtered endpoints to ensure quicker edge freshness.

---

### 6) Client cache (React Query)
Set a non-zero `staleTime` so navigations/remounts don’t spam the API while server/CDN caches are effective.

Example (in `src/providers/react-query.tsx`):
```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (tune 5–15m)
      refetchOnWindowFocus: false,
    },
  },
});
```

---

### 7) TTL guidance (tune per traffic & freshness)
- Route/Data caches: `revalidate = 900` (15m) to start.
- CDN (filtered API like `/api`): `s-maxage=60–180` to avoid edge staleness after on-demand invalidation.
- CDN (low-cardinality endpoints like `/api/pricing`): `s-maxage=300–900`, optional `stale-while-revalidate=3600`.
- React Query: `staleTime = 5–15m`.
- Immediately call `revalidateTag('pricing')` and `revalidatePath(...)` after a successful scrape (so freshness isn’t strictly bound to the 15m TTL).

---

### 8) Rollout steps
1. Add `export const revalidate = 900` to GET route handlers; remove `force-dynamic`.
2. Add `next: { revalidate: 900, tags: ['pricing'] }` to server `fetch` calls.
3. Add CDN `Cache-Control` headers to API JSON responses.
4. In scrape job, call `revalidateTag('pricing')` and `revalidatePath(...)` when `wasUpdated`.
5. (Optional) Wrap API compute in `unstable_cache` with `tags: ['pricing']` and `revalidate: 900`.
6. Set React Query `staleTime` to 5–15 minutes.
7. Verify logs show fewer invocations; monitor latency and cache hit rates; adjust TTLs.

---

### 9) Validation & monitoring
- Check API latency and function invocations in Vercel dashboard pre/post change.
- Inspect headers on responses (`x-vercel-cache`, `Cache-Control`).
- Confirm immediate freshness after a scrape by verifying responses change and cache is purged.

---

### 10) Risks & notes
- Ensure only GET routes are cached; keep mutations `no-store` and dynamic.
- Tag names are contract: use a single source of truth (e.g., `'pricing'`) everywhere.
- Over-caching can mask data drift; keep the on-demand revalidation in the scrape job.
- Cache cardinality: Avoid caching every permutation of filters. Prefer caching the heavy base (flattened snapshots, provider-version keyed) and performing cheap per-request filter/sort/slice on top.
- Client freshness: No auto-refresh is required. Keep `refetchOnWindowFocus: false` and use a moderate `staleTime` (e.g., 10–15m). After a scrape, server caches are revalidated (via tags/paths); users will see fresh data on navigation or manual reload.
- SSR prefetch: Server calls to `/api` via `fetch` still incur an HTTP hop. Optional: for SSR paths, call the internal compute directly to bypass HTTP while keeping the public API unchanged.

---

### Reference docs
- Route Handlers caching & `revalidate`: [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#caching)
- Time-based revalidation for `fetch`: [Caching](https://nextjs.org/docs/app/building-your-application/caching#time-based-revalidation)
- Cache Tagging & `revalidateTag`: [Cache Tagging](https://nextjs.org/docs/app/building-your-application/caching#cache-tagging)
- `revalidatePath`: [API Reference](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- `unstable_cache`: [API Reference](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)


