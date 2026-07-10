---
name: perf-audit
description: Scan backend and frontend code for slow-loading or inefficient code paths (oversized files, N+1 queries, in-memory filtering that should happen at the DB level, unbundled heavy scripts), report findings, then apply targeted fixes. Use when the user asks to make the site/app "faster", audit performance, or find "heavy"/"slow" code.
---

# Perf Audit

## Instructions

### Step 1: Scan for common inefficiency patterns
- **Database**: queries inside loops (N+1), `->all()`/`SELECT *` followed by in-memory `filter`/`where` that could be pushed into the query, missing eager-loading (`with()` in Eloquent, `.select_related`/`.prefetch_related` in Django, etc.), missing indexes on frequently-filtered columns.
- **Assets**: large unbundled/unsplit JS or CSS files served on every page load, images not lazy-loaded or unoptimized, blocking synchronous scripts in `<head>`.
- **File size as a smell**: very large single files often correlate with the above — cross-reference with a size scan.

Use Grep for query patterns (loop constructs near ORM calls) and Glob/size checks for asset bloat rather than reading every file.

### Step 2: Report findings before fixing
Produce a concise findings list: file/location, the specific inefficiency, and estimated impact (e.g. "N+1 query loads one row per mentor in a loop — O(n) queries on a page with 50 mentors"). Share this with the user if the fix set is nontrivial, so they can prioritize.

### Step 3: Apply targeted fixes
- Move filtering to the database (query scopes, `WHERE` clauses, indexes) instead of `array_filter`/in-memory loops.
- Add eager-loading for relations accessed in loops.
- Split/bundle heavy scripts appropriately (defer, code-split, lazy-load below-the-fold assets).
- Fix one category at a time and keep changes scoped to the identified inefficiency — don't refactor unrelated code while in here.

### Step 4: Verify improvement
Where feasible, show before/after evidence: query count, page load time, or bundle size. If the project has logging/query-count tooling (e.g. Laravel Debugbar, browser devtools network tab), use it to confirm the fix actually helped rather than assuming.
