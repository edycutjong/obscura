# Changelog

All notable changes to this project will be documented in this file.

## [1.7.1](../../compare/v1.7.0...v1.7.1) (2026-08-22)

### 🐛 Bug Fixes

- **deps:** resolve 8 dependency vulnerabilities via lockfile (1cc1a4f)

### 🔧 Chores

- **deps-dev:** bump tsx from 4.23.9 to 4.23.12 (#46) (5dd9e29)
- **deps-dev:** bump prettier from 3.9.5 to 3.9.6 (#33) (4e18ccf)
- **deps-dev:** bump tsx from 4.23.0 to 4.23.9 (#34) (1eabc57)
- **deps-dev:** bump tailwindcss from 4.3.2 to 4.3.3 (#35) (e53b413)
- **deps:** bump next from 16.2.10 to 16.3.0 (#37) (0f370b2)
- **deps:** bump @supabase/supabase-js from 2.110.2 to 2.112.1 (#38) (630aee3)
- **deps-dev:** bump @playwright/test from 1.61.0 to 1.62.1 (#39) (f055f81)
- remove agent instruction files from public repo (e65d702)
- **deps-dev:** bump eslint-config-next from 16.2.9 to 16.3.0 (#14) (8992700)
- **deps-dev:** bump @tailwindcss/postcss from 4.3.1 to 4.3.2 (#15) (5e3ae26)
- **deps-dev:** bump tailwindcss from 4.3.1 to 4.3.2 (#16) (a5d17fd)
- **deps:** bump next from 16.2.9 to 16.2.10 (#17) (2e6e522)
- **deps-dev:** bump tsx from 4.22.4 to 4.23.0 (#18) (1832d30)
- **deps:** bump @supabase/supabase-js from 2.108.2 to 2.110.2 (#24) (2f984e9)
- **deps-dev:** bump prettier from 3.8.4 to 3.9.5 (#25) (5c1f111)

### 📝 Documentation

- **readme:** link the hook contract ID to stellar.expert (800c569)
- **readme:** point judges at the one-click on-chain verify (76b2030)

## [1.7.0](../../compare/v1.6.0...v1.7.0) (2026-07-02)

### 🚀 Features

- **zk:** witness the real on-chain proof in-browser (b4956f5)

## [1.6.0](../../compare/v1.5.0...v1.6.0) (2026-07-02)

### 🚀 Features

- **ui:** show app version badge in footer (06885ac)

## [1.5.0](../../compare/v1.4.1...v1.5.0) (2026-07-02)

### 🚀 Features

- **seo:** robots + sitemap, security headers, next/image logo (6ea768f)

## [1.4.1](../../compare/v1.4.0...v1.4.1) (2026-07-01)

### 🐛 Bug Fixes

- **footer:** point SPECIFICATION/SECURITY AUDIT to real GitHub docs (aabfd4f)

## [1.4.0](../../compare/v1.3.0...v1.4.0) (2026-07-01)

### 🚀 Features

- **ui:** wallet Disconnect button, custom 404, Privacy & Terms pages (bfcf391)

## [1.3.0](../../compare/v1.2.0...v1.3.0) (2026-07-01)

### 🚀 Features

- **wallet:** real Freighter connect via official SDK + demo button (96b3eca)

### 💄 Style

- fix prettier formatting (509d8a4)
- format pitch.html with prettier (b1198b0)

### ✅ Tests

- **core:** verify and complete unit test suites and coverage (2ab3717)

### 📝 Documentation

- **pitch:** replace page 1 emojis with SVG icons (81b8750)
- **pitch:** replace emoji with logo icon and update demo video link (06c0867)

## [1.2.0](../../compare/v1.1.0...v1.2.0) (2026-06-29)

### 🚀 Features

- **dashboard:** show verify entrypoint in telemetry console, refine stats, and add README screenshots (e3348d0)
- **obscura:** update contract ids to real testnet deployments (7412ed2)

### 💄 Style

- **obscura:** run prettier to format codebase (d721957)

### 🔧 Chores

- **obscura:** update screenshot assets (df99b89)

### 📝 Documentation

- **readme:** update demo video YouTube URL and configuration (00b2e23)
- **readme:** update readme content and references (b8efe6a)
- **readme:** add Demo Materials section and link GitHub & Pitch Deck (785c150)

## [1.1.0](../../compare/HEAD~50...v1.1.0) (2026-06-28)

### 🚀 Features

- **setup:** initialize project codebase (012c886)

### 🐛 Bug Fixes

- **ci:** run next build in E2E job before running playwright tests (e015588)
- **css:** inline design tokens directly into globals.css and delete _tokens.css (2b72bdc)
- **css:** move _tokens.css out of gitignored folder, adjust imports, increase bundle size limits, and format files (1adb9e8)
- **package:** update homepage url to custom domain obscura.edycu.dev (0b6dc72)
- **ci:** add package repo metadata, sync lockfile, and upgrade CI to Node 22 (b75d2ad)

### 🤖 CI/CD

- **deploy:** add Vercel CLI deployment steps to CI workflow (abe1639)

