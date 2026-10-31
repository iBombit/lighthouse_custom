# ⚙️ settings

Configuration layer for Lighthouse, Puppeteer, custom audits, gatherers, and test execution.
Compatible with **Lighthouse v13**.

---

## settings/browser.ts

Browser launch configuration — maps browser type + headless mode to Puppeteer launch options.

**Browser**

- **Constructor**: `new Browser(os)` — `os.type()` value (the Chrome path is then auto-detected) or an explicit executable path
- **Properties**: `os`, `browserLocation`
- **Getters** (Puppeteer `LaunchOptions`):
  - `headlessDesktop` / `headfulDesktop` — desktop launch configs
  - `headlessMobile` / `headfulMobile` — mobile launch configs
- Browser args come from `settings.browserArgs.headless|headful` of the custom config file, with built-in defaults.

---

## settings/constants.ts

Device presets and network throttling profiles (`DeviceProfile` interface).

**Device Classes**

| Class | Profile |
|-------|---------|
| `Desktop` | 1920×1080, 10 Mbps down / 2 Mbps up, 40 ms RTT |
| `Mobile` | 390×844 @3x, 10 Mbps, 40 ms RTT |
| `Mobile3G` | 360×640, 700 kbps, 300 ms RTT |
| `Mobile4G` | 360×640, 1.6 Mbps, 150 ms RTT, touch |
| `Mobile4G_Slow` | 360×640, 0.8 Mbps, 150 ms RTT, touch |

- **BrowserLocations** — auto-detects Chrome/Chromium path per OS (Windows / macOS / Linux).
- **`BrowserType`** — `'desktop' | 'mobile' | 'mobile3G' | 'mobile4G' | 'mobile4GSlow'`.

---

## settings/configLoader.ts

Builds the Lighthouse config for a device profile and merges the custom JSON config file (`--configFile`).

- **`getLighthouseConfigByBrowserType(browserType)`** — full config (`extends: 'lighthouse:default'`) with throttling,
  screen emulation, form factor, the custom artifacts/audits and the `custom-metrics` category, shallow-merged with the
  custom config file (`groups` are merged key by key). Framework-only settings (`browserArgs`, `onlyCategories`) are
  removed before reaching Lighthouse. With `--jsProfiling=true` it adds the `disabled-by-default-v8.cpu_profiler`
  trace category (`additionalTraceCategories`).
- **`getOnlyCategories()`** / **`getOnlyCategoriesForMode(mode)`** — `settings.onlyCategories` from the custom config,
  optionally filtered to categories that support the gather mode (applied per flow step).
- **`loadCustomConfig()`** / **`getBrowserArgsFromCustomConfig(isHeadless)`** — custom config file helpers.

Custom audits and gatherers are referenced by the absolute path of the installed build.

**Custom category: `custom-metrics` ("Custom Metrics")**

All framework audits in one report section (navigation and timespan steps). Formerly `server-side` ("Server-Side
Metrics"): `server-side` in `settings.onlyCategories` is still accepted and mapped to `custom-metrics`.

| Group | Audits |
|-------|--------|
| *(top, added when reports are created)* | `frontend-issues` · `web-vitals-overview` |
| Main thread & Total Blocking Time | `tbt-breakdown` · `main-thread-timeline` · `js-hotspots` · `main-thread-tasks` · `mainthread-work-breakdown` |
| Network & server | `longest-first-party-request` · `slowest-network-request` · `network-requests` · `network-waterfall` · `network-rtt` · `network-server-latency` · `network-xhr-audit` · `xhr-count-audit` |
| Rendering, screenshots & memory | `final-screenshot` · `enhanced-screenshot-thumbnails` · `selector-timing-audit` · `memory-audit` |

The category score uses the same weighted audits as `server-side` did; the main-thread and overview audits have
weight 0 and none of the new audits has a `numericValue`, so the Datadog / InfluxDB reporters send no new metrics.

---

## settings/mochaHooks.ts

Mocha lifecycle hooks that wire up the browser and reporting.

| Hook | Purpose |
|------|---------|
| `beforeHook` | Launches the browser via `setupBrowser()` |
| `beforeEachHook` | Applies `--testTime` and skips the test if the previous step failed or timed out |
| `afterEachHook` | Logs test completion; saves the page HTML to `./reports/errors/` when a test failed |
| `afterHook` | Takes a final snapshot, generates reports, sends metrics, closes the browser |

`HookContext` describes the part of Mocha's hook context the hooks use (Mocha's `Context` is assignable to it).

