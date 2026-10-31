# 📊 reporting

Generates Lighthouse flow reports and pushes metrics to external services.

---

## reporting/createReport.ts

Main reporting orchestrator.

**CreateReport** (default export)

| Method | Purpose |
|--------|---------|
| `constructor()` | Registers all reporter plugins with their enable-conditions |
| `createReports(flow)` | Audits the flow once, adds the deep-dive audits, writes the HTML + JSON reports and the issue files to `./reports/` (and traces with `--saveTraces=true`), then calls `sendReports()` |
| `sendReports(flowResult)` | Iterates registered reporters — sends to each one whose CLI params are provided |

**`saveHTMLSource(page, stepName)`** — standalone helper that dumps the current page HTML into `./reports/errors/` with a timestamped filename (used on test failures).

Report filenames include a timestamp when `--includeTimestamp=true`.

Files written to `./reports/`:

| File | Content |
|------|---------|
| `user-flow.report.html` / `.json` | Lighthouse user-flow report (with the Custom Metrics deep dive and a links panel in the HTML) |
| `frontend-issues.md` | Prioritized issues for frontend developers, ready to paste into tickets |
| `frontend-issues.json` | The same issues, structured |
| `frontend-issues.jira.csv` | The same issues for Jira's "Import issues from CSV" |
| `traces/NN-<step>.json` | With `--saveTraces=true`: each step's trace, to open in the DevTools Performance panel ("Load profile") |
| `performance-analysis.csv` | With `--generateCSV=true`: metrics with thresholds |

## reporting/frontendIssues.ts

Builds issues from the finished flow result (every navigation and timespan step) and merges repeats across steps:

- **Web Vitals** — LCP, TBT, CLS, FCP, Speed Index, INP below target (score < 90), with the related failing audits.
- **Main thread** — scripts with ≥ 50 ms of TBT (from `tbt-breakdown`, plus hot functions from `js-hotspots`), 1st vs 3rd party.
- **Lighthouse insights & diagnostics** — failing performance audits with their estimated savings, top offending items and Lighthouse's guidance.
- **Network & API** — first-party requests slower than 1 s (with their server / download split), API calls with ≥ 1 s server
  time (backend), failing API calls (4xx → frontend, 5xx / network error → backend), the same API call repeated in a step.
- **Memory** — memory that keeps growing over ≥ 3 measurements on the same page (e.g. a page load and two interactions;
  JS heap +5 MB / +20 %, event listeners +100 / +30 % or DOM nodes +500 / +30 %, every step higher): a possible leak.
  Absolute sizes aren't judged: they include earlier pages kept in Chrome's back/forward cache.
- API calls to other sites (tags, ads, analytics) are assigned to `third-party` at P3; a slow first-party request
  that is mostly download goes to `frontend` (make it smaller), mostly server time to `backend`.

Priorities: **P1** poor Core Web Vital, ≥ 250 ms TBT or ≥ 500 ms estimated savings; **P2** needs improvement, ≥ 100–150 ms
or ≥ 100 KiB; **P3** smaller wins. Ids (`PERF-XXXXXX`) are derived from the rule and its target, so they are stable across runs.

## reporting/deepDive.ts

Report additions made after auditing: the `frontend-issues` and `web-vitals-overview` audits at the top of the Custom
Metrics category, and the HTML enhancements (full-width charts that open in a new tab when clicked, links panel).

## reporting/charts/

SVG chart builders used by the audits (`longTasksChart`, `activityChart`, `barChart`, `vitalsChart`), plus shared
palette / axis helpers (`svg.ts`) and formatting (`format.ts`, also used by the waterfall).

## reporting/waterfall.ts

- **`buildWaterfallSVG(requests, entityGroups, timingMarkers, stepName, options?)`** — renders the network waterfall
  chart (used by the `network-waterfall` audit, which embeds it in the report): requests in start order, each bar split
  into queued / DNS / connect / SSL / waiting for the server (light) / download (dark, colored by resource type),
  render-blocking rows red and the LCP resource green, metric markers, an optional main-thread lane (`options.tasks`) and
  requests / bytes / time per entity. Hover a row (chart opened full size) for URL, priority, initiator, protocol, cache and
  the phase timings. Requests without `phases` are drawn as single bars, as before.
- **`generateWaterfalls(flowResult, reportsDir)`** — writes one standalone `waterfall_<step>.svg` per flow step: the
  `network-waterfall` audit's chart, or a chart built from the `network-requests` table for older reports.

---

## reporting/reporters/

7 pluggable reporter modules. Each is auto-enabled when its required CLI params are provided.

| Reporter | File | Required Params | Protocol |
|----------|------|-----------------|----------|
| **Datadog** | `datadog.ts` | `--ddHost` `--ddKey` | HTTPS — Datadog Metrics API v1 |
| **Teams** | `teamsWebhook.ts` | `--teamsWebhook` | Incoming Webhook (MessageCard) |
| **Teams Workflow** | `teamsWorkflow.ts` | `--teamsWorkflow` | Teams Workflow API (MessageCard) |
| **Slack** | `slackWebhook.ts` | `--slackWebhook` | Incoming Webhook (text with a table) |
| **InfluxDB v1** | `influx_v1.ts` | `--influxUrl` `--influxUsername` `--influxPassword` `--influxDatabase` | HTTP write API (line protocol) |
| **InfluxDB v2** | `influx_v2.ts` | `--influxUrl` `--influxToken` `--influxOrg` `--influxBucket` | HTTP write API v2 (line protocol + token auth) |
| **CSV** | `csv.ts` | `--generateCSV=true` | Local file — `./reports/performance-analysis[_<timestamp>].csv` |

Both Teams reporters post the same card, built by `teamsMessageCard.ts`.

All reporters extract per-step metrics (FCP, LCP, TBT, CLS, SI, TTI, etc.) and custom audit results from the Lighthouse `flowResult` JSON.

The CSV reporter also applies color-coded **good / needs-work / poor** thresholds per metric for quick visual analysis.
