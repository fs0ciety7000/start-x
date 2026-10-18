# Project instructions

- Keep product text in French and code identifiers in English.
- Follow `PRODUCT.md`, `DESIGN.md`, and `docs/ARCHITECTURE.md`.
- Keep all dashboard and rail API routes authenticated, except Better Auth sign-in and the one-time first-admin setup.
- Never expose environment secrets to the browser or commit secret values.
- Use the existing public API at `https://reseau.fs0ciety.org` through server-side route handlers. Do not add CORS to the source project unless an actual requirement appears.
- Show source health and freshness on all live rail data.
- Preserve mobile layout, keyboard access, and `prefers-reduced-motion` support.
- Do not add test files or run tests unless the user requests testing.
