# VISIT SD Design System

An audit of the current visual design, what's working, what's inconsistent, and a phased roadmap to a polished, marketable product.

---

## 1. Current State Audit

The app has a strong editorial direction — Bebas Neue display type, warm neutrals, bold borders. The bones are good. The issues are consistency and refinement, not direction.

### ✅ Solid
- **Visual Identity**: Bebas Neue + DM Sans pairing is distinctive. Warm off-white palette and bold 2px borders create an editorial, magazine-like feel
- **Dark Mode**: CSS custom properties make theming clean. Light/dark palettes are well-considered with proper contrast adjustments on cuisine colors
- **Cuisine Color System**: 10-color palette with `color-mix()` for backgrounds is a smart approach. Cards get visual personality without chaos

### ⚠️ Needs Work
- **Type Scale**: 13 distinct font sizes used across the app with no clear hierarchy. Same semantic level (body text) rendered at 13px, 14px, and 15px in different components
- **Spacing**: Padding and gaps vary per-component rather than following a system. Modal padding is p-7 in some places, p-6 in others. Button padding has 4+ variants

### 🔴 Fix
- **Semantic Colors**: Accent (coral) is used for primary CTAs *and* error states. No dedicated error/success/warning colors. This creates ambiguity

---

## 2. Color System

The current palette works but lacks semantic clarity. The proposed system separates brand colors from functional colors.

### Current Palette
- **Accent**: `#d85a30` (coral)
- **Accent 2**: `#1d9e75` (teal)
- **Background**: `#fafaf8`
- **Surface**: `#f1efe8`
- **Text**: `#1a1a18`
- **Text Secondary**: `#5f5e5a`
- **Border**: `rgba(26, 26, 24, 0.12)`

### Proposed Additions
Add dedicated semantic colors instead of overloading accent:

- **Error**: `#c0392b`
- **Success**: `#1d9e75` (can alias accent2)
- **Warning**: `#d4a017`
- **Info**: `#2d7dd2`

```css
/* Add to globals.css :root */
--error: #c0392b;
--success: #1d9e75;
--warning: #d4a017;
--info: #2d7dd2;
```

```js
/* Add to tailwind.config.js colors */
error: "var(--error)",
success: "var(--success)",
warning: "var(--warning)",
info: "var(--info)",
```

