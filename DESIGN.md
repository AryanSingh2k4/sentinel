# Design System Specification (`design.md`)

## 1. Design Philosophy & Aesthetic Essence

A warm, editorial, and human-centered design language built on tactile surfaces, literary warmth, and precision clarity:
* **Organic Warmth over Stark Monochromes**: Replaces clinical, harsh pure-whites (`#ffffff`) and pitch-blacks (`#000000`) with warm ivory parchment (`#faf9f5`) and rich slate espresso (`#141413`).
* **Signature Terracotta Accent**: Warm terracotta clay (`#d97757`) serves as the primary focal color, providing intellectual warmth and high accessibility contrast without aggressive neon glows.
* **Editorial & Humanist Typography**: A blend of refined, readable sans-serif typography, elegant editorial serif headings, and clean tabular monospace for code and telemetry.
* **Tactile Surface Elevation**: Ultra-subtle, warm hairline borders (1px) with soft, organic diffusion shadows and friendly border radii (10px–14px).

---

## 2. Color Palette & Swatches

### Light Theme (Warm Luminous & Slate)
| Token | Hex Value | Semantic Role |
|:---|:---|:---|
| `--background` | `#faf9f6` | Main viewport canvas (luminous warm ivory) |
| `--foreground` | `#191919` | Primary body text (deep slate ink) |
| `--card` | `#ffffff` | Elevated surface containers & cards (crisp white paper) |
| `--card-foreground`| `#191919` | Text on card surfaces |
| `--popover` | `#ffffff` | Dropdowns, tooltips, and floating sheets |
| `--popover-foreground` | `#191919` | Text inside popovers |
| `--primary` | `#c96442` | Signature warm terracotta accent (buttons, active states) |
| `--primary-hover` | `#b85736` | Terracotta hover state |
| `--primary-foreground` | `#ffffff` | Text on primary terracotta components |
| `--secondary` | `#f5f4ef` | Secondary surfaces, pills, and subtle badge backings |
| `--secondary-foreground` | `#191919` | Text on secondary elements |
| `--muted` | `#f5f4ef` | Subtle background fills and inactive panels |
| `--muted-foreground` | `#6e6d67` | Secondary/helper text and breadcrumbs |
| `--accent` | `#f2f1eb` | Interactive list-item hover and selection state |
| `--accent-foreground` | `#191919` | Text on accent backgrounds |
| `--border` | `#e8e6df` | Delicate hairline borders and structural dividers |
| `--input` | `#e8e6df` | Input and form control borders |
| `--ring` | `#c96442` | Accessibility focus ring |

#### Status & Signal Colors (Light Mode)
| Role | Hex Value | Swatch Description |
|:---|:---|:---|
| **Success / Safe** | `#788c5d` | Earthy olive / sage green |
| **Warning / Notice** | `#d97706` | Warm amber kraft |
| **Critical / Risk** | `#c2410c` | Warm terracotta red / burnt orange |
| **Info / Probes** | `#6a9bcc` | Soft sky blue |

---

### Dark Theme (Warm Slate & Terracotta)
| Token | Hex Value | Semantic Role |
|:---|:---|:---|
| `--background` | `#141413` | Main canvas (rich warm slate espresso, non-harsh) |
| `--foreground` | `#faf9f5` | Primary body text (soft cream / ivory light) |
| `--card` | `#1c1b1a` | Elevated cards and data tables (warm charcoal surface) |
| `--card-foreground`| `#faf9f5` | Text on card surfaces |
| `--popover` | `#21201e` | Dropdowns, drawers, and modal sheets |
| `--popover-foreground` | `#faf9f5` | Text inside popovers |
| `--primary` | `#d97757` | Luminous terracotta accent (primary interactive triggers) |
| `--primary-hover` | `#e08265` | Luminous terracotta hover |
| `--primary-foreground` | `#ffffff` | High-contrast text on primary buttons |
| `--secondary` | `#21201e` | Secondary buttons and toolbar surface |
| `--secondary-foreground` | `#faf9f5` | Text on secondary elements |
| `--muted` | `#21201e` | Subtle muted backgrounds and inactive tabs |
| `--muted-foreground` | `#a8a69e` | Soft cloud gray for secondary metadata |
| `--accent` | `#282724` | List-item hover state and row highlights |
| `--accent-foreground` | `#faf9f5` | Text on accent backgrounds |
| `--border` | `#2c2b28` | Warm hairline border (low eye-strain divider) |
| `--input` | `#2c2b28` | Input fields and dropdown borders |
| `--ring` | `#d97757` | Terracotta focus halo |

