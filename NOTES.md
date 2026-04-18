# Session Notes — 2026-04-18

Notes on removing the Live Loading feature and making the delivery destinations list user-manageable.

---

## 1. Summary

Two discrete deliverables this session:

- **Live Loading removed** — the `/live-loading` page, its entry-point `SavedOrdersModal`, the `View Orders` button on the home page, and all conditional layout plumbing were deleted. The Supabase `load_sessions` table is now orphaned but left in place per user choice (historical migrations intact).
- **Destinations are now user-managed** — the hardcoded 11-entry depot list that previously lived duplicated in `OrderForm.tsx` and `gemini.ts` is now a Supabase-backed table with add/delete UI in a modal. The existing 11 names are seeded by the new migration.

---

## 2. Feature removal — Live Loading

### Context
The feature had two UI entry points: the `View Orders` button on the home page (opened `SavedOrdersModal`), and every order card plus the `Live Loading` button inside that modal (all navigated to `/live-loading`). The modal had no use independent of Live Loading — `OrdersList` on the home page already shows every order with richer controls (edit, delete, print, export, bulk delete).

### Deleted
- `src/pages/LiveLoadingPage.tsx` (~42 KB, 1058 lines) — the entire tracker page, including Supabase `load_sessions` session management, progress persistence, stale-session cleanup, and the multi-step loading UI.
- `src/components/SavedOrdersModal.tsx` (~6 KB) — the Live Loading gateway modal.

### Edited
- `src/App.tsx` — removed `LiveLoadingPage` import and the `<Route path="/live-loading">` block.
- `src/pages/HomePage.tsx` — removed the `View Orders` button, `SavedOrdersModal` render, `showSavedOrders` state, and the now-unused `Button` and `Archive` imports. Also simplified the `ProfileSelector` card: the container used to be a two-child flex row (ProfileSelector + View Orders); it is now a single-child flex with `justify-center sm:justify-start` so the profile pill shrinks to its content width instead of stretching the full page.
- `src/components/layout/MainLayout.tsx` — removed the `isLiveLoading` constant and its conditional branches (the `mb-6` toggle on the header, the `hidden` class on the page-title span, and the Live Loading case inside `getPageTitle()`).
- `src/hooks/useRouteState.ts` — dropped `/live-loading` from `validRoutes`. Any stale `lastRoute` saved in localStorage pointing there is now automatically redirected to `/`.

### Intentionally untouched
- `supabase/migrations/20250205021053_teal_band.sql` and `20250205023552_turquoise_bush.sql` — the `load_sessions` table's create + RLS-disable migrations stay intact. The table is now orphaned; no app code touches it.
- `react-router-dom`, `framer-motion`, `lucide-react` deps — still used elsewhere, left in `package.json`.

### Verification
- `rg -n "live-loading|LiveLoading|liveLoadingState|SavedOrdersModal|showSavedOrders"` across `src/` → no matches.
- `ReadLints` on all edited files → no new errors.
- `npm run build` → exit 0. Bundle went from ~321 KB gzip to **315.92 KB gzip** (~5 KB smaller).

---

## 3. Feature addition — Manageable destinations

### Context
The 11 depot names (`ARNDELL`, `BANYO`, `SALISBURY`, `DERRIMUT`, `MOONAH`, `JANDAKOT`, `GEPPS CROSS`, `BARON`, `SHEPPARTON`, `EE-FIT`, `CANBERRA`) lived hardcoded in **two** places that had to stay in sync:

1. `src/components/OrderForm.tsx` — select dropdown options + the custom-fallback equality check when loading an existing order for edit.
2. `src/lib/gemini.ts` — the prompt's "known locations" enumeration **and** the post-parse `knownDestinations` normalizer that collapses Gemini's extracted suburb (e.g. `"BARON WAREHOUSE"` → `"BARON"`).

Adding a new depot without updating both places would silently break normalization on PDF imports.

### Architectural decisions
Locked in up front with the user:
- **Storage**: Supabase table, globally shared across profiles/machines (matches how `orders`, `profiles`, `product_data` work; destinations are business data, not user preferences).
- **UI**: small "Manage" affordance next to the Destination dropdown label opens a modal. Matches the `ProfileSelector` → `ProfileModal` pattern.

### Added
- `supabase/migrations/20260418000001_create_destinations.sql`
  - `destinations` table: `id uuid PK`, `name text UNIQUE NOT NULL`, `created_at timestamptz`.
  - Seeds the 11 original entries with `ON CONFLICT (name) DO NOTHING` so re-runs are safe.
  - No RLS — matches every other table (`orders` and `load_sessions` RLS were explicitly disabled earlier; `profiles` and `product_data` never had any).
