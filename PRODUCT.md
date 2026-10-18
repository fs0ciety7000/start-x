# Product

<!-- impeccable:product-schema 1 -->

## Platform

Web application, self-hosted on Coolify behind Cloudflare at `init.fs0ciety.org`.

## Stack

- Next.js 16 App Router, React 19, TypeScript.
- PostgreSQL 17, Drizzle ORM, Better Auth.
- Motion for restrained interface transitions; Canvas 2D for the live network map.
- Docker Compose for app + persistent PostgreSQL on Coolify.

## Users

One owner/admin, using a private daily startpage on desktop and mobile.

## Product Purpose

Provide a personal startpage with configurable bookmark categories, a dedicated WORK area, a station-selectable SNCB departures/arrivals widget, and a live Belgian rail map. The owner can add, edit, remove, and reorder links and categories, choose a station, and switch light/dark themes without editing code.

## Positioning

A personal home page that makes the owner's everyday links and Belgian rail status immediately available.

## Operating Context

Used daily, primarily on desktop. The page should remain compact and practical on phones. Train content is live and must show its source, update time, and degraded/offline state. The map uses live train positions over the rail network supplied by `reseau-en-direct`.

## Capabilities and Constraints

- Categories and bookmarks: create, edit, delete, reorder, and open quickly.
- Dedicated WORK section for work application links.
- SNCB station selector with departures and arrivals.
- Live Belgian network map with moving trains and delay state.
- Light and dark themes; restrained animations respecting `prefers-reduced-motion`.
- Private by default, with one administrator sign-in and signup disabled after first setup.
- Docker deployment to Coolify, hostname `init.fs0ciety.org`.
- No secrets in source control. Configure auth, database, and rail API via environment variables.

## Brand Commitments

- Personal startpage first. The interface must not read as an enterprise command center.
- Industrial brutalist / cyber-brutalist detailing, with compact navigation, warm mineral surfaces, near-black ink, and signal orange.
- Hard geometry and crisp type, with enough whitespace to keep links and train information effortless to scan.
- The approved visual reference is `.impeccable/mocks/personal-startpage.png`.

## Evidence on Hand

- The source project is `https://github.com/fs0ciety7000/reseau-en-direct` and is deployed at `https://reseau.fs0ciety.org`.
- Its existing public JSON endpoints include `/api/stations`, `/api/stations/{id}/board`, and `/api/health`.
- `/api/network` and `/api/snapshot` expose binary messages described in `contract/PROTOCOL.md`; map projection and frame cadence are documented there.
- The dashboard will proxy these endpoints behind its own authenticated route handlers; the browser will not connect to the source service directly.
- The reference image contains illustrative schedule text only; production data comes from the live API.

## Product Principles

- The links and WORK area remain immediately visible.
- Rail widgets stay secondary to personal shortcuts.
- Data freshness and unavailable states are explicit; illustrative values never appear as live.
- Every preference and link is editable in the interface.
- Keyboard access, visible focus, and reduced motion are built in.

## Accessibility & Inclusion

Target WCAG 2.2 AA, keyboard navigation, accessible dialogs and forms, clear focus indicators, and reduced motion support.
