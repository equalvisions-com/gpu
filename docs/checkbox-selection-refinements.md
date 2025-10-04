# Checkbox selection and details pane: refinements

This document captures refinements and best practices for our table interactions where:

- Row click selects a single row (opens the details pane).
- A separate checkbox per row toggles a “checked” highlight without side-effects.

The implementation follows TanStack Table, React, and Next.js guidance for enterprise-grade UX, performance, and maintainability.

## Current design (summary)

- TanStack `rowSelection` is reserved for the details pane (single-select via row click or Enter key).
- Independent `checkedRows: Record<string, boolean>` drives checkbox-only highlight.
- Column cell uses a small React component to run hooks (Rules of Hooks compliant).
- `MemoizedRow` renders receive `selected` and `checked` props; `React.memo` comparator includes both to re-render only affected rows.
- Virtualization uses stable keys (`row.id`) and measured row heights.

## Cross-check with vendor docs

- TanStack Table
  - Use `getRowId` for stable row identity.
  - Hoist controlled state externally; limit table features to their intent (keep `rowSelection` for selection).
  - Access shared utilities via `table.options.meta` or external context.
- React
  - Controlled checkboxes (`checked` + `onChange`/`onCheckedChange`).
  - Rules of Hooks respected: hooks live in React components, not plain cell functions.
  - Targeted re-renders: include visual drivers (e.g., `checked`) in memo comparators.
- Next.js (App Router)
  - Interactive components are client components; no SSR-dependent UI state.

## Recommended refinements

1) Multi-check and bulk actions (optional)
- Support multi-checked operations with a bulk toolbar (count, clear, action buttons).
- Keep details pane single-select via row click to avoid UX conflicts.

2) Header checkbox (scoped)
- If needed, provide a header checkbox that toggles only visible/current-batch rows.
- Avoid cross-dataset “Select All” without backend support. Clarify scope in UI copy.

3) Persistence
- If persistence is desired, store `checkedRows` in `localStorage` keyed by dataset signature (e.g., provider + filter hash) or in the URL when the set is small.
- Rehydrate on mount; prune stale ids when data changes.

4) Keyboard and a11y
- Row: `tabIndex={0}`, `aria-selected={selected}`, Enter toggles selection (opens details).
- Checkbox: focusable; Space toggles; add `aria-label` or associate with row label.
- Add Escape to close the details pane and restore focus to the active row.

5) Testing
- Unit
  - Row click sets selection and opens details; checkbox toggles only highlight.
  - `MemoizedRow` comparator: changing `checked` triggers re-render; unrelated rows don’t re-render.
- E2E
  - Virtualized list retains checked state while scrolling/paginating.
  - Header checkbox (if enabled) toggles only visible rows.

6) Performance notes
- Keep `checkedRows` as a map for O(1) reads.
- Pass `checked` down as a prop and include it in `React.memo` comparator to avoid unnecessary row updates.
- Avoid reading large maps in every cell render; compute once per row when mapping virtual items.

7) Virtualization semantics
- Keys: use `row.id` from `getRowId`. If row contents can change height based on `checked`, ensure the virtualizer re-measures via the provided `rowRef`.
- For “Select All visible,” operate on the current virtual items (or all rows in the current model) to avoid O(n) beyond what’s visible.

8) Types and meta surface
- Extend `react-table.d.ts` for any meta callbacks exposed through `table.options.meta`.
- Keep provider props minimal; expose mutations via provider or meta (avoid tight coupling in cell functions).

## Usage patterns (do/don’t)

- Do: call hooks from small leaf components rendered by cells (e.g., `<RowCheckboxCell/>`).
- Do: stop event propagation inside the checkbox cell so it doesn’t trigger row click.
- Don’t: mix `rowSelection` for multiple concerns (details + highlight). Keep concerns separate.
- Don’t: use row indices as keys; always use `getRowId` with stable ids.

## Example: header checkbox (visible-only)

Pseudo-code outline (adapt to your UI layer):

```tsx
header: ({ table }) => {
  const virtualRows = /* your virtualizer’s visible rows */
  const allVisibleChecked = virtualRows.every(v => checkedRows[v.id])
  const someVisibleChecked = !allVisibleChecked && virtualRows.some(v => checkedRows[v.id])
  const onToggle = (next?: boolean) => {
    const target = typeof next === 'boolean' ? next : !allVisibleChecked
    batchUpdate(virtualRows.map(v => v.id), target)
  }
  return <Checkbox checked={allVisibleChecked} onCheckedChange={onToggle} indeterminate={someVisibleChecked} />
}
```

Where `batchUpdate(ids, target)` sets or clears entries in `checkedRows` for provided ids in one immutable update.

---

These refinements keep the implementation predictable, accessible, and performant under virtualization, while complying with TanStack Table, React, and Next.js standards.