---

## settings/testParams.ts

CLI argument parser and browser singleton manager. Parameter names are case-insensitive (`--name=value`).

**Key Parameters**

| Param | Default | Description |
|-------|---------|-------------|
| `--url` | — | Target URL |
| `--browserType` | `desktop` | `desktop` · `mobile` · `mobile3G` · `mobile4G` · `mobile4GSlow` |
| `--headless` | `true` | Headless mode toggle |
| `--browserLocation` | auto | Browser executable path |
| `--loops` | `1` | Number of test iterations |
| `--testTime` | `120` (sec) | Per-test timeout |
| `--suitTime` | `1800` (sec) | Suite-level timeout |
| `--login` / `--password` | — | Credentials |
| `--regions` | `not set` | Dot-separated region list |
| `--configFile` | — | Path to custom Lighthouse JSON config |
| `--generateCSV` | `false` | Enable CSV performance report |
| `--includeTimestamp` | `false` | Append timestamp to report filenames |
| `--saveTraces` | `false` | Save each step's trace to `./reports/traces/` to open in the DevTools Performance panel |
| `--jsProfiling` | `false` | Record V8 JavaScript samples for the `js-hotspots` audit (adds overhead — compare metrics only between runs with the same setting) |

**Reporting Params**: `--ddHost` · `--ddKey` · `--influxUrl` · `--influxToken` · `--influxOrg` · `--influxBucket` · `--influxUsername` · `--influxPassword` · `--influxDatabase` · `--teamsWebhook` · `--slackWebhook` · `--teamsWorkflow` (alias `--teamsWorkflowUrl`) · `--ciUrl`

**Functions**

- **`setupBrowser()`** — creates and initializes the singleton `LighthouseBrowser` instance.
- **`getBrowserInstance()`** — returns the existing instance or throws if not initialized.

---

## settings/audits/

15 custom Lighthouse audits registered in the config, plus `network-audit` (deprecated alias, see below),
`metrics-to-audits` and the helper modules `main-thread-analysis`, `cpu-profile-analysis`, `deep-dive-context` and `network-timing`. Audits extend `Audit` from `lighthouse` and use v13 artifact access patterns
(`artifacts.Trace`, `artifacts.DevtoolsLog`).

### Network Audits

| Audit | ID | What it measures |
|-------|----|------------------|
| `network-requests.ts` | `network-requests` | Requests grouped by entity (first/third party) with timing, size, status and type. Score: time until the last request finished. Not applicable when the step made no requests |
| `network-waterfall.ts` | `network-waterfall` | Waterfall chart in start order: DevTools timing phases per request (queued / DNS / connect / SSL / waiting for the server / download), render-blocking requests and the LCP resource flagged, FCP/LCP/DCL/Load markers, main-thread lane, per-entity summary; plus a "slowest requests — where the time went" table |
| `network-server-latency.ts` | `network-server-latency` | Estimated server time per origin, with its request count and slowest request (TTFB) |
| `network-longest-first-party.ts` | `longest-first-party-request` | Slowest request to the page's own entity (extends `network-requests`), split into stalled + connect / server (TTFB) / download with a diagnosis |
| `network-slowest-request.ts` | `slowest-network-request` | Slowest request overall (extends `network-requests`), with the same breakdown |
| `network-xhr-audit.ts` | `network-xhr-audit` | API calls (XHR/Fetch) with request bodies, server time (TTFB) and download time |
| `xhr-count-audit.ts` | `xhr-count-audit` | API call count by method / status / domain, plus repeated identical calls |
| `network-audit.ts` | `network-audit` | Deprecated: Lighthouse's `mainthread-work-breakdown` under its 1.x id, kept for old custom configs (not registered) |

### Main thread & Total Blocking Time (deep dive)

