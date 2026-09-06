# Sentinel Design System Specification (`DESIGN.md`)

## 1. Design Philosophy & Aesthetic Essence

A restrained, text-first interface built on system fonts and a near-black ink tone, with a single classic hyperlink-blue used sparingly for interactive text; surfaces stay unstyled and transparent, letting typography and a thin neutral hairline do the structural work, while a parallel dark theme swaps in soft off-white text and a muted sky-blue link tone for low-glare reading.

* **Restrained Text-First Hierarchy**: Structure and priority are conveyed almost entirely through typographic scale, weight contrasts, and disciplined whitespace rather than heavy backgrounds or decorative gradients.
* **Classic Hyperlink Focal Color**: A single classic hyperlink blue (`#0000EE` in light mode, desaturated sky-blue `#82B6FF` in dark mode) directs operator focus toward interactive elements, links, and operational controls.
* **Strict Two-Weight Font Ladder**: All UI copy is strictly set in `system-ui` across two weights: **400** (regular for reading and captions) and **600** (semibold for headings and titles). Monospace is reserved exclusively for code, parameters, endpoints, and telemetry.
* **Hairline Separation & Zero Drop Shadows**: Surfaces avoid artificial drop shadows (`shadow-none` elevation). Visual separation between cards, lists, tables, and sections is driven by 1px neutral hairline borders (`#D9D9D9` in light mode, `#333333` in dark mode) and purposeful whitespace.
* **Conservative Geometry**: Subtle, disciplined border radii (4px–6px) on buttons, cards, and input fields prevent visual distraction while retaining modern ergonomics.

---

## 2. Color System & Tokens

### Light Theme (Text-First Ink & Hyperlink Blue)

| Token | Hex Value | Role & Usage |
|:---|:---|:---|
| `--background` | `#FFFFFF` | Unstyled canvas viewport |
| `--foreground` | `#313131` | Near-black ink for readable, crisp body text |
| `--card` | `#FFFFFF` | Content containers and data panels |
| `--card-foreground` | `#313131` | Primary text within cards |
| `--popover` | `#FFFFFF` | Dropdowns, menus, and floating tooltips |
| `--popover-foreground` | `#313131` | Text inside popovers |
| `--primary` | `#0000EE` | Classic hyperlink-blue for interactive triggers and links |
| `--primary-hover` | `#0000CD` | Primary interactive hover state |
| `--primary-foreground` | `#FFFFFF` | High-contrast text on primary buttons |
| `--secondary` | `#F6F6F6` | Secondary buttons, toolbars, and inactive tab pills |
| `--secondary-foreground` | `#313131` | Text on secondary elements |
| `--muted` | `#F0F0F0` | Muted background fills and subtle dividers |
| `--muted-foreground` | `#707070` | Secondary metadata, labels, and helper text |
| `--accent` | `#EEEEEE` | Row hover states and subtle element highlights |
| `--accent-foreground` | `#313131` | Text on accented items |
| `--border` | `#D9D9D9` | 1px neutral hairline border |
| `--input` | `#D9D9D9` | Form and input control boundaries |
| `--ring` | `#0000EE` | Focused interactive ring |

#### Status Signals (Light Theme)
| Role | Hex Value | Usage |
|:---|:---|:---|
| **Safe / Success** | `#16A34A` | Completed scans, verified resolved states |
| **Notice / Warning** | `#D97706` | Medium severity notices, queued processes |
| **Risk / Critical** | `#D32F2F` | Critical security findings, leaked secrets |
| **Information** | `#0000EE` | Operational notes and telemetry links |

---

### Dark Theme (Low-Glare Off-White & Sky-Blue)

