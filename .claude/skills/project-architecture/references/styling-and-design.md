# Styling & Design System

## Overview

VISIT SD uses a custom design system built on Tailwind CSS with CSS custom properties for theming. The visual identity is sharp, editorial, and minimal: sharp corners on most elements, a warm off-white background, orange-red primary accent, and a clear typographic hierarchy using two Google Fonts.

All design rules are codified in `STANDARDS.md` section 4.

## Color Palette (CSS Variables)

Defined in `app/globals.css` under `@layer base { :root { ... } }`:

| Token      | Light                   | Dark                    | Usage                      |
|------------|-------------------------|-------------------------|----------------------------|
| `--accent` | `#D85A30` (orange-red)  | `#E8734F` (lighter)     | Primary brand, CTAs, errors|
| `--accent2`| `#1D9E75` (green)       | `#2BBF8E` (lighter)     | Secondary actions, badges  |
| `--bg`     | `#FAFAF8` (warm white)  | `#1A1A18` (near-black)  | Page background            |
| `--bg2`    | `#F1EFE8` (warm gray)   | `#2A2A26` (dark gray)   | Card hover, secondary bg   |
| `--txt`    | `#1A1A18`               | `#FAFAF8`               | Primary text               |
| `--txt2`   | `#5F5E5A`               | `#A8A7A3`               | Muted/secondary text       |
| `--brd`    | `rgba(26,26,24,0.12)`   | `rgba(250,250,248,0.12)`| Borders and dividers       |

Rule: **Never hardcode hex values in components.** Use Tailwind's theme tokens (`bg-accent`, `text-txt2`, `border-brd`, etc.). The only exception is `#fff`/`white` for text on colored backgrounds.

## Tailwind Configuration

File: `tailwind.config.js`

The config maps CSS variables into Tailwind's theme so they work as utility classes:

```js
colors: {
  accent: "var(--accent)",
  accent2: "var(--accent2)",
  bg: "var(--bg)",
  bg2: "var(--bg2)",
  txt: "var(--txt)",
  txt2: "var(--txt2)",
  brd: "var(--brd)",
},
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-body)"],
},
borderRadius: {
  pill: "20px",
},
```

- `darkMode: "class"` -- dark mode is toggled by a `.dark` class on `<html>`.
- Content paths scan `app/`, `components/`, `lib/`.
- No Tailwind plugins are used.

## Typography

Two fonts loaded via Google Fonts import in `app/globals.css`:

- **Bebas Neue** (`font-display`) -- All caps display font for headlines and titles. Always weight 400 (only weight available).
- **DM Sans** (`font-body`) -- Clean sans-serif for body text, labels, buttons. Weights 400 and 500.

Size reference:

| Element               | Font       | Size                       | Notes                        |
|-----------------------|------------|----------------------------|------------------------------|
| Hero page title       | Bebas Neue | `clamp(56px, 12vw, 96px)`  | Responsive fluid sizing      |
| Section headers       | Bebas Neue | 22px                       | Cuisine group headers        |
| Card restaurant name  | Bebas Neue | 28px                       | `leading-none`               |
| Modal titles          | Bebas Neue | 36px (`text-4xl`)          |                              |
| Body text / notes     | DM Sans    | 13-15px                    |                              |
| Uppercase labels      | DM Sans    | 10-11px                    | `tracking-[0.1em]`, weight 500|
| Buttons               | DM Sans    | 13-14px                    | Weight 500                   |

## Dark Mode

### How it works

1. **Inline script in `<head>`** (`app/layout.tsx`) reads `localStorage.getItem("theme")` before paint to prevent flash of wrong theme. Falls back to `prefers-color-scheme: dark`.
2. **`ThemeToggle` component** (`components/ThemeToggle.tsx`) provides a fixed button (top-right, `z-50`) that toggles `.dark` on `document.documentElement` and persists to `localStorage`.
3. **CSS variables swap** under the `.dark` selector in `app/globals.css`. Since all colors flow through variables and Tailwind maps to those variables, the entire UI recolors automatically.