- `src/hooks/useDestinations.ts` — modeled on `useProfiles`. `fetch`, `createDestination`, `deleteDestination`. Auto-seeds from code if the table exists but is empty (same safety-net pattern as `useProductData`). Normalizes names to `UPPERCASE` on create, with client-side duplicate check in addition to the DB unique constraint.
- `src/components/DestinationsModal.tsx` — uses `ModalTransition` for the same drawer aesthetic as `ProfileModal`. Input + list + per-row delete with a confirmation overlay. Notes explicitly that existing orders are unaffected by deletion.
- `src/types.ts` — new `Destination` interface (`id`, `name`, `created_at?`).

### Edited
- `src/App.tsx` — calls `useDestinations()`; threads `destinations` + `onCreateDestination` + `onDeleteDestination` into `HomePage`.
- `src/pages/HomePage.tsx` — new props added to `HomePageProps`; forwards `destinations` to `PDFAnalyzer` and all three props to `OrderForm`.
- `src/components/OrderForm.tsx` — hardcoded `DESTINATIONS` const deleted. Dropdown options now render from the `destinations` prop. A small `Settings2` "Manage" button sits next to the Destination label and opens `DestinationsModal`. Edit flow still falls back to the custom-destination input if the stored destination is no longer in the list, so no existing order is broken by a later deletion.
- `src/components/PDFAnalyzer.tsx` — accepts `destinations` prop, passes `destinations.map(d => d.name)` into `analyzePDFContent`.
- `src/lib/gemini.ts` — `analyzePDFContent(base64PDF, productData, destinations)` now takes the list as a third (required) parameter. The prompt's "known locations (…)" enumeration is built from it, and the post-parse `knownDestinations` local is derived from it too — sorted longest-first so a shorter overlapping entry (e.g. a future `BAR`) can't outrank a longer match (`BARON`). Small robustness improvement over the previous implementation, which used insertion order.

### Data model note
`orders.destination` is still a plain string on the `orders` table — there's no FK from `orders` to `destinations`. Deleting a destination therefore cannot break existing orders; they just keep whatever string they were saved with, and the edit flow auto-routes them into the custom-destination input if you ever re-open them.

### Verification
- `rg` for hardcoded names (`ARNDELL|BANYO|...`) across `src/` → only expected hits remain: the `DEFAULT_DESTINATIONS` fallback constant inside `useDestinations.ts`, and the now-dynamic `knownDestinations` local in `gemini.ts`.
- `ReadLints` on all new/edited files → no errors.
- `npm run build` → exit 0. Bundle at **317.28 KB gzip** (+~1.4 KB over the post-Live-Loading baseline — modal component + hook).

---

## 4. One-time action required by the user

The destinations migration must be applied to the production Supabase project before the UI is fully functional. Either:

```bash
supabase db push
```

…or paste `supabase/migrations/20260418000001_create_destinations.sql` into the Supabase SQL editor. Until this runs, `useDestinations` will fail to fetch (table does not exist), the dropdown will only show "Other…", and the Manage modal will show an error state.

---

## 5. Notes on the earlier (2026-04-17) section below

The historical session notes preserved below are factually out of date in two spots after this session:

- §1 "Key files" lists `src/pages/LiveLoadingPage.tsx` — that file no longer exists.
- The opening tagline ("…and track live loading") is no longer accurate.

The content is otherwise preserved verbatim as a historical record of the Gemini SDK migration / repo cleanup.

---

# Session Notes — 2026-04-17

Notes on the Gemini SDK upgrade, model change, and repo cleanup done in this session.

---

## 1. Codebase at a glance

**Fletcher Order Summary App** — internal tool for staff to enter Fletcher Insulation delivery manifests, extract products/destinations from PDF manifests, and track live loading.

### Stack
- **React 18 + TypeScript** bundled by **Vite 5**
- **Tailwind CSS 3** for styling
- **framer-motion** for animations, **react-transition-group** for one legacy transition
- **lucide-react** for icons
- **react-router-dom v6** for routing
- **Supabase** (`@supabase/supabase-js`) for backend — orders, profiles, product data, Postgres migrations in `supabase/migrations/`
- **Google Gemini** (`@google/genai`) for PDF → structured-order extraction
- **Netlify** for hosting (single-page redirect to `index.html` in `netlify.toml`)