**Key change**: Reserve `accent` (#d85a30) exclusively for primary CTAs and brand moments. Error states, delete buttons, and validation messages should use the dedicated `error` red.

---

## 3. Typography Scale

Currently 13+ arbitrary pixel sizes. Propose consolidating to a 7-step scale.

### Current Issues
Font sizes found in the codebase: 10px, 11px, 12px, 13px, 14px, 15px, 16px, 18px, 20px, 22px, 24px, text-sm, text-xs, text-lg, text-xl, text-2xl, text-4xl, text-5xl, plus 3 different clamp() values.

Body text appears at 13px, 14px, *and* 15px depending on the component. Section headings use 22px, 24px, or text-2xl interchangeably.

### Proposed 7-Step Scale

| Step | Size | Usage | Font |
|------|------|-------|------|
| **HERO** | `clamp(48px, 10vw, 96px)` | Main page heading | Bebas Neue |
| **H1** | `32px` | Section headings, modal titles | Bebas Neue |
| **H2** | `22px` | Card titles, subsections | Bebas Neue |
| **BODY** | `15px` | Primary text, descriptions, form inputs | DM Sans |
| **SMALL** | `13px` | Buttons, metadata, secondary info, filter chips | DM Sans Medium |
| **CAPTION** | `11px` | Labels, timestamps, fine print | DM Sans Medium, uppercase, 0.1em tracking |
| **MICRO** | `10px` | Badge text, cuisine tags | DM Sans Medium, uppercase, 0.08em tracking |

```js
/* Proposed Tailwind extension — reference names instead of raw px */
fontSize: {
  hero:    ['clamp(48px, 10vw, 96px)', { lineHeight: '0.9', letterSpacing: '0.02em' }],
  h1:      ['32px', { lineHeight: '1', letterSpacing: '0.04em' }],
  h2:      ['22px', { lineHeight: '1.1', letterSpacing: '0.04em' }],
  body:    ['15px', { lineHeight: '1.6' }],
  small:   ['13px', { lineHeight: '1.5' }],
  caption: ['11px', { lineHeight: '1.4', letterSpacing: '0.1em' }],
  micro:   ['10px', { lineHeight: '1.4', letterSpacing: '0.08em' }],
}
```

---

## 4. Spacing & Layout

Adopt a base-4 spacing scale. Every margin, padding, and gap should be a multiple of 4px.

### Spacing Scale
`4px` · `8px` · `12px` · `16px` · `20px` · `24px` · `32px` · `40px` · `48px` · `64px`

### Standardization

- **Section Padding**: `p-6` (24px) for all sections. Currently mixes p-6, p-7, p-4, p-3
- **Card Padding**: `p-4` (16px) for compact cards, `p-6` (24px) for expanded views
- **Button Padding**: `py-2 px-4` (standard) and `py-1.5 px-3` (compact). Currently 4+ padding variants
- **Gap System**:
  - `gap-1.5` (6px) for tight groups
  - `gap-2` (8px) for buttons
  - `gap-3` (12px) for cards
  - `gap-6` (24px) for sections

### Border System

Three tiers — currently used inconsistently:

- **Subtle** — `1px` / `border-brd`: Card separators, list dividers, image borders
- **Interactive** — `1.5px`: Buttons, inputs, chips, interactive cards
- **Structural** — `2px` / `border-txt`: Section dividers, modals, hero borders

---

## 5. Component Inventory

Current components and their design debt.

### Buttons

The app currently has no shared button styles. Each component defines its own inline classes.

**Proposed**: 4 variants × 2 shapes = 8 button types

**Variants**:
- Primary (accent background)
- Secondary (accent2 background)
- Outline (transparent with border)
- Ghost (transparent, subtle border)

**Shapes**:
- Pill (`rounded-pill`) — filters, badges, nav
- Rectangle (`rounded-none`) — modals, forms, admin

**Action**: Extract button classes into Tailwind `@apply` components or a shared `className` utility. Every button in the app should use one of these 8 combinations.

### Cards

- ✅ **Restaurant Card**: Good structure with image, title, badges, metadata. Cuisine color left-border is a nice touch. Card hover animation (`-translate-y-0.5`) is subtle and effective
- ⚠️ **Card Title Size**: Card titles use `text-[24px]` Bebas Neue which is very large for a grid card. Consider dropping to 18-20px on cards, keeping 24px for detail page headings. Long restaurant names (like CJK text) overflow badly at this size

### Modals

- ⚠️ **Inconsistent Padding**: AddModal/OrderModal use `p-7`. ConfirmModal uses `p-6`. Standardize to `p-6` across all
- ⚠️ **Inconsistent Title Sizing**: AddModal uses `text-4xl`. ConfirmModal uses `text-2xl`. Use the H1 step (32px) for all modal titles

### Filter Bar

✅ **Overall Pattern**: Sticky filter bar with slide-down panel is well-implemented. The `grid-template-rows` animation for panel open/close is smooth. Chip toggle pattern is clear. The scroll-aware bottom border is a nice detail.

- Search input uses `rounded-none` which fits the editorial aesthetic
- Active chip inversion (bg-txt text-bg) provides clear state feedback
- Panel backdrop overlay (`bg-txt/5`) is appropriately subtle

### Detail Page

⚠️ **Section Rhythm**: The detail page stacks many `p-6 border-b border-brd` sections vertically. Each section (Notes, Address, Details, Visit History, Menu Highlights, Order History) has the same visual weight. This creates a flat, form-like feel rather than a curated restaurant profile.

**Suggestions**:
- Consider visual hierarchy: hero photo + name should dominate, notes should feel editorial (already has italic + left border, which is good), metadata should recede
- The floating admin action bar is well-done — sticky bottom with clear z-indexing
- Visit history expand/collapse is functional but the arrow (▸ / ▾) feels like a file browser, not a restaurant app

---

## 6. Key Issues & Fixes

Concrete problems and their solutions, ordered by impact.

### 🔴 High: No shared component styles

**Problem**: Every button, chip, and input defines its own Tailwind classes inline. This leads to drift (1.5px here, 2px there) and makes systematic changes painful.

**Fix**:
- Create a `@layer components` block in globals.css with `.btn-primary`, `.btn-secondary`, `.input-base`, `.chip`, `.chip-active` using `@apply`
- Or extract to a `cn()` utility with variant objects (like class-variance-authority)

### 🔴 High: Color semantics overloaded

**Problem**: `accent` (#d85a30 coral) currently means: primary CTA, error state, delete button, validation failure, and the must-try badge. A user seeing coral doesn't know if something is clickable, broken, or important.

**Fix**:
- Add `--error` variable
- Replace all error/delete uses of `text-accent` / `border-accent` with `text-error` / `border-error`
- Keep accent exclusively for: primary CTA buttons, brand moments (hero "SD"), must-try badges

### ⚠️ Medium: Disabled/loading states inconsistent

**Problem**: Disabled buttons use `opacity-30`, `opacity-50`, or `opacity-60` depending on the component. Some add `cursor-default`, others don't.

**Fix**: Standardize to `opacity-40 cursor-not-allowed` for all disabled interactive elements

### ⚠️ Medium: Letter-spacing chaos

**Problem**: Uppercase text uses tracking values of 0.03em, 0.04em, 0.05em, 0.08em, 0.1em, 0.12em, and 0.15em across different components. No discernible pattern.

**Fix**: Two tracking values:
- `tracking-wide` (0.05em) for body uppercase
- `tracking-wider` (0.12em) for caption/label uppercase

### ⚠️ Medium: Card z-index stacking bug

**Problem**: Restaurant cards have `relative` positioning and `hover:-translate-y-0.5` which creates a new stacking context, causing cards to paint over the sticky FilterBar.

**Fix**: Already fixed with the `relative z-0` wrapper.

### ⚠️ Medium: No focus/accessibility styles

**Problem**: Interactive elements rely on default browser focus rings or none at all. Custom buttons with `border-none` or `bg-transparent` have no visible focus indicator.

**Fix**: Add a global focus-visible style: `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`

---

## 7. Improvement Roadmap

Four phases to take the app from functional prototype to polished, marketable product. Each phase is self-contained and ships value independently.

### Phase 1: Foundation Cleanup

**Goal**: Zero visual change to users. Pure consistency and architecture. Do this first so subsequent work doesn't fight the codebase.

- Add semantic color variables (`--error`, `--success`, `--warning`) and replace overloaded accent uses
- Define the 7-step type scale in tailwind.config.js and migrate all `text-[Npx]` to named steps
- Standardize letter-spacing to 2 values
- Create `@apply` component classes for buttons (4 variants × 2 shapes), inputs, chips, badges
- Unify modal padding to `p-6`, title size to 32px
- Standardize disabled state to `opacity-40 cursor-not-allowed`
- Add global `focus-visible` ring styles for accessibility

### Phase 2: Visual Polish

**Goal**: Subtle refinements that elevate perceived quality. Each change is small but they compound.

- **Card refinement**: Reduce card title to 18px. Add subtle entrance animations (fade-up on scroll into view). Improve image loading with blur-up placeholder or skeleton shimmer
- **Hero upgrade**: Add a subtle background texture or grain overlay to the hero section. Consider an animated counter for the stat pills on mount
- **Detail page hierarchy**: Make the photo hero taller (400px) with a gradient text overlay instead of separate sections. Combine cuisine + neighborhood + price into a single metadata row
- **Micro-interactions**: Add subtle scale on card tap (mobile), smooth chip toggle with brief color transition, skeleton-to-content crossfade
- **Empty states**: Design proper empty state illustrations (no spots found, no visits yet) instead of plain text
- **Toast notifications**: Replace `alert()` calls with styled toast component for actions like "Marked as visited" or "Order saved"

### Phase 3: Layout & Navigation

**Goal**: Structural improvements that make the app feel like a product, not a project.

- **Responsive grid**: Move from `minmax(260px, 1fr)` to intentional breakpoints: 1 column mobile, 2 columns tablet, 3-4 columns desktop. Control card aspect ratio for visual consistency
- **Image treatment**: Enforce consistent image aspect ratio (3:2 or 16:9) across all cards. Add proper `next/image` with blur placeholder, priority loading for above-fold
- **Navigation depth**: Add breadcrumbs or a persistent back-navigation pattern. The current breadcrumb on detail pages is good but could be sticky
- **Map view**: Style map markers with cuisine colors. Add a split-view option (list + map side-by-side on desktop)
- **Search UX**: Add search suggestions, recent searches, or category quick-filters. Debounce already works but visual feedback during filtering would help

### Phase 4: Delight & Brand

**Goal**: The details that make people screenshot and share.

- **Custom illustrations**: Commission or create a small set of spot illustrations for empty states, loading screens, and the hero. Food-themed line art in the coral/teal palette
- **Social sharing**: Generate OG images per restaurant with the cuisine color, name in Bebas Neue, and photo. Make shared links look premium
- **Scroll-driven animations**: Subtle parallax on the hero, staggered card reveals, section header animations. Use CSS scroll-timeline where supported
- **Print/share mode**: A "Share this list" feature that generates a clean, designed PDF or shareable link with selected restaurants
- **Onboarding moment**: First-visit animation sequence: title reveals letter-by-letter, stat pills count up, cards cascade in. Make the first impression memorable
- **Sound design**: Optional subtle UI sounds (filter toggle click, card selection) for a premium feel. Off by default, toggle in settings

---

## Priority

**Phase 1** is a prerequisite for everything else — it eliminates the inconsistency tax.

**Phase 2** gives the biggest perception-to-effort ratio.

**Phases 3-4** are where the app crosses from "works well" to "feels like a product someone would pay for."

---

*VISIT SD Design System Review · April 2026*
