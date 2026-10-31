# lh-pptr-framework

Customizable framework for UI performance testing of multiple pages / SPA actions within a single
[Lighthouse](https://github.com/GoogleChrome/lighthouse) user-flow report, driven by
[Puppeteer](https://pptr.dev/) and [Mocha](https://mochajs.org/).

Written in **TypeScript** and published as compiled ES modules with type declarations.
The test project that uses it lives on the [`main` branch](https://github.com/iBombit/lighthouse_custom).

| Module | Contents |
|--------|----------|
| [`core/`](core/README.md) | `LighthouseBrowser`, the `Page` base page object and UI element wrappers |
| [`settings/`](settings/README.md) | CLI parameters, Lighthouse/Puppeteer configuration, Mocha hooks, custom audits & gatherers |
| [`reporting/`](reporting/README.md) | HTML/JSON report generation and metric reporters (Datadog, InfluxDB, Slack, Teams, CSV) |
| [`logger/`](logger/README.md) | Shared Winston logger |

## Requirements

- Node.js **≥ 22.19** (required by Lighthouse 13)
- Peer dependencies installed by the test project: `lighthouse` 13, `puppeteer-core` (or `puppeteer`), `winston` 3

## Usage

Import modules by their path — the same paths as in 1.x:

```js
import LighthouseBrowser from 'lh-pptr-framework/core/browser.js';
import Page from 'lh-pptr-framework/core/page.js';
import Button from 'lh-pptr-framework/core/elements/button.js';
import { beforeHook, beforeEachHook, afterEachHook, afterHook } from 'lh-pptr-framework/settings/mochaHooks.js';
import * as params from 'lh-pptr-framework/settings/testParams.js';
```

Each path maps to `dist/<path>` through the package `exports`, so JavaScript test suites keep working
unchanged, and TypeScript test suites get typings for the same imports (`moduleResolution` `node16`,
`nodenext` or `bundler`; `node10` is covered by `typesVersions`).

See the [`main` branch README](https://github.com/iBombit/lighthouse_custom/blob/main/README.md) for the
command-line parameters and the custom config file.

## Performance deep dive

Every page-load (navigation) and interaction (timespan) step of `reports/user-flow.report.html` has a **Custom Metrics**
section (click its gauge at the top of the step) with, from top to bottom:

1. **Issues for frontend developers** — prioritized (P1–P3) findings for the step; expand a row for the evidence.
2. **Web Vitals at a glance** — each metric against Lighthouse's good / needs-improvement / poor thresholds.
3. **Main thread & Total Blocking Time**
   - *Total Blocking Time breakdown* — main-thread timeline with long tasks (blocking part hatched red), the TBT window
     and FCP/LCP/TTI markers; TBT contribution per script (1st / 3rd party); long tasks and the scripts in them. Adds up to
     Lighthouse's TBT.
   - *Main-thread activity* — CPU activity by category over time, Summary and Bottom-Up by script, like the DevTools Performance panel.
   - *JavaScript hot spots in long tasks* — Bottom-Up by function (with `--jsProfiling=true`).
4. **Network & server** — the request waterfall (DevTools timing phases per request, render-blocking requests and the
   LCP resource flagged, main-thread lane) with the slowest requests split into server time and download, API / XHR
   calls with server time, repeated and failing calls, server latency per origin.
5. **Rendering, screenshots & memory** — key frames with visual progress, last visual change, page-validation timing,
   page size, JS heap and event listeners after garbage collection (growth across interactions on one page is reported
   as a possible leak).

Hover a chart for the details of each bar / row; "Open full size" opens it in a new tab. The issues of all steps are also written next to the report as
`frontend-issues.md` (to read or paste into tickets), `frontend-issues.json` and `frontend-issues.jira.csv` (Jira
"Import issues from CSV"); a panel in the report links to them.

Optional flags:

| Flag | Effect |
|------|--------|
| `--saveTraces=true` | Saves each step's trace to `reports/traces/` — open it in the DevTools Performance panel (Load profile) for full call stacks |
| `--jsProfiling=true` | Records JavaScript samples for function-level hot spots. Sampling adds overhead, so compare metrics only between runs with the same setting |

The deep-dive audits add no `numericValue`, so the Datadog / InfluxDB reporters send the same metrics as before.

## Development

```bash
npm install          # TypeScript, typings and the peer packages used for type-checking
npm run build        # compile *.ts -> dist/ (JavaScript + .d.ts)
npm run typecheck    # strict type-check of sources and tests
npm test             # build + type-check + unit tests (node:test, no browser needed)
```

Sources are the `.ts` files in `core/`, `logger/`, `reporting/` and `settings/`; `dist/` is generated and
not committed. `package-lock.json` is committed so that CI installs exactly the same dependencies (`npm ci`).
`npm pack` / `npm publish` build automatically (`prepack`).

### CI and releases

| Workflow | Runs on | What it does |
|----------|---------|--------------|
| `framework_ci.yml` | pull requests to `framework`, and before every release | Build, type-check and unit tests on Node 22 / 24 / 26 (Linux) and Node 24 (Windows); package-contents check and a smoke test of the packed tarball in a fresh project; dependency review of the PR |
| `codeql.yml` | pull requests and pushes to `framework` | CodeQL security analysis of the TypeScript sources and of the workflows |
| `publish_npm_package.yml` | pushes to `framework`; manually (dry run by default) | Runs CI, then publishes the `version` from `package.json` with npm trusted publishing (OIDC, no npm token) and provenance, then creates the `lh-pptr-framework@<version>` tag and GitHub release. A version that is already on npm is skipped |

To release, bump `version` in `package.json` in the pull request; merging it publishes. Pre-release versions
(`2.1.0-beta.1`) are published under the `next` dist-tag instead of `latest`. Actions are pinned to commit SHAs
(Dependabot keeps them up to date), and every job runs with read-only permissions unless it needs more.

To try a local build in the test project without publishing:

```bash
npm pack                                               # in this repo -> lh-pptr-framework-<version>.tgz
npm install ../path/to/lh-pptr-framework-<version>.tgz # in the test project
```

## 2.0.0 — TypeScript rewrite

The public API, CLI parameters, reports and metrics are unchanged. Differences from 1.3.7:

- **Package layout**: compiled files live in `dist/` and are exposed through `exports`; only the module
  paths listed above (`lh-pptr-framework/<dir>/<file>.js`) can be imported.
- **Fixed** `Button.doubleClick()` and `TextField.clear()`: Puppeteer ≥ 22 ignores the `clickCount` click option
  they used, so they performed a single click (the double click never registered, and `clear()` didn't select
  the text). They now pass `count`.
- **Fixed** `Button.clickAndHold()` / `TextField.clear()` on elements inside an iframe (they used the frame's
  non-existent `mouse`/`keyboard`); an invalid `browserType` now raises the intended error message.
- **Fixed** `slowest-network-request` / `longest-first-party-request` failing with "Invalid score … NaN" (which
  also blanked the step's `server-side` score) when the first listed request had no duration — e.g. a beacon from
  the previous page that never finished. Requests without a duration are now skipped.
- Custom audits/gatherers are registered in the Lighthouse config by absolute path of the installed build
  (previously by package name), so Lighthouse always loads the same copy of the framework.
- **Category renamed**: "Server-Side Metrics" (`server-side`) is now **"Custom Metrics"** (`custom-metrics`) and also
  holds the new deep-dive audits (see above). Its score is computed from the same audits as before. `server-side` in
  `settings.onlyCategories` keeps working (mapped to `custom-metrics`); JSON consumers should read
  `categories['custom-metrics']`.
- Reports are built from a single audit pass (1.x audited the flow twice: once for the HTML, once for the JSON).
- **Existing audits reviewed** so each one is actionable (details in `settings/README.md`):
  - `memory-audit` measured native allocation samples (> 1 MB → fail), failed on practically every real page and showed
    no data. It now lists the page's element count and, after garbage collection, the JS heap, DOM nodes, event listeners
    and documents. It is informative (weight 0, so the Custom Metrics score no longer includes a near-constant 0): the
    heap covers the renderer process, which also keeps earlier pages of the flow in the back/forward cache. Memory that
    keeps growing over interactions on one page is reported as a possible leak; still no `numericValue`.
  - `selector-timing-audit` scored 1 and sent a `0 ms` value to Datadog / InfluxDB when the step didn't validate the
    page; it is now *not applicable* in that case (no value sent).
  - `network-requests` showed "-∞ s" (and a null value) for steps without requests; now *not applicable*.
  - `enhanced-screenshot-thumbnails` embedded every frame of the step (185 frames / 2 MB for one interaction in a real
    run); it now shows up to 10 key frames with visual progress. A 15-step report went from 23 MB to 11 MB.
  - `network-waterfall` was rebuilt: requests in start order with DevTools timing phases, render-blocking / LCP flags, a
    main-thread lane and a "slowest requests — where the time went" table (it used to group bars by entity).
  - `longest-first-party-request` takes the first party from the step's page (Lighthouse entity) instead of `--url`;
    it and `slowest-network-request` now split the request into stalled + connect / server (TTFB) / download.
  - `xhr-count-audit` grouped failed requests as "NaNxx" / "-100xx"; repeated identical calls are now listed.
  - `main-thread-tasks` lists blocking time, TBT impact, activity and script per task; `network-xhr-audit` and
    `network-server-latency` add server-time columns; `network-audit` (never registered, a copy of Lighthouse's
    `mainthread-work-breakdown`) is now a deprecated alias of it.
  - Metrics sent to Datadog / InfluxDB are unchanged, except that `selector-timing-audit` no longer sends `0`.
- The HTML report uses up to 1440 px of the window (Lighthouse's default 840 px column shrank the charts to about half
  their size), and the charts are inlined as SVG: hovering a bar / row shows its details in place.
- Report JSON details: the tables of `main-thread-tasks` and `xhr-count-audit` use Lighthouse's current
  `valueType`/`label` heading keys instead of the legacy `itemType`/`text` (Lighthouse's report renderer converted
  those). `network-waterfall` and `enhanced-screenshot-thumbnails` details are now `list`s of sections (chart / filmstrip
  + table) instead of a single table.