No per-component dark mode overrides exist. If a new color is needed, add a variable in both `:root` and `.dark`, then map it in `tailwind.config.js`.

## Layout Patterns

### Restaurant Card Grid

Defined in `components/RestaurantGrid.tsx`:

```
grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-0 bg-brd border-l border-brd
```

The grid uses `gap-0` with `bg-brd` on the container and `bg-bg` on cards -- this creates visible grid lines between cards via the background color bleeding through. Cards have `border-b border-brd` for the bottom edge.

### Border Radius Convention

- **Sharp corners** (`rounded-none` / `border-radius: 0`) on: cards, inputs, buttons, modals, image containers.
- **Pill radius** (`rounded-pill` / `20px`) on: filter chips, "Must-Try" badges, "View on Maps" buttons, mark-visited buttons.

### Spacing

- Page padding: `px-6` (1.5rem horizontal)
- Card internal padding: `p-5` (1.25rem)
- Modal padding: `p-7` (1.75rem)
- Modal max-width: `max-w-[480px]`

## Shared Class Strings

Components define reusable class-string constants at the top of the file rather than using a shared utility file. This pattern is used in `components/AddModal.tsx` and other form-heavy components:

```ts
const inputCls =
  "w-full py-2 px-3 text-[15px] border-[1.5px] border-brd bg-bg text-txt rounded-none outline-none font-body transition-[border-color] duration-[0.12s] focus:border-accent";

const labelCls =
  "block text-[11px] tracking-[0.1em] uppercase font-medium text-txt2 mb-1";
```

These are file-scoped `const` strings, not exported. Each component that needs form inputs defines its own copy (or similar variants). There is no global component library or shared style module.

## Interactive States

- **Inputs**: 1.5px `border-brd` at rest, `border-accent` on focus. Transition: `0.12s`.
- **Cards**: `hover:bg-bg2` transition on the entire card link.
- **Toggle buttons** (price selector, must-try): Solid fill when active (`bg-txt text-bg` or `bg-accent text-white`), transparent with border when inactive.
- **Outline action buttons** ("View on Maps", "Mark as Visited"): 1.5px border in accent color, transparent bg, fill on hover.
- **Primary action buttons** ("Save restaurant"): Solid `bg-accent text-white`, `opacity-60` when disabled.
- **Destructive actions**: Use `accent` (orange-red) for delete buttons. Ghost style at rest, fills on hover.
- **Transitions**: Consistently `duration-[0.12s]` or `duration-100`/`duration-150`.

## Modal Pattern

Modals (e.g., `components/AddModal.tsx`, `components/ConfirmModal.tsx`) use:

- Fixed overlay: `fixed inset-0 bg-black/55 z-[100]` with click-outside-to-close.
- Content box: `bg-bg border-2 border-txt` (sharp border, no radius).
- Title: `font-display text-4xl`.
- Form layout: stacked fields with `mb-4` gaps.
- Footer buttons: `flex gap-2 mt-6` with primary/secondary/cancel pattern.

## Key Files

| File | Role |
|------|------|
| `app/globals.css` | CSS variable definitions, font import, base body styles |
| `tailwind.config.js` | Theme extensions mapping variables to Tailwind utilities |
| `app/layout.tsx` | Dark mode inline script, ThemeToggle placement |
| `components/ThemeToggle.tsx` | Dark mode toggle button and localStorage persistence |
| `components/RestaurantGrid.tsx` | Card grid layout, card component styling |
| `components/AddModal.tsx` | Form styling patterns, shared class strings |
| `STANDARDS.md` (section 4) | Canonical design rules and reference tables |

## Cross-References

- For the data model behind restaurant cards, see [data-model.md](data-model.md).
- For project file layout conventions, see [project-structure.md](project-structure.md).