DevTools-Performance-panel-style analysis built on Lighthouse's own computed artifacts (`TBTImpactTasks`,
`MainThreadTasks`), so the numbers reconcile with Lighthouse's TBT. Charts are SVG images in the report (click to open full size).

| Audit | ID | What it shows |
|-------|----|---------------|
| `tbt-breakdown.ts` | `tbt-breakdown` | Where TBT comes from: main-thread lane with long tasks (blocking part hatched), the TBT window and FCP/LCP/DCL/Load/TTI markers; TBT contribution per script (1st / 3rd party); long tasks with the scripts that ran in them; activity inside long tasks. Scored with Lighthouse's TBT curve |
| `main-thread-timeline.ts` | `main-thread-timeline` | CPU activity by category over time (like the DevTools CPU track), task lane, Summary (time per activity) and Bottom-Up by script |
| `js-hotspots.ts` | `js-hotspots` | Bottom-Up by function: JavaScript functions with the most self time inside long tasks, from V8 samples. Needs `--jsProfiling=true` (not applicable otherwise) |

### Performance & Diagnostics

| Audit | ID | What it measures |
|-------|----|------------------|
| `main-thread-tasks.ts` | `main-thread-tasks` | Top-level main-thread tasks (> 5 ms) in start order with blocking time, TBT impact, main activity and script |
| `memory-audit.ts` | `memory-audit` | Informative: elements in the page, plus JS heap after garbage collection, DOM nodes, event listeners and documents of the renderer process at the end of the step. The process also holds earlier pages kept in Chrome's back/forward cache, so absolute values grow page after page; growth across interactions on the same page is reported as a possible leak |
| `selector-timing-audit.ts` | `selector-timing-audit` | Time until the `pageValidate` element was found (measured by `navigationValidate()`). Not applicable when the step didn't validate the page |

### Screenshots

| Audit | ID | What it measures |
|-------|----|------------------|
| `final-screenshot.ts` | `final-screenshot` | Last screenshot of the step = last visual change, with its time (score: ≤ 2 s good, 4 s → 0.5) |
| `enhanced-screenshot-thumbnails.ts` | `enhanced-screenshot-thumbnails` | Filmstrip of up to 10 key frames (first frame, first visual change, FCP, LCP, visually complete, last change) with a frame timeline |

### Metric Mappings

- **`metrics-to-audits.ts`** — maps core Web Vitals (FCP, LCP, TBT, CLS, INP) to their relevant v13 insight audits for contextual report enrichment.

---

## settings/gatherers/

3 custom Lighthouse gatherers extending `Gatherer` from `lighthouse`.

| Gatherer | Artifact ID | What it collects |
|----------|-------------|------------------|
| `memory-gatherer.ts` | `MemoryProfile` | JS heap (`Runtime.getHeapUsage`), DOM counters (`Memory.getDOMCounters`) and the page's element count at the end of the step, after a forced garbage collection (`HeapProfiler.collectGarbage`; done after the trace was recorded, so it doesn't affect the step's metrics) |
| `selector-timing-gatherer.ts` | `SelectorTiming` | `window.pageValidateTiming` stored by `Page.navigationValidate()` |
| `network-request-bodies-gatherer.ts` | `NetworkRequestBodies` | Request bodies of XHR/Fetch requests (`Network.getRequestPostData`) |

## Shared modules

- **`audits/main-thread-analysis.ts`** — pure analysis of task trees: self-time intervals, CPU activity bins, TBT attribution per script, long-task summaries.
- **`audits/cpu-profile-analysis.ts`** — self / total time per function from the V8 CPU profile.
- **`audits/deep-dive-context.ts`** — loads tasks with TBT impact, the TBT window, markers and 1st/3rd-party attribution for the deep-dive audits.
- **`audits/network-timing.ts`** — per-request DevTools timing phases from Chrome's resource timing, render-blocking requests and the LCP request (from Lighthouse's trace engine), cache source and a short "where the time went" hint.

- **`custom-artifacts.ts`** — types of the three custom artifacts; registers them with Lighthouse's
  `GathererArtifacts` typings (module augmentation) so audits can use them type-safely.
- **`network-filters.ts`** — XHR/static/ad request classification shared by the XHR audits and the request-bodies gatherer.
