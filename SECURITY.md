# Fjord security model

## Scope

Fjord is designed as a privacy-first personal activity product. This repository contains the static web experience and an early Manifest V3 extension foundation. Production authentication, ingestion, storage, and deployment controls must be supplied by the chosen hosting environment before real user data is enabled.

## Data minimization

The extension must not capture keystrokes, passwords, payment values, screenshots, screen recordings, Incognito activity, browser-internal pages, or sensitive-domain page content. The local event queue is bounded to prevent unbounded browser storage growth. Users must be able to pause, exclude domains, export data, and delete data.

## Implemented backend controls

The API uses strict Zod schemas, a bounded JSON body, Helmet security headers, an explicit CORS origin, authenticated bearer tokens with HMAC verification, per-user repository queries, user-scoped idempotency keys, parameterized PostgreSQL queries, a bounded connection pool, and a per-IP request rate limit. The event store has user and timestamp indexes and rejects unbounded event batches.

The extension stores its event queue locally but keeps the access token in Chrome session storage rather than persistent local storage. The static marketing/dashboard page does not read tokens from browser storage. Proxy trust is disabled by default and must be explicitly enabled only when the deployment is behind a trusted proxy.

## Required production controls

Before onboarding users, the backend must enforce authenticated ingestion, per-user authorization on every read and write, idempotency keys for event batches, request-size limits, rate limits, encrypted transport, encryption at rest, structured audit events without raw URLs, short-lived access tokens, secure cookies, CSRF protection where cookie-authenticated mutations are used, and generic error responses that never expose stack traces.

The web application must validate all incoming data against a strict schema. It must not accept arbitrary HTML, executable URLs, unbounded text fields, or user-controlled SQL fragments. Aggregation queries must use parameterized statements and bounded date ranges.

## Supply-chain and repository controls

Commits must not contain credentials, private keys, `.env` files, production exports, or customer data. Dependency installation must use a lockfile once dependencies are introduced. CI should run the repository checks, tests, build, dependency audit, and secret scanning on every push and pull request. Dependabot or an equivalent update alert should be enabled on GitHub.

## Scale target

The initial architecture is intended for approximately 1,000 users with batched event ingestion. The backend should enforce per-user quotas, batch-size limits, retention and rollup policies, and observability for ingestion latency, queue depth, error rates, and database growth. Horizontal scaling and an external queue are not required for the first milestone but should remain possible behind the ingestion boundary.

## Incident response

Preserve logs and request identifiers without recording sensitive URLs. Disable affected tokens, isolate the affected service, determine the data boundary, patch and test the issue, and review notification obligations with qualified legal counsel before making user or regulatory notifications. Never publish secrets or private user data in an issue.

## Safe reporting

Report security issues privately to the repository owner. Include the affected file or endpoint, reproduction steps against a local or authorized staging copy, impact evidence, and a proposed mitigation. Do not test production with destructive payloads, denial-of-service traffic, credential attacks, or unauthorized access attempts.