### Key files
| File | Purpose |
|---|---|
| `src/lib/gemini.ts` | Sends PDF base64 + prompt to Gemini, parses JSON response into an `Order` |
| `src/lib/supabase.ts` | Supabase client setup, reads `VITE_SUPABASE_*` env vars |
| `src/pages/HomePage.tsx` | Main UI — file upload, order form, orders list |
| `src/pages/LiveLoadingPage.tsx` | Live loading tracker with real-time sync |
| `src/components/PDFAnalyzer.tsx` | Drag-and-drop PDF upload + Gemini analyze loop |
| `src/hooks/useOrders.ts`, `useProfiles.ts`, `useProductData.ts` | Supabase-backed state hooks |

### Required env vars (`.env` at repo root, gitignored)
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...
```

A populated template lives in `.env.example`.

---

## 2. Problems diagnosed & fixed today

### Problem A — Gemini rate limiting on `gemini-2.5-flash`

- App was on `gemini-2.5-flash` with no retry/backoff.
- `PDFAnalyzer` loops through PDFs back-to-back with no delay.
- On the free tier, `gemini-2.5-flash` is mid-pack on RPM/RPD; bursts trigger 429.
- Researched free-tier quotas — recommended moving to `gemini-2.5-flash-lite` (higher RPM/RPD) or newer 3.x previews.

### Problem B — `404 "model not found for API version v1"` after updating model string

Error seen in production:

```
models/gemini-3.1-flash-lite-preview is not found for API version v1
```

**Root cause:** the installed `@google/generative-ai@^0.2.0` SDK calls the **`v1`** Generative Language API surface. `gemini-3.1-flash-lite-preview` is only registered on **`v1beta`**.

**Verification via ListModels:**

- Authenticated with the API key from the browser DevTools console (the key has HTTP referrer restrictions so shell calls were blocked).
- `v1beta`: returned 36 generateContent models including `gemini-3.1-flash-lite-preview`.
- `v1`: returned 7 models (2.0 / 2.5 family only).

**Fix — SDK migration:**

- Uninstalled `@google/generative-ai`.
- Installed `@google/genai@^1.50.1` (current official successor, defaults to `v1beta`).
- Rewrote `src/lib/gemini.ts`:
  - `new GoogleGenAI({ apiKey })` instead of `new GoogleGenerativeAI(key)`
  - `ai.models.generateContent({ model, contents })` with explicit `{ text }` and `{ inlineData }` parts
  - `response.text` (property) instead of `response.text()` (method)
- Pulled the model string into a top-level constant (`GEMINI_MODEL`) for easy swapping.

### Problem C — `403` with referrer restriction on the API key

When testing ListModels from shell, hit `API_KEY_HTTP_REFERRER_BLOCKED`.

**Confirmed** the Google Cloud key restriction allowlists `https://fletcher-ordersummary.netlify.app/`. The key is correctly locked to production. The new SDK request path validated against that referrer returned **200 OK** with full `gemini-3.1-flash-lite-preview` metadata (1M input / 64K output, `generateContent` supported, `thinking: true` by default).

### Problem D — `503 UNAVAILABLE "high demand"` after deploy

- Not a quota issue (would be 429).
- Server-side capacity pressure on the preview model. Preview models get less provisioned capacity than stable ones.
- **Not fixed this session** — kept in outstanding work. Recommended approach: retry with exponential backoff, with optional fallback to `gemini-2.5-flash-lite`.

### Problem E — Missing deps / stale config after fresh clone

Audit of the repo surfaced:

- No `.env` file (expected, gitignored) and no `.env.example` either → blind cloning breaks at startup.
- ESLint flat config (`eslint.config.js`) referenced packages not declared in `package.json` — `npm run lint` failed with "Cannot find module".
- Several dead deps and duplicate component files.
- Leftover scaffolding from bolt.new / StackBlitz.
- Malformed inline SVG favicon.

See the cleanup commit for the full fix.

---

## 3. What changed on disk (shipped in commit `36f5e43`)

