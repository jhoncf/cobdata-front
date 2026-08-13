---
inclusion: fileMatch
fileMatchPattern: "**/*.tsx,**/*.jsx,**/*.ts"
---

# Vercel React Best Practices

Comprehensive performance optimization guide for React and Next.js applications. Contains 70 rules across 8 categories, prioritized by impact.

## When to Apply

Reference these guidelines when:
- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
- Optimizing bundle size or load times

## Rule Categories by Priority

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Eliminating Waterfalls | CRITICAL |
| 2 | Bundle Size Optimization | CRITICAL |
| 3 | Server-Side Performance | HIGH |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH |
| 5 | Re-render Optimization | MEDIUM |
| 6 | Rendering Performance | MEDIUM |
| 7 | JavaScript Performance | LOW-MEDIUM |
| 8 | Advanced Patterns | LOW |

## 1. Eliminating Waterfalls (CRITICAL)

- Check cheap sync conditions before awaiting flags or remote values
- Move await into branches where actually used
- Use Promise.all() for independent operations
- Use Suspense to stream content
- Start promises early, await late in API routes

## 2. Bundle Size Optimization (CRITICAL)

- Import directly, avoid barrel files
- Prefer statically analyzable import paths
- Use next/dynamic for heavy components
- Load analytics/logging after hydration
- Load modules only when feature is activated
- Preload on hover/focus for perceived speed

## 3. Server-Side Performance (HIGH)

- Authenticate server actions like API routes
- Use React.cache() for per-request deduplication
- Avoid duplicate serialization in RSC props
- Hoist static I/O (fonts, logos) to module level
- Avoid module-level mutable request state in RSC/SSR
- Minimize data passed to client components
- Restructure components to parallelize fetches
- Use after() for non-blocking operations

## 4. Client-Side Data Fetching (MEDIUM-HIGH)

- Use SWR for automatic request deduplication
- Deduplicate global event listeners
- Use passive listeners for scroll
- Version and minimize localStorage data

## 5. Re-render Optimization (MEDIUM)

- Don't subscribe to state only used in callbacks
- Extract expensive work into memoized components
- Hoist default non-primitive props
- Use primitive dependencies in effects
- Subscribe to derived booleans, not raw values
- Derive state during render, not effects
- Use functional setState for stable callbacks
- Pass function to useState for expensive values
- Avoid memo for simple primitives
- Split hooks with independent dependencies
- Put interaction logic in event handlers
- Use startTransition for non-urgent updates
- Defer expensive renders to keep input responsive
- Use refs for transient frequent values
- Don't define components inside components

## 6. Rendering Performance (MEDIUM)

- Animate div wrapper, not SVG element
- Use content-visibility for long lists
- Extract static JSX outside components
- Reduce SVG coordinate precision
- Use inline script for client-only data
- Use ternary, not && for conditionals
- Prefer useTransition for loading state
- Use React DOM resource hints for preloading

## 7. JavaScript Performance (LOW-MEDIUM)

- Group CSS changes via classes or cssText
- Build Map for repeated lookups
- Cache object properties in loops
- Combine multiple filter/map into one loop
- Check array length before expensive comparison
- Return early from functions
- Hoist RegExp creation outside loops
- Use Set/Map for O(1) lookups
- Use flatMap to map and filter in one pass

## 8. Advanced Patterns (LOW)

- Don't put useEffectEvent results in effect deps
- Store event handlers in refs
- Initialize app once per app load
- useLatest for stable callback refs