| Token | Hex Value | Role & Usage |
|:---|:---|:---|
| `--background` | `#121212` | Low-glare dark viewport |
| `--foreground` | `#F2F2F2` | Soft off-white text for comfortable reading |
| `--card` | `#181818` | Dark content cards and panels |
| `--card-foreground` | `#F2F2F2` | Text within card containers |
| `--popover` | `#181818` | Dark popovers and modals |
| `--popover-foreground` | `#F2F2F2` | Text within popovers |
| `--primary` | `#82B6FF` | Muted sky-blue link tone for low-glare interactive text |
| `--primary-hover` | `#9EC5FF` | Muted sky-blue hover state |
| `--primary-foreground` | `#121212` | Dark text on primary buttons |
| `--secondary` | `#202020` | Secondary surfaces and button backings |
| `--secondary-foreground` | `#F2F2F2` | Text on secondary elements |
| `--muted` | `#242424` | Muted background fills |
| `--muted-foreground` | `#9E9E9E` | Secondary metadata and muted labels |
| `--accent` | `#262626` | Row and list item hover highlights |
| `--accent-foreground` | `#F2F2F2` | Text on accented items |
| `--border` | `#333333` | Subtle 1px neutral dark hairline divider |
| `--input` | `#333333` | Input field borders |
| `--ring` | `#82B6FF` | Interactive focus halo |

#### Status Signals (Dark Theme)
| Role | Hex Value | Usage |
|:---|:---|:---|
| **Safe / Success** | `#22C55E` | Completed jobs and verified safe checks |
| **Notice / Warning** | `#F59E0B` | Queued states and warning notices |
| **Risk / Critical** | `#F87171` | High / Critical security alerts |
| **Information** | `#82B6FF` | Telemetry references |

---

## 3. Typography & Hierarchy

The interface strictly adheres to `system-ui` sans-serif typography with a disciplined two-weight ladder:

* **Font Families**:
  * **Interface & Reading Stack**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
  * **Code & Telemetry Stack**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
* **Type Scale**:
  * **Display**: 40px, Line-height: 1.25, Weight: 600 (`font-semibold`).
  * **Title**: 24px, Line-height: 1.25, Weight: 600 (`font-semibold`).
  * **Body**: 16px (and 14px for UI controls), Line-height: 1.5, Weight: 400 (`font-normal`).
  * **Caption / Utility**: 12px, Line-height: 1.5, Weight: 400 (`font-normal`).
  * **Code / Telemetry**: 12px, Line-height: 1.5, Weight: 400 (`font-mono`).
* **Strict Weight Discipline**: Only font weights **400** and **600** are permitted. No serif fonts (Georgia, Cambria) or intermediate font weights (500, 700+).

---

## 4. Surfaces, Depth & Geometry

* **Zero Elevation Shadows**:
  * All cards, containers, tables, and modals use `shadow-none`.
  * Spatial definition is achieved exclusively through 1px hairline borders (`border border-border`) and whitespace.
* **Border Radii**:
  * Buttons & Inputs: `6px` (`rounded-[6px]`)
  * Cards & Panels: `6px` to `8px` (`rounded-[6px]` or `rounded-[8px]`)
  * Badges & Tags: `4px` to `6px` (`rounded-[4px]` or `rounded-[6px]`)
  * Avatars / Dots: `9999px` (`rounded-full`) reserved strictly for circular profile icons and status indicator dots.

---

## 5. Component Patterns

1. **Interactive Buttons**:
   * **Primary**: `bg-primary text-primary-foreground hover:bg-[#0000CD] dark:hover:bg-[#9EC5FF] rounded-[6px] font-semibold text-[14px] px-4 py-2 shadow-none transition-colors`
   * **Secondary**: `bg-card text-foreground border border-border hover:bg-secondary rounded-[6px] font-normal text-[14px] px-4 py-2 shadow-none transition-colors`
   * **Text / Links**: `text-primary hover:underline font-normal cursor-pointer`
2. **Cards & Containers**:
   * `bg-card text-card-foreground border border-border rounded-[6px] p-6 shadow-none`
3. **Data Tables & Lists**:
   * Clean 1px hairline separators (`divide-y divide-border`), table headers at 12px font-semibold uppercase tracking-wider text-muted-foreground.
4. **Console & Telemetry Streams**:
   * Monospace font stack (`font-mono text-[12px] font-normal`), 1px hairline border, dark unstyled background.
