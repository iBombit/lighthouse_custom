import https from 'https';
import logger from "../../logger/logger.js";
import * as params from '../../settings/testParams.js';

const performanceAuditsTeams = [
  'first-contentful-paint',
  'speed-index',
  'interactive',
  'interaction-to-next-paint',
  'total-blocking-time',
  'largest-contentful-paint',
  'cumulative-layout-shift',
  'mainthread-work-breakdown',
  'network-requests'
];

export async function sendMetricsToTeams(webhookUrl, flowResult) {
  logger.debug("[REPORT] Sending metrics to Teams via webhook...");

  const auditNames = {
    'first-contentful-paint': 'FCP',
    'speed-index': 'SI',
    'interactive': 'TTI',
    'interaction-to-next-paint': 'INP',
    'total-blocking-time': 'TBT',
    'largest-contentful-paint': 'LCP',
    'cumulative-layout-shift': 'CLS',
    'mainthread-work-breakdown': 'JS time',
    'network-requests': 'API time',
  };

  let text = "**UI Performance test notification**" + "\n\n" + `${params.url} - ${params.githubRunUrl}`

  let tableHeader = "| Step | Score | " + performanceAuditsTeams.map(audit => auditNames[audit]).join(" | ") + " |";
  let tableDivider = "| --- | --- | " + performanceAuditsTeams.map(() => "---").join(" | ") + " |";

  let rows = flowResult.steps.map(step => {
    const performanceScore = Math.round(step.lhr.categories.performance.score * 100);

    let row = `| ${step.name} | ${performanceScore} | ` + performanceAuditsTeams.map(audit => {
      let numericValue = step.lhr.audits[audit]?.numericValue;
      if (numericValue != null) {
        numericValue = audit === 'cumulative-layout-shift' ? numericValue.toFixed(2) : Math.round(numericValue);
      } else {
        numericValue = '-';
      }
      return numericValue;
    }).join(" | ") + " |";
    if (performanceScore != 0)
      return row;
  }).filter(row => row !== undefined);

  const payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "summary": "Performance Metrics",
    "text": text + "\n\n" + tableHeader + "\n" + tableDivider + "\n" + rows.join('\n')
  };

  const options = {
    hostname: new URL(webhookUrl).hostname,
    path: new URL(webhookUrl).pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = https.request(options, res => {
    res.on('data', d => process.stdout.write(d));
    logger.debug("[REPORT] Teams response: ");
  });

  req.on('error', e => {
    logger.debug("[REPORT] Error sending metrics to Teams: " + e.message);
  });

  req.write(JSON.stringify(payload));
  req.end();
}