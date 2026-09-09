# Fjord

Fjord is a private work-intelligence product: an award-style web experience paired with a Manifest V3 Chrome extension foundation. It is designed to help a person understand the shape of a working day without recording invasive data.

## Current foundation

- Editorial, motion-led dashboard experience in `web/`.
- Chrome extension foundation in `extension/`.
- Durable local event queue and bounded storage.
- Visible pause/resume control and domain exclusions.
- Explicit guards against browser-internal and sensitive domains.
- Repository checks, tests, build packaging, and GitHub Actions quality gates.
- Security model and production-readiness requirements in `SECURITY.md`.

## Local checks

This repository intentionally has no runtime dependency beyond Node.js 20 for the current foundation.

```bash
npm run check
npm test
npm run build
```

Open `web/index.html` directly for a quick static preview, or serve the repository with any static HTTP server. Load `extension/` through `chrome://extensions` with Developer mode enabled for local extension testing.

## Next production milestone

The next implementation step is an authenticated HTTPS ingestion service with strict schema validation, per-user authorization, idempotent batch writes, retention controls, and dashboard data queries. Do not connect the extension to a production endpoint until those controls are implemented and tested.

## Ownership

Repository and commit identity: **mantisdarling**.
