# Mafia God PWA (`خدای مافیا`)

A bilingual (**Persian / English**) Progressive Web App for moderating in-person **Mafia** party games. Designed for the Game Moderator ("God"), it tracks every player, role, night action, vote, timer, and edge-case rule offline on mobile or desktop — live at **[mafia.appilico.com](https://mafia.appilico.com)**.

## Features

- **Bilingual RTL / LTR Interface**: Instant switching between Persian (`fa`, RTL) and English (`en`, LTR), plus customizable dark-theme accent colors.
- **Offline-First PWA**: Installable on iOS, Android, and desktop with a custom Service Worker (`sw.js`) and Web App Manifest (`manifest.json`).
- **Flexible Role Assignment**: Supports random role dealing with pass-and-play **Role Reveal**, as well as **Manual Role Assignment** (visible and blind-pick modes).
- **Comprehensive Mafia Rules Engine**:
  - **Mafia Team**: Godfather (night shot, Salakhi role-guess, one-time shield), Dr. Lecter (mafia heal with configurable self-heal limit), Bomber (code-based noon defusal), Spy, Silencer (Matador), Sorcerer (Jadoogar night block), Joker (detective reversal), Negotiator, and more.
  - **Citizen & Independent Roles**: Detective, Doctor, Sniper, Gunner (live/blank bullets), Bodyguard, Freemason alliance, Cowboy, Kane, Jack, Zodiac, and Last Action cards.
  - **Edge-Case & Chain-Reaction Engine**: Handles shields, curses, bombs, victory/chaos conditions, and multi-step night resolution.
- **Moderator Dashboard & Phase Tools**: Guided Night wake-up sequence, Day speech/defense timers, voting and elimination tracking, and post-game summary.
- **Native Mobile Packaging**: Includes Capacitor configuration (`capacitor.config.json`, `build.cjs`, `BUILD_NATIVE.md`) and a standalone native Android (Kotlin / Jetpack Compose) project in `android/`.

## Tech Stack

- **Web App**: Vanilla ES Modules (zero-framework SPA), custom `Router`, `EventBus`, and `Component` architecture, CSS custom properties, Service Worker (`sw.js`)
- **Build & Packaging**: Node.js asset bundler (`build.cjs` → `www/`), Capacitor 6 (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/splash-screen`, `@capacitor/status-bar`)
- **Testing**:
  - **Unit & Integration**: Vitest 4 (`tests/*.test.mjs`)
  - **End-to-End**: Playwright (`tests/e2e/*.spec.js`) and Cypress (`cypress/e2e/*.cy.js`)
- **Deployment**: GitHub Pages via `.github/workflows/deploy.yml` with custom domain `mafia.appilico.com` (`CNAME`)

## Folder Structure

```text
PWA/
├── index.html                   # SPA entry point & Service Worker registration
├── manifest.json                # PWA manifest (icons, standalone display, RTL)
├── sw.js                        # Service Worker for offline caching
├── CNAME                        # Custom domain (mafia.appilico.com)
├── build.cjs                    # Copies web assets into www/ for deploy & Capacitor
├── capacitor.config.json        # Capacitor native app configuration
├── BUILD_NATIVE.md              # Step-by-step Android & iOS native build guide
├── css/
│   └── styles.css               # Dark UI theme, RTL/LTR layout, and component styles
├── assets/                      # SVG/PNG app icons and touch icons
├── js/
│   ├── app.js                   # Main application controller
│   ├── native.js                # Capacitor native bridge (back button, status bar)
│   ├── engine/                  # Component, EventBus, and client-side Router
│   ├── models/                  # Core game rules (Game, Player, Roles, Bomb, Shield, Curse, BulletManager, Framason, LastActionManager)
│   ├── components/              # GodDashboard, PhaseBar, PlayerList, RoleCard, StatBar, TargetGrid, TimerWidget
│   ├── views/                   # HomeView, SetupView, ManualAssignView, RoleRevealView, NightView, DayView, SummaryView
│   └── utils/                   # i18n, Settings, Storage, Timer
├── tests/
│   ├── *.test.mjs               # Vitest unit, mechanics, scenario, and deep engine test suites
│   └── e2e/*.spec.js            # Playwright end-to-end browser specs
├── cypress/
│   └── e2e/*.cy.js              # Cypress mobile-viewport E2E test suites
├── android/                     # Native Android (Kotlin / Jetpack Compose) project
└── .github/workflows/deploy.yml # GitHub Pages CI/CD pipeline
```

## Development & Testing Commands

### Install Dependencies

```bash
npm install
```

### Build & Serve Locally

```bash
# Build static PWA output into www/
npm run build

# Serve www/ locally on http://localhost:5173
npm run serve
```

### Unit & Integration Tests (Vitest)

```bash
# Run all Vitest suites once
npm test

# Watch mode
npm run test:watch

# Run standalone sniper test script
npm run test:sniper
```

### End-to-End Tests (Playwright & Cypress)

```bash
# Playwright E2E suite (auto-starts `npm run serve` on port 5173)
npx playwright test

# Cypress E2E suite (requires `npm run serve` running on port 5173)
npx cypress run
# or interactive UI:
npx cypress open
```

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which:
1. Runs `node build.cjs` to assemble the static site into `www/`.
2. Copies `CNAME` (`mafia.appilico.com`) into `www/CNAME`.
3. Uploads and deploys `www/` to GitHub Pages.

## Native Mobile Builds

For packaging the PWA into standalone offline Android (`.apk` / `.aab`) and iOS (`.ipa`) builds via Capacitor, see **[BUILD_NATIVE.md](BUILD_NATIVE.md)**.

Quick Capacitor sync commands:

```bash
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```
