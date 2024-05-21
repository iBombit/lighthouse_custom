import fs from 'fs/promises';
import https from 'https';
import logger from "../logger/logger.js";

const reportPath = './reports/user-flow.report.html';
const reportPathJson = './reports/user-flow.report.json';
const performanceAudits = [
  'first-contentful-paint',
  'speed-index',
  'interactive',
  'interaction-to-next-paint',
  'total-blocking-time',
  'largest-contentful-paint',
  'cumulative-layout-shift',
  'mainthread-work-breakdown',
  'network-requests',
];

export default class CreateReport {
  constructor(ddHost, ddKey) {
    this.ddHost = ddHost;
    this.ddKey = ddKey;
  }

  async createReports(flow) {
    const reportHTML = await flow.generateReport();
    const flowResult = await flow.createFlowResult();
    const reportJSON = JSON.stringify(flowResult, null, 2);

    await fs.writeFile(reportPath, reportHTML);
    await fs.writeFile(reportPathJson, reportJSON);

    logger.debug("[REPORT] HTML path: " + reportPath);
    logger.debug("[REPORT] JSON path: " + reportPathJson);

    if (this.ddHost && this.ddKey) {
      await this.sendMetricsToDD(flowResult);
    } else {
      logger.debug("[REPORT] Datadog API host or API key not provided. Skipping sending metrics");
    }
  }

  async sendMetricsToDD(flowResult) {
    logger.debug("[REPORT] Sending metrics to Datadog...");
    const now = Math.floor(Date.now() / 1000);
    try {
      const metricsToSend = flowResult.steps.flatMap(step => {
        const metrics = [];
        const applicationName = this.extractApplicationName(step.lhr.finalDisplayedUrl);
        const performanceScore = step.lhr.categories.performance.score * 100;

        metrics.push({
          metric: 'website.performance.score',
          points: [[now, performanceScore]],
          type: 'gauge',
          tags: [`step_name:${step.name}`, `application_name:${applicationName}`, 'environment:test']
        });

        for (const audit of performanceAudits) {
          const numericValue = step.lhr.audits[audit]?.numericValue;
          if (numericValue != null) {
            metrics.push({
              metric: `website.performance.${audit.replace('-', '_')}`,
              points: [[now, numericValue]],
              type: 'gauge',
              tags: [`step_name:${step.name}`, `application_name:${applicationName}`, 'environment:test']
            });
          }
        }

        return metrics;
      });

      const options = {
        hostname: this.ddHost,
        path: '/api/v1/series',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.ddKey
        }
      };

      const req = https.request(options, res => {
        res.on('data', d => process.stdout.write(d));
      });

      req.on('error', e => {
        logger.debug("[REPORT] Error sending metrics to Datadog: " + e.message);
      });

      req.write(JSON.stringify({ series: metricsToSend }));
      req.end();
    } catch (error) {
      logger.debug(`[REPORT] Error sending metrics to Datadog: ${error}`);
    }
  }

  extractApplicationName(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname ? urlObj.hostname.split('.')[0] : '3rd-party';
    } catch (e) {
      logger.debug(e);
      return '3rd-party';
    }
  }
}