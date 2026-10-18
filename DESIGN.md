# Design system

## Direction

An everyday personal startpage with the graphic discipline of a rail information system. Industrial brutalism appears in the cut grid, compact technical labels, oversized condensed headings, and signal-orange actions. The page remains warm, readable, and personal.

## Palette

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `#e9e7df` | `#171918` | Page surface |
| `surface` | `#f5f3ec` | `#202321` | Work and widget surfaces |
| `ink` | `#171918` | `#f1efe8` | Main text |
| `muted` | `#62645f` | `#a5a69f` | Secondary text |
| `rule` | `#bbb9b0` | `#414440` | Fine dividers |
| `signal` | `#ec5929` | `#ff7041` | Primary action and rail alert |
| `live` | `#277b55` | `#76c89a` | Live source state |
| `delay` | `#a9472a` | `#ff966d` | Delays and cancellations |

## Type

- Display and navigation: Barlow Condensed, 600–700.
- Interface copy: DM Sans, 400–600.
- Times, IDs, and metadata: IBM Plex Mono, 400–500, tabular numerals.
- Headings use tight tracking; data labels use short uppercase copy and restrained tracking.

## Layout and components

- Two working columns at desktop: personal bookmarks/WORK and rail widgets.
- Small rectangular bookmark tiles and compact link rows; no decorative nesting or dashboard within dashboard.
- Thin rules define hierarchy. Corners are square or minimally cut; no pill-card system.
- The train board is a compact table with station selector and departure/arrival tabs.
- The map is a restrained flat technical drawing with live train positions over the source rail graph.
- On mobile, navigation and content stack in reading order. Map height and timetable row density adapt to the viewport.

## Motion

Motion is short and functional: subtle content entry, press response, and controlled train-marker interpolation. Honor `prefers-reduced-motion`; never animate layout dimensions.

## Accessibility

Contrast is checked for each theme. All controls have text labels or accessible names, keyboard focus is visible, and status uses both text and color.
