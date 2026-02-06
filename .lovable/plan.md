

# Code Quality Improvements Plan

## Summary
After a thorough review of the codebase, I've identified several categories of improvements -- from actual bugs to code duplication and production hygiene. All changes are safe, non-breaking refactors.

---

## 1. Bug Fix: React Hooks Violation in `getReasons()`

**Files:** `RiskFunnel.tsx` (line 196-199), `RiskFunnel1.tsx` (line 197-199)

Both funnel files define a standalone `getReasons()` function that calls `useLocale()` -- a React hook -- outside of a React component. This is a **Rules of Hooks violation** and can cause unpredictable behavior.

**Fix:** The function is actually **dead code** in both files -- the `reasons` are already computed inline via `useMemo` (lines 914-987 in RiskFunnel, 944-1016 in RiskFunnel1). Remove the `getReasons` function entirely from both files.

---

## 2. Massive Code Duplication: RiskFunnel vs RiskFunnel1

**Files:** `RiskFunnel.tsx` (1462 lines), `RiskFunnel1.tsx` (1494 lines)

These two files are ~95% identical. They share the same:
- `FunnelData` type, `defaultData`, `COUNTRIES`, `AVATAR_PHOTOS`
- `calculateScore()`, `getRiskLevel()`, `getReasons()` (dead code)
- `WhyWeAsk`, `FunnelInterstitial`, `FunnelAnalyzingScreen`, `SocialProof`, `ProductPopup` components
- `whyWeAskContent` translations

The **only differences** are:
- RiskFunnel uses one-time payment (`create-guest-checkout` / `create-payment-intent`, amount: 4900)
- RiskFunnel1 uses subscription (`create-subscription-checkout` / `create-subscription-setup`, amount: 0)
- Different `STORAGE_KEY` and log prefixes

**Fix:** Extract shared code into a dedicated module:
- Create `src/pages/riskFunnel/shared.tsx` with all shared types, constants, utility functions, and sub-components
- Slim down both `RiskFunnel.tsx` and `RiskFunnel1.tsx` to only contain their unique checkout logic and main component, importing shared code
- This reduces total code from ~2,950 lines to ~1,200 lines

---

## 3. Production Console Logs Cleanup

**Files:** `RiskFunnel.tsx`, `RiskFunnel1.tsx`

Both files have a module-level `console.log()` at line 47 that runs on every import in production:
```typescript
console.log("[RiskFunnel] Stripe publishable key available:", !!stripePublishableKey);
```

Plus ~40+ verbose debug logs throughout the Express Pay flow that leak implementation details in production.

**Fix:** Wrap all debug logging behind `import.meta.env.DEV` checks, consistent with the pattern already used in `AuthContext.tsx` and `EntitlementsContext.tsx`.

---

## 4. Lazy Loading for Route Pages

**File:** `App.tsx`

All 30+ page components are eagerly imported, meaning the entire app's code is downloaded upfront. Only `AuthDebugPanel` uses lazy loading.

**Fix:** Apply `React.lazy()` to less-visited routes (admin pages, premium pages, legal pages, funnel pages) while keeping high-traffic routes (Index, Pricing, RiskCalculator, Library) eagerly loaded. This improves initial load performance.

Pages to lazy-load:
- Admin pages (6 routes)
- Premium pages (7 routes)
- Panic pages (3 routes)
- Legal pages (2 routes)
- Funnel pages (RiskFunnel, RiskFunnel1, PurchaseSuccess, Claim)

---

## 5. QueryClient Configuration

**File:** `App.tsx` (line 63)

The `QueryClient` is created with default settings. Adding sensible defaults prevents unnecessary refetches and improves UX.

**Fix:** Add configuration:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

---

## 6. Remove Dead `use-toast.ts` Re-export

**File:** `src/components/ui/use-toast.ts`

This file is a simple re-export of `@/hooks/use-toast`. It adds an unnecessary indirection layer.

**Fix:** Find any imports using `@/components/ui/use-toast` and redirect them to `@/hooks/use-toast`, then remove the file.

---

## Implementation Order

1. Fix the hooks violation (bug fix, highest priority)
2. Clean up production console logs
3. Extract shared funnel code (biggest code quality win)
4. Add lazy loading for routes
5. Configure QueryClient defaults
6. Remove dead re-export file

All changes are internal refactors with zero user-facing behavior changes.

---

## Technical Details

### Shared Funnel Module Structure
```
src/pages/riskFunnel/
  shared.tsx          -- Types, constants, utility fns, sub-components
  RiskFunnel.tsx      -- One-time payment variant (moved from pages/)
  RiskFunnel1.tsx     -- Subscription variant (moved from pages/)
```

### Lazy Loading Pattern
```typescript
const AdminIndex = lazy(() => import("./pages/admin/Index"));
// Wrapped in Suspense with loading fallback at route level
```

