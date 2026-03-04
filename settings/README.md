# ⚙️ settings

Configuration layer for Lighthouse, Puppeteer, custom audits, gatherers, and test execution.
Compatible with **Lighthouse v13**.

---

## settings/browser.js

Browser launch configuration — maps browser type + headless mode to Puppeteer launch args.

**Browser**

- **Properties**: `os`, `browserLocation`
- **Methods**:
  - `headlessDesktop` / `headfulDesktop` — desktop launch configs
  - `headlessMobile` / `headfulMobile` — mobile launch configs

---

## settings/constants.js

Device presets and network throttling profiles.

**Device Classes**

| Class | Profile |
|-------|---------|
| `Desktop` | 1920×1080, 10 Mbps, no CPU throttle |
| `Mobile` | 390×844, 10 Mbps, no CPU throttle |
| `Mobile3G` | 390×844, 1.6 Mbps, 4× CPU slowdown, 300 ms RTT |
| `Mobile4G` | 390×844, 9 Mbps, 2× CPU slowdown, 170 ms RTT |
| `Mobile4G_Slow` | 390×844, 4 Mbps, 4× CPU slowdown, 170 ms RTT |

- **BrowserLocations** — auto-detects Chrome/Chromium path per OS (Windows / macOS / Linux).

---

## settings/lighthouse.js

Builds the Lighthouse config object for a given device profile.

- **`createBaseConfig(device)`** — generates a full config (`extends: 'lighthouse:default'`) with throttling, screen emulation, form factor, custom artifacts, audits, and the `server-side` category.
- **`getConfigByBrowserType(browserType)`** — resolves the device class and optionally merges a user-provided JSON config file.

**Custom Category: `server-side`**

Groups custom audit results into a dedicated "Server-Side Metrics" section in the report:
`network-requests` · `network-server-latency` · `network-rtt` · `longest-first-party-request` · `slowest-network-request` · `main-thread-tasks` · `mainthread-work-breakdown` · `final-screenshot` · `enhanced-screenshot-thumbnails` · `memory-audit` · `selector-timing-audit` · `network-xhr-audit` · `xhr-count-audit`

---

## settings/mochaHooks.js

Mocha lifecycle hooks that wire up the browser and reporting.

| Hook | Purpose |
|------|---------|
| `beforeHook` | Launches the browser via `setupBrowser()` |
| `beforeEachHook` | Validates previous flow completed before continuing |
| `afterEachHook` | Logs test completion |
| `afterHook` | Generates reports, sends metrics, closes browser |

- **`getCurrentDate()`** — formatted timestamp for report filenames.

---

## settings/testParams.js

CLI argument parser and browser singleton manager.

**Key Parameters**

| Param | Default | Description |
|-------|---------|-------------|
| `--url` | — | Target URL |
| `--browserType` | `desktop` | `desktop` · `mobile` · `mobile3G` · `mobile4G` · `mobile4GSlow` |
| `--headless` | `true` | Headless mode toggle |
| `--loops` | `1` | Number of test iterations |
| `--testTime` | `120` (sec) | Per-test timeout |
| `--suitTime` | `1800` (sec) | Suite-level timeout |
| `--login` / `--password` | — | Credentials |
| `--regions` | `not set` | Dot-separated region list |
| `--configFile` | — | Path to custom Lighthouse JSON config |
| `--generateCSV` | `false` | Enable CSV performance report |
| `--includeTimestamp` | `false` | Append timestamp to report filenames |

**Reporting Params**: `--ddHost` · `--ddKey` · `--influxUrl` · `--influxToken` · `--influxOrg` · `--influxBucket` · `--influxUsername` · `--influxPassword` · `--influxDatabase` · `--teamsWebhook` · `--slackWebhook` · `--teamsWorkflowUrl` · `--ciUrl`

**Functions**

- **`setupBrowser()`** — creates and initializes the singleton `LighthouseBrowser` instance.
- **`getBrowserInstance()`** — returns the existing instance or throws if not initialized.

---

## settings/audits/

11 custom Lighthouse audits extending `Audit` from `lighthouse`. All use v13 artifact access patterns (`artifacts.Trace`, `artifacts.DevtoolsLog`).

### Network Audits

| Audit | ID | What it measures |
|-------|----|------------------|
| `network-audit.js` | `network-audit` | Full network request table with URL, method, status, size, timing, priority, and main-thread correlation |
| `network-requests.js` | `network-requests` | Parsed network log with request details, frame-aware filtering |
| `network-server-latency.js` | `network-server-latency` | Server response latency per origin |
| `network-longest-first-party.js` | `longest-first-party-request` | Slowest first-party request (extends `network-requests`) |
| `network-slowest-request.js` | `slowest-network-request` | Slowest request overall (extends `network-requests`) |
| `network-xhr-audit.js` | `network-xhr-audit` | XHR/Fetch requests with response bodies |
| `xhr-count-audit.js` | `xhr-count-audit` | Total XHR/Fetch request count |

### Performance & Diagnostics

| Audit | ID | What it measures |
|-------|----|------------------|
| `main-thread-tasks.js` | `main-thread-tasks` | Long main-thread tasks (> 50 ms) from trace data |
| `memory-audit.js` | `memory-audit` | JS heap usage via `Performance.getMetrics()` |
| `selector-timing-audit.js` | `selector-timing-audit` | Element selector resolution timing from custom gatherer |

### Screenshots

| Audit | ID | What it measures |
|-------|----|------------------|
| `final-screenshot.js` | `final-screenshot` | Final rendered screenshot with timing metadata |
| `enhanced-screenshot-thumbnails.js` | `enhanced-screenshot-thumbnails` | Screenshot filmstrip thumbnails from trace |

### Metric Mappings

- **`metrics-to-audits.js`** — maps core Web Vitals (FCP, LCP, TBT, CLS, INP) to their relevant v13 insight audits for contextual report enrichment.

---

## settings/gatherers/

3 custom Lighthouse gatherers extending `Gatherer` from `lighthouse`.

| Gatherer | Artifact ID | What it collects |
|----------|-------------|------------------|
| `memory-gatherer.js` | `MemoryProfile` | JS heap metrics via `Performance.getMetrics()` |
| `selector-timing-gatherer.js` | `SelectorTiming` | Element selector timing data injected during page load |
| `network-request-bodies-gatherer.js` | `NetworkRequestBodies` | Response bodies for XHR/Fetch requests via CDP `Network.getResponseBody` |