### Added
- `.env.example` — template with the three `VITE_*` keys (empty values).
- `.nvmrc` — pinned to Node `22` (matching Netlify's default).

### Edited
- `package.json`:
  - `"engines": { "node": ">=20" }`
  - Lint script dropped `--ext ts,tsx` (ESLint 10 flat config doesn't accept it).
  - Removed: `pdf-parse`, `uuid`, `@types/uuid` (unused).
  - Removed: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` (legacy).
  - Added: `eslint@^10`, `@eslint/js`, `globals`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
- `package-lock.json` — regenerated.
- `src/lib/gemini.ts` — migrated from `@google/generative-ai` to `@google/genai`; model constant at top; model set to `gemini-3.1-flash-lite-preview`.
- `index.html` — fixed malformed inline SVG favicon (third `<path>` had a missing separator, rendered broken in tabs). Replaced with clean Lucide `check-check` glyph, black stroke (data URI SVGs have no CSS context for `currentColor`).
- `README.md` — step 3 now references `.env.example` + a `cp` command.

### Deleted
- `src/components/HomePage.tsx` (duplicate — `src/pages/HomePage.tsx` is the one used by `App.tsx`).
- `src/components/PrintOrder.tsx` (duplicate — `src/components/print/PrintOrder.tsx` is used).
- `src/components/PrintSizeControl.tsx` (duplicate — `src/components/print/PrintSizeControl.tsx` is used).
- `home/project/netlify.toml` (duplicate of root `netlify.toml`, StackBlitz cruft).
- `.bolt/config.json`, `.bolt/prompt` (bolt.new scaffolding).

---

## 4. Deploy status

- `main` at `36f5e43`, pushed to `origin`.
- Netlify will auto-build from the push. Build verified locally: `npm run build` passes with identical bundle size.
- Runtime flow confirmed prior to cleanup: PDF → `gemini-3.1-flash-lite-preview` via `v1beta` → 200 OK.

### Netlify env vars (must be set on the Netlify side, already were)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`

### Gemini key restrictions (Google Cloud Console)
- **HTTP referrers:** `https://fletcher-ordersummary.netlify.app/*` (and whatever preview branches are used)
- **API restrictions:** Generative Language API

---

## 5. Outstanding / future work (not done this session)

| # | Item | Notes |
|---|---|---|
| 1 | **Retry + fallback in `src/lib/gemini.ts`** | Wrap `generateContent` with exponential backoff on `429`/`500`/`502`/`503`/`504`, plus fallback to `gemini-2.5-flash-lite` on terminal 503. Biggest quality-of-life win given preview-model flakiness. |
| 2 | **Pre-existing lint errors in app code** | `npm run lint` now runs and reports 25 issues (21 errors, 4 warnings) in `src/hooks/*`, `src/pages/*`, `src/lib/gemini.ts`, `src/utils/*`. All pre-existing code smells (`react-hooks/exhaustive-deps`, `no-explicit-any`, `set-state-in-effect`, etc.). Cleanup left them alone per scope. |
| 3 | **Move `VITE_GEMINI_API_KEY` behind a serverless proxy** | Currently the key is shipped to the browser (any `VITE_*` var is public). Referrer restriction is the only defense. A Netlify Function proxying `generateContent` would let the key stay server-side. |
| 4 | **Bundle size** | Single JS chunk is ~1.1 MB (321 KB gzipped). Vite flagged it. Not urgent, but `manualChunks` or route-level dynamic imports would split it. |
| 5 | **Consolidate `react-transition-group` into framer-motion** | Only used in `src/components/transitions/FadeTransition.tsx`. Drops one dep. |
| 6 | **Thinking budget on Gemini call** | `gemini-3.1-flash-lite-preview` has `thinking: true` by default — higher latency/tokens. For simple PDF extraction, `config.thinkingConfig.thinkingBudget: 0` may be faster/cheaper. |
| 7 | **`tsconfig.json` consolidation** | Root currently `extends` `tsconfig.app.json` directly; typical Vite template uses `references` instead. Works as-is. |

---

## 6. Quick-reference commands

```bash
# Clone-to-running
git clone https://github.com/alevalenteee/fletcher-ordersummary-app.git
cd fletcher-ordersummary-app
nvm use             # picks up .nvmrc -> Node 22
npm install
cp .env.example .env   # then fill in the three VITE_* values
npm run dev

# Verify lint tooling works (errors in app code are expected, see §5)
npm run lint

# Production build
npm run build

# Debug Gemini model availability from the browser (prod site, DevTools Console)
const key = import.meta.env.VITE_GEMINI_API_KEY;
for (const v of ["v1beta", "v1"]) {
  const r = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${key}&pageSize=200`);
  const j = await r.json();
  console.log(v, (j.models || []).filter(m => m.supportedGenerationMethods?.includes("generateContent")).map(m => m.name));
}
```