#### Status & Signal Colors (Dark Mode)
| Role | Hex Value | Swatch Description |
|:---|:---|:---|
| **Success / Safe** | `#8ca36f` | Muted olive sage |
| **Warning / Notice** | `#f59e0b` | Warm gold amber |
| **Critical / Risk** | `#f87171` | Warm coral rose |
| **Info / Probes** | `#7dd3fc` | Luminous sky blue |

---

## 3. Typography Hierarchy

* **Editorial Serif Headings**: `Georgia, Cambria, "Times New Roman", Times, serif`
  * Applied to `h1`, `h2`, `h3`, `h4`, hero headers, section titles, and report headings for literary warmth and publication-grade elegance.
  * Standard styling: `font-serif font-normal` or `font-medium`, `tracking-tight`.
* **Primary Sans Stack**: `var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
  * Body copy: 14px / 20px, letter-spacing: normal, weight: 400.
  * Form controls, buttons, tooltips, and table cell content: 13px–14px.
* **Monospace Stack**: `var(--font-mono), "SF Mono", Menlo, Monaco, Consolas, monospace`
  * Terminal streams, secret snippets, hex dumps, and API endpoints: 12px, letter-spacing: -0.01em.

---

## 4. Box Styles, Radii & Card Surfaces

* **Seamless Card Surfaces**:
  * Card containers use crisp elevated surfaces (`bg-card`, `#ffffff` light / `#1c1b1a` dark) with delicate hairline borders (`border border-border`).
  * Card headers remain integrated with the card canvas (avoiding heavy dark bands), separated cleanly with `border-b border-border`.
  * Table column header strips use an ultra-light whisper tint (`bg-muted/40` or `bg-[#faf9f6]`), maintaining high contrast and airy readability.
* **Border Radii**:
  * Badges & Status Pills: `9999px` (fully rounded pills)
  * Small buttons & Inputs: `8px` (`0.5rem`)
  * Content Cards & Tables: `12px` (`0.75rem`)
  * Modal Windows & Dialogs: `16px` (`1rem`)
* **Borders**:
  * 1px solid hairline (`border border-border`)
* **Box Shadows**:
  * **Light Elevation**: `0 1px 3px rgba(20, 20, 19, 0.04), 0 4px 12px rgba(20, 20, 19, 0.02)`
  * **Dark Elevation**: `0 1px 3px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.2)`
  * **Card Hover**: Subtle warm border shift from `--border` to `--border-hover` with 150ms ease.

---

## 5. Component Styling Rules

1. **Buttons**:
   * **Primary**: Background `--primary` (`#d97757`), text white, font-medium, rounded-md/lg.
   * **Secondary**: Background `--secondary`, border 1px `--border`, text `--foreground`, hover:bg-accent.
   * **Ghost**: Transparent background, text `--foreground`, hover:bg-muted.
2. **Cards & Panels**:
   * Background `--card`, border 1px `--border`, rounded-xl, soft shadow.
3. **Inputs & Selectors**:
   * Background `--background`, border 1px `--border`, text `--foreground`, focus:ring-1 focus:ring-primary.
4. **Terminal / Console**:
   * Dark editorial canvas (`#141413`), border `--border`, font-mono text-xs, soft warm text tokens.
