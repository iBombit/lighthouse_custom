# 📊 reporting

Generates Lighthouse flow reports and pushes metrics to external services.

---

## reporting/createReport.js

Main reporting orchestrator.

**CreateReport**

| Method | Purpose |
|--------|---------|
| `constructor()` | Registers all reporter plugins with their enable-conditions |
| `createReports(flow)` | Generates HTML + JSON reports to `./reports/`, then calls `sendReports()` |
| `sendReports(flowResult)` | Iterates registered reporters — sends to each one whose CLI params are provided |

**`saveHTMLSource(page, stepName)`** — standalone helper that dumps the current page HTML into `./reports/errors/` with a timestamped filename (used on test failures).

Report filenames include a timestamp when `--includeTimestamp=true`.

---

## reporting/reporters/

6 pluggable reporter modules. Each is auto-enabled when its required CLI params are provided.

| Reporter | File | Required Params | Protocol |
|----------|------|-----------------|----------|
| **Datadog** | `datadog.js` | `--ddHost` `--ddKey` | HTTPS — Datadog Metrics API v1 |
| **Teams** | `teamsWebhook.js` | `--teamsWebhook` | Incoming Webhook (Adaptive Card) |
| **Slack** | `slackWebhook.js` | `--slackWebhook` | Incoming Webhook (Block Kit) |
| **InfluxDB v1** | `influx_v1.js` | `--influxUrl` `--influxUsername` `--influxPassword` `--influxDatabase` | HTTP write API (line protocol) |
| **InfluxDB v2** | `influx_v2.js` | `--influxUrl` `--influxToken` `--influxOrg` `--influxBucket` | HTTP write API v2 (line protocol + token auth) |
| **CSV** | `csv.js` | `--generateCSV=true` | Local file — `./reports/performance-analysis_<timestamp>.csv` |

All reporters extract per-step metrics (FCP, LCP, TBT, CLS, SI, TTI, etc.) and custom audit results from the Lighthouse `flowResult` JSON.

The CSV reporter also applies color-coded **good / needs-work / poor** thresholds per metric for quick visual analysis.