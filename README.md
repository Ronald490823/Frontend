# CDS Attend — Web

Next.js 15 (App Router) client for CDS Attend. API: `../attendance_backend`.

## Run

```bash
npm install
cp .env.example .env.local     # API_ORIGIN = where FastAPI runs (server-side only)
npm run dev                    # http://localhost:3000
```

The browser only ever calls `/api/*` on this origin; `next.config.ts` proxies those requests to
`API_ORIGIN`. Auth cookies are therefore first-party, and the backend address never ships to
the browser. No tokens are stored in `localStorage`.

## Design system

- **Apple-style UI**: frosted-glass chrome (`.glass`), large tight headlines, soft depth
  (`shadow-soft` / `shadow-lift`), 20px+ radii, iOS segmented controls and bottom tab bar.
- **Type**: Poppins via `next/font`. Tokens (teal palette) in `src/app/globals.css` `@theme`.
- **Motion**:
  - GSAP + ScrollTrigger (`src/components/motion/`): masked word reveals (`RevealText`),
    scroll-scrubbed hero device, pinned word sequence, batched card reveals.
  - Framer Motion: page transitions (`(dashboard)/template.tsx`), shared-layout nav pill,
    segmented thumb, dialogs and row exit animations, magnetic CTA.
  - Everything respects `prefers-reduced-motion` (GSAP via `matchMedia`, Framer via
    `MotionConfig reducedMotion="user"`, CSS via a global media query).

## Conventions

- **Server state**: TanStack Query only. Hooks live in `src/features/<domain>/hooks.ts`.
- **Forms**: React Hook Form + Zod (`src/lib/validators.ts`). Backend field errors are placed
  beside their inputs with `applyServerErrors`.
- **Errors & toasts** (Sonner, top-right):
  - Mutations: one global toast from `MutationCache` unless the error has field errors or
    the mutation sets `meta.silentError` (because the component shows its own feedback).
  - Queries: no toasts. They render inline `ErrorState` with a retry button.
  - Session expiry: a single controlled toast and a redirect to `/login`.
- **Loading**: one `<Loader />` (`src/components/ui/loader.tsx`). Buttons take `loading`
  and disable while pending. Skeletons are used for lists and cards.
- **Authorization**: navigation hides screens a role can't use, but the API enforces every rule.

## Screens

| Route | Who | Backed by |
|---|---|---|
| `/` | public | — |
| `/login`, `/register`, `/pending-approval` | public / pending | auth, groups, memberships |
| `/dashboard` | approved users | `/users/me`, membership counts |
| `/members` | executives, LGIs | membership approval API |
| `/groups` | LGIs, super admin | groups & areas API |
| `/settings` | approved users | `PATCH /users/me` |

Sessions, QR check-in, excuses, reports and audit-log screens arrive with backend phases 4–7.
