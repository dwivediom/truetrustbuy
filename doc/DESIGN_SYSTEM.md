# TrueTrustBuy design system

This document mirrors the **landing page** ([`src/components/LandingPage.tsx`](../src/components/LandingPage.tsx)) and **global tokens** ([`src/app/globals.css`](../src/app/globals.css)). New screens should converge here; legacy pages may still use `zinc-*` until migrated to `slate-*` for parity.

## Typography

- **Font**: Plus Jakarta Sans (see [`src/app/layout.tsx`](../src/app/layout.tsx) — `variable: "--font-plus-jakarta"`).
- **Weights**: `font-medium` (body), `font-semibold` / `font-bold` (UI), `font-extrabold` (hero and section titles).
- **Hero**: `text-5xl md:text-7xl`, `leading-[1.1]`, `tracking-tighter`.
- **Section titles**: `text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900`.
- **Nav links**: `text-[15px] font-medium text-slate-600`.
- **Supporting body**: `text-lg font-medium text-slate-600` or `text-sm text-slate-500`.

## Color

| Role | Tailwind | Notes |
|------|-----------|--------|
| Page background | `bg-slate-50` or `landing-hero-bg` / `bg-mesh` | Marketing sections may use `.landing-hero-bg`. |
| Primary text | `text-slate-900` | |
| Secondary text | `text-slate-600`, `text-slate-500` | |
| Brand / links / focus | `text-brand-600`, `hover:text-brand-600`, `border-brand-500` | Tokens: `--color-brand-50` … `--color-brand-950` in `@theme`. |
| Primary button | `bg-slate-900 hover:bg-brand-600 text-white` | Rounded full for hero CTAs. |
| Cards | `bg-white border border-slate-200 shadow-sm` | Hover: `hover:shadow-md` or `hover:border-brand-200`. |
| Dark marketing band | `bg-slate-900` with `text-white` / `text-slate-300` | |

**Migration**: Prefer `slate` over `zinc` on updated pages so grays match the landing.

## Spacing and layout

- **Horizontal padding**: `px-6` on main content.
- **Max width**: `max-w-5xl` (focused columns), `max-w-7xl` (wide grids), `max-w-md` (forms).
- **Section vertical rhythm**: `py-20`, `py-24`, `pb-24`.
- **Fixed nav offset**: anchor targets use `scroll-mt-24` or `scroll-mt-28`.
- **Radius**: pills `rounded-full`; cards `rounded-2xl` / `rounded-3xl`; logo mark `rounded-xl`.

## Components (spec)

### Primary button

```txt
rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white
transition-all hover:bg-brand-600 hover:shadow-lg active:scale-95
```

### Secondary / ghost link

```txt
text-sm font-semibold text-slate-600 hover:text-slate-900
```

### Stat / trust card

```txt
flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm
```

### Pill / chip (trending)

```txt
rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700
shadow-sm hover:border-brand-500 hover:text-brand-600
```

### Top navigation (app shell)

- Sticky: `fixed top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-lg`.
- Height ~`h-16`–`h-20`, inner `max-w-7xl mx-auto px-6`.

### Decorative

- **Noise overlay** (optional): `.noise-bg` — use on marketing-heavy pages only; `pointer-events-none`.
- **Hero wash**: `.landing-hero-bg` for radial blue wash.

## Icons

- Library: **`lucide-react`**.
- Sizes: `h-4 w-4` (inline), `h-5 w-5` (nav), `h-6 w-6` / `h-7 w-7` (feature icons).
- Pair with `aria-hidden` when adjacent text labels the control.

## Forms

- Inputs: `rounded-xl` or `rounded-full` (hero search), `border-2 border-slate-200`, `focus:border-brand-500`, `outline-none`.
- Always associate **visible labels** or `aria-label` for accessibility.
- Error text: `text-sm text-red-600`.

## Accessibility

- Icon-only buttons: `aria-label` + optional `aria-expanded` for menus.
- Focus: rely on Tailwind `focus-visible:ring-2 focus-visible:ring-brand-500` where inputs are not custom.
- Respect `prefers-reduced-motion` for large animations (landing ghost text is subtle; avoid blocking motion-only affordances).

## Content and compliance

- Prefer **“AI assists”** / **tier matching** language over guaranteed automated negotiation unless the product legally and technically guarantees it.
- Performance claims (e.g. latency, match rate) should be **telemetry-backed** or framed as targets.

## Reference files

- [`src/app/globals.css`](../src/app/globals.css) — `@theme`, utilities.
- [`src/components/LandingPage.tsx`](../src/components/LandingPage.tsx) — canonical composition.
