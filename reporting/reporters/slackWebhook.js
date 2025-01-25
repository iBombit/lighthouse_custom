import https from 'https';
import logger from "lh-pptr-framework/logger/logger.js";
import * as params from 'lh-pptr-framework/settings/testParams.js';

const performanceAuditsSlack = [
  'first-contentful-paint',
  'speed-index',
  'interactive',
  'interaction-to-next-paint',
  'total-blocking-time',
  'largest-contentful-paint',
  'cumulative-layout-shift',
  'mainthread-work-breakdown',
  'network-requests',
  'slowest-network-request',
  'longest-first-party-request'
];

export async function sendMetricsToSlack(webhookUrl, flowResult) {
  logger.debug("[REPORT] Sending metrics to Slack via webhook...");
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
    'slowest-network-request': 'Slowest API',
    'longest-first-party-request': 'Slowest 1st party API'
  };

  let text = `*UI Performance test notification*\n\n` 
  
  if (params.url) {
    text += `*Environment:* ${params.url}\n\n`;
  }
  if (!params.regions.includes("not set")) {
    text += `*Region:* ${params.regions}\n\n`;
  }
  if (params.ciUrl) {
    text += `*CI link:* ${params.ciUrl}\n\n`;
  }
  
  let tableHeaders = ['Step', 'Score'];
  performanceAuditsSlack.map(audit => {
    tableHeaders.push(auditNames[audit]);
  });
  const tableRows = [];
  const padString = (str, width) => {
    return str.toString().padEnd(width, ' ');
  };

  const columnWidths = tableHeaders.map(header => header.length);

  flowResult.steps.forEach(step => {

    const row = [];
    row.push(step.name);
    const performanceScore = Math.round(step.lhr.categories.performance.score * 100);
    row.push(performanceScore); 

    performanceAuditsSlack.forEach(audit => {
      let numericValue = step.lhr.audits[audit]?.numericValue;
      if (numericValue != null) {
        numericValue = audit === 'cumulative-layout-shift' ? numericValue.toFixed(2) : Math.round(numericValue);
      } else {
        numericValue = '-';
      }
      row.push(numericValue);
    });

    row.forEach((value, index) => {
      columnWidths[index] = Math.max(columnWidths[index], value.toString().length);
    });

    if (performanceScore != 0)
      tableRows.push(row);
    
  });

  const headerRow = tableHeaders.map((header, index) => padString(header, columnWidths[index])).join(' | ');
  tableRows.unshift(headerRow);
  const separatorRow = columnWidths.map(width => '-'.repeat(width)).join('-|-');
  tableRows.splice(1, 0, separatorRow);

  const formattedRows = tableRows.map(row => {
    if (typeof row === 'string') return row;
    return row.map((value, index) => padString(value, columnWidths[index])).join(' | ');
  });

  const table = formattedRows.join('\n');

  const payload = {
    text: `${text}\`\`\`${table}\`\`\``
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
    logger.debug("[REPORT] Slack response: ");
  });

  req.on('error', e => {
    logger.debug("[REPORT] Error sending metrics to Slack: " + e.message);
  });

  req.write(JSON.stringify(payload));
  req.end();
}